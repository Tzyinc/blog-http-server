var CACHE_NAME = "taiko-v1-0";
var urlsToCache = [
  "/taiko/",
  "/taiko/index.html",
  "/taiko/index.js",
  "/taiko/dong.ogg",
  "/taiko/ka.ogg",
  "/taiko/drum_sprite.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("Opened cache", cache);
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
