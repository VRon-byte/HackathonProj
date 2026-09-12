// --- 1. Theme Switcher Logic ---
const themeSelect = document.querySelectorAll('.settings-select')[0];
if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        const root = document.documentElement;
        if (e.target.value === 'Light') {
            root.style.setProperty('--bg-main', '#f0f2f5');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--text-primary', '#121212');
            root.style.setProperty('--text-secondary', '#555555');
            root.style.setProperty('--border-color', '#dcdcdc');
            root.style.setProperty('--btn-bg', '#e4e6e8');
            root.style.setProperty('--btn-hover', '#d4d6d8');
        } else {
            root.style.removeProperty('--bg-main');
            root.style.removeProperty('--bg-card');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--border-color');
            root.style.removeProperty('--btn-bg');
            root.style.removeProperty('--btn-hover');
        }
    });
}

// --- 2. Two-Factor Authentication (2FA) Reveal ---
const toggle2faBtn = document.getElementById('toggle-2fa-btn');
const setup2faDiv = document.getElementById('2fa-setup');

if (toggle2faBtn && setup2faDiv) {
    toggle2faBtn.addEventListener('click', () => {
        const isHidden = setup2faDiv.style.display === 'none';
        setup2faDiv.style.display = isHidden ? 'block' : 'none';
        toggle2faBtn.textContent = isHidden ? 'Cancel Setup' : 'Enable';
    });
}

// --- 3. Action Buttons (Data & Storage) ---
const actionBtns = document.querySelectorAll('.settings-action-btn');
if (actionBtns.length >= 2) {
    const clearCacheBtn = actionBtns[0];
    const exportDataBtn = actionBtns[1];

    clearCacheBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to clear 124 MB of cached map data?')) {
            alert('Map cache cleared successfully!');
        }
    });

    exportDataBtn.addEventListener('click', () => {
        alert('Your data archive is being generated. We will email you a download link shortly.');
    });
}

// --- 4. Danger Zone Buttons ---
const dangerBtns = document.querySelectorAll('.danger-btn');
if (dangerBtns.length >= 2) {
    const deactivateBtn = dangerBtns[0];
    const deleteBtn = dangerBtns[1];

    deactivateBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to deactivate your account? Your profile will be hidden.')) {
            alert('Account deactivated. You will now be logged out.');
        }
    });

    deleteBtn.addEventListener('click', () => {
        const doubleCheck = prompt('To permanently delete your account, please type "DELETE" below:');
        if(doubleCheck === 'DELETE') {
            alert('Account permanently deleted.');
        }
    });
}

// --- 5. Sign Out Button ---
const signOutBtn = document.querySelector('.sign-out-btn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        alert('You have successfully signed out.');
    });
}

// --- 6. Form Submission Prevention ---
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Form changes saved successfully!');
    });
});

// --- 7. Live Update Profile Header ---
const nameInput = document.getElementById('Name');
const usernameInput = document.getElementById('UserName');
const locationInput = document.getElementById('Location');

const headerName = document.querySelector('.user-name');
const headerMeta = document.querySelector('.user-meta');

function updateProfileCard() {
    const nameText = nameInput.value || 'Your Name';
    const usernameText = usernameInput.value ? `@${usernameInput.value}` : '@username';
    const locationText = locationInput.value || 'City, State';
    
    if (headerName) headerName.textContent = nameText;
    if (headerMeta) headerMeta.innerHTML = `${usernameText} &middot; ${locationText}`;
}

if (nameInput) nameInput.addEventListener('input', updateProfileCard);
if (usernameInput) usernameInput.addEventListener('input', updateProfileCard);
if (locationInput) locationInput.addEventListener('input', updateProfileCard);


// --- 8. Live Update Event Count ---
const eventCheckboxes = document.querySelectorAll('.tab-content.Event input[type="checkbox"]');
const eventBadge = document.querySelector('.event-tag');

function updateEventCount() {
    let checkedCount = 0;
    
    eventCheckboxes.forEach(box => {
        if (box.checked) {
            checkedCount++;
        }
    });
    
    if (eventBadge) {
        if (checkedCount === 1) {
            eventBadge.textContent = `📍 1 event type`;
        } else {
            eventBadge.textContent = `📍 ${checkedCount} event types`;
        }
    }
}

eventCheckboxes.forEach(box => {
    box.addEventListener('change', updateEventCount);
});

// Run once on load to set the initial count
updateEventCount();