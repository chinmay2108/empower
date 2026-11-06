---
name: subflow-component-derivation
description: Draft workflow for deriving an editable subflow component library, checking reference coverage with a fresh subagent, finalizing Foundation-bound tier specifications, and promoting the project changes through a commit and PR.
---

# Subflow component derivation

Status: Draft. This captures Daniel's process so far; later steps may be added through his walkthrough.

## Purpose and priority

Create a strong, reusable frontend foundation for an effective mobile MVP. The difficult work is deriving editable, faithful components from references and efficiently assembling them into the required screens. Prioritize missing element references and unresolved component specifications. Production completeness and exhaustive loading or failure screens are secondary at this stage.

Deliver an editable Figma component library with the required screens assembled and a populated component-tier catalog in the subflow folder. Derive components and record their Foundation bindings together. The final stages are a fresh reference-coverage sweep, reconciliation of the system-token documents, and promotion to the project repository. PandaCSS implementation follows this design-library workflow; record recipe specifications now without claiming executable recipes exist. Cross-flow systematization happens later, after collecting multiple flows and reference apps, in its own workflow.

## Setup steps

1. **Create a new subflow folder** in the working code project. Keep the objective, reference inventory, screen/component mapping, and derived tier documents together there.
2. **Define the journey and write down its objective.** Identify the outcome, the necessary screens, and the elements each screen needs. Each flow node represents a screen. Capture derivation priorities here if already known.
3. **Establish the reference source.** Prefer a Figma file, but accept other sources when appropriate. Record exact source links and the relevant screens or elements. Do not assume every reference supplies editable components.
4. **Inspect the references and take stock.** Map required elements to available material. Distinguish visual evidence, editable structure, extractable specifications, and missing references. A PNG can help identify an element; it does not supply a reusable component or verified font, spacing, or motion data by itself.
5. **Clarify derivation priority if Step 2 did not establish it.** Confirm which components matter most to the journey and which missing element references or specifications impede faithful construction. Optimize the path from reference evidence to reusable components.

## Derivation and final stages

1. **Prepare the tier scaffold and Foundations.** Copy `_templates/components_system_template` into the subflow's system-token folder. Establish the in-scope screen/component inventory. Resolve literal design values in **Tier 0 — Foundations** from source evidence or an explicit design decision; bind downstream values directly to those tokens. Populate the catalog as components are derived.
2. **Derive editable components and assemble the scenes.** Build native editable Figma text, shapes, icons, reusable components, variants, and screen assemblies in the working library. Record source links, Figma identities, token bindings, and the nesting/dependency relationships across tiers. Preserve provisional decisions visibly for review. A flattened screen image does not satisfy this deliverable.
3. **Run one fresh subagent reference-coverage sweep, then derive omissions.** Launch a separate subagent with no inherited construction history. Give it the journey objective, agreed scope, exact reference-library links, and exact working-library links. Have it independently inspect both libraries, compare each in-scope scene and its nested elements, and report what is missing, incomplete, flattened, or materially inconsistent. Include icons, controls, text, states visible in the reference, and nested component content; prioritize missing elements on the screens being built over speculative production screens. Each finding must identify the source evidence and the corresponding working node or missing destination. Keep optional and out-of-scope items explicitly distinguished. The primary agent derives or repairs every confirmed in-scope omission and verifies the affected result. Record the findings and their dispositions beside the subflow inventory, outside the validator's closed system-token folder. One fresh sweep is required; do not automatically launch repeated reviewers. Unresolved in-scope findings block completion.
4. **Finalize the system-token catalog to match the built library.** Reconcile all tier documents, not just Foundations: each built component and screen needs its tier, Figma ID, lower-tier dependencies, slots, variants, source evidence, and element/property-to-Foundation token bindings. Update the Figma identity ledger and synchronization mapping, including components added during the sweep. Record recipe names, slots, variants, and defaults to the extent specified; do not invent recipe implementations or file paths. Every required specification field must be populated and every reference must resolve before the gate clears. Use the closed contract and command in [Mandatory gate](#mandatory-gate) below. Run the validator on the entire derived system-token folder, fix findings, and rerun until the full gate passes. Verify that changed Foundation bindings and recorded synchronization still work in Figma. A zero-hardcode count alone is not a passing completion gate; unresolved or deferred required specifications keep it closed.
5. **Promote last.** After the sweep findings are resolved, the catalog reflects the final library, and the mandatory gate passes, review the project diff, create or select a task branch, commit the intended project files, push that branch, and open a PR against the confirmed project repository. Use a promotion command only when its applicability to this project is verified; otherwise use the normal Git workflow described here. An Agent OS-specific `/promote` or `/git-promote` command must not be run against this app project; use the project's normal branch/commit/PR workflow instead. Include the component catalog, Foundation registry, supporting scripts, and, when requested for the handoff, the current Figma export at the code project root. Accept a user-supplied export; otherwise export it through Figma. Keep the live Figma link discoverable. Report the PR URL, commit, validation evidence, and actual remaining limitations. Honor existing checks and the user's requested auto-merge policy without bypassing requirements. If the repository destination, access, a requested export, or gate is unresolved, report the specific unfinished item; do not claim promotion succeeded. Do not initialize Git or deposit code/dependencies in the vault workspace.

## Absolute Foundation rule

- Literal design values may exist only in `tier_00_foundations.json`, the scaffold's Tier 0 registry. That file is the current Foundation location; no separate folder is implied by the existing scaffold.
- Every value reference in Tiers 1–7, component bindings, themes, and recipe specifications must point directly to a declared Foundation token. Foundation aliases may reference other Foundation tokens, must terminate at a value, and must not form cycles.
- Colors, typography, dimensions, spacing, borders, radii, shadows, opacity, layers, and motion values receive no downstream literal exceptions. Zero is a value too. Keep units with the Foundation definition.
- Components depend only on lower tiers. Central token values must propagate through their bindings and recipes; do not paste resolved values into components.
- Unknown values stay unresolved while work is in progress. An unresolved value fails completion; do not invent one to pass the gate.
- Tier numbers, identifiers, property names, variant labels, source URLs, and explanatory prose are metadata, not design values. They cannot be used as alternative containers for literal style configuration. Unknown fields fail validation.
- Candidate components may be removed only through a documented scope decision. Do not remove required entries, change the contract, hide files, or weaken the validator merely to obtain a pass.

## Mandatory gate

From the code project root, run:

```powershell
python -B skills/validate_component_tiers.py user_connecting_flow/userconnections_system_tokens
```

For a full report, append `--json`. This changes presentation only; it does not relax checks.

**The gate clears only when the command exits 0 and reports PASS / `gate_passed: true`: every file is validated, zero hardcoded design values exist outside Foundations, every required field is complete, and all token and component references resolve. There is no warning-only mode, allowlist of violations, or partial-pass threshold.**

Exit 1 means the gate remains closed. A validator crash, malformed document, missing required file, unreadable file, duplicate JSON key, or unsupported file also fails.

The validator recursively inventories all files, including hidden files and files in nested directories. It does not ignore files by extension. Its certifiable format is the closed contract in [component_tiers_contract.json](component_tiers_contract.json). Additional documents, source code, binary files, linked files/directories, and unrecognized structures fail as unvalidated rather than being silently accepted. Support for another format requires a deliberate parser/contract extension and tests before that format can clear the gate. This is fail-closed coverage, not a claim that regex can prove arbitrary code contains no literals.

The current blank template must **fail the completion gate** even when it contains no hardcoded downstream values. For a quick template check:

```powershell
python -B skills/validate_component_tiers.py _templates/components_system_template
```

Required schema fields must be present. Null is permitted only for structurally inactive or optional fields: the unused value/alias branch, unit on a non-dimensional token, optional evidence notes or node ID, and manifest origin. Schema examples under `_system.json.entry_shapes` are documentation, not unfinished components. Empty collections are allowed where nothing applies, but an in-scope component, required binding, or final screen cannot be omitted. Exact field presence is checked mechanically; scope completeness must also be checked against the journey's screen/element inventory.

## Checks maintained with the validator

```powershell
python -B skills/test_validate_component_tiers.py _templates/components_system_template
```

Tests use isolated synthetic copies. They verify a completed fixture passes and that a single literal, missing field, unresolved reference, alias cycle, invalid dependency, or unvalidated file fails. Never populate the user's blank template with test values.

A passing specification gate proves the checked document contract and token policy. It does not by itself prove editable Figma coverage, working synchronization, executable PandaCSS recipes, or runtime behavior. The fresh comparison and targeted Figma checks supply the design evidence; recipe implementation and runtime behavior require their own later validation. Carry the Foundation-only rule into those formats and extend enforcement before claiming them compliant.
