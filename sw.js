// Offline support: open from the saved copy right away, then refresh it quietly for next time.
const CACHE = "fpac-planner-v5";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  // Save each file on its own, so one missing file can't stop the app from working offline.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function refresh(req, key) {
  return fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key || req, copy)); }
    return res;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" && url.origin === location.origin) {
    // Opening the app: show the saved page instantly, update it in the background.
    e.respondWith(
      caches.match("index.html").then(saved => {
        const fresh = refresh(req, "index.html").catch(() => saved);
        if (saved) { e.waitUntil(fresh.catch(() => {})); return saved; }
        return fresh;
      })
    );
    return;
  }

  if (url.origin === location.origin || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.origin === location.origin }).then(saved => {
        const fresh = refresh(req).catch(() => saved);
        if (saved) { e.waitUntil(fresh.catch(() => {})); return saved; }
        return fresh;
      })
    );
  }
});
