const fs = require('fs');
require('dotenv').config({ path: fs.existsSync('.env') ? '.env' : 'auth0.env' });

const express = require('express');
const { auth } = require('express-openid-connect');

const app = express();
const port = Number(process.env.PORT) || 5500;

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

app.get('/', (req, res) => res.sendFile('dashboard.html', { root: __dirname }));
app.get('/login.html', (req, res) => res.redirect('/'));
app.get('/profile', (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.redirect('/login?returnTo=/profile');
  return res.json(req.oidc.user);
});

app.use(express.static(__dirname));

app.listen(port, '127.0.0.1', () => {
  console.log(`TouchGrass is running at http://127.0.0.1:${port}`);
});
