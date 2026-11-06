"""Fail-closed component-tier document gate. Standard library only; never edits input.

Only the closed JSON document contract is certifiable. Every other file is
reported as unvalidated and fails, regardless of extension. This deliberately
does not pretend to understand arbitrary programming languages or binary data.
"""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import re
import sys

TIER_FILES = [
    'tier_00_foundations.json', 'tier_01_primitives.json',
    'tier_02_controls.json', 'tier_03_overlays_and_feedback.json',
    'tier_04_patterns.json', 'tier_05_product_components.json',
    'tier_06_regions.json', 'tier_07_screens.json',
]
EXPECTED = {'_system.json', *TIER_FILES}
PLACEHOLDERS = {'unpopulated', 'not_assessed', 'todo', 'tbd', 'placeholder', 'replace_me'}
LITERAL = re.compile(
    r'(?i)(?<![\w])\#[0-9a-f]{3,8}\b|'
    r'\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|cubic-bezier)\s*\(|'
    r'(?<![\w.])-?(?:\d*\.)?\d+\s*(?:(?:px|rem|em|vh|vw|vmin|vmax|pt|ms|s|deg)\b|%)'
)
BARE_LITERAL = re.compile(r'(?i)^(?:-?(?:\d*\.)?\d+|red|blue|green|white|black|transparent|currentcolor|inherit|initial|unset|none)$')
IDENTITY_FIELDS = {'format_version', 'node_id', 'figma_node_id', 'figma_component_id', 'url'}


def parse_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate JSON key: ' + key)
            result[key] = value
        return result
    def bad_constant(value):
        raise ValueError('non-finite JSON number: ' + value)
    return json.loads(text, object_pairs_hook=pairs, parse_constant=bad_constant)


def validate(root):
    errors = []
    def fail(kind, file, path, message):
        errors.append({'kind': kind, 'file': file, 'path': path, 'message': message})

    def check_schema(value, schema, file, path='$'):
        types = schema.get('type')
        if isinstance(types, str):
            types = [types]
        matches = {'null': value is None, 'boolean': type(value) is bool,
                   'integer': type(value) is int, 'string': isinstance(value, str),
                   'array': isinstance(value, list), 'object': isinstance(value, dict)}
        if types and not any(matches.get(t, False) for t in types):
            fail('structure', file, path, 'Wrong field type; expected ' + ', '.join(types))
            return
        if isinstance(value, dict) and schema.get('type') == 'object':
            properties = schema.get('properties', {})
            for key in schema.get('required', []):
                if key not in value:
                    fail('structure', file, path + '.' + key, 'Required field is missing')
            for key, child in value.items():
                if key in properties:
                    check_schema(child, properties[key], file, path + '.' + key)
                elif schema.get('additionalProperties') is False:
                    fail('structure', file, path + '.' + key, 'Unknown field; it cannot bypass the token policy')
                elif isinstance(schema.get('additionalProperties'), dict):
                    check_schema(child, schema['additionalProperties'], file, path + '.' + key)
        if isinstance(value, list) and schema.get('type') == 'array':
            for index, child in enumerate(value):
                check_schema(child, schema['items'], file, f'{path}[{index}]')

    def scan_literals(value, file, path='$', field=''):
        if isinstance(value, dict):
            for key, child in value.items():
                # Also inspect keys: a literal hidden as a mapping key is still a literal.
                if LITERAL.search(key) or BARE_LITERAL.fullmatch(key):
                    fail('hardcoded_value', file, path, 'Literal used as an object key: ' + key)
                if key == 'token_value' and child is not None:
                    fail('hardcoded_value', file, path + '.token_value', 'Literal token values are restricted to Foundations')
                scan_literals(child, file, path + '.' + key, key)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                scan_literals(child, file, f'{path}[{index}]', field)
        elif isinstance(value, str) and field not in IDENTITY_FIELDS:
            if LITERAL.search(value) or BARE_LITERAL.fullmatch(value.strip()):
                fail('hardcoded_value', file, path, 'Literal design value outside Foundations')
        elif type(value) in (int, float) and field not in {'tier', 'allowed_dependency_tiers'}:
            fail('hardcoded_value', file, path, 'Numeric value outside Foundations')

    def needed(value, file, path):
        if value is None or (isinstance(value, str) and (not value.strip() or value.lower() in PLACEHOLDERS)):
            fail('incomplete', file, path, 'Required specification is unpopulated')
            return False
        return True

    root = Path(root).absolute()
    contract = parse_json(Path(__file__).with_name('component_tiers_contract.json').read_text(encoding='utf-8-sig'))
    documents = {}
    seen = set()
    if not root.is_dir() or root.is_symlink() or root.is_junction():
        fail('coverage', str(root), '$', 'Root must be an existing real directory')
    else:
        def walk_error(error):
            fail('coverage', str(error.filename), '$', 'Directory cannot be read')
        for directory, dirs, files in os.walk(root, followlinks=False, onerror=walk_error):
            for name in list(dirs):
                target = Path(directory, name)
                if target.is_symlink() or target.is_junction():
                    fail('coverage', str(target.relative_to(root)), '$', 'Linked directories are not certifiable')
                    dirs.remove(name)
            for name in files:
                target = Path(directory, name)
                relative = target.relative_to(root).as_posix()
                seen.add(relative)
                if target.is_symlink():
                    fail('coverage', relative, '$', 'Linked files are not certifiable')
                    continue
                try:
                    text = target.read_bytes().decode('utf-8-sig')
                except (OSError, UnicodeError):
                    fail('coverage', relative, '$', 'Unreadable or non-UTF-8 file; never skipped')
                    continue
                if relative not in EXPECTED:
                    fail('coverage', relative, '$', 'File is outside the closed document contract; no format or extension is exempt')
                    if LITERAL.search(text):
                        fail('hardcoded_value', relative, '$', 'Literal design value in an additional file')
                    continue
                try:
                    value = parse_json(text)
                except ValueError as error:
                    fail('structure', relative, '$', str(error))
                    continue
                schema = contract['manifest' if relative == '_system.json' else 'tier']
                before = len(errors)
                check_schema(value, schema, relative)
                structural_ok = len(errors) == before
                if relative != TIER_FILES[0]:
                    scan_literals(value, relative)
                if structural_ok:
                    documents[relative] = value
    for missing in sorted(EXPECTED - seen):
        fail('coverage', missing, '$', 'Required document is missing')

    manifest = documents.get('_system.json')
    refs = set()
    if manifest:
        if manifest['core_token_file'] != TIER_FILES[0]:
            fail('structure', '_system.json', '$.core_token_file', 'Foundations location cannot be reassigned to evade the gate')
        registered = [(x['tier'], x['file']) for x in manifest['tiers']]
        if registered != list(enumerate(TIER_FILES)):
            fail('structure', '_system.json', '$.tiers', 'Register each of the eight canonical tiers exactly once, in order')
        if manifest['status'] != 'complete':
            fail('incomplete', '_system.json', '$.status', 'System is not marked complete')
        for i, ref in enumerate(manifest['references']):
            if ref['reference_id'] in refs:
                fail('structure', '_system.json', f'$.references[{i}]', 'Duplicate reference ID')
            refs.add(ref['reference_id'])
            for field in ('reference_id', 'url', 'evidence_kind'):
                needed(ref[field], '_system.json', f'$.references[{i}].{field}')

    tokens = {}
    components = {}
    for tier, file in enumerate(TIER_FILES):
        doc = documents.get(file)
        if not doc:
            continue
        if doc['tier'] != tier or doc['allowed_dependency_tiers'] != list(range(tier)):
            fail('structure', file, '$.tier', 'Tier identity or allowed dependencies are incorrect')
        if doc['status'] != 'complete':
            fail('incomplete', file, '$.status', 'Tier is not marked complete')
        if manifest and doc['system_id'] != manifest['system_id']:
            fail('structure', file, '$.system_id', 'System identity differs from manifest')
        for i, tok in enumerate(doc['tokens']):
            path = f'$.tokens[{i}]'
            if tok['token_name'] in tokens:
                fail('structure', file, path, 'Duplicate token name')
            tokens[tok['token_name']] = (tier, tok, file, path)
            for field in ('category', 'token_name', 'value_type'):
                needed(tok[field], file, path + '.' + field)
            if tok['status'] != 'complete':
                fail('incomplete', file, path + '.status', 'Token is not marked complete')
            if tier == 0:
                literal, alias = tok['token_value'], tok['reference_token']
                if (literal is None) == (alias is None):
                    fail('incomplete', file, path, 'Foundation token needs exactly one value or alias')
                if literal is not None:
                    needed(literal, file, path + '.token_value')
                    if literal == '' or literal == [] or literal == {}:
                        fail('incomplete', file, path + '.token_value', 'Empty token value')
                    if tok['value_type'] in {'dimension', 'duration'} and type(literal) in (int, float):
                        needed(tok['unit'], file, path + '.unit')
                    for field in ('reference_id', 'measurement_method'):
                        needed(tok['evidence'][field], file, path + '.evidence.' + field)
                    if tok['evidence']['reference_id'] not in refs:
                        fail('reference', file, path + '.evidence.reference_id', 'Source is not registered')
            else:
                needed(tok['reference_token'], file, path + '.reference_token')
                if tok['unit'] is not None:
                    fail('hardcoded_value', file, path + '.unit', 'Units belong to the Foundation definition')
        for i, comp in enumerate(doc['components']):
            key = (tier, comp['component_id'])
            if key in components:
                fail('structure', file, f'$.components[{i}]', 'Duplicate component ID in tier')
            components[key] = (comp, file, f'$.components[{i}]')

    def foundation_ref(name, file, path, trail=()):
        record = tokens.get(name)
        if not record or record[0] != 0:
            fail('reference', file, path, 'Reference must name an existing Foundation token')
            return None
        if name in trail:
            fail('reference', file, path, 'Foundation alias cycle')
            return None
        token = record[1]
        if token['reference_token'] is not None:
            return foundation_ref(token['reference_token'], file, path, trail + (name,))
        if token['token_value'] is None:
            fail('incomplete', file, path, 'Foundation reference has no resolved value')
        return token

    for name, (tier, tok, file, path) in tokens.items():
        if tok['reference_token'] is not None:
            resolved = foundation_ref(tok['reference_token'], file, path + '.reference_token', (name,) if tier == 0 else ())
            if resolved and resolved['value_type'] != tok['value_type']:
                fail('reference', file, path, 'Reference value type differs from the Foundation token')

    if manifest:
        for i, theme in enumerate(manifest['themes']):
            needed(theme['name'], '_system.json', f'$.themes[{i}].name')
            for name, target in theme['foundation_overrides'].items():
                foundation_ref(name, '_system.json', f'$.themes[{i}].foundation_overrides')
                foundation_ref(target, '_system.json', f'$.themes[{i}].foundation_overrides.{name}')

    for (tier, component_id), (comp, file, path) in components.items():
        for field in ('name', 'purpose'):
            needed(comp[field], file, path + '.' + field)
        if comp['status'] != 'complete' or comp['include_in_flow'] is not True:
            fail('incomplete', file, path, 'Required component must be complete and included; remove out-of-scope candidates with a documented scope decision')
        needed(comp['design_spec']['figma_component_id'], file, path + '.design_spec.figma_component_id')
        for field in ('name', 'kind', 'file_path'):
            needed(comp['recipe'][field], file, path + '.recipe.' + field)
        if comp['derivation']['source_status'] not in {'verified_reference', 'explicit_design_decision'}:
            fail('incomplete', file, path + '.derivation', 'Component source is not verified or explicitly decided')
        if comp['derivation']['missing_element_references'] or comp['derivation']['unresolved_specifications']:
            fail('incomplete', file, path + '.derivation', 'Component derivation still has unresolved gaps')
        if not comp['reference_ids'] or not set(comp['reference_ids']).issubset(refs):
            fail('reference', file, path + '.reference_ids', 'Register component reference evidence')
        if not set(comp['design_spec']['motion_reference_ids']).issubset(refs):
            fail('reference', file, path + '.design_spec.motion_reference_ids', 'Motion source is not registered')
        if not comp['token_bindings']:
            fail('incomplete', file, path + '.token_bindings', 'Component has no Foundation bindings')
        for i, binding in enumerate(comp['token_bindings']):
            for field in ('slot', 'property', 'token_name'):
                needed(binding[field], file, path + f'.token_bindings[{i}].{field}')
            foundation_ref(binding['token_name'], file, path + f'.token_bindings[{i}].token_name')
        for dep in comp['depends_on']:
            if dep['tier'] >= tier or (dep['tier'], dep['component_id']) not in components:
                fail('reference', file, path + '.depends_on', 'Dependency must resolve to an existing lower-tier component')
        for field in ('variants',):
            for parent in ('design_spec', 'recipe'):
                for variant in comp[parent][field]:
                    if variant['default_value'] not in variant['values'] or not variant['values']:
                        fail('incomplete', file, path + '.' + parent + '.variants', 'Variant default must be one of its named choices')
        defaults = comp['recipe']['default_variants']
        choices = {v['name']: v['values'] for v in comp['recipe']['variants']}
        for name, value in defaults.items():
            if name not in choices or value not in choices[name]:
                fail('reference', file, path + '.recipe.default_variants', 'Unknown variant choice')

    if not tokens or not any(tier == 0 for tier, *_ in tokens.values()):
        fail('incomplete', TIER_FILES[0], '$.tokens', 'Foundations cannot be empty')
    if not any(tier == 7 for tier, _ in components):
        fail('incomplete', TIER_FILES[7], '$.components', 'Completed flow needs at least one assembled screen specification')
    counts = dict(Counter(e['kind'] for e in errors))
    return {'gate_passed': not errors, 'coverage_percent': 100 if not counts.get('coverage') else None,
            'files_seen': len(seen), 'files_validated': len(documents),
            'hardcoded_values': counts.get('hardcoded_value', 0), 'error_counts': counts, 'errors': errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--json', action='store_true', help='Print the full machine-readable report')
    args = parser.parse_args()
    try:
        result = validate(args.directory)
    except Exception as error:
        result = {'gate_passed': False, 'errors': [{'kind': 'validator_error', 'message': str(error)}]}
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print('PASS' if result['gate_passed'] else 'FAIL: gate remains closed')
        print('Files:', result.get('files_seen'), 'Hardcoded values:', result.get('hardcoded_values'))
        print('Findings:', result.get('error_counts', {'validator_error': 1}))
        for error in result['errors'][:12]:
            print(f"{error.get('file', '')}:{error.get('path', '')}: {error['message']}")
        if len(result['errors']) > 12:
            print('Use --json to see all findings.')
    return 0 if result['gate_passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
