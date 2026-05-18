import json
import urllib.request
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import ALLOWED_ORIGINS, APP_NAME, BASE_DIR, INGEST_TOKEN, PAYLOAD_PATH, SOURCE_URL, SOURCES_DIR
from app.storage import read_json, read_json_files, utc_now_iso, write_json
from app.transform import aggregate_payloads, normalize_payload


app = FastAPI(title=APP_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")


def require_ingest_token(authorization: str | None, x_laguna_token: str | None) -> None:
    if not INGEST_TOKEN:
        return
    bearer = ""
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()
    received = x_laguna_token or bearer
    if received != INGEST_TOKEN:
        raise HTTPException(status_code=401, detail="Token invalido para ingestao.")


def empty_payload() -> Dict[str, Any]:
    return {
        "ok": False,
        "app": APP_NAME,
        "generatedAt": utc_now_iso(),
        "message": "Nenhum payload recebido ainda. Envie dados para POST /api/ingest ou configure LAGUNA_SOURCE_URL e chame /api/sync.",
        "sources": [],
        "categories": [],
        "data": None,
        "charts": {},
    }


def source_path(source_key: str) -> Any:
    return SOURCES_DIR / f"{source_key}.json"


def all_source_payloads() -> list[Dict[str, Any]]:
    payloads = read_json_files(SOURCES_DIR)
    if payloads:
        return payloads

    legacy_payload = read_json(PAYLOAD_PATH)
    if legacy_payload and legacy_payload.get("payloadType") != "combined":
        return [legacy_payload]
    return []


def filtered_payloads(source: str | None = None, category: str | None = None) -> list[Dict[str, Any]]:
    source_filter = (source or "").strip().lower()
    category_filter = (category or "").strip().lower()
    payloads = []

    for payload in all_source_payloads():
        metadata = payload.get("source") or {}
        source_values = {
            str(metadata.get("key", "")).lower(),
            str(metadata.get("id", "")).lower(),
            str(metadata.get("name", "")).lower(),
        }
        category_value = str(metadata.get("category", "")).lower()
        if source_filter and source_filter not in source_values:
            continue
        if category_filter and category_filter != category_value:
            continue
        payloads.append(payload)

    return payloads


def rebuild_combined_payload() -> Dict[str, Any]:
    combined = aggregate_payloads(all_source_payloads())
    write_json(PAYLOAD_PATH, combined)
    return combined


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("dashboard.html", {"request": request, "app_name": APP_NAME, "embed": False})


@app.get("/embed", response_class=HTMLResponse)
def embed_dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("dashboard.html", {"request": request, "app_name": APP_NAME, "embed": True})


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "app": APP_NAME, "generatedAt": utc_now_iso()}


@app.get("/api/data")
def get_data(
    source: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> JSONResponse:
    payloads = filtered_payloads(source=source, category=category)
    if payloads:
        payload = aggregate_payloads(payloads)
    elif source or category:
        payload = aggregate_payloads([])
    else:
        payload = read_json(PAYLOAD_PATH) or aggregate_payloads(all_source_payloads()) or empty_payload()
    return JSONResponse(payload)


@app.get("/api/sources")
def get_sources() -> Dict[str, Any]:
    payloads = all_source_payloads()
    sources = [payload.get("source") for payload in payloads if payload.get("source")]
    categories = sorted({source.get("category", "Geral") for source in sources})
    return {
        "ok": True,
        "app": APP_NAME,
        "generatedAt": utc_now_iso(),
        "sources": sources,
        "categories": categories,
    }


@app.post("/api/ingest")
async def ingest(
    request: Request,
    authorization: str | None = Header(default=None),
    x_laguna_token: str | None = Header(default=None),
) -> Dict[str, Any]:
    require_ingest_token(authorization, x_laguna_token)
    payload = await request.json()
    normalized = normalize_payload(payload)
    write_json(source_path(normalized["source"]["key"]), normalized)
    rebuild_combined_payload()
    return {
        "ok": True,
        "message": "Dados recebidos pelo BI Laguna.",
        "source": normalized["source"],
        "receivedAt": normalized["receivedAt"],
    }


@app.post("/api/sync")
def sync_from_source(
    authorization: str | None = Header(default=None),
    x_laguna_token: str | None = Header(default=None),
) -> Dict[str, Any]:
    require_ingest_token(authorization, x_laguna_token)
    if not SOURCE_URL:
        raise HTTPException(status_code=400, detail="Configure LAGUNA_SOURCE_URL para sincronizar via pull.")

    with urllib.request.urlopen(SOURCE_URL, timeout=30) as response:
        raw = response.read().decode("utf-8")
    normalized = normalize_payload(json.loads(raw))
    write_json(source_path(normalized["source"]["key"]), normalized)
    rebuild_combined_payload()
    return {
        "ok": True,
        "message": "Dados sincronizados da origem configurada.",
        "source": normalized["source"],
        "receivedAt": normalized["receivedAt"],
    }
