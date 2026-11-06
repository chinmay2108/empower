# Events flow component library

The editable design derivation is ready for review. It covers browsing, a prescribed event-card decision, saved interests, optional companion selection, solo/group review and confirmation, friends’ attendance, and personal upcoming/past events. “I want to go” saves interest; selecting companions is optional; confirming attendance registers only the current user. A selected friend receives a separate invitation.

Open [Discover and choose](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=58-623) and [Review and attend](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=58-1438). These boards contain editable instances. Construction masters sit to their right. Top-level frames below the boards contain the representative clickable prototype; start at [Browse](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=61-2600) or [For you](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=61-2701) and use Figma Present.

The catalog contains 116 main components, including 14 assembled screen variants, with 707 locally owned elements. It records 326 Foundation definitions, 268 native Figma variables, 11 shared text styles, direct token bindings and lower-tier dependencies.

## Review path

This handoff and its artifacts are in the repository's `events_flow` subfolder. Daniel's local checkout is `C:\Users\danie\NovaCaelum_code\coding_with_gpt_final`; run the commands below from your own checkout root.

In Figma Present, start at **For you** and choose **I want to go**. Continue alone to review and confirm your own attendance, or select Maya and follow the separate invitation branch. The card feed is a small recommended selection; saved interests are events retained for later without confirming attendance. Use **View saved interests** to review that collection. Also review Browse, event details, Friends, and My events on the two boards.

Check that each scene contains the elements needed for these journeys, that the solo path is clear, and that inviting someone never implies they are already registered. Review provisional typography and reconstructed details for visual acceptance. Leave feedback as comments on the corresponding Figma scene, or report it in this chat. This is design and interaction review; the prototype does not submit real registrations or invitations.

## Start here

- [Journey and transitions](user_flow.json): product objective, optional companion branch and integration boundaries.
- [Screen and reference inventory](screens-and-components-inventory.md): what is in scope and what came from Luma, Hinge or the product brief.
- [Tier manifest](events_system_tokens/_system.json): the nine-file closed specification and links to tiers zero through seven.
- [Foundation registry](events_system_tokens/tier_00_foundations.json): the only source of literal design values.
- [Component ledger](figma/component-ledger.json): each component’s Figma identity, its dependencies, and each local element’s parent, owner and token mapping. An instance points to its lower-tier main component, whose elements supply the next nesting level.
- [Recipe specifications](recipes/events.recipe-specs.json): slots, dependencies, variants and Foundation references. These are declarative design recipes, not executable PandaCSS components.
- [Fresh comparison and repairs](reference-coverage-sweep.md): the independent coverage findings and their dispositions.

## Change a core value

Edit the Foundation registry, then run these commands from the code project root:

```powershell
python -B skills/validate_component_tiers.py events_flow/events_system_tokens
python -B events_flow/figma/export_foundation_sync.py --plan
python -B events_flow/figma/export_foundation_sync.py --batch 0
```

The last command prints a Figma MCP script; it does not contact Figma. An agent with Figma access applies every batch listed by `--plan`, in order, using `use_figma` with the active file session. Follow the installed Figma skill requirements. The registry and ledger choose the target file and node identities. Review the affected screen after synchronization. This is an explicit export/apply workflow, not an automatic filesystem watcher. Direct changes to Figma variables propagate to their bound masters and instances, but do not update the local registry. Treat such edits as experiments until their values are reconciled into the Foundation registry; otherwise the next export/apply will overwrite them. Make durable token changes in the registry first.

## Verification and limits

Verification snapshot: **2026-11-05**, for the node identities linked above. The [verification record](figma/verification-record.json) records the checks and SHA-256 hashes of the reviewed local specifications; it is a snapshot, not a Git revision or a guarantee against later Figma edits.

The strict tier gate passes all nine files with zero downstream hardcoded values. All 20 existing validator regression tests pass. All four generated synchronization batches were applied successfully. A temporary Foundation height change reached both a decision-control master and a screen instance, then restored. The final Figma identity check found all 116 catalogued components, no foreign variable references and no missing fonts. The fresh reference sweep’s four findings were repaired and visually checked. A final layout reflow made both completion actions visible.

The prototype demonstrates one event and the Maya invitation branch. The prescribed-card specimen shows the final card of an example batch; Pass goes to batch completion. Other selections, filters, contact/share actions, recommendation ranking and backend persistence are component contracts, not implemented runtime behavior. Interest and attendance screens are fixture states. Names, event details and counts are demonstration content.

DM Sans remains provisional and flagged for review. Raster measurements and reconstructed icon/background geometry are documented derivation choices, not claims of recovered original design tokens. The next workflow converts these specifications into executable PandaCSS recipes. Cross-flow systematization comes after additional reference flows.

The confirmed repository destination is [chinmay2108/empower](https://github.com/chinmay2108/empower), with collaborator access for Highproofhero. See [Design assets and validation](../docs/design-assets.md) for import scope and CI coverage. The vault remains outside Git, and no dependency installation was performed there.
