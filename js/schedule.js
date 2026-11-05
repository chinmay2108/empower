/* ==========================================================================
   schedule.js: turns recurring groups into dated sessions

   Pure functions: same inputs, same outputs, no saved data, no clock reads
   unless you pass the date in. That keeps them predictable for
   Given-When-Then scenarios and easy to unit test later (Session 7).
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.schedule = (function () {
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Local date as "YYYY-MM-DD" */
  function dateKey(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  /*
   * upcomingSessions(groups, fromDate, days)
   * Returns one session per group meeting between fromDate (inclusive) and
   * fromDate + days (exclusive), sorted by start time.
   * A session id is stable: groupId + "@" + date, e.g. "g01@2026-11-05".
   */
  function upcomingSessions(groups, fromDate, days) {
    var sessions = [];
    var start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

    for (var i = 0; i < days; i++) {
      var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      groups.forEach(function (g) {
        if (g.weekday !== day.getDay()) return;
        var parts = g.time.split(":");
        var startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
          Number(parts[0]), Number(parts[1]));
        sessions.push({
          id: g.id + "@" + dateKey(day),
          groupId: g.id,
          startsAt: startsAt.toISOString(),
          endsAt: new Date(startsAt.getTime() + g.durationMin * 60000).toISOString()
        });
      });
    }

    sessions.sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; });
    return sessions;
  }

  return { upcomingSessions: upcomingSessions, dateKey: dateKey };
})();

/* Lets Node-based unit tests load this file later without a browser. */
if (typeof module !== "undefined") { module.exports = Empower.schedule; }
