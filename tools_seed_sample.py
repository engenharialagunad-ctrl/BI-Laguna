import json
from pathlib import Path

from app.config import PAYLOAD_PATH, SOURCES_DIR
from app.storage import write_json
from app.transform import aggregate_payloads, normalize_payload

ROOT = Path(__file__).resolve().parent
sample = ROOT / "sample_payload.json"

payload = json.loads(sample.read_text(encoding="utf-8"))
normalized = normalize_payload(payload)
source_path = SOURCES_DIR / f"{normalized['source']['key']}.json"
write_json(source_path, normalized)
write_json(PAYLOAD_PATH, aggregate_payloads([normalized]))
print(f"Payload de exemplo gravado em {source_path}")
