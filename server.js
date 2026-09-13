const fs = require('fs');
require('dotenv').config({ path: fs.existsSync('.env') ? '.env' : 'auth0.env' });

const express = require('express');
const { auth } = require('express-openid-connect');

const app = express();
const port = Number(process.env.PORT) || 5500;

// Keep the public event feed ahead of Auth0's catch-all middleware.
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

async function getEvents(req, res) {
  const zip = String(req.query.zip || '').trim();
  const nationwide = req.query.radius === 'nationwide';
  const radius = nationwide ? 'nationwide' : Math.min(Math.max(Number(req.query.radius) || 25, 1), 500);
  if (!/^\d{5}(?:-\d{4})?$/.test(zip)) return res.status(400).json({ error: 'Enter a valid US ZIP code.' });
  if (!process.env.TICKETMASTER_API_KEY) return res.status(503).json({ error: 'Add TICKETMASTER_API_KEY to auth0.env to enable live events.' });

  const query = new URLSearchParams({
    apikey: process.env.TICKETMASTER_API_KEY,
    countryCode: 'US',
    sort: nationwide ? 'date,asc' : 'distance,asc',
    size: '30',
  });
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
      latitude: Number(event._embedded?.venues?.[0]?.location?.latitude),
      longitude: Number(event._embedded?.venues?.[0]?.location?.longitude),
      image: event.images?.find((image) => image.ratio === '16_9')?.url || event.images?.[0]?.url || '',
    }));
    res.json({ events, radius, zip });
  } catch (error) { res.status(502).json({ error: 'Could not load live events right now.' }); }
}

app.get('/', (req, res) => res.sendFile('dashboard.html', { root: __dirname }));
app.get('/events', (req, res) => res.sendFile('events.html', { root: __dirname }));
app.get('/login.html', (req, res) => res.redirect('/'));
app.get('/profile', (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.redirect('/login?returnTo=/profile');
  return res.sendFile('profile.html', { root: __dirname });
});

app.use(express.static(__dirname));

app.listen(port, '127.0.0.1', () => {
  console.log(`TouchGrass is running at http://127.0.0.1:${port}`);
});

const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 


const pool = new Pool({
  connectionString: 'postgres://tsdbadmin:umcr124i8agy2h1d@p3iqzw86fg.qrjdazel2h.tsdb.cloud.timescale.com:37034/tsdb?sslmode=require'
});


app.post('/api/update-profile', async (req, res) => {
  const { userId, theme, radius } = req.body;
  
  try {
    await pool.query(
      `UPDATE users SET setting_theme = $1, alert_radius_miles = $2 WHERE user_id = $3`,
      [theme, radius, userId]
    );
    res.json({ success: true, message: 'Profile updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));