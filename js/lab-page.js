/* ==========================================================================
   lab-page.js: the Matching Lab page (E8)
   Runs Empower.lab.run on the 500 synthetic people for 8 weeks and shows
   each strategy side by side. The model's assumptions are listed on the
   page so nobody mistakes this for real-world results.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var host = document.getElementById("lab-root");
  var WEEKS = 8;

  ui.renderNav("me");

  var LABELS = { random: "Random", interests: "Interests only", empower: "Empower picks" };
  var METRICS = [
    ["kindlingAt4", "Have a Kindling connection after 4 weeks", "The number we steer by: 3+ sessions with the same person."],
    ["showUpRate", "Show up to the pick", "Sessions attended out of sessions picked."],
    ["returnRate", "Go back the next week", "Attended sessions followed by the same group the next week."],
    ["likedRate", "Rate it Good or Great", "Out of sessions attended."],
    ["kindlingAt8", "Have a Kindling connection after 8 weeks", ""]
  ];

  function pct(x) { return Math.round(x * 100) + "%"; }

  function bars(results, key) {
    return Empower.lab.strategies.map(function (s) {
      var v = results[s][key];
      var width = Math.max(2, Math.round(v * 100));
      return '<div class="lab-bar"><span class="lab-bar__label">' + LABELS[s] + '</span>' +
        '<span class="lab-bar__track"><span class="lab-bar__fill lab-bar__fill--' + s + ' lab-w-' + width + '"></span></span>' +
        '<span class="lab-bar__value">' + pct(v) + "</span></div>";
    }).join("");
  }

  function render(results, ms) {
    host.innerHTML =
      '<p class="eyebrow">Matching Lab</p><h1 class="title">Do our picks work?</h1>' +
      '<p class="subtitle">Each of the ' + results.empower.people + " synthetic people plays an Empower user for " + WEEKS +
      " weeks. Every week one strategy picks one session for them.</p>" +
      METRICS.map(function (m) {
        return '<div class="card card--outline"><p class="card__title">' + m[1] + "</p>" +
          (m[2] ? '<p class="card__meta">' + m[2] + "</p>" : "") + '<div class="mt-3">' + bars(results, m[0]) + "</div></div>";
      }).join("") +
      '<h2 class="section-title">What this assumes</h2><ul class="tips small">' +
      "<li>People show up at their own reliability, much less often at times they said they're busy, and less often in groups above their comfort step.</li>" +
      "<li>They like a session more when it shares their interests, fits their comfort step, or they've been before.</li>" +
      "<li>Who else is there comes from the synthetic population's own weekly attendance.</li>" +
      "<li>These are model results, not real-world proof. Change the model in <code>js/lab.js</code> and run it again.</li></ul>" +
      '<p class="small muted">Ran in ' + ms + " ms. Same inputs give the same results every time.</p>";
  }

  var start = Empower.clock.now();
  var t0 = Date.now();
  var results = Empower.lab.run(store.getPopulation(), store.getGroups(), start, WEEKS);
  render(results, Date.now() - t0);
  Empower.log("lab.ran", { weeks: WEEKS, results: results });
})();
