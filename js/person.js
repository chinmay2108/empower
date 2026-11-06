/* ==========================================================================
   person.js: Flow 5, a match's profile (?id=u123)
   Only matched people can be viewed; anyone else sends you back to People.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var people = Empower.people;
  var logic = Empower.logic;
  var host = document.getElementById("person-root");
  var now = Empower.clock.now();

  ui.renderNav("people");
  document.getElementById("topbar").innerHTML = '<a class="back" href="people.html">&larr; People</a>';

  var profile = store.getProfile();
  var person = store.getPerson(ui.param("id"));
  var connection = person && store.getConnections().find(function (k) { return k.personId === person.id; });
  var together = person ? people.sessionsTogether(person, store.getCommitments()) : 0;
  if (!person || !connection || !people.willAddBack(person, profile, together, profile && profile.createdAt)) {
    host.innerHTML = '<div class="empty"><p class="empty__title">Not a match yet</p><p class="mt-4"><a class="btn btn--inline" href="people.html">Back to People</a></p></div>';
    Empower.log("person.not_matched", { id: ui.param("id") });
    return;
  }

  var STAGE_LABELS = { spark: "Spark", kindling: "Kindling", warm: "Warm", glow: "Glow", bonfire: "Bonfire" };
  var time = people.timeTogether(person, store.getCommitments(), store.getGroups());
  var stage = people.warmthStage(time, true);
  var tags = people.pairTags(person, store.getCommitments(), store.getGroups());
  var shared = people.sharedInterests(person, profile);
  var groupsInCommon = person.memberships.map(function (m) { return store.getGroup(m.groupId); })
    .filter(function (g) { return store.getCommitments().some(function (c) { return c.groupId === g.id; }); });
  var reliability = person.reliability >= 0.8 ? "Almost always" : person.reliability >= 0.65 ? "Usually" : "Sometimes";

  host.innerHTML =
    '<div class="center"><div class="avatar avatar--lg avatar--center">' + ui.initials(person.name) + "</div>" +
    '<h1 class="title">' + person.name + '</h1><p><span class="score-badge">Empower score ' + people.scoreOf(person) + "</span></p>" +
    '<p class="subtitle">' + person.bio + " Lives in " + person.neighborhood + ".</p></div>" +
    '<p class="center"><span class="tag">' + STAGE_LABELS[stage] + "</span> " +
    tags.map(function (t) { return '<span class="tag">' + ui.escapeHtml(t) + "</span>"; }).join(" ") + "</p>" +
    '<p class="small muted center">Only the two of you see this.</p>' +
    '<ul class="facts">' +
    "<li><span>Met at</span><span>" + store.getGroup(connection.groupId).name + "</span></li>" +
    "<li><span>Time together</span><span>" + time.sessions + (time.sessions === 1 ? " session, " : " sessions, ") + time.hours + " hours</span></li>" +
    "<li><span>You both like</span><span>" + (shared.length ? shared.join(", ") : "Still finding out") + "</span></li>" +
    (groupsInCommon.length ? "<li><span>Groups in common</span><span>" + groupsInCommon.map(function (g) { return g.name; }).join(", ") + "</span></li>" : "") +
    "<li><span>Shows up</span><span>" + reliability + "</span></li>" +
    "<li><span>Meetups outside sessions</span><span id=\"meetup-count\">" + meetupsWith().length + "</span></li></ul>" +
    '<div class="card card--outline"><p class="card__title">Met up outside a session?</p>' +
    '<p class="card__meta">Coffee, a walk, anything. When you both confirm, it adds 10 to your Empower score.</p>' +
    '<p class="mt-4" id="meetup-action">' + meetupButton() + "</p></div>" +
    '<p class="small muted">Synthetic demo profile.</p>' +
    '<div class="footer-action"><div class="footer-action__inner"><a class="btn" href="chat.html?id=' + person.id + '">Message ' +
    person.name.split(" ")[0] + "</a></div></div>";

  function meetupsWith() {
    return store.getMeetups().filter(function (m) { return m.personId === person.id && m.confirmed; });
  }

  function meetupButton() {
    return logic.canLogMeetup(store.getMeetups(), person.id, now)
      ? '<button type="button" class="btn btn--secondary btn--small" data-action="meetup">We met up</button>'
      : '<span class="small muted">Logged for today.</span>';
  }

  host.addEventListener("click", function (e) {
    if (!e.target.closest("[data-action=meetup]")) return;
    if (!logic.canLogMeetup(store.getMeetups(), person.id, now)) return;
    var confirmed = people.confirmsMeetup(person, profile, together, profile.createdAt);
    store.addMeetup({ personId: person.id, at: now.toISOString(), confirmed: confirmed });
    Empower.log("person.meetup_logged", { id: person.id, confirmed: confirmed });
    document.getElementById("meetup-action").innerHTML = '<span class="small muted">' +
      (confirmed ? person.name.split(" ")[0] + " confirmed. Logged for today." : "Waiting for " + person.name.split(" ")[0] + " to confirm.") + "</span>";
    document.getElementById("meetup-count").textContent = meetupsWith().length;
    if (confirmed) ui.toast("+10 Empower score with " + person.name.split(" ")[0]);
  });

  Empower.log("person.viewed", { id: person.id, together: together, at: now.toISOString() });
})();
