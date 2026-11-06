/* ==========================================================================
   onboarding.js: Flow 1, set up or edit the user's profile
   Steps: name, interests (3+), free times (1+), comfort. Saves one Profile.
   ?edit=1 opens with the saved profile filled in.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var host = document.getElementById("onboarding-root");

  var INTERESTS = ["trivia", "board games", "games", "running", "hiking", "outdoors", "books",
    "arts", "crafts", "cooking", "food", "volleyball", "climbing", "music", "comedy",
    "volunteering", "photography", "languages"];
  var SLOTS = [
    ["mon-eve", "Mon"], ["tue-eve", "Tue"], ["wed-eve", "Wed"], ["thu-eve", "Thu"], ["fri-eve", "Fri"]
  ];
  var WEEKEND = [["sat-am", "Sat morning"], ["sat-pm", "Sat afternoon"], ["sun-am", "Sun morning"], ["sun-pm", "Sun afternoon"]];
  var COMFORT = [
    ["easy", "I'm easy", "Happy to walk into anything"],
    ["nervous", "A bit nervous", "Start me with things that have an activity to focus on"],
    ["anxious", "Pretty anxious", "Small, structured groups only"]
  ];
  var MIN_INTERESTS = 3;
  var TOTAL_STEPS = 4;

  var saved = store.getProfile();
  var editing = ui.param("edit") === "1" && saved;
  var state = {
    step: editing ? 1 : 0,
    name: saved ? saved.name : "",
    interests: saved ? saved.interests.slice() : [],
    freeSlots: saved ? saved.freeSlots.slice() : [],
    comfort: saved ? saved.comfort : "",
    error: ""
  };

  /* ---------- Rules (pure) ---------- */

  function validate(step, s) {
    if (step === 0 && !s.name.trim()) return "Add your first name so we can say hi.";
    if (step === 1 && s.interests.length < MIN_INTERESTS) return "Pick at least " + MIN_INTERESTS + " so we have something to go on.";
    if (step === 2 && !s.freeSlots.length) return "Pick at least one time you're usually free.";
    if (step === 3 && !s.comfort) return "Pick the one that fits best.";
    return "";
  }

  function toggle(list, value) {
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
  }

  /* ---------- Rendering ---------- */

  function steps() {
    if (state.step === 0) return "";
    var bars = "";
    for (var i = 1; i <= TOTAL_STEPS; i++) bars += '<span class="' + (i <= state.step ? "is-done" : "") + '"></span>';
    return '<div class="steps">' + bars + "</div>";
  }

  function chips(options, selected, kind) {
    return '<div class="chip-row">' + options.map(function (o) {
      var value = Array.isArray(o) ? o[0] : o;
      var label = Array.isArray(o) ? o[1] : o.charAt(0).toUpperCase() + o.slice(1);
      var on = selected.indexOf(value) !== -1;
      return '<button type="button" class="chip" data-kind="' + kind + '" data-value="' + value +
        '" aria-pressed="' + on + '">' + label + "</button>";
    }).join("") + "</div>";
  }

  function body() {
    switch (state.step) {
      case 0:
        return '<div class="center"><p class="eyebrow mt-4">New in town?</p>' +
          '<h1 class="title">Find your people.<br>One group at a time.</h1>' +
          '<p class="subtitle">We pick one thing a week that fits you, help you actually go, and get you back to the same people until they feel like yours.</p></div>' +
          '<div class="field"><label class="label" for="name">Your first name</label>' +
          '<input class="input" id="name" autocomplete="given-name" value="' + ui.escapeHtml(state.name) + '"></div>';
      case 1:
        return '<h1 class="title">What do you enjoy?</h1><p class="subtitle">Pick at least ' + MIN_INTERESTS + '. You can change these later.</p>' +
          chips(INTERESTS, state.interests, "interests") +
          '<p class="small muted mt-4">' + state.interests.length + " selected</p>";
      case 2:
        return '<h1 class="title">When are you usually free?</h1><p class="subtitle">We only suggest things that fit.</p>' +
          '<p class="label">Weeknight evenings</p>' + chips(SLOTS, state.freeSlots, "freeSlots") +
          '<p class="label mt-4">Weekends</p>' + chips(WEEKEND, state.freeSlots, "freeSlots");
      case 3:
        return '<h1 class="title">How do new groups feel?</h1><p class="subtitle">No wrong answer. This sets how we start.</p>' +
          COMFORT.map(function (c) {
            return '<button type="button" class="option' + (state.comfort === c[0] ? " is-selected" : "") +
              '" data-kind="comfort" data-value="' + c[0] + '"><p class="option__title">' + c[1] +
              '</p><p class="option__meta">' + c[2] + "</p></button>";
          }).join("");
      default:
        return '<div class="center"><div class="big-check">&#10003;</div>' +
          '<h1 class="title">You\'re set, ' + ui.escapeHtml(state.name) + ".</h1>" +
          '<p class="subtitle">Your picks for this week are ready.</p></div>';
    }
  }

  function actions() {
    if (state.step > TOTAL_STEPS - 1 + 1) return "";
    if (state.step === TOTAL_STEPS) {
      return footer('<a class="btn" href="events.html">See this week\'s picks</a>');
    }
    var label = state.step === 0 ? "Get started" : state.step === TOTAL_STEPS - 1 ? (editing ? "Save" : "Finish") : "Continue";
    var back = state.step > (editing ? 1 : 0) ? '<button type="button" class="btn btn--secondary" data-action="back">Back</button>' : "";
    return footer('<button type="button" class="btn" data-action="next">' + label + "</button>" + back);
  }

  function footer(inner) {
    return '<div class="footer-action"><div class="footer-action__inner">' + inner + "</div></div>";
  }

  function render() {
    host.innerHTML = steps() +
      (state.error ? '<div class="notice notice--error" role="alert">' + state.error + "</div>" : "") +
      body() + actions();
  }

  /* ---------- Events ---------- */

  host.addEventListener("input", function (e) {
    if (e.target.id === "name") state.name = e.target.value;
  });

  host.addEventListener("click", function (e) {
    var el = e.target.closest("[data-kind], [data-action]");
    if (!el) return;
    var kind = el.getAttribute("data-kind");
    var action = el.getAttribute("data-action");

    if (kind === "interests" || kind === "freeSlots") toggle(state[kind], el.getAttribute("data-value"));
    if (kind === "comfort") state.comfort = el.getAttribute("data-value");
    if (kind) { state.error = ""; render(); return; }

    if (action === "back") { state.step -= 1; state.error = ""; render(); return; }
    if (action === "next") {
      state.error = validate(state.step, state);
      if (state.error) { Empower.log("onboarding.blocked", { step: state.step }); render(); return; }
      if (state.step === TOTAL_STEPS - 1) {
        store.saveProfile({ name: state.name.trim(), interests: state.interests, freeSlots: state.freeSlots, comfort: state.comfort });
        Empower.log(editing ? "onboarding.updated" : "onboarding.completed", { interests: state.interests.length, slots: state.freeSlots.length, comfort: state.comfort });
        if (editing) { window.location.href = "me.html"; return; }
      }
      state.step += 1;
      render();
      window.scrollTo(0, 0);
    }
  });

  render();
  Empower.log("onboarding.viewed", { editing: !!editing });
})();
