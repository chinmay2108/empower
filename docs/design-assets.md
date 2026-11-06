# Design assets and validation

The imported Coding with GPT files preserve the team's Figma design work alongside the existing Empower app. Start with the [primary Figma library](../figma_designlibrary_pointer.md) and [journey summaries](../User_journeys_summarys.md).

| Location | Contents | Current status |
| --- | --- | --- |
| `events_flow/` | Event journeys, component tiers, recipes, Figma ledgers and export script | The local nine-file tier specification passes the strict validator. |
| `user_connecting_flow/` | Profile, matching and chat design work, component tiers, Figma ledgers and export script | In progress. The strict completion check currently fails. |
| `_templates/components_system_template/` | Blank component-tier scaffold | Intentionally unpopulated; not a completed design. |
| `skills/` | JSON contract, Python validator, regression tests and derivation notes | Standard-library Python tooling; no package installation needed. |

These are design inputs, not newly implemented app features. The imported connection journey explores profile discovery and matching; [the prototype proposal in PR #1](https://github.com/chinmay2108/empower/pull/1) proposes mutual adding after meeting. The team still needs to settle that product decision before implementation. The existing HTML/CSS/JavaScript app remains the runtime. References to PandaCSS recipes in the design notes are proposals, not an adopted dependency or a change to the course stack.

## Run the automated checks

From the repository root, with Python 3.13:

```sh
python -B skills/test_validate_component_tiers.py
python -B skills/validate_component_tiers.py events_flow/events_system_tokens
python -B events_flow/figma/export_foundation_sync.py --plan
python -B user_connecting_flow/figma/export_foundation_sync.py --plan
```

The `Design validation` GitHub Actions job runs these same commands on pull requests and pushes to `main`. The regression suite has 20 tests, including valid fixtures and failures for missing fields, unresolved references, forbidden literals, extra files and incorrect CLI exit codes. The events gate checks all nine specification files. Export planning generates scripts in memory and reports batch sizes; it does not contact or modify Figma.

To inspect the unfinished connection specification separately:

```sh
python -B skills/validate_component_tiers.py user_connecting_flow/userconnections_system_tokens --json
```

At the November 5, 2026 import check, this exits 1 with 797 incomplete-field findings and 38 reference findings. Its manifest is `in_progress`. The completion gate is not included in the passing CI job. Promote the connection specification after the strict validator passes and a teammate approves the resolved journey; add its completion command to CI in the same change. The template also intentionally fails completion, as covered by a regression test.

A green job verifies the listed local contracts and export generation. It does not verify visual design, current Figma node state, browser interactions, or backend behavior. Existing Figma verification records are historical snapshots. Follow [the contribution process](../CONTRIBUTING.md) for teammate review and the manual scenarios required by app changes.
