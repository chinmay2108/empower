/* ==========================================================================
   sw.js: the service worker that makes Empower installable and offline

   Browsers run this in the background once the live site (https) has been
   opened. It keeps a copy of every app file, so the app opens instantly
   and works with no signal. It does nothing when index.html is opened as
   a file from your computer.

   How it serves a file: it asks the network first, so a new deploy shows
   up the first time the app is opened, and saves that fresh copy. If the
   network fails or takes longer than 3 seconds, it uses the saved copy
   instead, so the app still opens fast offline or on a bad connection.

   Adding a new page or script? Add it to FILES below. tests/pwa.test.js
   fails if a file is missing from the list.
   ========================================================================== */

var CACHE = "empower-v2";
var NETWORK_WAIT_MS = 3000;

var FILES = [
  "./index.html",
  "./pages/chat.html",
  "./pages/commit.html",
  "./pages/events.html",
  "./pages/group.html",
  "./pages/lab.html",
  "./pages/me.html",
  "./pages/onboarding.html",
  "./pages/people.html",
  "./pages/person.html",
  "./pages/prep.html",
  "./pages/reflect.html",
  "./pages/thread.html",
  "./css/styles.css",
  "./js/chat.js",
  "./js/commit.js",
  "./js/demo.js",
  "./js/events.js",
  "./js/group.js",
  "./js/home.js",
  "./js/lab-page.js",
  "./js/lab.js",
  "./js/logic.js",
  "./js/matches.js",
  "./js/me.js",
  "./js/onboarding.js",
  "./js/people.js",
  "./js/person.js",
  "./js/prep.js",
  "./js/reflect.js",
  "./js/schedule.js",
  "./js/store.js",
  "./js/thread.js",
  "./js/ui.js",
  "./data/groups.js",
  "./data/population.js",
  "./data/questions.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

/* Remove copies saved by an older version of this file. */
self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(event.request, { ignoreSearch: true }).then(function (saved) {
      var fresh = fetch(event.request).then(function (response) {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      });
      if (!saved) return fresh;
      // Network first, but don't keep someone waiting: after 3 seconds, or on
      // any network error, show the saved copy (the fetch still updates it).
      var fallback = new Promise(function (resolve) { setTimeout(function () { resolve(saved); }, NETWORK_WAIT_MS); });
      return Promise.race([fresh.catch(function () { return saved; }), fallback]);
    });
  }));
});
