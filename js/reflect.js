/* ==========================================================================
   reflect.js: controller for pages/reflect.html

   STORY (owner: TBD, decided at the Thursday team meeting)
   As Rick the Relocator, I want to log that I went and rate it in three taps, so that I can see my progress with that group.

   Owner builds this in their PR. Guidelines from the course:
   - Structure in pages/reflect.html, look in css/styles.css classes, behavior here.
   - Use Empower.store for all saved data. Functions you will likely need:
       getCommitments(), updateCommitment(id, changes), addReflection(fields)
   - Put rules in small named functions with no hidden inputs (pass "now" in
     rather than reading the clock inside), so each Given-When-Then scenario
     maps to one function you can check.
   - Log key moments with Empower.log("reflect.something_happened", {...}).
   - Do not edit other pages' files. Need a change to a shared file
     (store.js, ui.js, styles.css)? Open a separate small PR for it.
   ========================================================================== */

(function () {
  Empower.ui.renderNav("reflect");
  Empower.log("reflect.viewed", {});
})();
