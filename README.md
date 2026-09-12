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



