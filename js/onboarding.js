/* ==========================================================================
   onboarding.js: Flow 1, set up or edit the user's profile
   Steps: name, interests (3+), free times (1+), 8 "this or that" questions.
   Saves the answers and one Profile (with its comfort step and traits).
   ?edit=1 opens with the saved profile filled in.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var QUIZ = Empower.QUESTIONS.filter(function (q) { return q.onboarding; });
  var host = document.getElementById("onboarding-root");

  var INTERESTS = ["trivia", "board games", "games", "running", "hiking", "outdoors", "books",
    "arts", "crafts", "cooking", "food", "volleyball", "climbing", "music", "comedy",
    "volunteering", "photography", "languages"];
  var SLOTS = [
    ["mon-eve", "Mon"], ["tue-eve", "Tue"], ["wed-eve", "Wed"], ["thu-eve", "Thu"], ["fri-eve", "Fri"]
  ];
  var WEEKEND = [["sat-am", "Sat morning"], ["sat-pm", "Sat afternoon"], ["sun-am", "Sun morning"], ["sun-pm", "Sun afternoon"]];
  var MIN_INTERESTS = 3;
  var TOTAL_STEPS = 4;

  var saved = store.getProfile();
  var editing = ui.param("edit") === "1" && saved;
  var state = {
    step: editing ? 1 : 0,
    name: saved ? saved.name : "",
    interests: saved ? saved.interests.slice() : [],
    freeSlots: saved ? saved.freeSlots.slice() : [],
    answers: savedAnswers(),
    quizIndex: 0,
    error: ""
  };

  function savedAnswers() {
    var map = {};
    store.getAnswers().forEach(function (a) { if (a.choice !== "skip") map[a.questionId] = a.choice; });
    return map;
  }

  function answeredCount() {
    return QUIZ.filter(function (q) { return state.answers[q.id]; }).length;
  }

  /* ---------- Checks before moving on ---------- */

  function validate(step, s) {
    if (step === 0 && !s.name.trim()) return "Add your first name so we can say hi.";
    if (step === 1 && s.interests.length < MIN_INTERESTS) return "Pick at least " + MIN_INTERESTS + " so we have something to go on.";
    if (step === 2 && !s.freeSlots.length) return "Pick at least one time you're usually free.";
    if (step === 3 && answeredCount() < QUIZ.length) return "Pick one in each pair. Go with your gut.";
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
        var q = QUIZ[state.quizIndex];
        return '<h1 class="title">This or that?</h1><p class="subtitle">Go with your gut. Both are good answers.</p>' +
          '<p class="label">' + (state.quizIndex + 1) + " of " + QUIZ.length + "</p>" +
          ["a", "b"].map(function (side) {
            return '<button type="button" class="option' + (state.answers[q.id] === side ? " is-selected" : "") +
              '" data-kind="quiz" data-value="' + side + '"><p class="option__title">' + ui.escapeHtml(q[side]) + "</p></button>";
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
    if (kind === "quiz") {
      state.answers[QUIZ[state.quizIndex].id] = el.getAttribute("data-value");
      if (state.quizIndex < QUIZ.length - 1) state.quizIndex += 1;
    }
    if (kind) { state.error = ""; render(); return; }

    if (action === "back") {
      if (state.step === 3 && state.quizIndex > 0) state.quizIndex -= 1; else state.step -= 1;
      state.error = "";
      render();
      return;
    }
    if (action === "next") {
      state.error = validate(state.step, state);
      if (state.error) { Empower.log("onboarding.blocked", { step: state.step }); render(); return; }
      if (state.step === TOTAL_STEPS - 1) {
        var at = Empower.clock.now().toISOString();
        QUIZ.forEach(function (q) { store.saveAnswer({ questionId: q.id, choice: state.answers[q.id], at: at }); });
        var traits = logic.traitsFromAnswers(store.getAnswers(), Empower.QUESTIONS);
        // Editing never moves the comfort step; only the ladder or the user in Me does.
        var step = saved && (saved.step || saved.comfort) ? logic.stepOf(saved) : logic.startingStep(traits);
        var profile = { name: state.name.trim(), interests: state.interests, freeSlots: state.freeSlots, step: step, traits: traits };
        if (saved && saved.createdAt) profile.createdAt = saved.createdAt;
        store.saveProfile(profile);
        Empower.log(editing ? "onboarding.updated" : "onboarding.completed",
          { interests: state.interests.length, slots: state.freeSlots.length, step: step, persona: logic.personaFor(traits) });
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
