# User journey summaries

We are building a mobile app interface by adapting components and UI patterns from reference apps that match our product's user journeys. This document indexes those journeys and provides a starting point for each detailed flow.

## Journey index

1. [User connect and match](#01-user-connect-and-match) — Hinge-inspired profile discovery, matching, and conversations.

## 01 User connect and match

**Reference app:** Hinge.

**User goal:** Discover other users, form a match, and start or continue a conversation with that match.

### Flow summary

1. **View profiles.** Browse other users through a profile view inspired by the Hinge references.
2. **Express interest or move on.** Use a similar profile-browsing and “swipe” path to indicate interest in another user or continue to the next profile. The exact gestures and controls will be defined in the detailed flow.
3. **Match with another user.** Mutual interest creates a match between the two users.
4. **Find matches in the Chat tab.** New matches populate the Chat tab alongside conversations with the user's previous matches.
5. **Open a conversation.** Select a match to begin chatting, or return to an existing conversation.

**Journey:** Profile discovery → Interest → Mutual match → Chat tab → Conversation.

### Design reference pointers

- [Hinge — full references](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=0-1&m=dev)
- [Sending a like](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=2-2&m=dev)
- [Matching with a user](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=2-7&m=dev)
- [Chatting with a user](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=2-57&m=dev)

### Next deep dive

Expand this journey in its dedicated flow folder, defining the profile view, interest and match interactions, Chat tab, and conversation screens. Use the references above to identify the components and UI patterns to adapt.

## Events and shared plans

Browse or decide on prescribed events, save interest, optionally choose companions, confirm attendance, and see friends’ events. Reference: Luma plus the Hinge decision pattern. [Journey](events_flow/user_flow.json) · [Component inventory](events_flow/screens-and-components-inventory.md).
