# TouchtheGrass
## For devs:

(This is rough just use it as a reference for functionalities)
project-root/
|
├── frontend/
|   ├── 
|   |   └──- Dashboard
|   |       - Map
|   |       - Event pins
|   |       - Event sidebar
|   |       - Filters
|   |       - Event details
|   |       - Event chat area
|   |       - Profile section
|   |       - Preferences section
|   |       - Liked events
|   |       - Notifications
|   |       - Auth0 login and signup controls
|   |
|   ├── app.js
|   |   └── [All frontend JavaScript behavior]
|   |       - Auth0 browser integration
|   |       - Login and logout actions
|   |       - Auth0 access-token handling
|   |       - FastAPI requests
|   |       - Leaflet map initialization
|   |       - OpenStreetMap tile display
|   |       - Event pin creation
|   |       - Map movement and radius filtering
|   |       - Event list and sidebar updates
|   |       - Event detail display
|   |       - Likes and attendance
|   |       - Profile updates
|   |       - Topic filters
|   |       - Notification display
|   |       - Basic chat requests
|   |       - Optional live chat WebSocket connection
|   |
|   └── styles.css
|       └── [All frontend styling]
|           - Page layout
|           - Sidebar
|           - Map area
|           - Event cards
|           - Profile sections
|           - Chat area
|           - Buttons
|           - Responsive behavior
|
├── backend/
|   |
|   ├── requirements.txt
|   |   └── [Python package list]
|   |       - FastAPI
|   |       - Uvicorn
|   |       - Auth0
|   |       - SQLAlchemy
|   |       - PostgreSQL driver
|   |       - GeoAlchemy
|   |       - Alembic
|   |       - Leaflet
|   |       - OpenStreetMap tiles
|   |       - HTTP client for external APIs
|   |
|   ├── app/
|   |   |
|   |   ├── main.py
|   |   |   └──  [FastAPI application and API routes]
|       |       - Starts the FastAPI application
|       |       - Registers middleware
|       |       - Configures frontend access
|       |       - Defines user/profile routes
|       |       - Defines event routes
|       |       - Defines nearby-event routes
|       |       - Defines topic routes
|       |       - Defines like routes
|       |       - Defines attendance routes
|       |       - Defines notification routes
|       |       - Defines chat-history routes
|       |       - Defines optional chat WebSocket route
|   |   |
|   |   ├── config.py
|   |   |   └── [Environment and application settings]
|   |   |       - Auth0 domain
|   |   |       - Auth0 audience
|   |   |       - Database connection
|   |   |       - External API keys
|   |   |       - frontend origin settings
|   |   |
|   |   ├── database.py
|   |   |   └── [PostgreSQL connection]
|   |   |       - Connects Python to PostgreSQL
|       |       - Provides database sessions
|       |       - Supports PostGIS queries
|   |   ├── auth.py
|   |   |   └── [Auth0 authentication protection]
|   |   |       - Validates Auth0 access tokens
|   |   |       - Identifies the current user
|   |   |       - Protects private endpoints
|   |   |       - Does not store Auth0 passwords
|   |   |
|   |   ├── models.py
|   |   |   └── [Database models]
|   |   |         - Users
|       |       - Profiles
|       |       - Preferences
|       |       - Events
|       |       - Venues
|       |       - Topics
|       |       - Likes
|       |       - Attendance
|       |       - Chat messages
|       |       - Notifications
|   |   |
|   |   ├── schemas.py
|   |   |   └── [Request and response definitions]
|   |   |       - Event input and output
|   |   |       - Profile input and output
|   |   |       - Map search parameters
|   |   |       - Topic data
|   |   |       - Chat messages
|   |   |       - Notification
|   |
|   └── migrations/
|       └── [Database structure changes]
|           - Creates database tables
|           - Adds geographic indexes
|           - Updates tables safely
|
└── .env
    └── [Private local configuration]
        - Database connection information
        - Auth0 settings
        - External API keys
        - Never commit this file
