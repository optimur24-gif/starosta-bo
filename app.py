"""Serve the built Mini App and optionally run its Telegram bot on BotHost."""
from __future__ import annotations

import argparse
import json
import logging
import mimetypes
import os
from pathlib import Path
import shutil
import signal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Event, Thread
from typing import Any
from urllib.parse import unquote, urlsplit

import main as bot

LOGGER = logging.getLogger("cranium.host")
ROOT = Path(__file__).resolve().parent / "dist"
CSP = (
    "default-src 'self'; script-src 'self' https://telegram.org https://core.telegram.org; "
    "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
    "connect-src 'self'; base-uri 'self'; form-action 'none'; "
    "frame-ancestors https://web.telegram.org https://*.telegram.org https://t.me"
)


def normalize_base(value: str) -> str:
    base = value.rstrip("/") + "/"
    if (
        not value.startswith("/")
        or value.startswith("//")
        or any(character in value for character in "\\\0?#%")
        or any(part.startswith(".") or not part for part in base.split("/")[1:-1])
    ):
        raise bot.ConfigError("BASE_PATH должен быть абсолютным URL-путём, например /.")
    return base


class RuntimeState:
    def __init__(self, status: str = "awaiting_configuration"):
        self.bot = status


def create_server(
    root: Path = ROOT,
    *,
    port: int = 3000,
    host: str = "0.0.0.0",
    base: str = "/",
    state: RuntimeState | None = None,
) -> ThreadingHTTPServer:
    root = root.resolve()
    if not (root / "index.html").is_file():
        raise bot.ConfigError("Сборка dist отсутствует. Выполните npm run build или используйте Dockerfile.")
    base = normalize_base(base)
    state = state or RuntimeState()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, _format: str, *args: Any) -> None:
            # URL queries can contain Telegram initData. Do not put requests in logs.
            return

        def end_headers(self) -> None:
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
            self.send_header("Content-Security-Policy", CSP)
            super().end_headers()

        def do_GET(self) -> None:
            self.serve()

        def do_HEAD(self) -> None:
            self.serve()

        def do_POST(self) -> None:
            self.send_response(405)
            self.send_header("Allow", "GET, HEAD")
            self.send_header("Content-Length", "0")
            self.end_headers()

        do_PUT = do_POST
        do_DELETE = do_POST
        do_PATCH = do_POST
        do_OPTIONS = do_POST

        def serve(self) -> None:
            try:
                pathname = unquote(urlsplit(self.path).path, errors="strict")
            except (ValueError, UnicodeError):
                self.send_error(400)
                return
            if pathname == "/healthz":
                body = json.dumps({"status": "ok", "bot": state.bot}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return
            if base != "/" and pathname == base[:-1]:
                self.send_response(308)
                self.send_header("Location", base)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if not pathname.startswith(base):
                self.send_error(404)
                return
            relative = pathname[len(base):] or "index.html"
            if (
                any(part.startswith(".") for part in relative.split("/"))
                or "\0" in relative
                or "\\" in relative
            ):
                self.send_error(404)
                return
            try:
                target = (root / relative).resolve()
                if not target.is_relative_to(root) or not target.is_file():
                    self.send_error(404)
                    return
                with target.open("rb") as source:
                    mime = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
                    if target.suffix == ".js":
                        mime = "text/javascript"
                    elif target.suffix == ".woff2":
                        mime = "font/woff2"
                    if mime.startswith("text/") or mime == "application/json":
                        mime += "; charset=utf-8"
                    self.send_response(200)
                    self.send_header("Content-Type", mime)
                    self.send_header("Content-Length", str(os.fstat(source.fileno()).st_size))
                    self.send_header(
                        "Cache-Control",
                        "public, max-age=31536000, immutable" if relative.startswith("assets/") else "no-cache",
                    )
                    self.end_headers()
                    if self.command != "HEAD":
                        shutil.copyfileobj(source, self.wfile)
            except (FileNotFoundError, PermissionError, IsADirectoryError):
                self.send_error(404)
            except (BrokenPipeError, ConnectionResetError):
                pass

    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    return server


def run_worker(settings: bot.Settings, state: RuntimeState, stopped: Event) -> None:
    delay = 1
    while not stopped.is_set():
        state.bot = "starting"
        try:
            bot.run(
                settings,
                stop_event=stopped,
                on_ready=lambda: setattr(state, "bot", "running"),
            )
            state.bot = "stopped"
            stopped.set()
            return
        except bot.ConfigError as error:
            state.bot = "failed"
            LOGGER.error("%s", error)
            return
        except bot.TelegramError as error:
            if error.code == 429 or error.code >= 500:
                LOGGER.warning("Telegram API недоступен (код %s). Сайт работает; подключение будет повторено.", error.code)
                stopped.wait(min(max(delay, error.retry_after), 300))
                delay = min(delay * 2, 30)
            else:
                state.bot = "failed"
                LOGGER.error("Telegram отклонил запуск (код %s). Проверьте BOT_TOKEN, MINI_APP_URL и журналы хостинга.", error.code)
                return


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--web-only", action="store_true", help="Serve the atlas without contacting Telegram")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    state = RuntimeState("disabled" if args.web_only else "awaiting_configuration")
    try:
        port = int(os.environ.get("PORT", "3000"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        LOGGER.error("PORT должен быть числом от 1 до 65535.")
        return 2
    try:
        server = create_server(port=port, base=os.environ.get("BASE_PATH", "/"), state=state)
    except (bot.ConfigError, OSError) as error:
        LOGGER.error("%s", error)
        return 2
    stopped = Event()
    for name in (signal.SIGINT, signal.SIGTERM):
        signal.signal(name, lambda _signum, _frame: stopped.set())
    thread = Thread(target=server.serve_forever, name="cranium-http", daemon=True)
    thread.start()
    LOGGER.info("Атлас запущен на порту %s. Проверка готовности: /healthz.", port)
    try:
        if not args.web_only:
            missing = [name for name in ("BOT_TOKEN", "MINI_APP_URL") if not os.environ.get(name, "").strip()]
            if missing:
                LOGGER.warning(
                    "Сайт работает. Для запуска бота добавьте %s в настройки хостинга и перезапустите контейнер. "
                    "MINI_APP_URL — публичный HTTPS-адрес, выданный BotHost.",
                    ", ".join(missing),
                )
            else:
                try:
                    settings = bot.Settings.from_environment()
                    run_worker(settings, state, stopped)
                except bot.ConfigError as error:
                    state.bot = "failed"
                    LOGGER.error("%s", error)
        stopped.wait()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
