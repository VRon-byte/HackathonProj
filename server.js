const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: fs.existsSync('.env') ? '.env' : 'auth0.env' });

const express = require('express');
const { auth } = require('express-openid-connect');

const app = express();
const port = Number(process.env.PORT) || 5500;
const dataDirectory = path.join(__dirname, '.data');
const preferencesFile = path.join(dataDirectory, 'notification-preferences.json');

app.use(express.json());

function readPreferences() {
  try {
    return JSON.parse(fs.readFileSync(preferencesFile, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writePreferences(preferences) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(preferencesFile, JSON.stringify(preferences, null, 2));
}

function normalizePreferences(input, email) {
  return {
    email,
    location: String(input.location || '').trim(),
    zip: String(input.zip || '').trim(),
    radius: Math.min(Math.max(Number(input.radius) || 5, 1), 25),
    categories: Array.isArray(input.categories) ? input.categories.map(String).slice(0, 20) : [],
    emailAlert: Boolean(input.emailAlert),
    newEventsNearby: Boolean(input.newEventsNearby),
    eventReminders: Boolean(input.eventReminders),
    sentEventIds: Array.isArray(input.sentEventIds) ? input.sentEventIds.slice(-100) : [],
  };
}

app.get('/api/events', getEvents);

app.use(auth({
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
}));

app.get('/signup', (req, res) => res.oidc.login({
  returnTo: '/',
  authorizationParams: { screen_hint: 'signup' },
}));

app.get('/api/me', (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.status(401).json({ authenticated: false });
  return res.json({ authenticated: true, user: req.oidc.user });
});

app.get('/api/profile/preferences', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const preferences = readPreferences();
  return res.json({ ...(preferences[email] || normalizePreferences({}, email)), configured: Boolean(preferences[email]) });
});

app.put('/api/profile/preferences', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (req.body.emailAlert && !process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email notifications require RESEND_API_KEY on the server.' });
  }
  const preferences = readPreferences();
  preferences[email] = normalizePreferences(req.body, email);
  writePreferences(preferences);
  return res.json({ success: true, preferences: preferences[email] });
});

async function getEvents(req, res) {
  const zip = String(req.query.zip || '').trim();
  const nationwide = req.query.radius === 'nationwide';
  const radius = nationwide ? 'nationwide' : Math.min(Math.max(Number(req.query.radius) || 25, 1), 500);
  if (!/^\d{5}(?:-\d{4})?$/.test(zip)) return res.status(400).json({ error: 'Enter a valid US ZIP code.' });
  if (!process.env.TICKETMASTER_API_KEY) return res.status(503).json({ error: 'Add TICKETMASTER_API_KEY to auth0.env to enable live events.' });

  const query = new URLSearchParams({ apikey: process.env.TICKETMASTER_API_KEY, countryCode: 'US', sort: nationwide ? 'date,asc' : 'distance,asc', size: '30' });
  if (!nationwide) {
    query.set('postalCode', zip);
    query.set('radius', String(radius));
    query.set('unit', 'miles');
  }
  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`);
    if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
    const data = await response.json();
    const events = (data._embedded?.events || []).map((event) => ({
      id: event.id, name: event.name, url: event.url, date: event.dates?.start?.localDate || 'Date TBA',
      time: event.dates?.start?.localTime || '', distance: event.distance,
      venue: event._embedded?.venues?.[0]?.name || 'Venue TBA',
      city: event._embedded?.venues?.[0]?.city?.name || '', state: event._embedded?.venues?.[0]?.state?.stateCode || '',
      category: event.classifications?.[0]?.segment?.name || 'Live event',
      latitude: Number(event._embedded?.venues?.[0]?.location?.latitude), longitude: Number(event._embedded?.venues?.[0]?.location?.longitude),
      image: event.images?.find((image) => image.ratio === '16_9')?.url || event.images?.[0]?.url || '',
    }));
    res.json({ events, radius, zip });
  } catch (error) {
    res.status(502).json({ error: 'Could not load live events right now.' });
  }
}

async function fetchPersonalizedEvents(preference) {
  if (!process.env.TICKETMASTER_API_KEY || !preference.zip) return [];
  const query = new URLSearchParams({ apikey: process.env.TICKETMASTER_API_KEY, countryCode: 'US', postalCode: preference.zip, radius: String(preference.radius), unit: 'miles', sort: 'date,asc', size: '20' });
  const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`);
  if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
  const data = await response.json();
  return (data._embedded?.events || []).filter((event) => {
    if (!preference.categories.length) return true;
    const segment = event.classifications?.[0]?.segment?.name || '';
    return preference.categories.some((category) => segment.toLowerCase().includes(category.toLowerCase()));
  });
}

async function sendDigest(preference, events) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL || !events.length) return;
  const items = events.map((event) => `<li><a href="${event.url}">${event.name}</a> - ${event.dates?.start?.localDate || 'Date TBA'}</li>`).join('');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.NOTIFICATION_FROM_EMAIL, to: [preference.email], subject: 'New events near you', html: `<p>Here are new events within ${preference.radius} miles of ${preference.zip}:</p><ul>${items}</ul>` }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

async function runNotificationJobs() {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL) return;
  const preferences = readPreferences();
  let changed = false;
  for (const [email, preference] of Object.entries(preferences)) {
    if (!preference.emailAlert || !preference.newEventsNearby || !preference.zip) continue;
    try {
      const events = await fetchPersonalizedEvents(preference);
      const newEvents = events.filter((event) => !preference.sentEventIds.includes(event.id));
      await sendDigest(preference, newEvents);
      preference.sentEventIds = [...preference.sentEventIds, ...newEvents.map((event) => event.id)].slice(-100);
      preferences[email] = preference;
      changed = true;
    } catch (error) {
      console.error(`Notification job failed for ${email}:`, error.message);
    }
  }
  if (changed) writePreferences(preferences);
}

app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname }));
app.get('/events', (req, res) => res.sendFile('events.html', { root: __dirname }));
app.get('/login.html', (req, res) => res.redirect('/'));
app.get('/profile', (req, res) => res.sendFile('profile.html', { root: __dirname }));
app.use(express.static(__dirname));

app.listen(port, '127.0.0.1', () => {
  console.log(`TouchGrass is running at http://127.0.0.1:${port}`);
  runNotificationJobs();
  setInterval(runNotificationJobs, 15 * 60 * 1000);
});
