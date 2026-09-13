# TouchtheGrass
## For devs:

(This is rough just use it as a reference)
project-root/
|## Frontend
- Single-page dashboard for the app
- Leaflet map with OpenStreetMap tiles
- Event cards and sidebar
- Profile and preferences area
- Auth0 login/sign-in controls

## Backend

- FastAPI service for API endpoints
- PostgreSQL + PostGIS for events and locations
- Auth0 token validation for protected routes

## Folder Structure

```text
project-root/
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── .env
├── migrations/
│   └── database_changes/


## Email notifications

The profile Alerts tab now saves event categories, alert toggles, ZIP code, and radius through the Node server. When email alerts and nearby events are enabled, the server checks Ticketmaster every 15 minutes and sends new matches through Resend.

Add these values to `.env` or `auth0.env` without committing the API key:

```text
RESEND_API_KEY=re_xxxxxxxxx
NOTIFICATION_FROM_EMAIL=TouchGrass <alerts@your-verified-domain.com>
```

The sender domain must be verified in Resend. Start the app with `npm start`; preferences are stored in the ignored `.data/` directory.

## GitHub Pages

The static frontend is available at `https://vron-byte.github.io/HackathonProj/`. On GitHub Pages, live event searches use the Ticketmaster browser endpoint because Pages cannot run the Node server. The Node server is still required for saved server preferences and email notifications.



