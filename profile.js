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

const toggle2faBtn = document.getElementById('toggle-2fa-btn');
const setup2faDiv = document.getElementById('2fa-setup');

if (toggle2faBtn && setup2faDiv) {
    toggle2faBtn.addEventListener('click', () => {
        const isHidden = setup2faDiv.style.display === 'none';
        setup2faDiv.style.display = isHidden ? 'block' : 'none';
        toggle2faBtn.textContent = isHidden ? 'Cancel Setup' : 'Enable';
    });
}

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

const signOutBtn = document.querySelector('.sign-out-btn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        window.location.assign('/logout');
    });
}

const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        if (form.id === 'profile-form') return;
        e.preventDefault();
        alert('Form changes saved successfully!');
    });
});

const nameInput = document.getElementById('Name');
const usernameInput = document.getElementById('UserName');
const locationInput = document.getElementById('Location');
const bioInput = document.getElementById('Bio');

const headerName = document.querySelector('.user-name');
const headerMeta = document.querySelector('.user-meta');
const headerBio = document.querySelector('.user-bio');

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


const eventCheckboxes = document.querySelectorAll('.tab-content.Event input[type="checkbox"]');
const eventBadge = document.querySelector('.event-tag');

// Keep profile preferences aligned with the categories used by dashboard.html.
const dashboardEventTypes = [
    ['Music', 'Concerts, open mics, and live performances'],
    ['Markets', 'Community markets and local vendors'],
    ['Museums', 'Exhibits, tours, and cultural collections'],
    ['Sports', 'Pickup games, runs, and workouts'],
    ['Tech', 'Meetups, job fairs, and tech talks'],
    ['Arts', 'Galleries, theater, and creative events'],
    ['Gardens', 'Community gardens and outdoor growing spaces'],
    ['Food', 'Pop-ups, tastings, and food festivals'],
    ['Entertainment', 'Shows, social events, and nightlife']
];

eventCheckboxes.forEach((checkbox, index) => {
    const [category, description] = dashboardEventTypes[index];
    checkbox.name = category.toLowerCase();
    const label = checkbox.closest('label');
    label.querySelector('strong').textContent = category;
    label.querySelector('small').textContent = description;
});

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

updateEventCount();

const editBtn = document.querySelector('.edit-btn');
if (editBtn) {
    editBtn.addEventListener('click', () => {
        alert('Edit mode enabled! You can now change your personal info.');
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

// TouchGrass profile preferences are local to this browser. Auth0 identity data
// is read from the server-side session and is never edited in the browser.
const profileForm = document.getElementById('profile-form');
const pictureInput = document.getElementById('ProfilePicture');
const profilePicture = document.getElementById('profile-picture');
const authEmail = document.getElementById('auth-email');
const profileStorageKey = 'touchgrass-profile';
const profilePreferences = JSON.parse(localStorage.getItem(profileStorageKey) || '{}');
let auth0User = null;

function renderAuthProfile() {
    if (!auth0User) return;
    const displayName = profilePreferences.displayName || 'Set your display name';
    if (headerName) headerName.textContent = displayName;
    if (nameInput) nameInput.value = profilePreferences.displayName || '';
    if (bioInput) bioInput.value = profilePreferences.bio || '';
    if (headerBio) headerBio.textContent = profilePreferences.bio || 'Add bio in profile.';
    if (document.getElementById('Email')) document.getElementById('Email').value = auth0User.email || '';
    if (authEmail) authEmail.textContent = auth0User.email || 'Signed in with Auth0';

    const picture = profilePreferences.picture || auth0User.picture;
    if (picture && profilePicture) {
        profilePicture.src = picture;
        profilePicture.hidden = false;
    }
}

if (profileForm) {
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const displayName = nameInput.value.trim();
        if (!displayName) return;

        const saveProfile = () => {
            localStorage.setItem(profileStorageKey, JSON.stringify(profilePreferences));
            renderAuthProfile();
            alert('Profile saved on this device.');
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
            saveProfile();
        });
        reader.readAsDataURL(pictureFile);
    });
}

fetch('/api/me')
    .then((response) => {
        if (!response.ok) throw new Error('Not authenticated');
        return response.json();
    })
    .then(({ user }) => {
        auth0User = user;
        renderAuthProfile();
    })
    .catch(() => window.location.assign('/login?returnTo=/profile'));

document.querySelectorAll('input[name="radius"]').forEach(radio => {
    radio.addEventListener('change', async (event) => {
        
        const updateData = {
            userId: 1, // Hardcoded user for testing
            radius: event.target.value,
            theme: document.querySelector('.settings-select').value
        };

        const response = await fetch('http://localhost:3000/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        console.log('Saved to Tiger Data!', await response.json());
    });
});