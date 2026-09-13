"""Small API used by the event map."""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import get_db

app = FastAPI(title="Event Locator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/events/nearby")
def nearby_events(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, gt=0, le=100),
    category: str | None = None,
) -> list[dict]:
    with get_db() as db:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, description, category, venue_name,
                       venue_address, latitude, longitude, starts_at
                FROM events
                WHERE 6371 * 2 * asin(sqrt(
                    power(sin(radians(latitude - %s) / 2), 2) +
                    cos(radians(%s)) * cos(radians(latitude)) *
                    power(sin(radians(longitude - %s) / 2), 2)
                )) <= %s
                  AND (%s IS NULL OR category = %s)
                ORDER BY starts_at NULLS LAST
                """,
                (latitude, latitude, longitude, radius_km, category, category),
            )
            rows = cursor.fetchall()

    return [event_dict(row) for row in rows]