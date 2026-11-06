import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('validator', HERE / 'validate_component_tiers.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
TEMPLATE = Path(sys.argv.pop(1)).resolve() if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else HERE.parent / '_templates' / 'components_system_template'


class GateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='gate-test-', dir=HERE)
        self.root = Path(self.temp.name).resolve()
        assert self.root.is_relative_to(HERE)
        self.addCleanup(self.temp.cleanup)
        self.docs = {p.name: json.loads(p.read_text(encoding='utf-8-sig')) for p in TEMPLATE.glob('*.json')}

    def write(self):
        for name, doc in self.docs.items():
            (self.root / name).write_text(json.dumps(doc), encoding='utf-8')

    def complete_fixture(self):
        # Synthetic specifications only. Never change or populate the user's template.
        manifest = self.docs['_system.json']
        manifest['status'] = 'complete'
        manifest['references'] = [{'reference_id': 'fixture-source', 'url': 'https://example.test/fixture', 'node_id': None, 'evidence_kind': 'synthetic_test'}]
        values = {'color': '#123456', 'font_family': 'Fixture Sans', 'dimension': 8,
                  'font_weight': 400, 'number': 1, 'shadow': '0 1px 3px #123456',
                  'duration': 120, 'easing': 'linear'}
        foundations = self.docs[validator.TIER_FILES[0]]['tokens']
        by_type = {}
        for tok in foundations:
            tok['token_value'] = values[tok['value_type']]
            tok['status'] = 'complete'
            if tok['value_type'] in {'dimension', 'duration'}:
                tok['unit'] = 'px' if tok['value_type'] == 'dimension' else 'ms'
            tok['evidence'].update(reference_id='fixture-source', measurement_method='synthetic_fixture')
            by_type[tok['value_type']] = tok['token_name']
        screen = copy.deepcopy(self.docs[validator.TIER_FILES[1]]['components'][0])
        screen['component_id'] = 'fixture_screen'
        self.docs[validator.TIER_FILES[7]]['components'] = [screen]
        for tier, file in enumerate(validator.TIER_FILES):
            doc = self.docs[file]
            doc['status'] = 'complete'
            for tok in doc['tokens']:
                if tier:
                    tok['reference_token'] = by_type[tok['value_type']]
                    tok['status'] = 'complete'
            for comp in doc['components']:
                comp.update(name=comp['component_id'], status='complete', include_in_flow=True, purpose='Fixture purpose', reference_ids=['fixture-source'])
                comp['design_spec']['figma_component_id'] = '10:20'
                comp['token_bindings'] = [{'slot': 'root', 'property': 'background', 'token_name': by_type['color']}]
                comp['recipe'].update(name='fixtureRecipe', kind='slot_recipe', file_path='planned/fixture.ts')
                comp['derivation']['source_status'] = 'verified_reference'

    def result(self):
        self.write()
        return validator.validate(self.root)

    def assert_failure(self, kind):
        result = self.result()
        self.assertFalse(result['gate_passed'])
        self.assertGreater(result['error_counts'].get(kind, 0), 0, result)

    def test_blank_template_fails_completion_not_literal_policy(self):
        result = self.result()
        self.assertFalse(result['gate_passed'])
        self.assertEqual(result['hardcoded_values'], 0)
        self.assertGreater(result['error_counts']['incomplete'], 0)

    def test_complete_fixture_passes(self):
        self.complete_fixture()
        result = self.result()
        self.assertTrue(result['gate_passed'], result['errors'][:5])
        self.assertEqual(result['coverage_percent'], 100)

    def test_one_literal_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['tokens'][0]['token_value'] = '#ff00aa'
        self.assert_failure('hardcoded_value')

    def test_zero_is_also_a_literal(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['tokens'][0]['token_value'] = 0
        self.assert_failure('hardcoded_value')

    def test_literal_nested_in_recipe_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['components'][0]['recipe']['styles'] = {'padding': 12}
        self.assert_failure('hardcoded_value')

    def test_unrecognized_field_fails_even_without_literal_pattern(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['components'][0]['recipe']['fontFamily'] = 'Some Unrecognized Font'
        self.assert_failure('structure')

    def test_literal_in_notes_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[4]]['notes'].append('Use padding 12px here.')
        self.assert_failure('hardcoded_value')

    def test_missing_required_field_fails(self):
        self.complete_fixture()
        del self.docs[validator.TIER_FILES[1]]['components'][0]['purpose']
        self.assert_failure('structure')

    def test_percentage_literal_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[4]]['notes'].append('width: 50%;')
        self.assert_failure('hardcoded_value')

    def test_unresolved_theme_alias_fails(self):
        self.complete_fixture()
        self.docs['_system.json']['themes'] = [{'name': 'night', 'foundation_overrides': {'color.surface.canvas': 'missing.token'}}]
        self.assert_failure('reference')

    def test_unresolved_motion_source_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['components'][0]['design_spec']['motion_reference_ids'] = ['missing-source']
        self.assert_failure('reference')

    def test_unresolved_core_reference_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['tokens'][0]['reference_token'] = 'color.not.present'
        self.assert_failure('reference')

    def test_nonfoundation_reference_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[2]]['tokens'][0]['reference_token'] = self.docs[validator.TIER_FILES[1]]['tokens'][0]['token_name']
        self.assert_failure('reference')

    def test_alias_cycle_fails(self):
        self.complete_fixture()
        tok = self.docs[validator.TIER_FILES[0]]['tokens'][0]
        tok['reference_token'] = tok['token_name']
        tok['token_value'] = None
        self.assert_failure('reference')

    def test_dependency_on_higher_tier_fails(self):
        self.complete_fixture()
        self.docs[validator.TIER_FILES[1]]['components'][0]['depends_on'] = [{'tier': 7, 'component_id': 'fixture_screen'}]
        self.assert_failure('reference')

    def test_fake_foundation_path_fails(self):
        self.complete_fixture()
        self.docs['_system.json']['core_token_file'] = validator.TIER_FILES[2]
        self.assert_failure('structure')

    def test_arbitrary_extensions_and_hidden_files_fail_closed(self):
        self.complete_fixture()
        self.write()
        for name, content in [('extra.md', b'padding: 12px'), ('extra.css', b'.x { color: red; }'), ('extra.tsx', b'const x = 8'), ('.hidden', b'opaque'), ('asset.bin', b'\xff\x00')]:
            with self.subTest(name=name):
                target = self.root / name
                target.write_bytes(content)
                result = validator.validate(self.root)
                self.assertFalse(result['gate_passed'])
                self.assertGreater(result['error_counts']['coverage'], 0)
                target.unlink()

    def test_nested_file_is_not_skipped(self):
        self.complete_fixture()
        (self.root / 'nested').mkdir()
        (self.root / 'nested' / 'notes.txt').write_text('arbitrary document')
        self.assert_failure('coverage')

    def test_duplicate_json_key_fails(self):
        self.complete_fixture()
        self.write()
        target = self.root / validator.TIER_FILES[2]
        target.write_text('{"tier":2,"tier":0}')
        self.assertFalse(validator.validate(self.root)['gate_passed'])

    def test_cli_exit_codes(self):
        self.complete_fixture()
        self.write()
        command = [sys.executable, '-I', '-B', str(HERE / 'validate_component_tiers.py'), str(self.root), '--json']
        passed = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(passed.returncode, 0, passed.stdout)
        self.docs[validator.TIER_FILES[2]]['tokens'][0]['token_value'] = 8
        self.write()
        failed = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(failed.returncode, 1)
        self.assertFalse(json.loads(failed.stdout)['gate_passed'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
