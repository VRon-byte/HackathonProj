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
const notificationZipInput = document.getElementById('NotificationZip');
const bioInput = document.getElementById('Bio');
const headerName = document.querySelector('.user-name');
const headerMeta = document.querySelector('.user-meta');
const headerBio = document.querySelector('.user-bio');

// Load any custom changes you made locally
const profileStorageKey = 'touchgrass-profile';
const profilePreferences = JSON.parse(localStorage.getItem(profileStorageKey) || '{}');
let authenticatedEmail = '';

const notificationInputs = document.querySelectorAll('.tab-content.Event input[type="checkbox"], .tab-content.Alert input[type="checkbox"]');
const radiusInputs = document.querySelectorAll('.tab-content.Alert input[name="radius"]');
const categoryMap = {
    bikerides: 'Sports',
    parties: 'Miscellaneous',
    livemusic: 'Music',
    foodanddrink: 'Miscellaneous',
    sportsandfitness: 'Sports',
    artsandculture: 'Arts',
    techandnetworking: 'Miscellaneous',
    outdoorandnature: 'Sports',
    familyfriendly: 'Miscellaneous',
};

function collectNotificationPreferences() {
    return {
        email: authenticatedEmail || document.getElementById('Email')?.value || '',
        location: locationInput?.value || '',
        zip: notificationZipInput?.value || '',
        radius: document.querySelector('.tab-content.Alert input[name="radius"]:checked')?.value || '5',
        categories: [...eventCheckboxes].filter((input) => input.checked).map((input) => categoryMap[input.name] || input.name),
        emailAlert: document.querySelector('input[name="emailalert"]')?.checked || false,
        newEventsNearby: document.querySelector('input[name="neweventsnearby"]')?.checked || false,
        eventReminders: document.querySelector('input[name="eventreminders"]')?.checked || false,
    };
}

function applyNotificationPreferences(preferences) {
    if (!preferences) return;
    if (notificationZipInput) notificationZipInput.value = preferences.zip || '';
    eventCheckboxes.forEach((input) => { input.checked = preferences.categories?.includes(categoryMap[input.name] || input.name) || false; });
    document.querySelector('input[name="emailalert"]').checked = Boolean(preferences.emailAlert);
    document.querySelector('input[name="neweventsnearby"]').checked = preferences.newEventsNearby !== false;
    document.querySelector('input[name="eventreminders"]').checked = preferences.eventReminders !== false;
    radiusInputs.forEach((input) => { input.checked = input.value === String(preferences.radius || 5); });
    updateEventCount();
}

async function saveNotificationPreferences() {
    const preferences = collectNotificationPreferences();
    if (!authenticatedEmail) return;
    try {
        const response = await fetch('/api/profile/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save notification preferences.');
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function loadNotificationPreferences() {
    if (!authenticatedEmail) return;
    try {
        const response = await fetch(`/api/profile/preferences?email=${encodeURIComponent(authenticatedEmail)}`);
        if (response.ok) {
            const preferences = await response.json();
            if (preferences.configured) applyNotificationPreferences(preferences);
        }
    } catch (error) {
        console.error('Could not load notification preferences.', error);
    }
}

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
    authenticatedEmail = auth0User.email || '';
    
    // 1. Load saved text into the input boxes FIRST
    if (nameInput) nameInput.value = profilePreferences.displayName || auth0User.name || auth0User.nickname || '';
    if (usernameInput) usernameInput.value = profilePreferences.username || auth0User.nickname || '';
    if (locationInput) locationInput.value = profilePreferences.location || '';
    if (bioInput) bioInput.value = profilePreferences.bio || '';
    if (document.getElementById('Email')) document.getElementById('Email').value = auth0User.email || '';
    
    // 2. Load Auth0 Email text
    if (authEmail) authEmail.textContent = auth0User.email || 'Signed in with Auth0';

    // 3. Load Picture
    const picture = profilePreferences.picture || auth0User.picture;
    if (picture && profilePicture) {
        profilePicture.src = picture;
        profilePicture.hidden = false;
    }
    
    // 4. Push those loaded text box values up to the Header!
    updateProfileCard();
    loadNotificationPreferences();
};

notificationInputs.forEach((input) => input.addEventListener('change', saveNotificationPreferences));
radiusInputs.forEach((input) => input.addEventListener('change', saveNotificationPreferences));
notificationZipInput?.addEventListener('change', saveNotificationPreferences);

// Handle saving your edits (like Bio and Custom Picture) locally
if (profileForm) {
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // Save ALL fields to local storage memory
        profilePreferences.displayName = nameInput.value.trim();
        profilePreferences.username = usernameInput.value.trim();
        profilePreferences.location = locationInput.value.trim();
        profilePreferences.bio = bioInput.value.trim();

        const saveProfile = () => {
            localStorage.setItem(profileStorageKey, JSON.stringify(profilePreferences));
            saveNotificationPreferences();
            alert('Profile and notification preferences saved.');
            updateProfileCard(); 
        };
        
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