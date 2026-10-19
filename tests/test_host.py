import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
from threading import Event, Thread
import time
import unittest
from unittest.mock import patch
from urllib.error import URLError
from urllib.request import urlopen

import app
import main as bot


class HostTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name) / 'dist'
        (self.root / 'assets').mkdir(parents=True)
        (self.root / 'models').mkdir()
        (self.root / 'index.html').write_text('<html>Cranium</html>')
        (self.root / 'assets' / 'app.js').write_text('export const model = true;')
        (self.root / 'assets' / 'font.woff2').write_bytes(b'font-data')
        (self.root / 'models' / 'skull.bin').write_bytes(b'\x00\xff\x01\x80')
        outside = Path(self.directory.name) / 'main.py'
        outside.write_text('private-server-code')
        (self.root / 'escape.js').symlink_to(outside)
        self.state = app.RuntimeState()
        self.server = self.start_server()

    def start_server(self, base='/'):
        server = app.create_server(self.root, host='127.0.0.1', port=0, base=base, state=self.state)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()

        def close():
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.addCleanup(close)
        return server

    def request(self, path='/', method='GET', server=None):
        connection = http.client.HTTPConnection('127.0.0.1', (server or self.server).server_port, timeout=3)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            return response.status, dict(response.headers), response.read()
        finally:
            connection.close()

    def test_serves_frontend_binary_and_browser_module_mime_types(self):
        for path, mime, body in [
            ('/', 'text/html; charset=utf-8', b'<html>Cranium</html>'),
            ('/assets/app.js', 'text/javascript; charset=utf-8', b'export const model = true;'),
            ('/assets/font.woff2', 'font/woff2', b'font-data'),
            ('/models/skull.bin', 'application/octet-stream', b'\x00\xff\x01\x80'),
        ]:
            with self.subTest(path=path):
                status, headers, received = self.request(path)
                self.assertEqual(status, 200)
                self.assertEqual(headers['Content-Type'], mime)
                self.assertEqual(received, body)
                self.assertEqual(int(headers['Content-Length']), len(body))

    def test_head_has_binary_content_length_without_response_body(self):
        status, headers, body = self.request('/models/skull.bin', 'HEAD')
        self.assertEqual(status, 200)
        self.assertEqual(int(headers['Content-Length']), 4)
        self.assertEqual(body, b'')

    def test_does_not_expose_source_hidden_paths_traversal_symlinks_or_directories(self):
        for path in ['/main.py', '/.env', '/../main.py', '/%2e%2e/main.py', '/%2f../main.py', '/%5c..%5cmain.py', '/escape.js', '/models/', '/%00']:
            with self.subTest(path=path):
                status, _, body = self.request(path)
                self.assertEqual(status, 404)
                self.assertNotIn(b'private-server-code', body)
        self.assertEqual(self.request('/%ff')[0], 400)

    def test_allows_telegram_embedding_and_caches_only_fingerprinted_assets(self):
        _, headers, _ = self.request('/')
        self.assertIn('frame-ancestors https://web.telegram.org', headers['Content-Security-Policy'])
        self.assertNotIn('X-Frame-Options', headers)
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(headers['Cache-Control'], 'no-cache')
        self.assertIn('immutable', self.request('/assets/app.js')[1]['Cache-Control'])
        self.assertEqual(self.request('/models/skull.bin')[1]['Cache-Control'], 'no-cache')

    def test_health_reports_worker_state_without_credentials(self):
        self.state.bot = 'running'
        with patch.dict(os.environ, {'BOT_TOKEN': 'test-secret-not-for-output'}):
            status, _, body = self.request('/healthz')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {'status': 'ok', 'bot': 'running'})
        self.assertNotIn(b'test-secret-not-for-output', body)

    def test_rejects_mutating_http_methods(self):
        for method in ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']:
            status, headers, body = self.request('/', method)
            self.assertEqual(status, 405)
            self.assertEqual(headers['Allow'], 'GET, HEAD')
            self.assertEqual(body, b'')

    def test_repository_subpath_redirects_and_serves_same_resources(self):
        server = self.start_server('/starosta-bo/')
        self.assertEqual(self.request('/starosta-bo', server=server)[0], 308)
        self.assertEqual(self.request('/starosta-bo', server=server)[1]['Location'], '/starosta-bo/')
        self.assertEqual(self.request('/starosta-bo/', server=server)[2], b'<html>Cranium</html>')
        self.assertEqual(self.request('/starosta-bo/models/skull.bin', server=server)[2], b'\x00\xff\x01\x80')
        self.assertEqual(self.request('/', server=server)[0], 404)
        self.assertEqual(self.request('/healthz', server=server)[0], 200)

    def test_bad_base_path_and_missing_build_fail_before_starting(self):
        for base in ['relative/', '//other-host/', '/../', '/x?query', '/x%20', '/x\\y']:
            with self.assertRaises(bot.ConfigError):
                app.create_server(self.root, port=0, base=base)
        with self.assertRaises(bot.ConfigError):
            app.create_server(self.root / 'missing', port=0)

    def test_combined_worker_keeps_web_responsive_and_registers_bothost_url(self):
        stopped = Event()
        settings = bot.Settings('worker-test-token', 'https://cranium-example.bothost.tech/')

        def telegram(method, payload=None, **kwargs):
            if method == 'getMe':
                return {'id': 1}
            if method == 'getWebhookInfo':
                return {'url': ''}
            if method == 'getUpdates':
                self.assertEqual(json.loads(self.request('/healthz')[2])['bot'], 'running')
                self.assertEqual(self.request('/')[0], 200)
                stopped.set()
                return []
            return True

        with patch.object(bot.TelegramClient, 'call', side_effect=telegram) as api, patch('app.signal.signal') as signals:
            app.run_worker(settings, self.state, stopped)
        menu = next(call.args[1] for call in api.call_args_list if call.args[0] == 'setChatMenuButton')
        self.assertEqual(menu['menu_button']['web_app']['url'], settings.app_url)
        self.assertEqual(self.state.bot, 'stopped')
        signals.assert_not_called()

    def test_initial_telegram_outage_retries_while_site_keeps_working(self):
        stopped = Event()
        attempts = []

        def worker(_settings, *, stop_event, on_ready):
            attempts.append(1)
            self.assertEqual(self.request('/')[0], 200)
            if len(attempts) == 1:
                raise bot.TelegramError(503)
            on_ready()
            stop_event.set()

        with patch.object(bot, 'run', side_effect=worker), patch.object(stopped, 'wait', return_value=False), self.assertLogs('cranium.host', 'WARNING'):
            app.run_worker(bot.Settings('worker-test-token', 'https://example.com/'), self.state, stopped)
        self.assertEqual(len(attempts), 2)

    def test_rejected_token_does_not_take_down_site_or_leak_secret(self):
        stopped = Event()
        with patch.object(bot.TelegramClient, 'call', side_effect=bot.TelegramError(401)), self.assertLogs('cranium.host', 'ERROR') as logs:
            app.run_worker(bot.Settings('worker-test-token', 'https://example.com/'), self.state, stopped)
        self.assertEqual(self.state.bot, 'failed')
        self.assertFalse(stopped.is_set())
        self.assertEqual(self.request('/')[0], 200)
        self.assertNotIn('worker-test-token', '\n'.join(logs.output))


class HostProcessTests(unittest.TestCase):
    def run_host(self, web_only=False):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        for filename in ['app.py', 'main.py']:
            shutil.copyfile(Path(__file__).resolve().parents[1] / filename, root / filename)
        (root / 'dist').mkdir()
        (root / 'dist' / 'index.html').write_text('<html>Host process atlas</html>')
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            port = listener.getsockname()[1]
        environment = {**os.environ, 'PORT': str(port), 'BASE_PATH': '/', 'BOT_TOKEN': 'host-process-test-token', 'MINI_APP_URL': 'https://example.com/' if web_only else ''}
        command = [sys.executable, str(root / 'app.py')]
        if web_only:
            command.append('--web-only')
        process = subprocess.Popen(command, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

        def cleanup():
            if process.poll() is None:
                process.kill()
            process.communicate(timeout=5)

        self.addCleanup(cleanup)
        endpoint = f'http://127.0.0.1:{port}'
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if process.poll() is not None:
                self.fail('Host process exited before becoming ready')
            try:
                with urlopen(endpoint + '/healthz', timeout=1) as response:
                    health = json.load(response)
                return process, endpoint, health
            except (URLError, OSError):
                time.sleep(0.05)
        self.fail('Host process did not become ready')

    def test_first_deploy_serves_atlas_without_url_and_accepts_sigterm(self):
        process, endpoint, health = self.run_host()
        self.assertEqual(health['bot'], 'awaiting_configuration')
        with urlopen(endpoint, timeout=2) as response:
            self.assertIn(b'Host process atlas', response.read())
        process.terminate()
        output, _ = process.communicate(timeout=5)
        self.assertEqual(process.returncode, 0)
        self.assertIn('MINI_APP_URL', output)
        self.assertNotIn('host-process-test-token', output)

    def test_web_only_mode_remains_available_with_bot_credentials_present(self):
        process, endpoint, health = self.run_host(web_only=True)
        self.assertEqual(health['bot'], 'disabled')
        with urlopen(endpoint, timeout=2) as response:
            self.assertEqual(response.status, 200)
        process.terminate()
        output, _ = process.communicate(timeout=5)
        self.assertEqual(process.returncode, 0)
        self.assertNotIn('Telegram API', output)
        self.assertNotIn('host-process-test-token', output)


if __name__ == '__main__':
    unittest.main()
