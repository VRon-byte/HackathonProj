import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg

app = FastAPI()

DATABASE_URL = os.getenv("TIGER_DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("TIGER_DATABASE_URL environment variable is not set!")
    return psycopg.connect(DATABASE_URL)

class PinModel(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    label: str = None

@app.post("/pins/")
def create_pin(pin: PinModel):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO pin_drops (user_id, location, label) VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s) RETURNING id;",
                    (pin.user_id, pin.longitude, pin.latitude, pin.label)
                )
                pin_id = cur.fetchone()[0]
                conn.commit()
        return {"pin_id": pin_id, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")