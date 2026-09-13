// ==========================================
// 1. APPEARANCE & THEME
// ==========================================
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

// ==========================================
// 2. BUTTONS & ALERTS (2FA, Data, Danger Zone)
// ==========================================
const toggle2faBtn = document.getElementById('toggle-2fa-btn');
const setup2faDiv = document.getElementById('2fa-setup');
if (toggle2faBtn && setup2faDiv) {
    toggle2faBtn.addEventListener('click', () => {
        const isHidden = setup2faDiv.style.display === 'none';
        setup2faDiv.style.display = isHidden ? 'block' : 'none';
        toggle2faBtn.textContent = isHidden ? 'Cancel Setup' : 'Enable';
    });
}

const confirm2faBtn = document.getElementById('confirm-2fa-btn');
const verificationInput = document.getElementById('verification-code');
if (confirm2faBtn) {
    confirm2faBtn.addEventListener('click', () => {
        if (verificationInput && verificationInput.value.length === 6) {
            alert('Success! Two-factor authentication is now enabled.');
            document.getElementById('2fa-setup').style.display = 'none';
            document.getElementById('toggle-2fa-btn').textContent = 'Manage 2FA';
            verificationInput.value = ''; 
        } else {
            alert('Please enter a valid 6-digit code.');
        }
    });
}

const actionBtns = document.querySelectorAll('.settings-action-btn');
if (actionBtns.length >= 2) {
    actionBtns[0].addEventListener('click', () => {
        if(confirm('Are you sure you want to clear 124 MB of cached map data?')) {
            alert('Map cache cleared successfully!');
        }
    });
    actionBtns[1].addEventListener('click', () => {
        alert('Your data archive is being generated. We will email you a download link shortly.');
    });
}

const dangerBtns = document.querySelectorAll('.danger-btn');
if (dangerBtns.length >= 2) {
    dangerBtns[0].addEventListener('click', () => {
        if(confirm('Are you sure you want to deactivate your account? Your profile will be hidden.')) {
            alert('Account deactivated. You will now be logged out.');
        }
    });
    dangerBtns[1].addEventListener('click', () => {
        const doubleCheck = prompt('To permanently delete your account, please type "DELETE" below:');
        if(doubleCheck === 'DELETE') {
            alert('Account permanently deleted.');
        }
    });
}

// Prevent default form submissions for everything except the main profile form
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        if (form.id === 'profile-form') return;
        if (form.action.includes('update-password')) return;
        e.preventDefault();
        alert('Form changes saved successfully!');
    });
});

// ==========================================
// 3. EVENT PREFERENCES PREVIEW
// ==========================================
const eventCheckboxes = document.querySelectorAll('.tab-content.Event input[type="checkbox"]');
const eventBadge = document.querySelector('.event-tag');

function updateEventCount() {
    let checkedCount = 0;
    eventCheckboxes.forEach(box => {
        if (box.checked) checkedCount++;
    });
    
    if (eventBadge) {
        eventBadge.textContent = checkedCount === 1 ? `📍 1 event type` : `📍 ${checkedCount} event types`;
    }
}
eventCheckboxes.forEach(box => box.addEventListener('change', updateEventCount));
updateEventCount();

// ==========================================
// 4. PROFILE DATA & LOCAL STORAGE
// ==========================================
const profileForm = document.getElementById('profile-form');
const pictureInput = document.getElementById('ProfilePicture');
const profilePicture = document.getElementById('profile-picture');
const authEmail = document.getElementById('auth-email');
const nameInput = document.getElementById('Name');
const usernameInput = document.getElementById('UserName');
const locationInput = document.getElementById('Location');
const bioInput = document.getElementById('Bio');
const headerName = document.querySelector('.user-name');
const headerMeta = document.querySelector('.user-meta');
const headerBio = document.querySelector('.user-bio');

// Load any custom changes you made locally
const profileStorageKey = 'touchgrass-profile';
const profilePreferences = JSON.parse(localStorage.getItem(profileStorageKey) || '{}');

// Updates the big header when you type in the text boxes
function updateProfileCard() {
    const nameText = nameInput.value || 'Your Name';
    const usernameText = usernameInput.value ? `@${usernameInput.value}` : '@username';
    const locationText = locationInput.value || 'City, State';
    const bioText = bioInput.value.trim() || 'Add bio in profile.';
    
    if (headerName) headerName.textContent = nameText;
    if (headerMeta) headerMeta.innerHTML = `${usernameText} &middot; ${locationText}`;
    if (headerBio) headerBio.textContent = bioText;
}

if (nameInput) nameInput.addEventListener('input', updateProfileCard);
if (usernameInput) usernameInput.addEventListener('input', updateProfileCard);
if (locationInput) locationInput.addEventListener('input', updateProfileCard);
if (bioInput) bioInput.addEventListener('input', updateProfileCard);

// ---------------------------------------------------------
// THIS is the bridge between Auth0 and your Profile Page!
// Auth0 calls this once it confirms you are securely logged in.
// ---------------------------------------------------------
window.renderAuthProfile = function(auth0User) {
    if (!auth0User) return;
    
    // Check if you saved a custom name, otherwise use Auth0's
    const displayName = profilePreferences.displayName || auth0User.name || auth0User.nickname;
    if (headerName) headerName.textContent = displayName;
    if (nameInput) nameInput.value = displayName;
    
    if (bioInput) bioInput.value = profilePreferences.bio || '';
    if (headerBio) headerBio.textContent = profilePreferences.bio || 'Add bio in profile.';
    
    if (document.getElementById('Email')) document.getElementById('Email').value = auth0User.email || '';
    if (authEmail) authEmail.textContent = auth0User.email || 'Signed in with Auth0';

    // Check if you uploaded a custom picture, otherwise use Auth0's
    const picture = profilePreferences.picture || auth0User.picture;
    if (picture && profilePicture) {
        profilePicture.src = picture;
        profilePicture.hidden = false;
    }
    
    updateProfileCard();
};

// Handle saving your edits (like Bio and Custom Picture) locally
if (profileForm) {
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const displayName = nameInput.value.trim();
        if (!displayName) return;

        const saveProfile = () => {
            localStorage.setItem(profileStorageKey, JSON.stringify(profilePreferences));
            alert('Profile saved on this device.');
            updateProfileCard(); 
        };

        profilePreferences.displayName = displayName;
        profilePreferences.bio = bioInput.value.trim();
        
        const pictureFile = pictureInput.files[0];
        if (!pictureFile) return saveProfile();
        
        if (pictureFile.size > 2 * 1024 * 1024) {
            alert('Choose an image smaller than 2 MB.');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            profilePreferences.picture = reader.result;
            if (profilePicture) profilePicture.src = reader.result;
            saveProfile();
        });
        reader.readAsDataURL(pictureFile);
    });
}