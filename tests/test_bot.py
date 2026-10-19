import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import URLError

import main


class BotTests(unittest.TestCase):
    def test_requires_token_and_https_app_url(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(main.ConfigError, 'BOT_TOKEN'):
                main.Settings.from_environment()
        for url in ['http://example.com', 'javascript:alert(1)', 'https://name:password@example.com', 'https://localhost/app']:
            with self.assertRaises(main.ConfigError):
                main.Settings.validate_url(url)

    def test_accepts_secure_subpath_without_exposing_token(self):
        with patch.dict(os.environ, {'BOT_TOKEN': 'opaque-proxy-binding', 'MINI_APP_URL': 'https://example.com/starosta-bo/'}, clear=True):
            config = main.Settings.from_environment()
            self.assertEqual(config.app_url, 'https://example.com/starosta-bo/')

    def test_private_start_opens_mini_app(self):
        response = main.response_for_update({'message': {'text': '/start demo', 'chat': {'type': 'private', 'id': 123}}}, 'https://example.com/app/')
        self.assertEqual(response['chat_id'], 123)
        self.assertEqual(response['reply_markup']['inline_keyboard'][0][0]['web_app']['url'], 'https://example.com/app/')

    def test_ignores_groups_noncommands_and_nonmessage_updates(self):
        for update in [{}, {'callback_query': {}}, {'message': {'text': '/start', 'chat': {'type': 'group', 'id': 1}}}, {'message': {'text': 'hello', 'chat': {'type': 'private', 'id': 1}}}]:
            self.assertIsNone(main.response_for_update(update, 'https://example.com'))

    def test_supports_commands_addressed_to_bot(self):
        self.assertIsNotNone(main.response_for_update({'message': {'text': '/atlas@CraniumBot', 'chat': {'type': 'private', 'id': 1}}}, 'https://example.com'))

    def test_check_only_uses_readonly_api_calls(self):
        with patch.object(main.TelegramClient, 'call', side_effect=[{'id': 1}, {'url': ''}]) as api:
            main.run(main.Settings('test-token', 'https://example.com'), check_only=True)
            self.assertEqual([c.args[0] for c in api.call_args_list], ['getMe', 'getWebhookInfo'])

    def test_does_not_delete_existing_webhook(self):
        with patch.object(main.TelegramClient, 'call', side_effect=[{'id': 1}, {'url': 'https://existing.example/webhook'}]) as api:
            with self.assertRaisesRegex(main.ConfigError, 'webhook'):
                main.run(main.Settings('test-token', 'https://example.com'))
            self.assertEqual(api.call_count, 2)

    def test_network_errors_never_include_token(self):
        with patch('main.urlopen', side_effect=URLError('https://api.telegram.org/botsecret-value/getMe')):
            with self.assertRaises(main.TelegramError) as ctx:
                main.TelegramClient('secret-value').call('getMe')
            self.assertNotIn('secret-value', str(ctx.exception))
            self.assertIsNone(ctx.exception.__cause__)

    def test_request_uses_tls_and_json_post(self):
        response = io.BytesIO(json.dumps({'ok': True, 'result': {'id': 1}}).encode())
        with patch('main.urlopen', return_value=response) as urlopen:
            self.assertEqual(main.TelegramClient('test-token').call('getMe'), {'id': 1})
            request = urlopen.call_args.args[0]
            self.assertTrue(request.full_url.startswith('https://api.telegram.org/'))
            self.assertEqual(request.method, 'POST')
            self.assertNotIn('context', urlopen.call_args.kwargs)


if __name__ == '__main__':
    unittest.main()
