/* ============================================================
   ترابط v3.0 — دوال مساعدة
   ============================================================ */

const Utils = {

    /* ===== DOM ===== */

    $:  (selector, parent = document) => parent.querySelector(selector),
    $$: (selector, parent = document) => [...parent.querySelectorAll(selector)],

    /* ===== نصوص ===== */

    escape(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    },

    truncate(text, length = 40) {
        const str = String(text ?? '');
        return str.length > length ? str.slice(0, length) + '…' : str;
    },

    /* ===== الوقت ===== */

    getCurrentTime() {
        return new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getCurrentDate() {
        return new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    timeAgo(isoString) {
        try {
            const date = new Date(isoString);
            const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

            if (seconds < 60) return 'الآن';
            if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
            if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
            if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
            return date.toLocaleDateString('ar-EG');
        } catch {
            return '';
        }
    },

    formatDate(isoString) {
        try {
            return new Date(isoString).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '';
        }
    },

    /* ===== الإشعارات ===== */

    toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-message">${this.escape(message)}</div>
            <button class="toast-close" aria-label="إغلاق">
                <i class="fas fa-times"></i>
            </button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        container.appendChild(toast);
        setTimeout(() => this.removeToast(toast), duration);

        return toast;
    },

    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    },

    /* ===== شاشة التحميل ===== */

    showLoading(text = 'جاري المعالجة...', showProgress = false) {
        const overlay = document.getElementById('loadingOverlay');
        const textEl = document.getElementById('loadingText');
        const progressWrap = overlay?.querySelector('.loading-progress');
        const percentEl = document.getElementById('loadingPercent');
        const fillEl = document.getElementById('loadingProgressFill');

        if (!overlay) return;

        if (textEl) textEl.textContent = text;

        if (showProgress) {
            if (progressWrap) progressWrap.style.display = 'block';
            if (percentEl) percentEl.style.display = 'block';
            if (fillEl) fillEl.style.width = '0%';
            if (percentEl) percentEl.textContent = '0%';
        } else {
            if (progressWrap) progressWrap.style.display = 'none';
            if (percentEl) percentEl.style.display = 'none';
        }

        overlay.classList.add('active');
    },

    updateLoading(percent, text) {
        const fillEl = document.getElementById('loadingProgressFill');
        const percentEl = document.getElementById('loadingPercent');
        const textEl = document.getElementById('loadingText');

        const p = Math.max(0, Math.min(100, Math.round(percent)));
        if (fillEl) fillEl.style.width = p + '%';
        if (percentEl) percentEl.textContent = p + '%';
        if (text && textEl) textEl.textContent = text;
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    /* ===== الأزرار ===== */

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.disabled = true;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                delete button.dataset.originalHtml;
            }
        }
    },

    /* ===== الملفات ===== */

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
            reader.readAsText(file, 'UTF-8');
        });
    },

    readDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
            reader.readAsDataURL(file);
        });
    },

    readArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
            reader.readAsArrayBuffer(file);
        });
    },

    downloadBlob(blob, filename) {
        try {
            if (window.saveAs) {
                window.saveAs(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        } catch (e) {
            console.error('خطأ في التنزيل:', e);
            this.toast('فشل التنزيل', 'error');
        }
    },

    safeFileName(name) {
        return String(name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
    },

    /* ===== أداء ===== */

    debounce(fn, wait = 250) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /* ===== تحقق ===== */

    isEmpty(value) {
        return !value || String(value).trim() === '';
    },

    isImageFile(file) {
        if (!file) return false;
        const name = file.name.toLowerCase();
        return SUPPORTED_FILES.images.some(ext => name.endsWith(ext));
    },

    /* ===== عام ===== */

    uid(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
};

window.Utils = Utils;
window.$  = Utils.$;
window.$$ = Utils.$$;