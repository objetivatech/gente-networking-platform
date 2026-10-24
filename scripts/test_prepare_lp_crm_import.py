"""Copyright © 2026 Ranktop SEO Inteligente. Author: Diogo Devitte."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('lp_import', pathlib.Path(__file__).with_name('prepare-lp-crm-import.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportRules(unittest.TestCase):
    def test_refuses_incomplete_export(self):
        with self.assertRaises(ValueError):
            module.build_sql([])

    def test_historical_leads_never_become_attendance(self):
        self.assertIn('meeting_attendance_count<>0', module.BODY)
        self.assertNotIn('INSERT INTO public.attendances', module.BODY)

    def test_no_automatic_rescue_or_activation(self):
        self.assertIn("'cadastro_recebido','not_applicable',true", module.BODY)
        self.assertNotIn('submit-lead', module.BODY)
        self.assertNotIn('INSERT INTO public.invitations', module.BODY)

    def test_supported_sources(self):
        rows = [{'id':str(i),'email':f'{min(i,540)}@test.invalid','source':'unknown'} for i in range(686)]
        with self.assertRaisesRegex(ValueError, 'Unknown source'):
            module.build_sql(rows)


if __name__ == '__main__':
    unittest.main()