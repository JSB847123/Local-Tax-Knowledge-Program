from __future__ import annotations

import argparse
import json
import mimetypes
import os
import random
import re
import socket
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlparse
from xml.etree import ElementTree as ET

from legal_query_parser import DEFAULT_SEARCH_FIELDS, parse_legal_query_to_elasticsearch_dsl


def bundled_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent)).resolve()
    return Path(__file__).resolve().parent


def writable_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return bundled_root()


ROOT = bundled_root()
DATA_DIR = writable_root() / "data"
DATA_FILE = DATA_DIR / "taxflow-data.json"
SETTINGS_FILE = DATA_DIR / "runtime-settings.json"
HOST = "127.0.0.1"
LAW_BASE_URL = "https://www.law.go.kr"
LAW_SEARCH_URL = "http://www.law.go.kr/DRF/lawSearch.do"
LAW_TIMEOUT_SECONDS = 10
LAW_RETRY_COUNT = 2
LAW_RETRY_DELAY_SECONDS = 0.5
LAW_RETRY_STATUSES = {429, 503, 504}
LAW_USER_AGENT = os.environ.get(
    "LAW_USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
)
LAW_REFERER = os.environ.get("LAW_REFERER", "https://www.law.go.kr/")
AI_TIMEOUT_SECONDS = 45
AI_MAX_CONTEXT_ITEMS = 12
AI_MAX_PROMPT_CHARS = 26000
AI_PROVIDER_CONFIG = {
    "openai": {
        "label": "OpenAI",
        "key": "OPENAI_API_KEY",
        "model_key": "OPENAI_MODEL",
        "default_model": "gpt-4o-mini",
        "models": ["gpt-5.5", "gpt-5.5-pro", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-4o", "gpt-4o-mini"],
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "compatible": True,
    },
    "gemini": {
        "label": "Gemini",
        "key": "GEMINI_API_KEY",
        "model_key": "GEMINI_MODEL",
        "default_model": "gemini-2.5-flash",
        "models": ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
        "compatible": False,
    },
    "deepseek": {
        "label": "DeepSeek",
        "key": "DEEPSEEK_API_KEY",
        "model_key": "DEEPSEEK_MODEL",
        "default_model": "deepseek-v4-flash",
        "models": ["deepseek-v4-pro", "deepseek-v4-flash"],
        "endpoint": "https://api.deepseek.com/chat/completions",
        "compatible": True,
    },
    "zai": {
        "label": "Z.ai",
        "key": "ZAI_API_KEY",
        "model_key": "ZAI_MODEL",
        "default_model": "GLM-4.7-FlashX",
        "models": ["GLM-5.2", "GLM-5.1", "GLM-5-Turbo", "GLM-5", "GLM-4.7", "GLM-4.7-FlashX"],
        "endpoint": "https://api.z.ai/api/paas/v4/chat/completions",
        "compatible": True,
    },
}

BASIC_CHAR_TRANSLATION = str.maketrans({
    "벚": "법",
    "벆": "법",
    "벋": "법",
    "뻡": "법",
    "볍": "법",
    "뱝": "법",
    "셰": "세",
    "쉐": "세",
    "괸": "관",
    "곽": "관",
    "엄": "업",
    "얼": "업",
})

LAW_ALIAS_ENTRIES = [
    {
        "canonical": "지방세법",
        "aliases": ["지세법", "지방세 법"],
        "alternatives": ["지방세법 시행령", "지방세법 시행규칙"],
    },
    {
        "canonical": "지방세기본법",
        "aliases": ["지기법", "지방세 기본법"],
        "alternatives": ["지방세기본법 시행령", "지방세기본법 시행규칙"],
    },
    {
        "canonical": "지방세징수법",
        "aliases": ["지징법", "지방세 징수법"],
        "alternatives": ["지방세징수법 시행령", "지방세징수법 시행규칙"],
    },
    {
        "canonical": "지방세특례제한법",
        "aliases": ["지특법", "지방세특례법", "지방세 특례 제한법", "지방세 특례제한법"],
        "alternatives": ["지방세특례제한법 시행령", "지방세특례제한법 시행규칙"],
    },
    {
        "canonical": "지방세법 시행령",
        "aliases": ["지방세법시행령", "지세법 시행령", "지세령"],
    },
    {
        "canonical": "지방세법 시행규칙",
        "aliases": ["지방세법시행규칙", "지세법 시행규칙", "지세규"],
    },
    {
        "canonical": "지방세특례제한법 시행령",
        "aliases": ["지특법 시행령", "지특령", "지방세특례제한법시행령"],
    },
    {
        "canonical": "지방세특례제한법 시행규칙",
        "aliases": ["지특법 시행규칙", "지특규", "지방세특례제한법시행규칙"],
    },
    {
        "canonical": "국세기본법",
        "aliases": ["국기법"],
    },
    {
        "canonical": "법인세법",
        "aliases": ["법인세 법"],
    },
    {
        "canonical": "소득세법",
        "aliases": ["소득세 법"],
    },
    {
        "canonical": "부가가치세법",
        "aliases": ["부가세법"],
    },
]

LOCAL_TAX_LAW_KEYWORDS = [
    "지방세법",
    "지방세법 시행령",
    "지방세법 시행규칙",
    "지방세기본법",
    "지방세징수법",
    "지방세특례제한법",
    "지방세특례제한법 시행령",
    "지방세특례제한법 시행규칙",
    "취득세",
    "재산세",
    "주민세",
    "지방소득세",
    "등록면허세",
]
TAX_LAW_KEYWORDS = [
    "국세기본법",
    "법인세법",
    "소득세법",
    "부가가치세법",
    "조세특례제한법",
    "세법",
    "조세",
]
LAW_TITLE_HINT_RE = re.compile(r"(법|법률|시행령|시행규칙|규칙|조례|고시|예규|훈령)$")

SEOUL_DISTRICTS = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
    "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
    "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
]
LOCAL_GOVERNMENT_FULL_NAMES = {
    "서울": "서울특별시",
    "부산": "부산광역시",
    "대구": "대구광역시",
    "인천": "인천광역시",
    "광주": "광주광역시",
    "대전": "대전광역시",
    "울산": "울산광역시",
    "세종": "세종특별자치시",
    "경기": "경기도",
    "강원": "강원특별자치도",
    "충북": "충청북도",
    "충남": "충청남도",
    "전북": "전북특별자치도",
    "전남": "전라남도",
    "경북": "경상북도",
    "경남": "경상남도",
    "제주": "제주특별자치도",
}
KEYWORD_EXPANSIONS = {
    "사업소분": ["재산분", "사업소세 재산할", "사업소 연면적", "사업소용 건축물 연면적"],
    "재산분": ["사업소분", "사업소세 재산할"],
    "종업원분": ["종업원할", "종업원 급여총액"],
    "개인분": ["균등분", "주민세 개인균등"],
    "중과": ["중과세", "중과세율"],
    "감면": ["지방세 감면", "감면 추징"],
    "추징": ["감면 추징", "목적 외 사용"],
    "별도합산": ["별도합산과세대상", "건축물 부속토지"],
    "대도시": ["과밀억제권역", "대도시 법인"],
}
PRECEDENT_STOPWORDS = {
    "판례", "판결", "결정", "사례", "관련", "대한", "관한", "찾아줘", "찾아주세요",
    "알려줘", "알려주세요", "검색", "조회", "가능", "가능여부", "여부", "절차", "방법",
}
COURT_CASE_RE = re.compile(
    r"(?:19|20)\d{2}\s*(?:고합|고단|고정|구합|구단|구|누|두|헌가|헌나|헌다|헌라|헌마|헌바|헌사|"
    r"카합|카단|카기|회합|회단|[가나다라마바사아자차카타파하]|고|노|도|모|보|로|초)\s*\d{1,8}",
    re.UNICODE,
)


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
        if parsed.path == "/api/ai-search":
            self.handle_ai_search()
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
        if parsed.path == "/api/ai-search":
            self.handle_ai_search()
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
        if "law_oc" in data or "LAW_OC" in data:
            law_oc = str(data.get("law_oc") or data.get("LAW_OC") or "").strip()
            if law_oc:
                settings["LAW_OC"] = law_oc
            else:
                settings.pop("LAW_OC", None)

        ai_keys = data.get("ai_keys") if isinstance(data.get("ai_keys"), dict) else {}
        ai_models = data.get("ai_models") if isinstance(data.get("ai_models"), dict) else {}
        clear_ai_keys = data.get("clear_ai_keys") if isinstance(data.get("clear_ai_keys"), list) else []
        for provider, config in AI_PROVIDER_CONFIG.items():
            if provider in clear_ai_keys:
                settings.pop(config["key"], None)
            api_key = str(ai_keys.get(provider) or "").strip()
            if api_key:
                settings[config["key"]] = api_key
            if provider in ai_models:
                model = normalize_ai_model(provider, ai_models.get(provider) or "")
                if model:
                    settings[config["model_key"]] = model
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
                variants = build_query_variants(query, source_type)
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

    def handle_ai_search(self) -> None:
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
            self.send_error(HTTPStatus.BAD_REQUEST, "AI request must be a JSON object")
            return

        provider = str(data.get("provider") or "").strip().lower()
        question = str(data.get("question") or "").strip()
        if provider not in AI_PROVIDER_CONFIG:
            self.send_json({"ok": False, "message": "지원하지 않는 AI provider입니다."}, HTTPStatus.BAD_REQUEST)
            return
        if not question:
            self.send_json({"ok": False, "message": "질문을 입력하세요."}, HTTPStatus.BAD_REQUEST)
            return

        settings = read_runtime_settings()
        config = AI_PROVIDER_CONFIG[provider]
        api_key = settings.get(config["key"], "").strip()
        if not api_key:
            self.send_json({"ok": False, "message": f"{config['label']} API key가 설정되지 않았습니다."}, HTTPStatus.BAD_REQUEST)
            return

        model = normalize_ai_model(provider, data.get("model") or settings.get(config["model_key"]) or config["default_model"])
        context_items = data.get("contextItems") if isinstance(data.get("contextItems"), list) else []
        context_items = context_items[:AI_MAX_CONTEXT_ITEMS]
        if not context_items:
            self.send_json({"ok": False, "message": "AI에 전달할 매뉴얼 또는 파일이 없습니다."}, HTTPStatus.BAD_REQUEST)
            return

        tax_item_name = str(data.get("taxItemName") or "").strip()
        try:
            system_prompt, user_prompt = build_ai_prompts(question, context_items, tax_item_name)
            if len(user_prompt) > AI_MAX_PROMPT_CHARS:
                user_prompt = user_prompt[:AI_MAX_PROMPT_CHARS] + "\n\n...[근거 일부 생략]"
            answer = call_ai_provider(provider, api_key, model, system_prompt, user_prompt)
            self.send_json({"ok": True, "answer": answer, "provider": provider, "model": model})
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            self.send_json({"ok": False, "message": f"AI API 오류({exc.code}): {detail}"}, HTTPStatus.BAD_GATEWAY)
        except Exception as exc:
            self.send_json({"ok": False, "message": f"AI 검색 실패: {exc}"}, HTTPStatus.BAD_GATEWAY)

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
    ai_providers = {}
    for provider, config in AI_PROVIDER_CONFIG.items():
        api_key = settings.get(config["key"], "")
        ai_providers[provider] = {
            "configured": bool(api_key),
            "source": "file" if api_key else "missing",
            "saved": bool(api_key),
            "model": normalize_ai_model(provider, settings.get(config["model_key"], config["default_model"])),
        }
    return {
        "law_oc": {
            "configured": bool(law_oc),
            "source": "file" if law_oc else "missing",
            "saved": bool(law_oc),
        },
        "ai": {
            "providers": ai_providers,
        },
        "settingsFile": str(SETTINGS_FILE),
    }


def normalize_ai_model(provider: str, model: object) -> str:
    config = AI_PROVIDER_CONFIG.get(provider, {})
    choices = config.get("models") or []
    requested = str(model or "").strip()
    if requested and requested in choices:
        return requested
    default_model = str(config.get("default_model") or "").strip()
    if default_model in choices:
        return default_model
    return str(choices[0] if choices else default_model or requested)


def build_ai_prompts(question: str, context_items: list[object], tax_item_name: str) -> tuple[str, str]:
    system_prompt = (
        "당신은 지방세 실무 지식베이스의 AI 검색 도우미입니다. "
        "반드시 제공된 매뉴얼과 등록 파일 근거 안에서만 답변하세요. "
        "근거가 부족하면 부족하다고 말하고 추가로 확인할 자료를 제안하세요. "
        "답변은 한국어로, 실무자가 바로 검토할 수 있게 핵심 판단, 근거, 주의사항 순서로 정리하세요. "
        "가능하면 문장 끝에 [M1], [F1] 같은 근거 표시를 붙이세요. "
        "최종 법적 판단은 담당자가 원문과 내부 절차로 확인해야 한다는 점을 유지하세요."
    )
    blocks: list[str] = []
    for item in context_items:
        if not isinstance(item, dict):
            continue
        ref = str(item.get("ref") or "").strip()
        title = str(item.get("title") or "").strip()
        kind_label = str(item.get("kindLabel") or "").strip()
        category = str(item.get("categoryPath") or "").strip()
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        header = " / ".join(part for part in [ref, kind_label, title, category] if part)
        blocks.append(f"### {header}\n{content}")

    context_text = "\n\n".join(blocks)
    tax_line = f"현재 세목: {tax_item_name}\n" if tax_item_name else ""
    user_prompt = (
        f"{tax_line}질문: {question}\n\n"
        "아래 근거만 사용해서 답변하세요.\n\n"
        f"{context_text}"
    )
    return system_prompt, user_prompt


def call_ai_provider(provider: str, api_key: str, model: str, system_prompt: str, user_prompt: str) -> str:
    if provider == "gemini":
        return call_gemini(api_key, model, system_prompt, user_prompt)
    return call_openai_compatible(provider, api_key, model, system_prompt, user_prompt)


def call_openai_compatible(provider: str, api_key: str, model: str, system_prompt: str, user_prompt: str) -> str:
    config = AI_PROVIDER_CONFIG[provider]
    payload = {
        "model": model or config["default_model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        str(config["endpoint"]),
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": LAW_USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=AI_TIMEOUT_SECONDS) as response:
        raw = response.read().decode("utf-8")
    parsed = json.loads(raw)
    try:
        return str(parsed["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("AI 응답 형식을 해석하지 못했습니다.")


def call_gemini(api_key: str, model: str, system_prompt: str, user_prompt: str) -> str:
    selected_model = model or AI_PROVIDER_CONFIG["gemini"]["default_model"]
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(selected_model, safe='')}:generateContent?key={quote(api_key, safe='')}"
    )
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1800,
        },
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": LAW_USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=AI_TIMEOUT_SECONDS) as response:
        raw = response.read().decode("utf-8")
    parsed = json.loads(raw)
    parts = parsed.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    answer = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict)).strip()
    if not answer:
        raise RuntimeError("Gemini 응답 형식을 해석하지 못했습니다.")
    return answer


def parse_es_fields(params: dict[str, list[str]]) -> tuple[str, ...]:
    raw_values = params.get("fields") or []
    fields: list[str] = []
    for raw_value in raw_values:
        for field in raw_value.split(","):
            cleaned = field.strip()
            if cleaned:
                fields.append(cleaned)
    return tuple(fields) or DEFAULT_SEARCH_FIELDS


def normalize_basic_typos(value: str) -> str:
    return (value or "").translate(BASIC_CHAR_TRANSLATION)


def normalize_law_search_text(value: str) -> str:
    text = unicodedata.normalize("NFC", value or "")
    text = re.sub(r"[\u00a0\u2002\u2003\u2009]", " ", text)
    text = re.sub(r"[‐‑‒–—―﹘﹣－]", "-", text)
    text = re.sub(r"[﹦=]", " ", text)
    text = text.replace("§", " 제")
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s*\.\s*", " ", text)
    text = normalize_basic_typos(text)
    text = re.sub(r"([a-zA-Z])([가-힣])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return text.strip()


def normalize_alias_key(value: str) -> str:
    text = normalize_basic_typos(value).lower()
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[·•]", "", text)
    return text


def looks_like_law_title(query: str) -> bool:
    normalized = normalize_law_search_text(query)
    key = normalize_alias_key(normalized)
    if not key:
        return False
    for entry in LAW_ALIAS_ENTRIES:
        candidate_keys = [normalize_alias_key(str(entry["canonical"]))]
        candidate_keys.extend(normalize_alias_key(alias) for alias in entry.get("aliases", []))
        if key in candidate_keys:
            return True
    return bool(LAW_TITLE_HINT_RE.search(normalized))


def resolve_law_alias(law_name: str) -> dict[str, object]:
    normalized_key = normalize_alias_key(law_name)
    for entry in LAW_ALIAS_ENTRIES:
        candidate_keys = [normalize_alias_key(str(entry["canonical"]))]
        candidate_keys.extend(normalize_alias_key(alias) for alias in entry.get("aliases", []))
        if normalized_key in candidate_keys:
            matched_alias = next(
                (alias for alias in entry.get("aliases", []) if normalize_alias_key(alias) == normalized_key),
                None,
            )
            return {
                "canonical": str(entry["canonical"]),
                "matchedAlias": matched_alias,
                "alternatives": list(entry.get("alternatives", [])),
            }
    return {"canonical": normalize_basic_typos(law_name).strip(), "alternatives": []}


def extract_embedded_aliases(query: str) -> list[dict[str, object]]:
    normalized_query = normalize_law_search_text(query)
    normalized_query_key = normalize_alias_key(normalized_query)
    candidates: list[dict[str, object]] = []
    for entry in LAW_ALIAS_ENTRIES:
        for alias in entry.get("aliases", []):
            key = normalize_alias_key(alias)
            if len(key) < 2:
                continue
            candidates.append({
                "alias": alias,
                "canonical": str(entry["canonical"]),
                "alternatives": list(entry.get("alternatives", [])),
                "key": key,
            })
    candidates.sort(key=lambda item: len(str(item["key"])), reverse=True)

    results: list[dict[str, object]] = []
    seen_canonicals: set[str] = set()
    for candidate in candidates:
        alias = str(candidate["alias"])
        canonical = str(candidate["canonical"])
        key = str(candidate["key"])
        if canonical in seen_canonicals:
            continue
        if normalized_query_key == key or key not in normalized_query_key:
            continue

        expanded_query = re.sub(re.escape(alias), canonical, normalized_query)
        if expanded_query == normalized_query:
            alias_parts = [re.escape(part) for part in alias.split() if part]
            if len(alias_parts) >= 2:
                expanded_query = re.sub(r"\s*".join(alias_parts), canonical, normalized_query)
        if expanded_query == normalized_query:
            compact_alias = re.escape(alias.replace(" ", ""))
            expanded_query = re.sub(compact_alias, canonical, normalized_query.replace(" ", ""))
        if expanded_query == normalized_query:
            continue

        seen_canonicals.add(canonical)
        results.append({
            "alias": alias,
            "canonical": canonical,
            "alternatives": list(candidate.get("alternatives", [])),
            "expandedQuery": expanded_query,
        })
    return results


def expand_law_query(query: str) -> list[str]:
    normalized = normalize_law_search_text(query)
    expanded: list[str] = []

    def add(value: str) -> None:
        cleaned = normalize_law_search_text(value)
        if cleaned and cleaned != normalized and cleaned not in expanded:
            expanded.append(cleaned)

    alias_resolution = resolve_law_alias(normalized)
    add(str(alias_resolution["canonical"]))
    for alternative in alias_resolution.get("alternatives", []):
        add(str(alternative))

    for match in extract_embedded_aliases(normalized):
        add(str(match["expandedQuery"]))
        for alternative in match.get("alternatives", []):
            add(str(alternative))

    for keyword, alternatives in KEYWORD_EXPANSIONS.items():
        if keyword.lower() not in normalized.lower():
            continue
        for alternative in alternatives:
            add(re.sub(re.escape(keyword), alternative, normalized, flags=re.IGNORECASE))

    return expanded[:8]


def expand_ordinance_query(query: str) -> list[str]:
    normalized = normalize_law_search_text(query)
    expanded: list[str] = []

    def add(value: str) -> None:
        cleaned = normalize_law_search_text(value)
        if cleaned and cleaned != normalized and cleaned not in expanded:
            expanded.append(cleaned)

    for district in SEOUL_DISTRICTS:
        if district in normalized and "서울" not in normalized:
            add(normalized.replace(district, f"서울특별시 {district}"))
            add(f"서울시 {district} {normalized.replace(district, '').strip()}")

    for short_name, full_name in LOCAL_GOVERNMENT_FULL_NAMES.items():
        if short_name in normalized and full_name not in normalized:
            add(normalized.replace(short_name, full_name))

    if "조례" in normalized:
        add(normalized.replace("조례", "규칙"))

    for match in extract_embedded_aliases(normalized):
        add(str(match["expandedQuery"]))

    return expanded[:5]


def normalize_case_number(value: str) -> str:
    return re.sub(r"\s+", "", normalize_law_search_text(value))


def extract_case_number(value: str) -> str:
    match = COURT_CASE_RE.search(normalize_law_search_text(value))
    return normalize_case_number(match.group(0)) if match else ""


def normalize_precedent_query(query: str) -> str:
    normalized = normalize_law_search_text(query)
    normalized = re.sub(r"<[^>]*>", " ", normalized)
    normalized = COURT_CASE_RE.sub(lambda match: normalize_case_number(match.group(0)), normalized)
    normalized = re.sub(r"(대법원|고등법원|지방법원|가정법원|행정법원|특허법원|법원)", " ", normalized)
    normalized = re.sub(r"(판례|판결|결정례|결정|사례)", " ", normalized)
    normalized = re.sub(r"(찾아주세요|찾아줘|알려주세요|알려줘|검색해주세요|검색해줘|조회해주세요|조회해줘|검색|조회)", " ", normalized)
    normalized = re.sub(r"\s+[을를이가은는]\s+", " ", normalized)
    normalized = re.sub(r"\s+[을를이가은는]$", "", normalized)
    normalized = re.sub(r"\b(관련|대한|관한)\b", " ", normalized)
    return clean_text(normalized)


def normalize_axis_token(token: str) -> str:
    token = re.sub(r"[?？!.,]", "", token)
    token = re.sub(r"(에서|에게|으로|로서|로써|부터|까지|입니다|합니다|했다|한다|해요)$", "", token)
    token = re.sub(r"(되었는지|되었는가|되는지|되는가|인가요|인지요|인가|인지)$", "", token)
    token = re.sub(r"(가|이|은|는|을|를|에|의|와|과)$", "", token)
    token = re.sub(r"된$", "", token)
    return token.strip()


def compact_precedent_queries(query: str, max_count: int = 5) -> list[str]:
    normalized = normalize_precedent_query(query)
    candidates: list[str] = []

    def add(value: str) -> None:
        cleaned = clean_text(value)
        if 2 <= len(cleaned) <= 40 and cleaned not in candidates:
            candidates.append(cleaned)

    case_number = extract_case_number(query)
    if case_number:
        add(case_number)
    add(normalized)

    tokens = [
        normalize_axis_token(token)
        for token in re.sub(r"[^0-9A-Za-z가-힣]+", " ", normalized).split()
    ]
    tokens = [token for token in tokens if len(token) >= 2 and token not in PRECEDENT_STOPWORDS]
    if len(tokens) >= 2:
        add(" ".join(tokens[:3]))
        for index in range(len(tokens) - 1):
            add(f"{tokens[index]} {tokens[index + 1]}")
    for token in tokens:
        add(token)

    return [candidate for candidate in candidates if candidate != normalize_law_search_text(query)][:max_count]


def search_law_documents(law_oc: str, query: str, source_type: str, max_results: int) -> tuple[list[dict[str, str]], list[str]]:
    targets = legal_targets_for_type(source_type)
    max_total = max(1, max_results * max(1, len(targets)))
    per_target = max(1, max_results)
    results: list[dict[str, str]] = []
    used_queries: list[str] = []
    normalized_query = normalize_law_search_text(query)
    query_candidates = [normalized_query]
    for variant in build_query_variants(query, source_type):
        if variant not in query_candidates:
            query_candidates.append(variant)

    for index, candidate in enumerate(query_candidates):
        candidate_results = search_law_targets(law_oc, candidate, targets, per_target if index == 0 else min(per_target, 10))
        if not candidate_results:
            continue
        used_queries.append(candidate)
        for result in candidate_results:
            if candidate != normalized_query:
                result["matchedQuery"] = candidate
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


def build_query_variants(query: str, source_type: str = "전체") -> list[str]:
    cleaned = normalize_law_search_text(query)
    if not cleaned:
        return []

    variants: list[str] = []

    def add(value: str) -> None:
        value = clean_text(value)
        if value and value != cleaned and value not in variants:
            variants.append(value)

    for expanded in expand_law_query(cleaned):
        add(expanded)

    if source_type in {"전체", "조례"}:
        for expanded in expand_ordinance_query(cleaned):
            add(expanded)

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

    if source_type in {"전체", "판례"}:
        for compact in compact_precedent_queries(cleaned):
            add(compact)

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
    if source_type == "조례":
        return ["ordin"]
    if source_type in {"법령", "시행령"}:
        return ["law"]
    if source_type == "행정규칙":
        return ["admrul"]
    if source_type == "행정해석":
        return ["expc"]
    if source_type == "조세심판":
        return ["ttSpecialDecc", "expc"]
    if source_type == "감사원":
        return ["expc"]
    return ["law", "prec", "expc", "ttSpecialDecc", "ordin", "admrul"]


def search_law_target(law_oc: str, query: str, target: str, max_results: int) -> list[dict[str, str]]:
    collected: list[dict[str, str]] = []
    for attempt in target_search_attempts(target, query):
        params = {
            "OC": law_oc,
            "target": target,
            "type": "XML",
            "display": str(max_results),
            **attempt["params"],
        }
        root = request_law_xml(params)
        if root is None:
            continue
        error_message = law_api_error_message(root)
        if error_message:
            raise RuntimeError(error_message)

        signatures = {
            "law": ["법령일련번호", "법령명한글", "법령명_한글", "법령ID"],
            "prec": ["판례일련번호", "판례정보일련번호", "사건명", "사건번호"],
            "expc": ["법령해석례일련번호", "안건명", "안건번호"],
            "ttSpecialDecc": ["특별행정심판재결례일련번호", "사건명", "청구번호"],
            "ordin": ["자치법규일련번호", "자치법규명", "지자체기관명"],
            "admrul": ["행정규칙일련번호", "행정규칙명", "행정규칙ID"],
        }
        nodes = find_record_nodes(root, signatures.get(target, []))
        mapped = [map_law_record(node, target) for node in nodes]
        mapped = [item for item in mapped if item.get("title")]
        if not mapped:
            continue
        sorted_results = sort_law_results(mapped, query, target)
        if attempt["label"] != query:
            for result in sorted_results:
                result["matchedQuery"] = attempt["label"]
        if target != "law":
            return sorted_results[:max_results]
        collected.extend(sorted_results)

    if target == "law" and collected:
        return sort_law_results(dedupe_law_results(collected), query, target)[:max_results]
    return []


def target_search_attempts(target: str, query: str) -> list[dict[str, object]]:
    attempts: list[dict[str, object]] = []
    seen: set[str] = set()

    def add(label: str, params: dict[str, str]) -> None:
        key = json.dumps(params, sort_keys=True, ensure_ascii=False)
        if key in seen:
            return
        seen.add(key)
        attempts.append({"label": label, "params": params})

    if target == "prec":
        case_number = extract_case_number(query)
        if case_number:
            add(case_number, {"nb": case_number})
        add(query, {"query": query})
        add(f"{query} 본문검색", {"query": query, "search": "2"})
        return attempts

    if target == "law":
        title_params = {"query": query}
        body_params = {"query": query, "search": "2"}
        if looks_like_law_title(query):
            add(query, title_params)
            add(f"{query} 본문검색", body_params)
        else:
            add(f"{query} 본문검색", body_params)
            add(query, title_params)
        return attempts

    add(query, {"query": query})
    return attempts


def request_law_xml(params: dict[str, str]) -> ET.Element | None:
    url = f"{LAW_SEARCH_URL}?{urlencode(params)}"
    last_error: Exception | None = None
    for attempt in range(LAW_RETRY_COUNT + 1):
        request = urllib.request.Request(url, headers=law_request_headers(url))
        try:
            with urllib.request.urlopen(request, timeout=LAW_TIMEOUT_SECONDS) as response:
                raw = response.read()
                status = response.getcode()
                if status in LAW_RETRY_STATUSES and attempt < LAW_RETRY_COUNT:
                    sleep_before_law_retry(attempt)
                    continue
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in LAW_RETRY_STATUSES and attempt < LAW_RETRY_COUNT:
                sleep_before_law_retry(attempt)
                continue
            raise RuntimeError(f"국가법령정보 API 오류 {exc.code}: {mask_sensitive_url(url)}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < LAW_RETRY_COUNT:
                sleep_before_law_retry(attempt)
                continue
            raise RuntimeError(mask_sensitive_url(str(exc))) from exc

        bad_body = detect_bad_law_body(raw)
        if bad_body and attempt < LAW_RETRY_COUNT:
            last_error = RuntimeError(f"법제처 API 비정상 응답({bad_body})")
            sleep_before_law_retry(attempt)
            continue
        if bad_body:
            raise RuntimeError(f"국가법령정보 API가 {bad_body} 응답을 반환했습니다. 잠시 후 다시 시도하세요.")

        try:
            return ET.fromstring(raw)
        except ET.ParseError as exc:
            last_error = exc
            if attempt < LAW_RETRY_COUNT:
                sleep_before_law_retry(attempt)
                continue
            raise RuntimeError("응답 XML을 해석할 수 없습니다.") from exc

    if last_error:
        raise RuntimeError(mask_sensitive_url(str(last_error))) from last_error
    return None


def law_request_headers(url: str) -> dict[str, str]:
    headers = {"User-Agent": LAW_USER_AGENT}
    if is_law_go_kr_url(url):
        headers["Referer"] = LAW_REFERER
    return headers


def is_law_go_kr_url(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return False
    return host == "law.go.kr" or host.endswith(".law.go.kr")


def detect_bad_law_body(raw: bytes) -> str:
    text = raw.decode("utf-8", errors="ignore").strip()
    if not text:
        return "빈 본문"
    if re.match(r"^<!doctype html", text, re.IGNORECASE) or re.match(r"^<html[\s>]", text, re.IGNORECASE):
        return "HTML 페이지"
    return ""


def mask_sensitive_url(value: str) -> str:
    return re.sub(r"([?&](?:oc|OC|apikey|apiKey|api_key|authKey|auth_key|key)=)[^&\s]+", r"\1***", value)


def sleep_before_law_retry(attempt: int) -> None:
    delay = LAW_RETRY_DELAY_SECONDS * (2 ** attempt)
    delay += random.random() * delay * 0.4
    time.sleep(delay)


def map_law_record(node: ET.Element, target: str) -> dict[str, str]:
    if target == "law":
        title = find_text(node, ["법령명한글", "법령명_한글"])
        abbr = find_text(node, ["법령약칭명"])
        mst = find_text(node, ["법령일련번호", "MST"])
        law_id = find_text(node, ["법령ID"])
        effective_date = format_date(find_text(node, ["시행일자"]))
        promulgation_date = format_date(find_text(node, ["공포일자"]))
        ministry = find_text(node, ["소관부처명", "소관부처"])
        status_code = find_text(node, ["현행연혁코드"])
        law_type = find_text(node, ["법령구분명"])
        detail_link = normalize_detail_link(find_text(node, ["법령상세링크"]))
        return {
            "id": f"law-{mst or law_id or title}",
            "type": "법령",
            "title": title or "법령",
            "abbr": abbr,
            "statusCode": status_code,
            "sourceName": "국가법령정보센터",
            "officialUrl": public_law_url(mst) or detail_link,
            "sourceDate": effective_date or promulgation_date,
            "documentNumber": law_id or mst,
            "summary": " / ".join(part for part in [
                law_type,
                ministry,
                status_code,
                f"시행 {effective_date}" if effective_date else "",
            ] if part),
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
            "officialUrl": public_precedent_url(serial_no) or detail_link,
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
    if target == "ordin":
        title = find_text(node, ["자치법규명"])
        serial_no = find_text(node, ["자치법규일련번호"])
        agency = find_text(node, ["지자체기관명"])
        promulgation_date = format_date(find_text(node, ["공포일자"]))
        effective_date = format_date(find_text(node, ["시행일자"]))
        detail_link = normalize_detail_link(find_text(node, ["자치법규상세링크"]))
        return {
            "id": f"ordin-{serial_no or title}",
            "type": "조례",
            "title": title or "자치법규",
            "sourceName": agency or "국가법령정보센터",
            "officialUrl": detail_link,
            "sourceDate": effective_date or promulgation_date,
            "documentNumber": serial_no,
            "summary": " / ".join(part for part in [agency, f"시행 {effective_date}" if effective_date else ""] if part),
        }
    if target == "admrul":
        title = find_text(node, ["행정규칙명"])
        serial_no = find_text(node, ["행정규칙일련번호"])
        rule_id = find_text(node, ["행정규칙ID"])
        rule_type = find_text(node, ["행정규칙종류"])
        ministry = find_text(node, ["소관부처명", "소관부처"])
        promulgation_date = format_date(find_text(node, ["발령일자", "공포일자"]))
        detail_link = normalize_detail_link(find_text(node, ["행정규칙상세링크"]))
        return {
            "id": f"admrul-{serial_no or rule_id or title}",
            "type": "행정규칙",
            "title": title or "행정규칙",
            "sourceName": ministry or "국가법령정보센터",
            "officialUrl": detail_link,
            "sourceDate": promulgation_date,
            "documentNumber": rule_id or serial_no,
            "summary": " / ".join(part for part in [rule_type, ministry, f"발령 {promulgation_date}" if promulgation_date else ""] if part),
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


def sort_law_results(results: list[dict[str, str]], query: str, target: str) -> list[dict[str, str]]:
    if target != "law":
        return sorted(results, key=lambda item: (
            exact_title_rank(item, query),
            sortable_date_rank(item.get("sourceDate", "")),
            item.get("title", ""),
        ))
    return sorted(results, key=lambda item: (
        exact_title_rank(item, query),
        law_domain_rank(item),
        1 if item.get("statusCode") == "연혁" else 0,
        sortable_date_rank(item.get("sourceDate", "")),
        item.get("title", ""),
    ))


def law_domain_rank(item: dict[str, str]) -> int:
    title = normalize_alias_key(item.get("title", ""))
    summary = normalize_alias_key(item.get("summary", ""))
    if any(normalize_alias_key(keyword) in title for keyword in LOCAL_TAX_LAW_KEYWORDS):
        return 0
    if any(normalize_alias_key(keyword) in title for keyword in TAX_LAW_KEYWORDS):
        return 1
    if "행정안전부" in summary and ("세" in title or "지방" in title):
        return 1
    if "세" in title:
        return 2
    return 3


def sortable_date_rank(value: str) -> int:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) >= 8:
        return -int(digits[:8])
    return 0


def exact_title_rank(item: dict[str, str], query: str) -> int:
    query_key = normalize_alias_key(query)
    canonical_key = normalize_alias_key(str(resolve_law_alias(query)["canonical"]))
    title_key = normalize_alias_key(item.get("title", ""))
    abbr_key = normalize_alias_key(item.get("abbr", ""))
    keys = {query_key, canonical_key}
    if title_key in keys or (abbr_key and abbr_key in keys):
        return 0
    if any(key and key in title_key for key in keys):
        return 1
    return 2


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


def public_law_url(mst: str) -> str:
    return f"{LAW_BASE_URL}/LSW/lsInfoP.do?lsiSeq={quote(mst)}" if mst else ""


def public_precedent_url(serial_no: str) -> str:
    return f"{LAW_BASE_URL}/LSW/precInfoP.do?precSeq={quote(serial_no)}" if serial_no else ""


def strip_sensitive_query_params(url: str) -> str:
    parsed = urlparse(url)
    params = [
        (key, value)
        for key, value in parse_qs(parsed.query, keep_blank_values=True).items()
        if key.lower() not in {"oc", "apikey", "api_key", "authkey", "auth_key", "key"}
    ]
    query = urlencode([(key, item) for key, values in params for item in values])
    return parsed._replace(query=query).geturl()


def normalize_detail_link(url: str) -> str:
    link = (url or "").strip()
    if not link:
        return ""
    if link.startswith(("http://", "https://")):
        return strip_sensitive_query_params(link)
    if link.startswith("/"):
        return strip_sensitive_query_params(urljoin(LAW_BASE_URL, link))
    return strip_sensitive_query_params(urljoin(f"{LAW_BASE_URL}/", link))


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
