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

    def test_refuses_duplicate_source_ids(self):
        rows = [{'id':'same','email':f'{min(i,540)}@test.invalid','source':'participe'} for i in range(686)]
        with self.assertRaisesRegex(ValueError, 'unique source records'):
            module.build_sql(rows)

    def test_requires_541_distinct_emails(self):
        rows = [{'id':str(i),'email':f'{i}@test.invalid','source':'participe'} for i in range(686)]
        with self.assertRaisesRegex(ValueError, '541 normalized emails'):
            module.build_sql(rows)

    def test_supported_sources(self):
        rows = [{'id':str(i),'email':f'{min(i,540)}@test.invalid','source':'unknown'} for i in range(686)]
        with self.assertRaisesRegex(ValueError, 'Unknown source'):
            module.build_sql(rows)


if __name__ == '__main__':
    unittest.main()