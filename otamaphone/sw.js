var CACHE_NAME = 'otamaphone-v1-1';
var urlsToCache = [
    '/otamaphone/',
    '/otamaphone/index.html', 
    '/otamaphone/index.js',
    '/otamaphone/ota.jpg',
    '/otamaphone/ota.png',
    '/otamaphone/otaclose.png',
    '/otamaphone/otaopen.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('Opened cache', cache);
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});