"""Minimal API for the existing event-locator UI.

Only the requested application features are included:
  - Auth0-protected user profile and preferences
  - Events and nearby-map searches
  - Topics/hashtags
  - Likes and attendance
  - Event chat history and a simple live WebSocket broadcast
  - In-app notifications

The frontend can call these endpoints from its existing JavaScript.  The
response shapes are intentionally small; adjust them to match the UI where
the `UI CONNECTION POINT` comments appear.
"""

from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime
import json
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg import Connection

from app.auth import current_user, token_subject, validate_token
from app.config import settings
from app.db import get_db


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    email: str | None = None
    preferences: dict[str, Any] | None = None


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    venue_name: str | None = None
    venue_address: str | None = None
    latitude: float
    longitude: float
    starts_at: datetime | None = None
    topics: list[str] = Field(default_factory=list)


class ChatMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Application startup/shutdown hook.

    Database tables are created by running schema.sql separately.  Keeping
    migrations outside startup avoids silently changing production databases.
    """
    yield


app = FastAPI(title="Event Locator API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory connections are sufficient for a single-process prototype.
# A multi-process deployment would need a shared pub/sub service.
chat_connections: dict[int, set[WebSocket]] = defaultdict(set)


def event_exists(event_id: int, db: Connection) -> None:
    with db.cursor() as cursor:
        cursor.execute("SELECT 1 FROM events WHERE id = %s", (event_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Event not found")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/me")
def get_profile(user: dict = Depends(current_user)) -> dict:
    # UI CONNECTION POINT: render this object in the profile page.
    return user


@app.patch("/api/me")
def update_profile(
    changes: ProfileUpdate,
    user: dict = Depends(current_user),
    db: Connection = Depends(get_db),
) -> dict[str, str]:
    # UI CONNECTION POINT: send only fields the user changed.
    with db.cursor() as cursor:
        cursor.execute(
            """
            UPDATE users
            SET display_name = COALESCE(%s, display_name),
                email = COALESCE(%s, email),
                preferences = COALESCE(%s::jsonb, preferences)
            WHERE id = %s
            """,
            (
                changes.display_name,
                changes.email,
                None if changes.preferences is None else json.dumps(changes.preferences),
                user["id"],
            ),
        )
    db.commit()
    return {"status": "updated"}


@app.get("/api/events")
def list_events(
    category: str | None = None,
    topic: str | None = None,
    db: Connection = Depends(get_db),
) -> list[dict]:
    """Return events for the sidebar and map.

    The optional topic filter is implemented with SQL joins.  The frontend
    supplies category/topic query parameters from its filter controls.
    """
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT e.id, e.title, e.description, e.category,
                   e.venue_name, e.venue_address, e.latitude, e.longitude,
                   e.starts_at
            FROM events e
            LEFT JOIN event_topics et ON et.event_id = e.id
            LEFT JOIN topics t ON t.id = et.topic_id
            WHERE (%s IS NULL OR e.category = %s)
              AND (%s IS NULL OR t.name = lower(%s))
            ORDER BY e.starts_at NULLS LAST, e.id
            """,
            (category, category, topic, topic),
        )
        rows = cursor.fetchall()
    return [event_dict(row) for row in rows]


@app.get("/api/events/nearby")
def nearby_events(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, gt=0, le=100),
    db: Connection = Depends(get_db),
) -> list[dict]:
    """Find events within a radius using SQL, without PostGIS.

    The Haversine expression calculates kilometers on PostgreSQL.  This keeps
    the dependency list small.  PostGIS can replace this query later if the
    dataset becomes large.
    """
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, description, category, venue_name, venue_address,
                   latitude, longitude, starts_at
            FROM events
            WHERE 6371 * 2 * asin(sqrt(
                power(sin(radians(latitude - %s) / 2), 2) +
                cos(radians(%s)) * cos(radians(latitude)) *
                power(sin(radians(longitude - %s) / 2), 2)
            )) <= %s
            ORDER BY starts_at NULLS LAST
            """,
            (latitude, latitude, longitude, radius_km),
        )
        rows = cursor.fetchall()
    return [event_dict(row) for row in rows]


@app.get("/api/events/{event_id}")
def event_detail(event_id: int, db: Connection = Depends(get_db)) -> dict:
    """Return one event for the event-details view."""
    with db.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, description, category, venue_name, venue_address,
                   latitude, longitude, starts_at
            FROM events
            WHERE id = %s
            """,
            (event_id,),
        )
        row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_dict(row)


def event_dict(row: tuple) -> dict:
    """Convert one SQL row to the JSON shape consumed by the UI."""
    return {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "category": row[3],
        "venue_name": row[4],
        "venue_address": row[5],
        "latitude": row[6],
        "longitude": row[7],
        "starts_at": row[8],
    }


@app.post("/api/events")
def create_event(
    event: EventCreate,
    _: dict = Depends(current_user),
    db: Connection = Depends(get_db),
) -> dict:
    """Create a manually entered event; no external event API is used."""
    with db.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO events
              (title, description, category, venue_name, venue_address,
               latitude, longitude, starts_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, title, description, category, venue_name,
                      venue_address, latitude, longitude, starts_at
            """,
            (
                event.title, event.description, event.category, event.venue_name,
                event.venue_address, event.latitude, event.longitude, event.starts_at,
            ),
        )
        row = cursor.fetchone()
        for raw_topic in event.topics:
            name = raw_topic.lstrip("#").strip().lower()
            if name:
                cursor.execute("INSERT INTO topics (name) VALUES (%s) ON CONFLICT DO NOTHING", (name,))
                cursor.execute("SELECT id FROM topics WHERE name = %s", (name,))
                topic_id = cursor.fetchone()[0]
                cursor.execute(
                    "INSERT INTO event_topics (event_id, topic_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (row[0], topic_id),
                )
    db.commit()
    return event_dict(row)


@app.get("/api/topics")
def list_topics(db: Connection = Depends(get_db)) -> list[dict]:
    with db.cursor() as cursor:
        cursor.execute("SELECT id, name FROM topics ORDER BY name")
        return [{"id": row[0], "name": row[1]} for row in cursor.fetchall()]


@app.post("/api/events/{event_id}/like")
def like_event(event_id: int, user: dict = Depends(current_user), db: Connection = Depends(get_db)) -> dict[str, str]:
    event_exists(event_id, db)
    with db.cursor() as cursor:
        cursor.execute(
            "INSERT INTO event_likes (user_id, event_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user["id"], event_id),
        )
    db.commit()
    return {"status": "liked"}


@app.delete("/api/events/{event_id}/like")
def unlike_event(event_id: int, user: dict = Depends(current_user), db: Connection = Depends(get_db)) -> dict[str, str]:
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM event_likes WHERE user_id = %s AND event_id = %s", (user["id"], event_id))
    db.commit()
    return {"status": "unliked"}


@app.post("/api/events/{event_id}/attend")
def attend_event(event_id: int, user: dict = Depends(current_user), db: Connection = Depends(get_db)) -> dict[str, str]:
    event_exists(event_id, db)
    with db.cursor() as cursor:
        cursor.execute(
            "INSERT INTO event_attendance (user_id, event_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user["id"], event_id),
        )
    db.commit()
    return {"status": "attending"}


@app.delete("/api/events/{event_id}/attend")
def stop_attending(event_id: int, user: dict = Depends(current_user), db: Connection = Depends(get_db)) -> dict[str, str]:
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM event_attendance WHERE user_id = %s AND event_id = %s", (user["id"], event_id))
    db.commit()
    return {"status": "not_attending"}


@app.get("/api/notifications")
def notifications(user: dict = Depends(current_user), db: Connection = Depends(get_db)) -> list[dict]:
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT id, message, read_at, created_at FROM notifications "
            "WHERE user_id = %s ORDER BY created_at DESC",
            (user["id"],),
        )
        return [
            {"id": row[0], "message": row[1], "read_at": row[2], "created_at": row[3]}
            for row in cursor.fetchall()
        ]


@app.get("/api/events/{event_id}/chat")
def chat_history(event_id: int, db: Connection = Depends(get_db)) -> list[dict]:
    event_exists(event_id, db)
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT id, user_id, message, created_at FROM chat_messages "
            "WHERE event_id = %s ORDER BY created_at",
            (event_id,),
        )
        return [
            {"id": row[0], "user_id": row[1], "message": row[2], "created_at": row[3]}
            for row in cursor.fetchall()
        ]


@app.post("/api/events/{event_id}/chat")
def send_chat_message(
    event_id: int,
    body: ChatMessageCreate,
    user: dict = Depends(current_user),
    db: Connection = Depends(get_db),
) -> dict:
    event_exists(event_id, db)
    with db.cursor() as cursor:
        cursor.execute(
            "INSERT INTO chat_messages (event_id, user_id, message) VALUES (%s, %s, %s) "
            "RETURNING id, user_id, message, created_at",
            (event_id, user["id"], body.message.strip()),
        )
        row = cursor.fetchone()
    db.commit()
    return {"id": row[0], "user_id": row[1], "message": row[2], "created_at": row[3]}


@app.websocket("/api/events/{event_id}/chat/live")
async def live_chat(websocket: WebSocket, event_id: int, token: str | None = None) -> None:
    """Broadcast chat messages within one backend process.

    UI CONNECTION POINT: connect with the Auth0 token as a query parameter.
    The token is checked before accepting the socket.  Query-string tokens
    are convenient for a prototype; a production app should use a short-lived
    socket token or a carefully designed handshake.
    """
    if not token:
        await websocket.close(code=1008)
        return
    try:
        validate_token(token)
    except ValueError:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    chat_connections[event_id].add(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            for connection in list(chat_connections[event_id]):
                await connection.send_text(message)
    except WebSocketDisconnect:
        chat_connections[event_id].discard(websocket)
