"""Setup-tool guardrails use synthetic credentials and never run dotnet or contact a DB."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('development_admin_setup', Path(__file__).parents[2] / 'scripts/seed-member1-development-admin.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class DevelopmentAdminSetupTests(unittest.TestCase):
    def test_tracked_file_refused_before_credentials_or_dotnet(self):
        with patch.object(setup.subprocess, 'run', side_effect=[SimpleNamespace(returncode=0), SimpleNamespace(returncode=0)]) as run:
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(1, setup.main())
            self.assertEqual(2, run.call_count)

    def test_missing_credentials_refused_without_dotnet(self):
        with patch.object(setup.subprocess, 'run', side_effect=[SimpleNamespace(returncode=0), SimpleNamespace(returncode=1)]) as run:
            with patch.object(setup, 'dotenv_values', return_value={}):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(1, setup.main())
            self.assertEqual(2, run.call_count)

    def test_private_credentials_only_in_backend_environment_and_output_is_safe(self):
        synthetic = {'E2E_ADMIN_EMAIL': 'synthetic-admin@example.test', 'E2E_ADMIN_PASSWORD': 'synthetic-secret'}
        with patch.object(setup.subprocess, 'run', side_effect=[SimpleNamespace(returncode=0), SimpleNamespace(returncode=1), SimpleNamespace(returncode=0)]) as run:
            with patch.object(setup, 'dotenv_values', return_value=synthetic):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(0, setup.main())
            args, kwargs = run.call_args
            self.assertIn('--seed-development-admin', args[0])
            self.assertEqual('Development', kwargs['env']['ASPNETCORE_ENVIRONMENT'])
            self.assertEqual(synthetic['E2E_ADMIN_PASSWORD'], kwargs['env']['SeedAccounts__AdminPassword'])
            for value in synthetic.values():
                self.assertNotIn(value, str(args))
                self.assertNotIn(value, output.getvalue())
