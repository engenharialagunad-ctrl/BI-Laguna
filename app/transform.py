import re
import unicodedata
from typing import Any, Dict, List, Tuple

from app.storage import utc_now_iso


def to_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return 0.0
    text = str(value).strip().replace(" ", "")
    comma_index = text.rfind(",")
    dot_index = text.rfind(".")

    if comma_index != -1 and dot_index != -1:
        text = text.replace(".", "").replace(",", ".") if comma_index > dot_index else text.replace(",", "")
    elif comma_index != -1:
        text = text.replace(".", "").replace(",", ".")
    elif dot_index != -1:
        decimals = len(text) - dot_index - 1
        if decimals == 3 and dot_index > 0:
            text = text.replace(".", "")

    try:
        return float(text)
    except ValueError:
        return 0.0


def chart_item(label: str, value: Any, **extra: Any) -> Dict[str, Any]:
    item = {"label": label or "-", "value": to_number(value)}
    item.update(extra)
    return item


def mm_to_meters(value: Any) -> float:
    return round(to_number(value) / 1000, 2)


def minutes_to_hours(value: Any) -> float:
    return round(to_number(value) / 60, 2)


def key_text(value: Any) -> str:
    text = str(value or "-").strip().lower()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", " ", text)
    return text or "-"


def add_number(target: Dict[str, Any], field: str, value: Any, digits: int = 2) -> None:
    target[field] = round(to_number(target.get(field)) + to_number(value), digits)


def enrich_metric_units(row: Dict[str, Any]) -> Dict[str, Any]:
    enriched = dict(row)
    if "totalLength" in enriched:
        enriched.setdefault("totalLengthMeters", mm_to_meters(enriched.get("totalLength")))
    if "length" in enriched:
        enriched.setdefault("lengthMeters", mm_to_meters(enriched.get("length")))
    if "totalTimeMinutes" in enriched:
        enriched.setdefault("totalTimeHours", minutes_to_hours(enriched.get("totalTimeMinutes")))
    if "timeMinutes" in enriched:
        enriched.setdefault("timeHours", minutes_to_hours(enriched.get("timeMinutes")))
    if "timeTaken" in enriched:
        enriched.setdefault("timeHours", minutes_to_hours(enriched.get("timeTaken")))
    return enriched


def slugify(value: Any) -> str:
    text = str(value or "origem").strip().lower()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "origem"


def get_source_metadata(payload: Dict[str, Any]) -> Dict[str, str]:
    spreadsheet = payload.get("spreadsheet") or {}
    source = payload.get("source") or {}
    category = (
        payload.get("category")
        or payload.get("sourceCategory")
        or source.get("category")
        or "Geral"
    )
    source_id = (
        source.get("id")
        or source.get("sourceId")
        or spreadsheet.get("id")
        or source.get("name")
        or spreadsheet.get("name")
        or category
    )
    source_name = source.get("name") or spreadsheet.get("name") or str(source_id)
    source_type = source.get("type") or "google_sheets"
    source_key = slugify(f"{category}-{source_id}")

    return {
        "key": source_key,
        "id": str(source_id),
        "name": str(source_name),
        "category": str(category),
        "type": str(source_type),
        "spreadsheetId": str(source.get("spreadsheetId") or spreadsheet.get("id") or ""),
        "spreadsheetUrl": str(source.get("spreadsheetUrl") or spreadsheet.get("url") or ""),
    }


def with_source(row: Dict[str, Any], source: Dict[str, str]) -> Dict[str, Any]:
    enriched = dict(row)
    enriched.setdefault("sourceKey", source["key"])
    enriched.setdefault("sourceId", source["id"])
    enriched.setdefault("sourceName", source["name"])
    enriched.setdefault("sourceCategory", source["category"])
    return enriched


def build_charts(data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    indicators = data.get("indicators", {}) or {}
    cut_counts = data.get("cutTypeCounts", {}) or {}

    return {
        "kpis": [
            chart_item("Categorias", indicators.get("totalCategories")),
            chart_item("Origens", indicators.get("totalSources")),
            chart_item("Clientes", indicators.get("totalClients")),
            chart_item("Processos", indicators.get("totalProcesses")),
            chart_item("Cortes", indicators.get("totalCuts")),
            chart_item("Comprimento Total (m)", indicators.get("totalLengthMeters") or mm_to_meters(indicators.get("totalLength"))),
            chart_item("Barras", indicators.get("totalBars")),
            chart_item("Tempo Total (h)", indicators.get("totalTimeHours") or minutes_to_hours(indicators.get("totalTimeMinutes"))),
        ],
        "cutDistribution": [
            chart_item(label, value) for label, value in cut_counts.items()
        ],
        "clientTime": [
            chart_item(
                item.get("clientLabel") or item.get("client", "-"),
                item.get("totalTimeHours") or minutes_to_hours(item.get("totalTimeMinutes")),
                cuts=to_number(item.get("totalCuts")),
                bars=to_number(item.get("totalBars")),
                sourceCategory=item.get("sourceCategory", "-"),
                sourceName=item.get("sourceName", "-"),
            )
            for item in data.get("clientSummary", []) or []
        ],
        "processTime": [
            chart_item(
                item.get("processLabel") or f"{item.get('client', '-')} | {item.get('process', '-')}",
                item.get("timeHours") or minutes_to_hours(item.get("timeMinutes")),
                client=item.get("client", "-"),
                process=item.get("process", "-"),
                sourceCategory=item.get("sourceCategory", "-"),
                sourceName=item.get("sourceName", "-"),
                cuts=to_number(item.get("totalCuts")),
                bars=to_number(item.get("totalBars")),
            )
            for item in data.get("clientProcessSummary", []) or []
        ],
        "profileBars": [
            chart_item(
                item.get("profile", "-"),
                item.get("totalBars"),
                length=to_number(item.get("totalLengthMeters") or mm_to_meters(item.get("totalLength"))),
            )
            for item in data.get("profileBarUsage", []) or []
        ],
        "dailyCuts": [
            chart_item(
                item.get("date", "-"),
                item.get("totalCuts"),
                timeHours=to_number(item.get("timeHours") or minutes_to_hours(item.get("timeTaken"))),
            )
            for item in data.get("dailySummary", []) or []
        ],
        "operatorTime": [
            chart_item(
                item.get("operator", "-"),
                item.get("timeHours") or minutes_to_hours(item.get("timeMinutes")),
                cuts=to_number(item.get("totalCuts")),
            )
            for item in data.get("operatorSummary", []) or []
        ],
    }


def normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    source = get_source_metadata(payload)
    if "data" in payload:
        data = payload.get("data") or {}
        normalized = dict(payload)
    else:
        data = payload
        normalized = {
            "ok": True,
            "app": "BI Laguna",
            "data": data,
        }

    normalized["ok"] = bool(normalized.get("ok", True))
    normalized["receivedAt"] = utc_now_iso()
    normalized.setdefault("generatedAt", normalized["receivedAt"])
    normalized.setdefault("app", "BI Laguna")
    normalized["payloadType"] = "source"
    normalized["category"] = source["category"]
    normalized["source"] = source
    normalized["data"] = data
    normalized["charts"] = payload.get("charts") or build_charts(data)
    return normalized


def aggregate_payloads(payloads: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not payloads:
        return {
            "ok": False,
            "app": "BI Laguna",
            "payloadType": "combined",
            "generatedAt": utc_now_iso(),
            "message": "Nenhuma origem recebida ainda.",
            "sources": [],
            "categories": [],
            "data": None,
            "charts": {},
        }

    combined_data: Dict[str, Any] = {
        "indicators": {
            "totalCuts": 0,
            "totalLength": 0,
            "totalLengthMeters": 0,
            "totalBars": 0,
            "totalTimeMinutes": 0,
            "totalTimeHours": 0,
            "totalClients": 0,
            "totalProcesses": 0,
            "totalSources": 0,
            "totalCategories": 0,
        },
        "cutTypeCounts": {},
        "dailySummary": [],
        "profileBarUsage": [],
        "dailyProfileUsage": [],
        "clientProcessSummary": [],
        "clientSummary": [],
        "operatorSummary": [],
    }

    sources: List[Dict[str, str]] = []
    categories = set()
    clients = set()
    processes = set()
    client_summaries: Dict[Tuple[str, str], Dict[str, Any]] = {}
    process_summaries: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    client_process_sets: Dict[Tuple[str, str], set[str]] = {}

    for payload in payloads:
        source = payload.get("source") or get_source_metadata(payload)
        data = payload.get("data") or {}
        indicators = data.get("indicators") or {}

        sources.append(source)
        categories.add(source.get("category", "Geral"))
        combined_data["indicators"]["totalCuts"] += to_number(indicators.get("totalCuts"))
        combined_data["indicators"]["totalLength"] += to_number(indicators.get("totalLength"))
        combined_data["indicators"]["totalLengthMeters"] += to_number(
            indicators.get("totalLengthMeters") or mm_to_meters(indicators.get("totalLength"))
        )
        combined_data["indicators"]["totalBars"] += to_number(indicators.get("totalBars"))
        combined_data["indicators"]["totalTimeMinutes"] += to_number(indicators.get("totalTimeMinutes"))
        combined_data["indicators"]["totalTimeHours"] += to_number(
            indicators.get("totalTimeHours") or minutes_to_hours(indicators.get("totalTimeMinutes"))
        )

        for cut_type, value in (data.get("cutTypeCounts") or {}).items():
            combined_data["cutTypeCounts"][cut_type] = combined_data["cutTypeCounts"].get(cut_type, 0) + to_number(value)

        for row in data.get("clientSummary", []) or []:
            enriched = enrich_metric_units(with_source(row, source))
            category_name = source.get("category", "Geral")
            client_name = row.get("client", "-")
            client_key = (key_text(category_name), key_text(client_name))
            clients.add(key_text(client_name))

            if client_key not in client_summaries:
                client_summaries[client_key] = {
                    **enriched,
                    "client": client_name,
                    "clientLabel": f"{category_name} | {client_name}",
                    "processes": 0,
                    "totalCuts": 0,
                    "totalLength": 0,
                    "totalLengthMeters": 0,
                    "totalBars": 0,
                    "totalTimeMinutes": 0,
                    "totalTimeHours": 0,
                }
            target = client_summaries[client_key]
            add_number(target, "totalCuts", enriched.get("totalCuts"), 0)
            add_number(target, "totalLength", enriched.get("totalLength"))
            add_number(target, "totalLengthMeters", enriched.get("totalLengthMeters"))
            add_number(target, "totalBars", enriched.get("totalBars"))
            add_number(target, "totalTimeMinutes", enriched.get("totalTimeMinutes"))
            add_number(target, "totalTimeHours", enriched.get("totalTimeHours"))

        for row in data.get("clientProcessSummary", []) or []:
            enriched = enrich_metric_units(with_source(row, source))
            category_name = source.get("category", "Geral")
            client_name = row.get("client", "-")
            process_name = row.get("process", "-")
            client_key = (key_text(category_name), key_text(client_name))
            process_key = (key_text(category_name), key_text(client_name), key_text(process_name))
            clients.add(key_text(client_name))
            processes.add((key_text(category_name), key_text(process_name)))
            client_process_sets.setdefault(client_key, set()).add(key_text(process_name))

            if process_key not in process_summaries:
                process_summaries[process_key] = {
                    **enriched,
                    "client": client_name,
                    "process": process_name,
                    "processLabel": f"{category_name} | {client_name} | {process_name}",
                    "totalCuts": 0,
                    "cuts2Retos": 0,
                    "cuts1Reto1Angulo": 0,
                    "cuts2Angulos": 0,
                    "totalLength": 0,
                    "totalLengthMeters": 0,
                    "totalBars": 0,
                    "timeMinutes": 0,
                    "timeHours": 0,
                }
            target = process_summaries[process_key]
            for field in ["totalCuts", "cuts2Retos", "cuts1Reto1Angulo", "cuts2Angulos"]:
                add_number(target, field, enriched.get(field), 0)
            for field in ["totalLength", "totalLengthMeters", "totalBars", "timeMinutes", "timeHours"]:
                add_number(target, field, enriched.get(field))
            if enriched.get("firstCut") and (not target.get("firstCut") or str(enriched.get("firstCut")) < str(target.get("firstCut"))):
                target["firstCut"] = enriched.get("firstCut")
            if enriched.get("lastCut") and (not target.get("lastCut") or str(enriched.get("lastCut")) > str(target.get("lastCut"))):
                target["lastCut"] = enriched.get("lastCut")

        for key in ["dailySummary", "profileBarUsage", "dailyProfileUsage", "operatorSummary"]:
            for row in data.get(key, []) or []:
                enriched = enrich_metric_units(with_source(row, source))
                combined_data[key].append(enriched)

    for key, processes_for_client in client_process_sets.items():
        if key in client_summaries:
            client_summaries[key]["processes"] = len(processes_for_client)

    combined_data["clientSummary"] = sorted(
        client_summaries.values(),
        key=lambda item: (str(item.get("sourceCategory", "")), str(item.get("client", ""))),
    )
    combined_data["clientProcessSummary"] = sorted(
        process_summaries.values(),
        key=lambda item: (str(item.get("sourceCategory", "")), str(item.get("client", "")), str(item.get("process", ""))),
    )

    combined_data["indicators"]["totalClients"] = len(clients)
    combined_data["indicators"]["totalProcesses"] = len(processes)
    combined_data["indicators"]["totalSources"] = len(sources)
    combined_data["indicators"]["totalCategories"] = len(categories)
    combined_data["indicators"]["totalLength"] = round(combined_data["indicators"]["totalLength"], 2)
    combined_data["indicators"]["totalLengthMeters"] = round(combined_data["indicators"]["totalLengthMeters"], 2)
    combined_data["indicators"]["totalBars"] = round(combined_data["indicators"]["totalBars"], 2)
    combined_data["indicators"]["totalTimeMinutes"] = round(combined_data["indicators"]["totalTimeMinutes"], 2)
    combined_data["indicators"]["totalTimeHours"] = round(combined_data["indicators"]["totalTimeHours"], 2)

    generated_at = max((payload.get("generatedAt") or payload.get("receivedAt") or "") for payload in payloads)
    return {
        "ok": True,
        "app": "BI Laguna",
        "payloadType": "combined",
        "generatedAt": generated_at or utc_now_iso(),
        "receivedAt": utc_now_iso(),
        "sources": sorted(sources, key=lambda item: (item.get("category", ""), item.get("name", ""))),
        "categories": sorted(categories),
        "data": combined_data,
        "charts": build_charts(combined_data),
    }
