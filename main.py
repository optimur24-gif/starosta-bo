"""Telegram entry point for BotHost. The Mini App itself is served over HTTPS."""
from __future__ import annotations

import json
import logging
import os
import re
import signal
import sys
from dataclasses import dataclass
from threading import Event
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

LOGGER = logging.getLogger("cranium")


class ConfigError(ValueError):
    pass


class TelegramError(RuntimeError):
    def __init__(self, code: int, retry_after: int = 0):
        self.code = code
        self.retry_after = retry_after
        # Do not expose URLs, request bodies, or credentials in logs.
        super().__init__(f"Telegram API error {code}")


@dataclass(frozen=True)
class Settings:
    token: str
    app_url: str

    @classmethod
    def from_environment(cls) -> Settings:
        token = os.environ.get("BOT_TOKEN", "").strip()
        app_url = os.environ.get("MINI_APP_URL", "").strip()
        if not token:
            raise ConfigError("Добавьте BOT_TOKEN в защищённые переменные BotHost.")
        # Proxy-backed environments may supply an opaque credential placeholder.
        # Telegram validates the credential; never log or inspect its value.
        if not app_url:
            raise ConfigError("Добавьте MINI_APP_URL — публичный HTTPS-адрес приложения.")
        cls.validate_url(app_url)
        return cls(token, app_url)

    @staticmethod
    def validate_url(value: str) -> None:
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ConfigError("MINI_APP_URL должен быть HTTPS-адресом без логина и пароля.")
        if parsed.hostname in {"localhost", "127.0.0.1", "0.0.0.0"}:
            raise ConfigError("Для Telegram нужен публичный HTTPS-адрес, а не localhost.")


class TelegramClient:
    def __init__(self, token: str):
        self._token = token

    def call(self, method: str, payload: dict[str, Any] | None = None, timeout: int = 35) -> Any:
        if not re.fullmatch(r"[A-Za-z]+", method):
            raise ValueError("Invalid API method")
        request = Request(
            f"https://api.telegram.org/bot{self._token}/{method}",
            data=json.dumps(payload or {}, ensure_ascii=False).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                body = json.load(response)
        except HTTPError as exc:
            retry_after = 0
            try:
                retry_after = int(json.load(exc).get("parameters", {}).get("retry_after", 0))
            except (ValueError, TypeError):
                pass
            raise TelegramError(exc.code, retry_after) from None
        except (URLError, TimeoutError, OSError):
            raise TelegramError(503) from None
        except (json.JSONDecodeError, UnicodeError):
            raise TelegramError(502) from None
        if not body.get("ok"):
            raise TelegramError(body.get("error_code", 502), body.get("parameters", {}).get("retry_after", 0))
        return body.get("result")


def response_for_update(update: dict[str, Any], app_url: str) -> dict[str, Any] | None:
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    if chat.get("type") != "private" or not isinstance(chat.get("id"), int):
        return None
    command = str(message.get("text", "")).split(maxsplit=1)[0:1]
    command = command[0].split("@")[0] if command else ""
    if command not in {"/start", "/atlas", "/help"}:
        return None
    return {
        "chat_id": chat["id"],
        "text": (
            "Cranium · 3D-атлас анатомии черепа\n\n"
            "22 отдельные кости в 3D, анимации сборки и разборки, русские и латинские названия, "
            "и тесты с разбором ответов.\n\n"
            "Откройте атлас кнопкой ниже. Прогресс сохраняется на вашем устройстве."
        ),
        "reply_markup": {"inline_keyboard": [[{"text": "Открыть атлас", "web_app": {"url": app_url}}]]},
    }


def run(
    settings: Settings,
    check_only: bool = False,
    *,
    stop_event: Event | None = None,
    on_ready: Callable[[], None] | None = None,
) -> None:
    client = TelegramClient(settings.token)
    client.call("getMe")
    webhook = client.call("getWebhookInfo") or {}
    if webhook.get("url"):
        raise ConfigError("У бота установлен webhook. Отключите его перед запуском polling; автоматически он не удаляется.")
    LOGGER.info("Доступ к Telegram проверен. Токен не выводится в журнал.")
    if check_only:
        return
    client.call("setMyCommands", {"commands": [
        {"command": "start", "description": "Открыть атлас черепа"},
        {"command": "atlas", "description": "Перейти к Mini App"},
        {"command": "help", "description": "О приложении"},
    ]})
    client.call("setChatMenuButton", {"menu_button": {"type": "web_app", "text": "Атлас", "web_app": {"url": settings.app_url}}})
    stopped = stop_event if stop_event is not None else Event()

    def stop(_signum: int, _frame: Any) -> None:
        stopped.set()

    if stop_event is None:
        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
    offset = 0
    backoff = 1
    LOGGER.info("Бот запущен. Ожидание личных команд /start, /atlas и /help.")
    if on_ready:
        on_ready()
    while not stopped.is_set():
        try:
            updates = client.call("getUpdates", {"offset": offset, "timeout": 25, "allowed_updates": ["message"]}) or []
            for update in updates:
                if stopped.is_set():
                    break
                response = response_for_update(update, settings.app_url)
                if response:
                    try:
                        client.call("sendMessage", response)
                    except TelegramError as exc:
                        if exc.code != 403:  # User can block the bot; acknowledge and continue.
                            raise
                offset = update["update_id"] + 1
            backoff = 1
        except TelegramError as exc:
            if exc.code in {401, 404}:
                raise ConfigError("Telegram отклонил токен. Проверьте BOT_TOKEN в защищённых переменных.") from None
            if exc.code == 409:
                raise ConfigError("Конфликт polling: остановите другую копию бота или проверьте webhook.") from None
            LOGGER.warning("Telegram API временно недоступен (код %s). Повтор подключения.", exc.code)
            delay = min(max(exc.retry_after, backoff), 300)
            stopped.wait(delay)
            backoff = min(backoff * 2, 30)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        run(Settings.from_environment(), check_only="--check" in sys.argv)
    except ConfigError as exc:
        LOGGER.error("%s", exc)
        return 2
    except TelegramError as exc:
        LOGGER.error("Не удалось обратиться к Telegram API (код %s). Проверьте доступ и параметры бота.", exc.code)
        return 3
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
