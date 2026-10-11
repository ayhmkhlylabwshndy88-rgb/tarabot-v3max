/* ============================================================
   ترابط v3.0 — Service Worker
   ============================================================ */

const CACHE_NAME = 'tarabot-v3.0.0';
const CACHE_URLS = [
    './',
    './index.html',
    './student.html',
    './manifest.json',

    // CSS
    './css/main.css',
    './css/layout.css',
    './css/components.css',
    './css/pages.css',
    './css/loader.css',
    './css/responsive.css',
    './css/student.css',

    // JS
    './js/config.js',
    './js/storage.js',
    './js/utils.js',
    './js/ui.js',
    './js/participants.js',
    './js/certificate.js',
    './js/export.js',
    './js/student.js',
    './js/app.js',

    // Icons
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',

    // CDN
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

/* تثبيت */
self.addEventListener('install', (event) => {
    console.log('📦 تثبيت Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(CACHE_URLS.map(url => new Request(url, { mode: 'no-cors' })));
            })
            .then(() => self.skipWaiting())
            .catch(err => console.warn('⚠️ بعض الملفات فشل تخزينها:', err))
    );
});

/* تنشيط */
self.addEventListener('activate', (event) => {
    console.log('✅ تنشيط Service Worker');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

/* الجلب */
self.addEventListener('fetch', (event) => {
    // تجاهل طلبات غير GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // لا تخزن الردود غير الناجحة
                if (!response || response.status !== 200) {
                    return response;
                }

                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    try {
                        cache.put(event.request, responseClone);
                    } catch {}
                });

                return response;
            }).catch(() => {
                // fallback للصفحة الرئيسية
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});