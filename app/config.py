import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("LAGUNA_DATA_DIR", BASE_DIR / "data"))
PAYLOAD_PATH = DATA_DIR / "latest_payload.json"
SOURCES_DIR = DATA_DIR / "sources"

APP_NAME = os.getenv("APP_NAME", "BI Laguna")
INGEST_TOKEN = os.getenv("LAGUNA_INGEST_TOKEN", "").strip()
SOURCE_URL = os.getenv("LAGUNA_SOURCE_URL", "").strip()

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "LAGUNA_ALLOWED_ORIGINS",
        "https://sites.google.com,https://script.google.com,https://script.googleusercontent.com",
    ).split(",")
    if origin.strip()
]
