/* ==========================================================================
   onboarding.js: controller for pages/onboarding.html

   STORY (owner: TBD, decided at the Thursday team meeting)
   As Rick the Relocator, I want to tell Empower my interests and free evenings, so that I only see events that fit me.

   Owner builds this in their PR. Guidelines from the course:
   - Structure in pages/onboarding.html, look in css/styles.css classes, behavior here.
   - Use Empower.store for all saved data. Functions you will likely need:
       saveProfile(profile), getProfile()
   - Put rules in small named functions with no hidden inputs (pass "now" in
     rather than reading the clock inside), so each Given-When-Then scenario
     maps to one function you can check.
   - Log key moments with Empower.log("onboarding.something_happened", {...}).
   - Do not edit other pages' files. Need a change to a shared file
     (store.js, ui.js, styles.css)? Open a separate small PR for it.
   ========================================================================== */

(function () {
  Empower.ui.renderNav("me");
  Empower.log("onboarding.viewed", {});
})();
