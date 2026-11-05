/* ==========================================================================
   ui.js: shared helpers every page uses
   - Empower.log: one place for observability (console now, analytics later)
   - Empower.ui.renderNav: the bottom navigation, so no page copies it
   - Empower.ui.formatX: consistent date and time text across pages
   Load order on every page: data/groups.js, js/ui.js, js/store.js,
   js/schedule.js, then the page's own script.
   ========================================================================== */

window.Empower = window.Empower || {};

/*
 * Empower.log(eventName, details)
 * Use for anything you would want to see when debugging or measuring.
 * Name events as "area.what_happened", e.g. "events.commit_clicked".
 * Session 11 (analytics) will forward these to PostHog from this one place.
 */
Empower.log = function (eventName, details) {
  console.info("[empower]", eventName, details || {});
};

Empower.ui = (function () {
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    events: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    reflect: '<path d="M20 6L9 17l-5-5"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>'
  };

  var NAV_ITEMS = [
    { key: "home", label: "Home", href: "index.html" },
    { key: "events", label: "This week", href: "pages/events.html" },
    { key: "reflect", label: "Check in", href: "pages/reflect.html" },
    { key: "me", label: "Me", href: "pages/onboarding.html" }
  ];

  function icon(key) {
    return '<svg class="nav__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + ICONS[key] + "</svg>";
  }

  /*
   * renderNav(activeKey)
   * Pages inside /pages/ pass their depth so links resolve correctly.
   * Put <nav id="nav"></nav> at the end of <body>.
   */
  function renderNav(activeKey) {
    var host = document.getElementById("nav");
    if (!host) return;
    var prefix = document.body.getAttribute("data-root") || "";
    host.className = "nav";
    host.innerHTML = '<div class="nav__inner">' + NAV_ITEMS.map(function (item) {
      var current = item.key === activeKey ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + prefix + item.href + '"' + current + ">" +
        icon(item.key) + "<span>" + item.label + "</span></a>";
    }).join("") + "</div>";
  }

  function formatDay(iso) {
    var d = new Date(iso);
    return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
  }

  function formatTime(iso) {
    var d = new Date(iso);
    var h = d.getHours();
    var m = d.getMinutes();
    var suffix = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + (m ? ":" + (m < 10 ? "0" : "") + m : "") + suffix;
  }

  /* Escape user-typed text before putting it into HTML. */
  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  return {
    renderNav: renderNav,
    formatDay: formatDay,
    formatTime: formatTime,
    escapeHtml: escapeHtml
  };
})();
