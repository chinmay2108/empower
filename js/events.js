/* ==========================================================================
   events.js: controller for pages/events.html

   STORY (owner: TBD, decided at the Thursday team meeting)
   As Rick the Relocator, I want to see this week's top picks and commit to one with a leave time, so that going feels decided.

   Owner builds this in their PR. Guidelines from the course:
   - Structure in pages/events.html, look in css/styles.css classes, behavior here.
   - Use Empower.store for all saved data. Functions you will likely need:
       getProfile(), getGroups(), Empower.schedule.upcomingSessions(...), getCommitments(), addCommitment(fields)
   - Put rules in small named functions with no hidden inputs (pass "now" in
     rather than reading the clock inside), so each Given-When-Then scenario
     maps to one function you can check.
   - Log key moments with Empower.log("events.something_happened", {...}).
   - Do not edit other pages' files. Need a change to a shared file
     (store.js, ui.js, styles.css)? Open a separate small PR for it.
   ========================================================================== */

(function () {
  Empower.ui.renderNav("events");
  Empower.log("events.viewed", {});
})();
