// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// Highlight active nav link
const path = window.location.pathname;
document.querySelectorAll('.nav-link-h').forEach(link => {
  if (path === '/' && link.getAttribute('href') === '/') {
    link.classList.add('active');
  } else if (link.getAttribute('href') !== '/' && path.startsWith(link.getAttribute('href'))) {
    link.classList.add('active');
  }
});
// Toast System
function showToast(message, type = 'success', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Check URL for feedback toasts
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('toast')) {
    const t = params.get('toast');
    if (t === 'remind_success') showToast('📧 Fee reminder email sent successfully!');
  }
  if (params.has('toastCustom')) {
    const msg = decodeURIComponent(params.get('toastCustom')).replace(/_/g, ' ');
    const type = msg.includes('✅') ? 'success' : 'error';
    showToast(msg, type, 8000);
  }
});
