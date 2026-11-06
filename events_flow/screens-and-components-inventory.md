# Events flow — screens and component inventory

The product has two discovery paths: browse events and decide on a small prescribed card feed. “I want to go” saves interest. Choosing companions is optional. The user confirms their own attendance afterward; selected friends are invited separately and are never shown as registered merely because they were selected.

The journey specification is [user_flow.json](user_flow.json). This is a design prototype, not a working registration service.

## Product scenes

| Scene | Goal | Component families |
|---|---|---|
| Browse events | Scan and compare interesting events | event_row, date_group, friends_attending, event_navigation |
| For you / decision card | Decide on each event in a small prescribed feed | event_decision_card, pass_action, interest_action, batch_progress, friends_attending |
| Event details | Evaluate event, venue, hosts and social context | event_hero, event_metadata, registration_status, location_map, host_row, attendee_stack, rich_description, interest_action |
| Choose companions / optional | Choose friends to invite or continue alone | event_summary, companion_row, selection_indicator, selected_count, continue_action, continue_alone_action |
| Review / on my own | Confirm own attendance without companions | event_summary, attendance_boundary, confirm_action |
| Review / with companions | Confirm own attendance and review invitations | event_summary, selected_companions, invitation_status, confirm_action |
| Attendance confirmed | Know own attendance is confirmed and invitations remain separate | success_mark, event_summary, own_attendance_status, companion_invitation_status, my_events_action |
| Friends' events | See events friends have signed up for | friend_activity_row, event_row, attendance_status, open_event_action |
| My events / upcoming | Distinguish interested, going and waiting events | event_period_tabs, event_row, registration_badge |
| My events / past | Revisit previous events | event_period_tabs, event_row |
| For you / decisions complete | Know the current prescribed batch is finished | completion_message, saved_interests_action, browse_action |
| Saved interests | Resume a saved event without implying registration | event_row_interested, continue_planning_action |

## Source coverage

Luma supplies event rows, metadata, detail artwork, actions, status badges, venue/map, hosts, attendee previews, rich descriptions and registration presentation. The existing Connection Flow library supplies the Hinge-style decision pattern. The source contains twenty-one PNG captures, with three duplicates; the references are evidence, not editable deliverables.

The card-feed composition, companion selection, friends’ attendance, saved-interest state and companion invitation status are new product derivations authorized by the user’s brief. They must be labeled as product decisions rather than falsely attributed to Luma. Full literal recreation of every Luma feed and long biography viewport is secondary reference coverage, not the main product journey.

| Source specimen | Reference | Available reference elements |
|---|---|---|
| Home / no saved events | [13:3](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-3) | status bar; account/brand toolbar; create and notifications controls; section headers; recommendation selector; date groups; poster thumbnails; host identity; event title; time and venue metadata; price/status badges; floating navigation |
| Home / saved events | [13:4](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-4) | status bar; account/brand toolbar; create and notifications controls; section headers; recommendation selector; date groups; poster thumbnails; host identity; event title; time and venue metadata; price/status badges; floating navigation |
| Home / discovery feed | [13:5](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-5) | status bar; account/brand toolbar; create and notifications controls; section headers; recommendation selector; date groups; poster thumbnails; host identity; event title; time and venue metadata; price/status badges; floating navigation |
| Upcoming / empty | [13:8](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-8) | status bar; back/filter controls; Upcoming/Past segmented control; dated event rows; registration status; floating navigation; reference-backed empty-state icon and faded skeleton rows |
| Upcoming / populated | [13:9](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-9) | status bar; back/filter controls; Upcoming/Past segmented control; dated event rows; registration status; floating navigation; reference-backed empty-state icon and faded skeleton rows |
| Past events | [13:10](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-10) | status bar; back/filter controls; Upcoming/Past segmented control; dated event rows; registration status; floating navigation; reference-backed empty-state icon and faded skeleton rows |
| Event / free | [13:17](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-17) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / paid | [13:18](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-18) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / limited capacity | [13:19](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-19) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / invited | [13:12](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-12) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / waitlist | [13:21](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-21) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / registered | [13:22](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-22) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / location, hosts and attendees | [13:23](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-23) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / about | [13:24](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-24) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / host biographies | [13:25](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-25) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Event / code of conduct | [13:26](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-26) | status bar; back/share or collapsed toolbar; content artwork where present; featured-location strip; title/date/price/capacity/status; registration/contact/more actions; venue/map; hosts/social link; attendee stack; rich text; tag; floating navigation |
| Invitation / confirm registration | [13:13](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-13) | status bar; drag handle; close control; event summary and artwork or success mark; confirmation action or success copy |
| Invitation / success | [13:14](https://www.figma.com/design/AEV0dOjWeK6EzC1vR8zeVK/Coding-with-GPT-Project?node-id=13-14) | status bar; drag handle; close control; event summary and artwork or success mark; confirmation action or success copy |


## Scope and implementation boundaries

- Preserve every nested element needed by the selected product scenes. Hosting setup, payment checkout, unrelated chat UI and OS interfaces are outside this subflow. Paid/waitlist events have informative component variants; their full purchase/request forms are not invented.
- Candidate template elements unrelated to these scenes may be removed with this scope decision. Actual needed controls and states must remain.
- Posters, portraits and map tiles are content-only image crops. UI text, symbols, controls and hierarchy remain native editable layers. No Mobbin strip appears in the product.
- DM Sans is a provisional available font, not a verified font identification. Foundation evidence records measured raster values and explicit reconstruction decisions. Motion is not inferable from PNGs; prototype navigation uses an instantaneous transition.
- Recipe documents describe slots, variants, defaults and direct Foundation references. They are not executable PandaCSS implementations; that conversion is the next workflow.

## Behavior and backend contract

Event presentation accepts event ID, artwork, title, host identities, date/time/timezone, venue, price, availability, attendee previews and the current user’s interest/registration status. The prescribed feed also accepts a bounded ordered event batch and a current index. Pass advances the batch; interest saves the event before entering optional companion selection. Companion rows accept friend ID, display name, authorized avatar, selection state and existing attendance/invitation status. The solo path must work without any selection.

Confirming attendance requests registration for the current user only. Sending invitations is a separately named request for selected users, after explicit review. Server responses determine registered, waitlisted, invited or declined states. Friends’ event activity is authorized shared attendance data. Demo names, dates and counts are fixtures, not claims about actual people or registrations.

Figma prototype routes demonstrate these transitions. They do not persist interest, register anyone, send invitations, enforce capacity, authorize access or implement event recommendations.
