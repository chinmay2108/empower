# Connection flow component library

This handoff is for reviewing and editing the current Figma assets; PandaCSS conversion is a subsequent task.

Open the [editable review board](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-592) on **Connection Flow - library**. It contains a profile-card assembly and five chat screens. The screen examples are instances; the reusable main components are below the board.

| Example | Included elements |
|---|---|
| [Profile family](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-595) | Photo, prompt, like control, and the age/gender/orientation/ethnicity/relationship details panel with editable icons and dividers. The pass control remains a separate screen-level component. |
| [Matches list](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-631) | Status bar, title, Your turn/Their turn group headers, avatars, names, previews, Start chat badge, separators, bottom navigation, notification counts, and home indicator. |
| [Conversation: start](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-725) | Back/name/more header, Chat/Profile tabs, matched-photo context, timestamps, start notice, message hint, empty composer, microphone, and home indicator. |
| [Conversation: composing](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-782) | Compact matched-photo context, draft text, send action, and editable keyboard keys/icons. |
| [Conversation: sent](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-915) | Outgoing message bubble, sent label, timestamp, composer, and keyboard. |
| [Conversation: received](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK?node-id=30-1050) | Partial photo context, incoming avatar/message rows, timestamp, voice-note prompt with close control and waveform, and composer. |

These are reference-derived design examples. Incoming Likes remains optional and unbuilt. Send interest and match acknowledgment are still separate inventory items. Only visible reference content is reproduced; the second Their turn conversation is below the source screenshot and has not been invented. The voice-note promotion is included as a reference component, not a product commitment.

## Editing and Foundation ownership

The sole source of literal design values is [tier_00_foundations.json](userconnections_system_tokens/tier_00_foundations.json). The profile and chat entries use the profile and connections namespaces. Other tiers reference these tokens; they contain no copied design literals.

[connection-flow-ledger.json](figma/connection-flow-ledger.json) is the current cross-tool identity map for all sixty-four main components, both variant sets, native variables, bindings, and generated geometry. The earlier per-stage ledgers are historical construction records, not synchronization inputs. Fifty-seven main components were added for the details and chat work, including the five screen masters.

Supported visual properties bind to the **User Connections / Foundations** Figma collection. Native text, vector icons, dividers, containers, and component instances remain editable. Photos and avatars alone use replaceable image fills; the supplied face obscuration remains. Text properties expose content such as names, previews, labels, messages, and context. Conversation rows have new/unread/read variants; the composer has idle/typing variants. Edit main components or their exposed properties to update instances.

Typography is provisional with explicit user approval, and its tokens remain flagged for review. Source-pixel normalization, responsive layout, and full draft visibility are documented prototype decisions; they are not verified original device or motion specifications. Color/geometry evidence and review status live on the individual Foundation entries.

Figma cannot bind path coordinates, crop matrices, or these absolute badge offsets directly to variables. The exporter regenerates those recorded properties from Foundations. Auto-layout computes content-dependent sizes; top-level canvas placement is library organization, not a screen style token.

## Synchronizing local changes into Figma

Code root: C:\Users\danie\NovaCaelum_code\coding_with_gpt_final. All relative paths in this document are rooted at its user_connecting_flow subfolder, except the commands below, which run from the code root.

After editing Foundations, run from that root:

    python -B user_connecting_flow/figma/export_foundation_sync.py --plan

The output lists the current ordered batch indexes. Emit each batch in that order:

    python -B user_connecting_flow/figma/export_foundation_sync.py --batch N

Replace N with a listed index. Each output is JavaScript to apply through the connected Figma **use_figma** tool with file key **AEV0dOjWeK6EzC1vR8zeVK** and a current session ID from **create_session**. The helper prints scripts; it does not contact Figma or synchronize automatically. Review and apply every listed batch. Do not save generated literal payloads into downstream tier files.

The variable batch updates existing variables. Geometry batches regenerate traced icons, recorded photo crops, and badge positions while preserving node identities. Per-instance content overrides outside the ledger remain content choices. Reopen the affected examples after a change. The earlier profile builder is creation-only and must not be rerun as an update mechanism.

## Runtime contract and remaining work

These are editable design assets. Click navigation, message sending, double-tap likes, microphone recording, dismissal, and the keyboard are not wired interactions. Proposed inputs/actions are recorded on the tier components for later implementation. Controllers will supply authenticated match/conversation identities, profile data, messages, unread state, draft state, and send/record outcomes; no backend endpoints or live chat service exist in this deliverable.

Next, convert reviewed Figma components into PandaCSS recipes that consume the same semantic Foundation tokens. Cross-flow systematization happens after more reference flows have been compiled.

## Verification and gate status

Snapshot: November 5, 2026; the recorded Figma identities identify the checked assets. The fresh-context handoff review found path and gate-discovery ambiguities; those are clarified here.

Visual review covered the details panel, matches list, and all four conversation states. The native audit verified 238 Foundation variables against the local registry, using numeric precision tolerance, and 2,051 recorded binding assertions with no mismatches. The cloned photo components' native bindings were also read and registered. A further 192 bindings on the four profile field components passed; all 288 recorded node identities resolved. Profile field defaults were retested through the variable sync batch, and their labels remained correct. The expanded sync exporter was exercised against the live file: its variable batch and both geometry batches succeeded; the resulting recorded crops and badge positions matched their Foundation inputs.

The unchanged tier validator inspected all nine canonical documents and found zero downstream hardcoded values. The full completion gate remains closed: the scaffold still has unfinished candidates, unresolved references, provisional specifications, and deferred recipes. This is not a claim that the entire subflow or tier system is complete. To list the remaining items from the code root, run `python -B skills/validate_component_tiers.py user_connecting_flow/userconnections_system_tokens --json`.

The simplify skill is unavailable in this harness; the exporter received direct review and an end-to-end live run. Native API assumptions were checked against the installed Plugin API documentation and live objects. No web UI or backend test applies to these design-only assets.
