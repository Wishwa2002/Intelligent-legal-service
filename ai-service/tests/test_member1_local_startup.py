import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('member1_local_startup', Path(__file__).parents[2] / 'scripts/start-member1-local.py')
startup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup)

class LocalStartupTests(unittest.TestCase):
    def test_maps_one_existing_dotenv_value_without_stale_env_or_browser_exposure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'ai-service').mkdir()
            (root / 'ai-service/.env').write_text('AI_INTERNAL_KEY= existing-test-key\nGEMINI_API_KEY=test-provider-key\nGEMINI_MODEL=configured-model\n')
            result = startup.service_environments(root, {'AI_INTERNAL_KEY':'stale', 'AI__InternalKey':'different-stale', 'GEMINI_MODEL':'stale-model'})
            self.assertEqual('existing-test-key', result['backend']['Ai__InternalKey'])
            self.assertEqual(result['backend']['Ai__InternalKey'], result['recommendation']['AI_INTERNAL_KEY'])
            self.assertNotIn('AI__InternalKey', result['backend'])
            self.assertEqual('configured-model', result['recommendation']['GEMINI_MODEL'])
            self.assertNotIn('VITE_AI_INTERNAL_KEY', result['frontend'])
            self.assertNotIn('AI_INTERNAL_KEY', result['frontend'])
            self.assertNotIn('GEMINI_API_KEY', result['frontend'])
            self.assertNotIn('GEMINI_API_KEY', result['backend'])
            self.assertEqual('http://127.0.0.1:5295', result['frontend']['VITE_API_URL'])
    def test_missing_key_fails_without_creating_or_replacing_any_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root/'ai-service').mkdir()
            with self.assertRaises(ValueError): startup.service_environments(root, {})
            self.assertFalse((root/'ai-service/.env').exists())
    def test_correct_modules_and_ports(self):
        commands=startup.commands()
        self.assertIn('lawyer_recommendation.app:app', commands['recommendation'][0])
        self.assertIn('8002',commands['recommendation'][0])
        self.assertIn('app.main:app',commands['agent'][0])
        self.assertIn('http://127.0.0.1:5295', commands['backend'][0])
