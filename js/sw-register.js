/* ============================================================
   ترابط v3.0 — تسجيل Service Worker
   ============================================================ */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('js/sw.js', { scope: './' })
            .then(reg => console.log('✅ SW registered'))
            .catch(err => console.warn('SW failed:', err));
    });
}
