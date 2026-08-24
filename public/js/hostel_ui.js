/**
 * UI Logic for Hostel Management
 */

function openHostelModal() {
    const modal = document.getElementById('hostelModal');
    modal.classList.add('open');
    
    // Set default date to today
    const dateInput = document.getElementById('checkInDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // If student, pre-fill summary
    if (typeof currentUserRole !== 'undefined' && currentUserRole === 'student') {
        document.getElementById('summary-student-name').innerText = currentStudentName || '—';
        document.getElementById('summary-student-id').innerText = currentStudentId || '—';
    }
    
    updateHostelSummary();
}

function updateHostelSummary() {
    // Room & Block Display
    const room = document.getElementById('roomNo').value || '—';
    const block = document.getElementById('block').value || '—';
    const bed = document.getElementById('bedNo').value || '—';
    const rent = document.getElementById('monthlyRent').value || '0';

    document.getElementById('summary-room-display').innerText = room !== '—' ? `Room ${room}` : '—';
    document.getElementById('summary-block-display').innerText = block !== '—' ? block : 'Select Room & Block';
    document.getElementById('summary-bed').innerText = bed;
    document.getElementById('summary-rent').innerText = `Rs. ${parseFloat(rent).toLocaleString()}`;

    // Student Info (for Admin)
    if (typeof currentUserRole !== 'undefined' && currentUserRole !== 'student') {
        const select = document.getElementById('studentSelect');
        if (select && select.selectedIndex > 0) {
            const option = select.options[select.selectedIndex];
            document.getElementById('summary-student-name').innerText = option.text.split(' (')[0];
            document.getElementById('summary-student-id').innerText = option.getAttribute('data-sid');
        } else {
            document.getElementById('summary-student-name').innerText = '—';
            document.getElementById('summary-student-id').innerText = '—';
        }
    }
}

// Close modal when clicking outside content
window.onclick = function(event) {
    const modal = document.getElementById('hostelModal');
    if (event.target == modal) {
        modal.classList.remove('open');
    }
}
