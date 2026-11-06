/* ==========================================================================
   events.js: Flow 2, this week's picks
   Decides for the user: one pick at a time as a card. Swipe right (or tap
   the check) to commit; swipe left (or tap the cross) to see the next best.
   Up to 3 picks a week (Empower.logic.swipesLeft); after 3 passes, the
   full list (pages/browse.html). No profile yet sends the user to onboarding.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("events-root");
  var now = Empower.clock.now();
  var profile = store.getProfile();

  ui.renderNav("events");

  if (!profile) {
    host.innerHTML = '<h1 class="title">This week</h1><div class="empty"><p class="empty__title">Tell us about you first</p>' +
      '<p class="small">Tell us a bit about you first.</p><p class="mt-4"><a class="btn btn--inline" href="onboarding.html">Get started</a></p></div>';
    return;
  }

  var groups = store.getGroups();
  var sessions = Empower.schedule.upcomingSessions(groups, now, 8);
  var commitments = store.getCommitments();
  var passes = logic.passesThisWeek(store.getPasses(), now);
  var left = logic.swipesLeft(store.getPasses(), now);

  // Passed on all 3 this week: show the full list instead.
  if (left === 0) { window.location.replace("browse.html?from=swipes"); return; }

  var familiar = Empower.people.familiarGoing(store.getPopulation(), sessions, store.getConnections(), commitments, groups, profile);
  var picks = logic.rankPicks(sessions, groups, profile, commitments, now, left, {
    reflections: store.getReflections(), familiarBySession: familiar,
    passedGroupIds: passes.map(function (p) { return p.groupId; })
  });
  var usedLines = [];
  var history = logic.historyFor(profile, commitments, store.getReflections(), groups, now, familiar);

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function going(session) {
    var list = Empower.people.attendeesOf(store.getPopulation(), session);
    return list.length ? '<p class="pick__social">' + ui.faces(list, 3) + ui.namesText(list) + (list.length === 1 ? " is" : " are") + " going</p>" : "";
  }

  function swipeCard(p, i) {
    return '<article class="swipe-card' + (i === 0 ? " is-top" : " is-next-" + i) + '" data-i="' + i + '" data-session="' + p.session.id +
      '" data-group="' + p.group.id + '" aria-label="' + ui.escapeHtml(p.group.name) + '">' +
      '<span class="swipe-card__stamp swipe-card__stamp--yes">I\'m in</span><span class="swipe-card__stamp swipe-card__stamp--no">Pass</span>' +
      '<p class="eyebrow">' + (passes.length + i === 0 ? "Your pick this week" : "Next best") + "</p>" +
      '<h2 class="swipe-card__title">' + p.group.name + "</h2>" +
      '<p class="card__meta">' + ui.formatDay(p.session.startsAt) + " · " + ui.formatTime(p.session.startsAt) + " · " + p.group.venue + "</p>" +
      '<p class="pick__why">' + logic.pitch(p.session, p.group, profile, history, usedLines) + "</p>" +
      going(p.session) +
      '<a class="swipe-card__more" href="group.html?session=' + encodeURIComponent(p.session.id) + '">More about this group</a>' +
      "</article>";
  }

  function countText(remaining) {
    if (remaining <= 1) return "Last one this week. Pass and you'll see everything instead.";
    return (remaining - 1) + " more " + (remaining - 1 === 1 ? "pick" : "picks") + " if this one's not it.";
  }

  if (!picks.length) {
    host.innerHTML = '<h1 class="title">This week</h1><div class="empty"><p class="empty__title">Nothing left this week</p>' +
      '<p class="small">That\'s the week. New picks tomorrow.</p><p class="mt-4"><a class="btn btn--inline" href="browse.html">See everything</a></p></div>';
    Empower.log("events.viewed", { picks: [] });
    return;
  }

  host.innerHTML =
    '<p class="eyebrow">' + ui.formatDay(now.toISOString()) + " to " + ui.formatDay(new Date(now.getTime() + 7 * 864e5).toISOString()) + "</p>" +
    '<h1 class="title">This week.</h1><p class="subtitle">Swipe right if you\'re in, left for another.</p>' +
    '<div class="deck" id="deck">' + picks.map(swipeCard).reverse().join("") + "</div>" +
    '<div class="deck__actions"><button type="button" class="deck__btn deck__btn--no" data-swipe="left" aria-label="Pass">' + CROSS + "</button>" +
    '<button type="button" class="deck__btn deck__btn--yes" data-swipe="right" aria-label="I\'m in">' + CHECK + "</button></div>" +
    '<p class="small muted center" id="deck-count">' + countText(picks.length) + "</p>";

  var deck = document.getElementById("deck");
  var shown = 0;

  function top() { return deck.querySelector(".swipe-card.is-top"); }

  function promote() {
    var cards = Array.prototype.slice.call(deck.querySelectorAll(".swipe-card")).filter(function (c) { return !c.classList.contains("is-gone"); });
    cards.sort(function (a, b) { return a.getAttribute("data-i") - b.getAttribute("data-i"); });
    cards.forEach(function (c, i) {
      c.className = "swipe-card" + (i === 0 ? " is-top" : " is-next-" + Math.min(i, 2));
    });
    document.getElementById("deck-count").textContent = countText(cards.length);
    return cards.length;
  }

  /* Decide on the top card. right: I'm in, go commit. left: pass, show the next. */
  function decide(dir) {
    var card = top();
    if (!card) return;
    var sessionId = card.getAttribute("data-session");
    card.classList.add(dir === "right" ? "is-out-right" : "is-out-left", "is-gone");
    card.classList.remove("is-top");
    card.style.transform = "";
    if (dir === "right") {
      Empower.log("events.swiped_right", { session: sessionId, position: passes.length + shown });
      setTimeout(function () { window.location.href = "commit.html?session=" + encodeURIComponent(sessionId); }, 280);
      return;
    }
    store.addPass({ sessionId: sessionId, groupId: card.getAttribute("data-group"), at: now.toISOString() });
    Empower.log("events.swiped_left", { session: sessionId, position: passes.length + shown });
    shown += 1;
    setTimeout(function () {
      card.remove();
      if (!promote()) window.location.href = "browse.html?from=swipes";
    }, 280);
  }

  host.addEventListener("click", function (e) {
    var b = e.target.closest("[data-swipe]");
    if (b) decide(b.getAttribute("data-swipe"));
  });

  /* Drag the top card: past 100px it counts as a swipe; otherwise it springs back. */
  var drag = null;
  deck.addEventListener("pointerdown", function (e) {
    var card = e.target.closest(".swipe-card.is-top");
    if (!card || e.target.closest("a")) return;
    drag = { card: card, x: e.clientX, dx: 0 };
    card.setPointerCapture(e.pointerId);
    card.classList.add("is-dragging");
  });
  deck.addEventListener("pointermove", function (e) {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.card.style.transform = "translateX(" + drag.dx + "px) rotate(" + (drag.dx / 18) + "deg)";
    drag.card.classList.toggle("is-yes", drag.dx > 40);
    drag.card.classList.toggle("is-no", drag.dx < -40);
  });
  function endDrag() {
    if (!drag) return;
    var card = drag.card, dx = drag.dx;
    drag = null;
    card.classList.remove("is-dragging", "is-yes", "is-no");
    if (Math.abs(dx) > 100) decide(dx > 0 ? "right" : "left");
    else card.style.transform = "";
  }
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);

  Empower.log("events.viewed", { picks: picks.map(function (p) { return p.session.id; }), swipesLeft: left });
})();
