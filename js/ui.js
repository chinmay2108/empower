/* ==========================================================================
   ui.js: shared helpers every page uses
   - Empower.log: one place for observability (console now, analytics later)
   - Empower.clock: the app's "now", with a demo time-travel offset
   - Empower.ui: bottom nav, URL params, date and time text, escaping
   Load order on every page: data/groups.js, js/ui.js, js/store.js,
   js/schedule.js, js/logic.js, data/population.js, js/people.js, then the
   page's own script.
   ========================================================================== */

window.Empower = window.Empower || {};

/*
 * Empower.log(eventName, details)
 * Name events "area.what_happened", e.g. "commit.saved".
 * Session 11 (analytics) will forward these to PostHog from this one place.
 */
Empower.log = function (eventName, details) {
  console.info("[empower]", eventName, details || {});
};

/*
 * Empower.clock.now()
 * Every page asks this for the current time instead of calling new Date()
 * directly. For demos, Me > Demo tools can move the clock forward so you can
 * check in to an event without waiting for Thursday.
 */
Empower.clock = (function () {
  var KEY = "empower.clockOffsetMs";
  function offset() {
    try { return Number(window.localStorage.getItem(KEY)) || 0; } catch (e) { return 0; }
  }
  return {
    now: function () { return new Date(Date.now() + offset()); },
    isShifted: function () { return offset() !== 0; },
    shiftHours: function (hours) {
      window.localStorage.setItem(KEY, String(offset() + hours * 3600000));
      Empower.log("clock.shifted", { hours: hours });
    },
    jumpTo: function (date) {
      window.localStorage.setItem(KEY, String(new Date(date).getTime() - Date.now()));
      Empower.log("clock.jumped", { to: new Date(date).toISOString() });
    },
    reset: function () {
      window.localStorage.removeItem(KEY);
      Empower.log("clock.reset", {});
    }
  };
})();

Empower.ui = (function () {
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    events: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    reflect: '<path d="M20 6L9 17l-5-5"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.8-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6.2 4.6 2 5.5 5.4"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>'
  };

  var NAV_ITEMS = [
    { key: "home", label: "Home", href: "index.html" },
    { key: "events", label: "This week", href: "pages/events.html" },
    { key: "reflect", label: "Check in", href: "pages/reflect.html" },
    { key: "people", label: "People", href: "pages/people.html" },
    { key: "me", label: "Me", href: "pages/me.html" }
  ];

  function icon(key) {
    return '<svg class="nav__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + ICONS[key] + "</svg>";
  }

  /* Pages set <body data-root="../"> when they live in /pages/. */
  function root() { return document.body.getAttribute("data-root") || ""; }

  /* renderNav(activeKey): put <nav id="nav"></nav> at the end of <body>. */
  function renderNav(activeKey) {
    var host = document.getElementById("nav");
    if (!host) return;
    host.className = "nav";
    host.innerHTML = '<div class="nav__inner">' + NAV_ITEMS.map(function (item) {
      var current = item.key === activeKey ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="' + root() + item.href + '"' + current + ">" +
        icon(item.key) + "<span>" + item.label + "</span></a>";
    }).join("") + "</div>";
  }

  /* Link to another page from anywhere, e.g. page("group.html?session=x"). */
  function page(path) { return root() ? path : "pages/" + path; }

  function param(name) { return new URLSearchParams(window.location.search).get(name); }

  function formatDay(iso) {
    var d = new Date(iso);
    return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
  }

  function formatTime(iso) {
    var d = new Date(iso);
    return formatClock(d.getHours(), d.getMinutes());
  }

  /* "18:40" -> "6:40pm" */
  function formatHHMM(hhmm) {
    var p = String(hhmm || "").split(":");
    return p.length === 2 ? formatClock(Number(p[0]), Number(p[1])) : "";
  }

  function formatClock(h, m) {
    var suffix = h >= 12 ? "pm" : "am";
    var hh = h % 12 || 12;
    return hh + (m ? ":" + (m < 10 ? "0" : "") + m : "") + suffix;
  }

  /* Escape any text that came from the user before putting it in HTML. */
  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* "Maya K., Sam P. and 3 others" (people from the synthetic population). */
  function namesText(people, max) {
    max = max || 2;
    var names = people.slice(0, max).map(function (p) { return p.name; });
    var more = people.length - names.length;
    if (!names.length) return "";
    if (!more) return names.length === 2 ? names[0] + " and " + names[1] : names[0];
    return names.join(", ") + " and " + more + (more === 1 ? " other" : " others");
  }

  function initials(name) {
    return String(name).split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
  }

  /*
   * toast(text): a short message at the bottom of the screen for small
   * wins ("+1 Empower score"), with a light vibration where the phone
   * supports it. Gone after about 2.5 seconds.
   */
  function toast(text) {
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = text;
    document.body.appendChild(el);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(function () { el.remove(); }, 2600);
    Empower.log("ui.toast", { text: text });
  }

  /*
   * Installable app: on the live site (https, or localhost for testing), register the service worker
   * (sw.js) so Empower can be added to the home screen and works offline.
   * Opening index.html as a file skips this; the app works the same.
   */
  var secure = window.location.protocol === "https:" || window.location.hostname === "localhost";
  if ("serviceWorker" in navigator && secure) {
    navigator.serviceWorker.register(root() + "sw.js").then(function () {
      Empower.log("app.offline_ready", {});
    }).catch(function (err) {
      Empower.log("app.offline_failed", { error: String(err) });
    });
  }

  var FLAME = '<svg class="ember__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1.2 3.6 5.5 5.6 5.5 10.7a5.5 5.5 0 0 1-11 0c0-2.8 1.6-4.5 2.7-5.6.3 2.2 1.6 3.3 2.7 3.3 0-3.3-1-5.8.1-8.4z"/></svg>';

  /*
   * ember(score, size): the Empower score as a small flame and the number.
   * The flame warms with the score (spark, warm, glow, blaze; see
   * Empower.logic.emberLevel). size "lg" for Me and profiles.
   */
  function ember(score, size) {
    var lvl = Empower.logic.emberLevel(score);
    return '<span class="ember ember--' + lvl.name + (size ? " ember--" + size : "") + '" title="Empower score ' + score +
      '" aria-label="Empower score ' + score + '">' + FLAME + '<span class="ember__value">' + score + "</span></span>";
  }

  /*
   * avatar(person, size): the person's photo if data/photos.js has one,
   * otherwise their initials. size "lg" for profiles.
   */
  function avatar(person, size) {
    var cls = "avatar" + (size ? " avatar--" + size : "");
    var file = Empower.PHOTOS && Empower.PHOTOS[person.id];
    if (file) return '<img class="' + cls + ' avatar--photo" src="' + root() + "img/people/" + file + '" alt="">';
    return '<div class="' + cls + '">' + initials(person.name) + "</div>";
  }

  /* faces(people, max): a small overlapping row of photos, for "who's going". */
  function faces(list, max) {
    return '<span class="faces">' + list.slice(0, max || 3).map(function (p) { return avatar(p, "sm"); }).join("") + "</span>";
  }

  var SEND_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4l17.5-7.5a1 1 0 0 0 0-1.8L3.4 3.6a.9.9 0 0 0-1.3 1l1.9 6.4 9 1-9 1-1.9 6.4a.9.9 0 0 0 1.3 1z"/></svg>';

  var MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.9V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.6a6 6 0 0 0 5-5.9z"/></svg>';
  var MAX_VOICE_SECONDS = 60;

  /* canRecord(): voice notes need a microphone and https (or localhost). */
  function canRecord() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.isSecureContext);
  }

  /*
   * composer(placeholder, onSend, onVoice): the message box pinned to the
   * bottom of a chat, like a messaging app. Added to the page once (so the
   * keyboard stays up after sending); calls onSend(text) and clears itself.
   * With onVoice, an empty box shows a mic instead of send: tap to record a
   * voice note (up to 60 seconds), then Send or Cancel. onVoice gets
   * { audio: data: URL, seconds }.
   */
  function composer(placeholder, onSend, onVoice) {
    var voice = !!onVoice && canRecord();
    var form = document.createElement("form");
    form.className = "composer";
    form.innerHTML = '<div class="composer__inner composer__type"><input class="composer__input" id="message" autocomplete="off" maxlength="300"' +
      ' placeholder="' + escapeHtml(placeholder) + '" aria-label="' + escapeHtml(placeholder) + '">' +
      '<button class="composer__send" type="submit" aria-label="Send"' + (voice ? "" : " disabled") + ">" + SEND_ICON + "</button></div>" +
      '<div class="composer__inner composer__rec" hidden><button type="button" class="composer__cancel" data-rec="cancel">Cancel</button>' +
      '<span class="composer__timer"><span class="rec-dot"></span><span data-rec="time">0:00</span></span>' +
      '<button type="button" class="composer__send" data-rec="send" aria-label="Send voice note">' + SEND_ICON + "</button></div>";
    document.body.appendChild(form);
    var input = form.querySelector("input");
    var send = form.querySelector(".composer__type .composer__send");
    var typeRow = form.querySelector(".composer__type");
    var recRow = form.querySelector(".composer__rec");
    var timeEl = form.querySelector('[data-rec="time"]');

    function refresh() {
      var hasText = !!input.value.trim();
      if (voice) {
        send.innerHTML = hasText ? SEND_ICON : MIC_ICON;
        send.setAttribute("aria-label", hasText ? "Send" : "Record a voice note");
        send.classList.toggle("composer__send--mic", !hasText);
      } else {
        send.disabled = !hasText;
      }
    }
    refresh();
    input.addEventListener("input", refresh);

    var recorder = null, chunks = [], started = 0, ticker = null, keep = false;

    function stopRecording(shouldKeep) {
      keep = shouldKeep;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    }

    function startRecording() {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          clearInterval(ticker);
          recRow.hidden = true;
          typeRow.hidden = false;
          var seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
          if (!keep || !chunks.length) { Empower.log("chat.voice_cancelled", {}); return; }
          var reader = new FileReader();
          reader.onload = function () { onVoice({ audio: reader.result, seconds: Math.min(seconds, MAX_VOICE_SECONDS) }); };
          reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.start();
        started = Date.now();
        typeRow.hidden = true;
        recRow.hidden = false;
        timeEl.textContent = "0:00";
        ticker = setInterval(function () {
          var s = Math.floor((Date.now() - started) / 1000);
          timeEl.textContent = Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
          if (s >= MAX_VOICE_SECONDS) stopRecording(true);
        }, 250);
        Empower.log("chat.voice_started", {});
      }).catch(function (err) {
        Empower.log("chat.voice_denied", { error: String(err) });
        toast("Allow the microphone to send voice notes");
      });
    }

    recRow.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rec]");
      if (b && b.getAttribute("data-rec") === "cancel") stopRecording(false);
      if (b && b.getAttribute("data-rec") === "send") stopRecording(true);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) {
        if (voice) startRecording();
        return;
      }
      input.value = "";
      refresh();
      input.focus();
      onSend(text);
    });
    return form;
  }

  /* duration(seconds): "0:07". */
  function duration(seconds) {
    return Math.floor(seconds / 60) + ":" + (seconds % 60 < 10 ? "0" : "") + (seconds % 60);
  }

  /*
   * voiceNote(src, seconds): a playable voice-note bubble body: play
   * button, progress bar, length. Only data:audio URLs are accepted.
   */
  function voiceNote(src, seconds) {
    if (!/^data:audio\//.test(String(src))) return "";
    return '<span class="voice" data-voice="' + escapeHtml(src) + '">' +
      '<button type="button" class="voice__play" aria-label="Play voice note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>' +
      '<span class="voice__track"><span class="voice__fill"></span></span>' +
      '<span class="voice__len">' + duration(seconds || 0) + "</span></span>";
  }

  /* One player for every voice note on the page: tap to play, tap again to pause. */
  var playing = null;
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".voice__play");
    if (!btn) return;
    var box = btn.closest(".voice");
    if (playing && playing.box === box) {
      if (playing.audio.paused) playing.audio.play(); else playing.audio.pause();
      return;
    }
    if (playing) { playing.audio.pause(); playing.box.classList.remove("is-playing"); }
    var audio = new Audio(box.getAttribute("data-voice"));
    var fill = box.querySelector(".voice__fill");
    playing = { box: box, audio: audio };
    audio.addEventListener("play", function () { box.classList.add("is-playing"); });
    audio.addEventListener("pause", function () { box.classList.remove("is-playing"); });
    audio.addEventListener("timeupdate", function () {
      if (audio.duration && isFinite(audio.duration)) fill.style.width = Math.round((audio.currentTime / audio.duration) * 100) + "%";
    });
    audio.addEventListener("ended", function () { fill.style.width = "0%"; box.classList.remove("is-playing"); });
    audio.play();
    Empower.log("chat.voice_played", {});
  });

  /* chatTime(iso): "6:31 PM" for message bubbles. */
  function chatTime(iso) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  /* scrollToLatest(): keep the newest message in view. */
  function scrollToLatest() {
    window.scrollTo(0, document.body.scrollHeight);
  }

  return {
    toast: toast,
    composer: composer,
    voiceNote: voiceNote,
    canRecord: canRecord,
    chatTime: chatTime,
    scrollToLatest: scrollToLatest,
    faces: faces,
    ember: ember,
    avatar: avatar,
    renderNav: renderNav,
    namesText: namesText,
    initials: initials,
    page: page,
    root: root,
    param: param,
    formatDay: formatDay,
    formatTime: formatTime,
    formatHHMM: formatHHMM,
    escapeHtml: escapeHtml
  };
})();
