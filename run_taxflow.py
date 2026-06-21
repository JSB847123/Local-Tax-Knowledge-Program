from __future__ import annotations

import argparse
import json
import mimetypes
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlencode, urljoin, urlparse
from xml.etree import ElementTree as ET

from legal_query_parser import DEFAULT_SEARCH_FIELDS, parse_legal_query_to_elasticsearch_dsl


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "taxflow-data.json"
SETTINGS_FILE = DATA_DIR / "runtime-settings.json"
HOST = "127.0.0.1"
LAW_BASE_URL = "https://www.law.go.kr"
LAW_SEARCH_URL = "http://www.law.go.kr/DRF/lawSearch.do"
LAW_TIMEOUT_SECONDS = 10


class TaxFlowHandler(BaseHTTPRequestHandler):
    server_version = "TaxFlowLocal/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True, "dataFile": str(DATA_FILE)})
            return
        if parsed.path == "/api/data":
            self.handle_get_data()
            return
        if parsed.path == "/api/settings":
            self.handle_get_settings()
            return
        if parsed.path == "/api/legal-search":
            self.handle_legal_search(parsed.query)
            return
        if parsed.path == "/api/legal-query-dsl":
            self.handle_legal_query_dsl(parsed.query)
            return
        self.serve_static(parsed.path)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/data":
            self.handle_put_data()
            return
        if parsed.path == "/api/settings":
            self.handle_put_settings()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        # Allow clients that cannot issue PUT to save through POST.
        parsed = urlparse(self.path)
        if parsed.path == "/api/data":
            self.handle_put_data()
            return
        if parsed.path == "/api/settings":
            self.handle_put_settings()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def handle_get_data(self) -> None:
        if not DATA_FILE.exists():
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()
            return

        try:
            payload = DATA_FILE.read_text(encoding="utf-8")
            json.loads(payload)
        except (OSError, json.JSONDecodeError):
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Saved data is not readable JSON")
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload.encode("utf-8"))

    def handle_put_data(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid content length")
            return

        if length <= 0:
            self.send_error(HTTPStatus.BAD_REQUEST, "Empty request body")
            return

        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(HTTPStatus.BAD_REQUEST, "Request body must be JSON")
            return

        if not isinstance(data, dict):
            self.send_error(HTTPStatus.BAD_REQUEST, "Saved data must be a JSON object")
            return

        DATA_DIR.mkdir(exist_ok=True)
        tmp_file = DATA_FILE.with_suffix(".json.tmp")
        tmp_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp_file, DATA_FILE)
        self.send_json({"ok": True})

    def handle_get_settings(self) -> None:
        self.send_json(build_settings_status())

    def handle_put_settings(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid content length")
            return

        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(HTTPStatus.BAD_REQUEST, "Request body must be JSON")
            return

        if not isinstance(data, dict):
            self.send_error(HTTPStatus.BAD_REQUEST, "Settings must be a JSON object")
            return

        settings = read_runtime_settings()
        law_oc = str(data.get("law_oc") or data.get("LAW_OC") or "").strip()
        if law_oc:
            settings["LAW_OC"] = law_oc
        else:
            settings.pop("LAW_OC", None)
        write_runtime_settings(settings)
        self.send_json({"ok": True, "settings": build_settings_status()})

    def handle_legal_search(self, query_string: str) -> None:
        params = parse_qs(query_string)
        query = (params.get("q") or [""])[0].strip()
        source_type = (params.get("type") or ["전체"])[0].strip() or "전체"
        try:
            max_results = max(1, min(int((params.get("max") or ["5"])[0]), 20))
        except ValueError:
            max_results = 5

        law_oc = read_runtime_settings().get("LAW_OC", "").strip()
        if not query:
            self.send_json({"results": [], "configured": bool(law_oc), "message": "검색어를 입력하세요."})
            return
        if not law_oc:
            self.send_json({
                "results": [],
                "configured": False,
                "message": "LAW_OC가 설정되지 않아 공식 검색 링크 후보만 표시합니다.",
            })
            return

        try:
            results, used_queries = search_law_documents(law_oc, query, source_type, max_results)
            if results and used_queries and used_queries[0] != query:
                message = f"입력한 검색어 그대로는 0건이라 API 검색어 '{', '.join(used_queries[:3])}'로 확장한 결과입니다."
            elif results:
                message = "국가법령정보 검색 결과입니다."
            else:
                variants = build_query_variants(query)
                suffix = f" 추천 검색어: {', '.join(variants[:3])}" if variants else ""
                message = f"국가법령정보 API가 '{query}' 검색어로는 0건을 반환했습니다.{suffix}"
            self.send_json({
                "results": results,
                "configured": True,
                "message": message,
                "usedQueries": used_queries,
            })
        except Exception as exc:
            self.send_json({
                "results": [],
                "configured": True,
                "message": f"국가법령정보 검색 실패: {exc}",
            })

    def handle_legal_query_dsl(self, query_string: str) -> None:
        params = parse_qs(query_string)
        query = (params.get("q") or [""])[0].strip()
        fields = parse_es_fields(params)
        parsed = parse_legal_query_to_elasticsearch_dsl(query, fields=fields)
        self.send_json(parsed.to_dict())

    def serve_static(self, raw_path: str) -> None:
        path = unquote(raw_path.split("?", 1)[0]).lstrip("/")
        if not path:
            path = "index.html"

        target = (ROOT / path).resolve()
        if ROOT not in target.parents and target != ROOT:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return
        if target.is_dir():
            target = target / "index.html"
        if not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_type, _ = mimetypes.guess_type(str(target))
        if target.suffix == ".js":
            content_type = "text/javascript"
        if target.suffix == ".css":
            content_type = "text/css"
        content_type = content_type or "application/octet-stream"

        try:
            payload = target.read_bytes()
        except OSError:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Could not read file")
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(payload)

    def send_json(self, data: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def pick_port(preferred: int) -> int:
    for port in range(preferred, preferred + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind((HOST, port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"No available local port from {preferred} to {preferred + 49}")


def read_runtime_settings() -> dict[str, str]:
    if not SETTINGS_FILE.exists():
        return {}
    try:
        raw = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    return {str(key): str(value).strip() for key, value in raw.items() if str(value).strip()}


def write_runtime_settings(settings: dict[str, str]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    cleaned = {key: value for key, value in settings.items() if value}
    if not cleaned:
        if SETTINGS_FILE.exists():
            SETTINGS_FILE.unlink()
        return
    tmp_file = SETTINGS_FILE.with_suffix(".json.tmp")
    tmp_file.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp_file, SETTINGS_FILE)


def build_settings_status() -> dict[str, object]:
    settings = read_runtime_settings()
    law_oc = settings.get("LAW_OC", "")
    return {
        "law_oc": {
            "configured": bool(law_oc),
            "source": "file" if law_oc else "missing",
            "saved": bool(law_oc),
        },
        "settingsFile": str(SETTINGS_FILE),
    }


def parse_es_fields(params: dict[str, list[str]]) -> tuple[str, ...]:
    raw_values = params.get("fields") or []
    fields: list[str] = []
    for raw_value in raw_values:
        for field in raw_value.split(","):
            cleaned = field.strip()
            if cleaned:
                fields.append(cleaned)
    return tuple(fields) or DEFAULT_SEARCH_FIELDS


def search_law_documents(law_oc: str, query: str, source_type: str, max_results: int) -> tuple[list[dict[str, str]], list[str]]:
    targets = legal_targets_for_type(source_type)
    max_total = max(1, max_results * max(1, len(targets)))
    per_target = max(1, max_results)
    results: list[dict[str, str]] = []
    used_queries: list[str] = []

    original_results = search_law_targets(law_oc, query, targets, per_target)
    if original_results:
        return dedupe_law_results(original_results)[:max_total], [query]

    for variant in build_query_variants(query):
        variant_results = search_law_targets(law_oc, variant, targets, min(per_target, 10))
        if not variant_results:
            continue
        used_queries.append(variant)
        for result in variant_results:
            result["matchedQuery"] = variant
            results.append(result)
        results = dedupe_law_results(results)
        if len(results) >= max_total:
            break

    return results[:max_total], used_queries


def search_law_targets(law_oc: str, query: str, targets: list[str], per_target: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for target in targets:
        results.extend(search_law_target(law_oc, query, target, per_target))
    return results


def build_query_variants(query: str) -> list[str]:
    cleaned = clean_text(query)
    if not cleaned:
        return []

    variants: list[str] = []

    def add(value: str) -> None:
        value = clean_text(value)
        if value and value != cleaned and value not in variants:
            variants.append(value)

    if "사업소분" in cleaned:
        add(cleaned.replace("사업소분", "재산분"))
        add(cleaned.replace("사업소분", "사업소세 재산할"))
        if "주민세" in cleaned and "면적" in cleaned:
            add("주민세 재산분 면적")
            add("사업소 연면적")
            add("사업소용 건축물 연면적")
        elif "면적" in cleaned or "연면적" in cleaned:
            add("사업소 연면적")
            add("사업소용 건축물 연면적")
        add("주민세 재산분")

    if "종업원분" in cleaned:
        add(cleaned.replace("종업원분", "종업원할"))
    if "개인분" in cleaned:
        add(cleaned.replace("개인분", "균등분"))

    tokens = [token for token in cleaned.split() if len(token) > 1]
    for index in range(len(tokens) - 1):
        add(f"{tokens[index]} {tokens[index + 1]}")
    for token in tokens:
        add(token)

    return variants[:8]


def dedupe_law_results(results: list[dict[str, str]]) -> list[dict[str, str]]:
    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for result in results:
        key = result.get("officialUrl") or "|".join([
            result.get("type", ""),
            result.get("documentNumber", ""),
            result.get("title", ""),
        ])
        if key in seen:
            continue
        deduped.append(result)
        seen.add(key)
    return deduped


def legal_targets_for_type(source_type: str) -> list[str]:
    if source_type == "판례":
        return ["prec"]
    if source_type in {"법령", "시행령", "조례"}:
        return ["law"]
    if source_type == "행정해석":
        return ["expc"]
    if source_type == "조세심판":
        return ["ttSpecialDecc", "expc"]
    if source_type == "감사원":
        return ["expc"]
    return ["law", "prec", "expc", "ttSpecialDecc"]


def search_law_target(law_oc: str, query: str, target: str, max_results: int) -> list[dict[str, str]]:
    params = {
        "OC": law_oc,
        "target": target,
        "type": "XML",
        "query": query,
        "display": str(max_results),
    }
    root = request_law_xml(params)
    if root is None:
        return []
    error_message = law_api_error_message(root)
    if error_message:
        raise RuntimeError(error_message)

    signatures = {
        "law": ["법령일련번호", "법령명한글", "법령명_한글", "법령ID"],
        "prec": ["판례일련번호", "판례정보일련번호", "사건명", "사건번호"],
        "expc": ["법령해석례일련번호", "안건명", "안건번호"],
        "ttSpecialDecc": ["특별행정심판재결례일련번호", "사건명", "청구번호"],
    }
    nodes = find_record_nodes(root, signatures.get(target, []))
    mapped = [map_law_record(node, target) for node in nodes]
    return [item for item in mapped if item.get("title")][:max_results]


def request_law_xml(params: dict[str, str]) -> ET.Element | None:
    url = f"{LAW_SEARCH_URL}?{urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": "TaxFlowLocal/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=LAW_TIMEOUT_SECONDS) as response:
            raw = response.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RuntimeError(str(exc)) from exc
    try:
        return ET.fromstring(raw)
    except ET.ParseError as exc:
        raise RuntimeError("응답 XML을 해석할 수 없습니다.") from exc


def map_law_record(node: ET.Element, target: str) -> dict[str, str]:
    if target == "law":
        title = find_text(node, ["법령명한글", "법령명_한글"])
        mst = find_text(node, ["법령일련번호", "MST"])
        law_id = find_text(node, ["법령ID"])
        effective_date = format_date(find_text(node, ["시행일자"]))
        promulgation_date = format_date(find_text(node, ["공포일자"]))
        ministry = find_text(node, ["소관부처명", "소관부처"])
        detail_link = normalize_detail_link(find_text(node, ["법령상세링크"]))
        return {
            "id": f"law-{mst or law_id or title}",
            "type": "법령",
            "title": title or "법령",
            "sourceName": "국가법령정보센터",
            "officialUrl": detail_link or f"{LAW_BASE_URL}/LSW/lsInfoP.do?lsiSeq={mst}",
            "sourceDate": effective_date or promulgation_date,
            "documentNumber": law_id or mst,
            "summary": " / ".join(part for part in [ministry, f"시행 {effective_date}" if effective_date else ""] if part),
        }
    if target == "prec":
        title = find_text(node, ["사건명"])
        case_no = find_text(node, ["사건번호"])
        court_name = find_text(node, ["법원명"])
        decision_date = format_date(find_text(node, ["선고일자"]))
        serial_no = find_text(node, ["판례일련번호", "판례정보일련번호"])
        detail_link = normalize_detail_link(find_text(node, ["판례상세링크"]))
        return {
            "id": f"prec-{serial_no or case_no or title}",
            "type": "판례",
            "title": title or case_no or "판례",
            "sourceName": court_name or "국가법령정보센터",
            "officialUrl": detail_link or (f"{LAW_BASE_URL}/LSW/precInfoP.do?precSeq={serial_no}" if serial_no else ""),
            "sourceDate": decision_date,
            "documentNumber": case_no or serial_no,
            "summary": " / ".join(part for part in [court_name, case_no, decision_date] if part),
        }
    if target == "ttSpecialDecc":
        title = find_text(node, ["사건명"])
        case_no = find_text(node, ["청구번호"])
        agency = find_text(node, ["처분청"])
        tribunal = find_text(node, ["재결청"])
        decision_date = format_date(find_text(node, ["의결일자"]))
        serial_no = find_text(node, ["특별행정심판재결례일련번호"])
        detail_link = normalize_detail_link(find_text(node, ["행정심판재결례상세링크"]))
        return {
            "id": f"tribunal-{serial_no or case_no or title}",
            "type": "조세심판",
            "title": title or case_no or "심판 결정례",
            "sourceName": tribunal or agency or "국가법령정보센터",
            "officialUrl": detail_link,
            "sourceDate": decision_date,
            "documentNumber": case_no or serial_no,
            "summary": " / ".join(part for part in [agency, tribunal, decision_date] if part),
        }

    title = find_text(node, ["안건명"])
    case_no = find_text(node, ["안건번호"])
    agency = find_text(node, ["회신기관명"])
    query_agency = find_text(node, ["질의기관명"])
    reply_date = format_date(find_text(node, ["회신일자"]))
    serial_no = find_text(node, ["법령해석례일련번호"])
    detail_link = normalize_detail_link(find_text(node, ["법령해석례상세링크"]))
    return {
        "id": f"expc-{serial_no or case_no or title}",
        "type": "행정해석",
        "title": title or case_no or "법령해석례",
        "sourceName": agency or "국가법령정보센터",
        "officialUrl": detail_link,
        "sourceDate": reply_date,
        "documentNumber": case_no or serial_no,
        "summary": " / ".join(part for part in [agency, query_agency, reply_date] if part),
    }


def law_api_error_message(root: ET.Element) -> str:
    if strip_namespace(root.tag) != "Response":
        return ""
    result = find_text(root, ["result"])
    message = find_text(root, ["msg"])
    if result or message:
        return message or result
    return ""


def find_record_nodes(root: ET.Element, signature_tags: list[str]) -> list[ET.Element]:
    if not signature_tags:
        return []
    direct = [child for child in list(root) if has_record_signature(child, signature_tags)]
    if direct:
        return direct
    matches: list[ET.Element] = []
    seen: set[int] = set()
    for node in root.iter():
        if node is root or not has_record_signature(node, signature_tags):
            continue
        node_id = id(node)
        if node_id not in seen:
            matches.append(node)
            seen.add(node_id)
    return matches


def has_record_signature(node: ET.Element, signature_tags: list[str]) -> bool:
    child_tags = {strip_namespace(child.tag) for child in list(node)}
    return any(tag in child_tags for tag in signature_tags)


def find_text(node: ET.Element, candidates: list[str]) -> str:
    for candidate in candidates:
        for element in node.iter():
            if strip_namespace(element.tag) == candidate:
                value = clean_text("".join(element.itertext()))
                if value:
                    return value
    return ""


def strip_namespace(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def clean_text(value: str | None) -> str:
    return " ".join((value or "").split())


def normalize_detail_link(url: str) -> str:
    link = (url or "").strip()
    if not link:
        return ""
    if link.startswith(("http://", "https://")):
        return link
    if link.startswith("/"):
        return urljoin(LAW_BASE_URL, link)
    return urljoin(f"{LAW_BASE_URL}/", link)


def format_date(value: str) -> str:
    raw = clean_text(value)
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def open_browser_later(url: str) -> None:
    time.sleep(0.7)
    webbrowser.open(url)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Tax-Flow local program.")
    parser.add_argument("--port", type=int, default=8765, help="Preferred local port")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser automatically")
    args = parser.parse_args()

    port = pick_port(args.port)
    server = ThreadingHTTPServer((HOST, port), TaxFlowHandler)
    url = f"http://{HOST}:{port}/"

    print("Tax-Flow local program is running.")
    print(f"URL: {url}")
    print(f"Data file: {DATA_FILE}")
    print("Press Ctrl+C to stop.")

    if not args.no_browser:
        threading.Thread(target=open_browser_later, args=(url,), daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Tax-Flow.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
