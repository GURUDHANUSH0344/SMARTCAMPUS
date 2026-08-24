'use strict';

/* ── Data (Will be populated by EJS) ────────────────────────── */
let feeRecords = window.FEE_RECORDS || [];
let activeFilter = 'all';
let searchQuery  = '';

/* ── Helpers ───────────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

function getStatus(rec) {
  if (rec.paid >= rec.amount) return 'Paid';
  if (rec.paid > 0 && rec.paid < rec.amount && rec.due >= today()) return 'Partial';
  if (rec.due < today()) return 'Overdue';
  return 'Unpaid';
}

function fmtINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

const AVATAR_COLORS = [
  '#2563eb','#7c3aed','#db2777','#059669','#d97706',
  '#0891b2','#9333ea','#16a34a','#dc2626','#0284c7'
];

function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function badgeHTML(status) {
  const map = {
    'Paid':    ['badge-paid',    'Paid'],
    'Unpaid':  ['badge-unpaid',  'Unpaid'],
    'Overdue': ['badge-overdue', 'Overdue'],
    'Partial': ['badge-partial', 'Partial']
  };
  const [cls, label] = map[status] || ['badge-default', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Stats ─────────────────────────────────────────────────── */


/* ── Toast Notifications ───────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span style="font-weight: 500">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ── Filter & Search ───────────────────────────────────────── */
function filteredRecords() {
  return feeRecords.filter(r => {
    const status = getStatus(r);
    const matchFilter =
      activeFilter === 'all'     ||
      (activeFilter === 'paid'   && status === 'Paid')    ||
      (activeFilter === 'unpaid' && status === 'Unpaid')  ||
      (activeFilter === 'overdue'&& status === 'Overdue');
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      r.studentName.toLowerCase().includes(q) ||
      r.id.toString().toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

/* ── Table Render ──────────────────────────────────────────── */
function renderTable() {
  const tbody = document.getElementById('fee-tbody');
  if (!tbody) return;
  
  const records = filteredRecords();

  if (!records.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state" style="padding: 60px 20px; text-align: center;">
          <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🧾</div>
          <p style="color: var(--text-3); font-weight: 500;">No fee records match your search.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const status  = getStatus(r);
    const balance = r.amount - r.paid;
    const isPaid  = status === 'Paid';
    const color   = avatarColor(r.studentName);
    
    // Progress calculation
    const progressPercent = r.amount ? Math.min(Math.round((r.paid / r.amount) * 100), 100) : 0;
    let fillClass = 'amber';
    if (progressPercent === 100) fillClass = 'green';
    else if (progressPercent === 0 && status === 'Overdue') fillClass = 'red';
    else if (progressPercent > 0) fillClass = 'blue';

    return `
      <tr data-id="${r.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar-sm" style="background:${color};width:34px;height:34px;font-size:12px;border-radius:50%;color:white;display:grid;place-items:center;font-weight:bold;">
              ${initials(r.studentName)}
            </div>
            <strong>${r.studentName}</strong>
          </div>
        </td>
        <td class="mono">FEE-${r.id.toString().padStart(3, '0')}</td>
        <td>${r.type}</td>
        <td style="font-family: 'Space Grotesk', sans-serif;">${fmtINR(r.amount)}</td>
        <td>
          <div class="progress-container">
            <div class="progress-fill ${fillClass}" style="width: ${progressPercent}%"></div>
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: var(--text-2); font-weight: 500;">
            ${fmtINR(r.paid)} of ${fmtINR(r.amount)}
          </div>
        </td>
        <td style="color:${status==='Overdue'?'var(--danger)':'var(--text-3)'}">
          ${r.due}
        </td>
        <td>${badgeHTML(status)}</td>
        <td>
          <div class="actions" style="display:flex; gap:6px; align-items:center;">
            <button class="btn btn-ghost btn-icon" onclick="viewDetails('${r.id}')" title="View details" style="padding:4px; display:inline-flex; align-items:center; justify-content:center; height:28px; width:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
            ${window.isAdmin ? `<button class="btn btn-ghost btn-icon" onclick="openEditModal('${r.id}')" title="Edit Fee" style="padding:4px; display:inline-flex; align-items:center; justify-content:center; height:28px; width:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>` : ''}
            ${(window.isAdmin && !isPaid) ? `<form method="POST" action="/fees/remind/${r.id}" style="display:flex; align-items:center; margin:0;"><button type="submit" class="btn btn-ghost btn-icon" title="Send Fee Reminder Email" style="padding:4px; color:#d97706; display:inline-flex; align-items:center; justify-content:center; height:28px; width:28px; font-size:14px;" onclick="return confirm('Send fee reminder email to this student?')">📧</button></form>` : ''}
            ${(isPaid && r.receiptNo) ? `<a href="/fees/receipt/${r.receiptNo}" target="_blank" class="btn btn-outline-brand btn-icon" title="Download Receipt" style="padding:4px; display:inline-flex; align-items:center; justify-content:center; height:28px; width:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ── UI Interaction ────────────────────────────────────────── */
function openAddModal() {
  const form = document.getElementById('smart-fee-form');
  if (form) {
    form.reset();
    form.action = '/fees';
    document.querySelector('#addModal .modal-title').textContent = 'Add Fee Details';
    document.querySelector('#addModal button[type="submit"]').textContent = 'Save Fee Record';
    const delBtn = document.getElementById('btn-delete-fee');
    if(delBtn) delBtn.style.display = 'none';
    
    // Enable all fields for Adding
    const fields = ['sf-name', 'sf-roll', 'sf-email', 'sf-dept', 'sf-program', 'sf-year', 'sf-sem', 'sf-session', 'sf-type', 'sf-total', 'sf-discount', 'sf-paid', 'sf-due', 'sf-paydate', 'sf-method', 'sf-txn', 'sf-remarks'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = false;
        el.disabled = false;
        el.style.backgroundColor = '';
        el.style.cursor = '';
      }
    });

    // Default values
    document.getElementById('sf-discount').value = '0.00';
    document.getElementById('sf-paid').value = '0.00';
    document.getElementById('sf-paydate').value = today();
    document.getElementById('sf-session').value = '2024-25';
    
    // Trigger reset logic
    initSmartForm(); 
  }
  document.getElementById('addModal').classList.add('open');
}

function openEditModal(id, title = 'Edit Fee Details') {
  const r = feeRecords.find(x => x.id == id);
  if (!r) return;
  const form = document.getElementById('smart-fee-form');
  if (form) {
    form.action = `/fees/edit/${id}`;
    document.querySelector('#addModal .modal-title').textContent = title;
    document.querySelector('#addModal button[type="submit"]').textContent = title.includes('Payment') ? 'Save Payment' : 'Update Fee Record';

    const delBtn = document.getElementById('btn-delete-fee');
    if (delBtn) {
      if (window.isAdmin) {
        delBtn.style.display = 'block';
        delBtn.onclick = function() {
          if (confirm('Are you sure you want to permanently delete this fee record? \\nThis action cannot be undone.')) {
            const tempForm = document.createElement('form');
            tempForm.method = 'POST';
            tempForm.action = `/fees/delete/${id}`;
            document.body.appendChild(tempForm);
            tempForm.submit();
          }
        };
      } else {
        delBtn.style.display = 'none';
      }
    }

    // Lock specific fields for Editing
    const fieldsToLock = ['sf-name', 'sf-roll', 'sf-email', 'sf-dept', 'sf-program', 'sf-year', 'sf-sem', 'sf-session', 'sf-type', 'sf-total', 'sf-discount', 'sf-method', 'sf-txn', 'sf-remarks'];
    fieldsToLock.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') { el.disabled = true; } 
        else { el.readOnly = true; }
        el.style.backgroundColor = '#f8fafc';
        el.style.cursor = 'not-allowed';
      }
    });

    // Explicitly ensure Amount Paid, Due Date, and Payment Date are editable
    const fieldsToUnlock = ['sf-paid', 'sf-due', 'sf-paydate'];
    fieldsToUnlock.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = false;
        el.style.backgroundColor = '';
        el.style.cursor = '';
      }
    });

    // Populate Student Fields
    document.getElementById('sf-name').value = r.studentName || '';
    document.getElementById('sf-roll').value = r.studentRoll || '';
    if(document.getElementById('sf-email')) {
      document.getElementById('sf-email').value = r.email || '';
    }
    document.getElementById('sf-dept').value = r.dept || '';
    
    // Update programs based on dept
    const deptChangeEv = new Event('change');
    document.getElementById('sf-dept').dispatchEvent(deptChangeEv);
    
    // Now set year and triggered sem update
    document.getElementById('sf-year').value = r.year || '';
    document.getElementById('sf-year').dispatchEvent(deptChangeEv);

    // Populate Fee Fields
    document.getElementById('sf-type').value = r.type || 'Tuition Fee';
    document.getElementById('sf-feeid').value = r.receiptNo || '';
    document.getElementById('sf-total').value = r.amount || 0;
    document.getElementById('sf-discount').value = '0.00'; 
    document.getElementById('sf-paid').value = r.paid || 0;
    document.getElementById('sf-method').value = r.method || 'Cash';
    document.getElementById('sf-due').value = r.due || '';
    document.getElementById('sf-paydate').value = r.paidDate || '';
    
    // Trigger Recalculate
    const inputEv = new Event('input');
    document.getElementById('sf-total').dispatchEvent(inputEv);
  }
  document.getElementById('addModal').classList.add('open');
}

function openBulkDeleteModal() {
  const container = document.getElementById('bulk-delete-fees-list');
  if (!container) return;
  const activeRecords = filteredRecords(); // Allows bulk deleting specifically what is currently searched/filtered
  if (activeRecords.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3); text-align:center; padding: 20px;">No records available to delete.</p>';
  } else {
    container.innerHTML = activeRecords.map(r => `
      <label style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border); border-radius:8px; cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" name="feeIds[]" value="${r.id}" style="width:16px; height:16px;" />
        <div>
          <strong style="display:block; color:var(--text);">${r.studentName} <span style="font-weight:normal; color:var(--text-3);">(${r.studentRoll || 'FEE-' + r.id.toString().padStart(3, '0')})</span></strong>
          <span style="font-size:12.5px; color:var(--text-2); display:block; margin-top:2px;">${r.type} - ₹${r.amount} &nbsp;&bull;&nbsp; Status: ${getStatus(r)}</span>
        </div>
      </label>
    `).join('');
  }
  document.getElementById('bulkDeleteFeesModal').classList.add('open');
}

function viewDetails(id) {
  const r = feeRecords.find(x => x.id == id);
  if (!r) return;

  const st = getStatus(r);
  const color = avatarColor(r.studentName);

  const modalBody = document.getElementById('view-modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
        <div class="avatar-sm" style="background:${color};width:48px;height:48px;font-size:16px;border-radius:50%;display:grid;place-items:center;color:white;font-weight:bold;">
          ${initials(r.studentName)}
        </div>
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--text)">${r.studentName}</div>
          <div class="text-muted mono">FEE-${r.id.toString().padStart(3, '0')}</div>
        </div>
        <div style="margin-left:auto">${badgeHTML(st)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${viewRow('Fee Type', r.type)}
        ${viewRow('Total Amount', fmtINR(r.amount))}
        ${viewRow('Amount Paid', fmtINR(r.paid))}
        ${viewRow('Balance Due', fmtINR(r.amount - r.paid),
            r.amount - r.paid > 0 ? 'color:var(--danger);font-weight:700' : '')}
        ${viewRow('Due Date', r.due,
            st === 'Overdue' ? 'color:var(--danger)' : '')}
        <div style="grid-column: 1 / -1; margin-top: 10px; display: flex; gap: 10px;">
          ${r.receiptNo ? `<a href="/fees/receipt/${r.receiptNo}" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Receipt</a>` : ''}
          ${window.isAdmin ? `<button class="btn btn-outline-brand" onclick="document.getElementById('viewModal').classList.remove('open'); openEditModal('${r.id}', 'Update Fee Details');" style="display: inline-flex; align-items: center; gap: 8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit Fee Record</button>` : ''}
        </div>
      </div>
    `;
  }
  document.getElementById('viewModal').classList.add('open');
}

function viewRow(label, value, style = '') {
  return `
    <div>
      <div class="info-label" style="font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">${label}</div>
      <div class="info-value" style="font-weight:600; margin-top:4px; color:var(--text); font-size:14px; ${style}">${value}</div>
    </div>`;
}

function recordPayment(id) {
  openEditModal(id, 'Record Payment');
}

/* ── Event Listeners ───────────────────────────────────────── */
function bindEvents() {
  const searchInput = document.getElementById('fee-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderTable();
    });
  }

  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderTable();
    });
  });
}

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  renderTable();

  const urlParams = new URLSearchParams(window.location.search);
  const toastMsg = urlParams.get('toast');
  const toastCustom = urlParams.get('toastCustom');
  if (toastCustom) {
    showToast(toastCustom.replace(/_/g, ' '));
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (toastMsg) {
    if (toastMsg === 'add_success') showToast('Fee record added successfully!');
    else if (toastMsg === 'pay_success') showToast('Payment recorded successfully!');
    else if (toastMsg === 'delete_success') showToast('Record deleted successfully!');
    else if (toastMsg === 'remind_success') showToast('Reminder sent successfully!');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  initSmartForm();
});

/* ── Smart Fee Form Logic ──────────────────────────────────── */
function initSmartForm() {
  const fName = document.getElementById('sf-name');
  const fRoll = document.getElementById('sf-roll');
  const fEmail = document.getElementById('sf-email');
  const fDept = document.getElementById('sf-dept');
  const fProg = document.getElementById('sf-program');
  const fYear = document.getElementById('sf-year');
  const fSem = document.getElementById('sf-sem');
  const fSess = document.getElementById('sf-session');
  const fType = document.getElementById('sf-type');
  const fFeeId = document.getElementById('sf-feeid');
  const fRefresh = document.getElementById('sf-refresh');
  
  const fTotal = document.getElementById('sf-total');
  const fDisc = document.getElementById('sf-discount');
  const fNet = document.getElementById('sf-net');
  const fPaid = document.getElementById('sf-paid');
  const fDue = document.getElementById('sf-due');
  const fPayDate = document.getElementById('sf-paydate');
  const fStatusBox = document.getElementById('sf-status');

  if (!fName) return;

  if (fPayDate) fPayDate.value = new Date().toISOString().split('T')[0];

  function updatePrograms() {
    if(!fDept) return;
    const dept = fDept.value;
    const isEng = ['CSE','IT','CSBS','AIDS','AIML','CSD','CY','MECH','CIVIL','EEE','ECE','EIE','AUTO','AERO','Aerospace','BME','BT','CHEM','FT','IE','Manufacturing','Metallurgical','Mining','Petroleum','RA','Agriculture','Marine','Textile','Environmental'].includes(dept);
    const isSci = ['BSc CS', 'BSc IT', 'BSc Math', 'BSc Physics', 'BSc Chemistry', 'MSc CS'].includes(dept);
    const isCom = ['BCom Gen', 'BCom CA', 'MCom'].includes(dept);
    const isMgt = ['MBA','MCA','BBA','BCA'].includes(dept);

    let opts = ['<option value="">— Select Program —</option>'];
    if (dept === '') {
      opts.push('<option>B.E</option><option>B.Tech</option><option>M.E</option><option>M.Tech</option>');
      opts.push('<option>B.Sc</option><option>M.Sc</option>');
      opts.push('<option>B.Com</option><option>M.Com</option>');
      opts.push('<option>BBA</option><option>BCA</option><option>MBA</option><option>MCA</option>');
    } else {
      if (isEng) opts.push('<option>B.E</option><option>B.Tech</option><option>M.E</option><option>M.Tech</option>');
      if (isSci) opts.push('<option>B.Sc</option><option>M.Sc</option>');
      if (isCom) opts.push('<option>B.Com</option><option>M.Com</option>');
      if (isMgt) opts.push('<option>BBA</option><option>BCA</option><option>MBA</option><option>MCA</option>');
    }

    fProg.innerHTML = opts.join('');
  }

  function updateSemesters() {
    if(!fYear || !fSem) return;
    const y = parseInt(fYear.value);
    let opts = ['<option value="">— Semester —</option>'];
    if (isNaN(y)) {
      opts.push('<option>Semester 1</option><option>Semester 2</option><option>Semester 3</option><option>Semester 4</option><option>Semester 5</option><option>Semester 6</option><option>Semester 7</option><option>Semester 8</option>');
    } else {
      if (y === 1) opts.push('<option>Semester 1</option><option>Semester 2</option>');
      if (y === 2) opts.push('<option>Semester 3</option><option>Semester 4</option>');
      if (y === 3) opts.push('<option>Semester 5</option><option>Semester 6</option>');
      if (y === 4) opts.push('<option>Semester 7</option><option>Semester 8</option>');
    }
    fSem.innerHTML = opts.join('');
  }

  function generateFeeId(force = false) {
    if(!fRoll || !fSem || !fSess || !fFeeId || !fType) return;
    
    const roll = fRoll.value.trim().toUpperCase() || 'ROLL';
    const semStr = fSem.value.replace('Semester ', 'S') || 'SX';
    const sess = fSess.value ? fSess.value.split('-')[0].slice(-2) : '24';
    const type = fType.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'FE';
    
    fFeeId.value = `FEE-${roll}-${type}-${semStr}-${sess}`;
  }

  function calculate() {
    const total = parseFloat(fTotal.value) || 0;
    const disc = parseFloat(fDisc.value) || 0;
    const net = Math.max(0, total - disc);
    fNet.value = net.toFixed(2);
    
    // validation
    const paid = parseFloat(fPaid.value) || 0;
    if (paid > net) {
      fPaid.style.borderColor = 'var(--danger)';
    } else {
      fPaid.style.borderColor = '';
    }

    // Status logic
    let stat = 'Unpaid';
    if (paid >= net && net > 0) stat = 'Paid';
    else if (paid > 0) stat = 'Partial';
    else if (fDue.value && fDue.value < new Date().toISOString().split('T')[0]) stat = 'Overdue';

    if (net === 0 && total === 0) stat = '—';

    // Status box visual
    fStatusBox.textContent = stat;
    fStatusBox.className = 'badge badge-default';
    if (stat === 'Paid') fStatusBox.className = 'badge badge-paid';
    if (stat === 'Partial') fStatusBox.className = 'badge badge-partial';
    if (stat === 'Overdue') fStatusBox.className = 'badge badge-overdue';
    if (stat === 'Unpaid') fStatusBox.className = 'badge badge-unpaid';

    updateSummary(net, paid);
  }

  function updateSummary(net, paid) {
    document.getElementById('sum-name').textContent = fName.value || 'Student Name';
    document.getElementById('sum-roll').textContent = fRoll.value ? 'ID: ' + fRoll.value : 'ID: —';
    let ava = '?';
    if (fName.value) {
      ava = fName.value.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      document.getElementById('sum-avatar').style.background = avatarColor(fName.value);
      document.getElementById('sum-avatar').style.color = '#fff';
    } else {
      document.getElementById('sum-avatar').style.background = 'var(--bg-2)';
      document.getElementById('sum-avatar').style.color = 'var(--text-3)';
    }
    document.getElementById('sum-avatar').textContent = ava;

    const dp = fDept.options[fDept.selectedIndex]?.text.split('(')[0].trim() || 'Department';
    const pr = fProg.value || 'Program';
    document.getElementById('sum-dept').textContent = `${dp} — ${pr}`;

    const yr = fYear.options[fYear.selectedIndex]?.text || '';
    const sm = fSem.value || '';
    document.getElementById('sum-sem').textContent = yr && sm ? `${yr} — ${sm}` : 'Year — Semester';

    const t = parseFloat(fTotal.value) || 0;
    const d = parseFloat(fDisc.value) || 0;
    const b = net - paid;

    document.getElementById('sum-total').textContent = fmtINR(t);
    document.getElementById('sum-disc').textContent = `-`+fmtINR(d);
    document.getElementById('sum-net').textContent = fmtINR(net);
    document.getElementById('sum-paid').textContent = fmtINR(paid);
    
    document.getElementById('sum-bal').textContent = fmtINR(Math.max(0, b));
    if(b <= 0 && net > 0) document.getElementById('sum-bal').style.color = 'var(--success)';
    else document.getElementById('sum-bal').style.color = '#d97706';

    const pct = net > 0 ? Math.min(100, Math.round((paid/net)*100)) : 0;
    const pf = document.getElementById('sum-prog-fill');
    pf.style.width = pct + '%';
    pf.className = 'progress-fill ' + (pct === 100 ? 'green' : (pct > 0 ? 'blue' : 'amber'));
    
    document.getElementById('sum-prog-lbl').textContent = pct + '% Paid';
  }

  fDept.addEventListener('change', () => { updatePrograms(); generateFeeId(); calculate(); });
  fYear.addEventListener('change', () => { updateSemesters(); generateFeeId(); calculate(); });
  fSem.addEventListener('change', () => { generateFeeId(); calculate(); });
  fSess.addEventListener('change', () => { generateFeeId(); calculate(); });
  
  fName.addEventListener('input', calculate);
  fRoll.addEventListener('input', () => { generateFeeId(); calculate(); });
  if(fEmail) fEmail.addEventListener('input', calculate);
  fProg.addEventListener('change', calculate);
  fTotal.addEventListener('input', calculate);
  fDisc.addEventListener('input', calculate);
  fPaid.addEventListener('input', calculate);
  fDue.addEventListener('change', calculate);
  
  // fRefresh is no longer present in HTML

  // Error border stripping on required fields
  const form = document.getElementById('smart-fee-form');
  form.addEventListener('submit', (e) => {
    // optional frontend validation intercept
  });

  updatePrograms();
  updateSemesters();
  generateFeeId();
}
