/* ============================================================
   ترابط v3.0 — الإعدادات (نسخة API)
   ============================================================ */

const Settings = {

    init() {
        const darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) {
            darkToggle.checked = Storage.getTheme() === 'dark';
            darkToggle.addEventListener('change', () => UI.toggleTheme());
        }

        const fontRange = document.getElementById('fontSizeRange');
        const fontDisplay = document.getElementById('fontSizeDisplay');
        if (fontRange) {
            const saved = Storage.getFontSize();
            fontRange.value = saved;
            if (fontDisplay) fontDisplay.textContent = saved + 'px';
            this.applyFontSize(saved);

            fontRange.addEventListener('input', (e) => {
                const val = e.target.value;
                if (fontDisplay) fontDisplay.textContent = val + 'px';
                this.applyFontSize(val);
                Storage.setFontSize(val);
            });
        }

        this.updateStorageInfo();
    },

    applyFontSize(size) {
        document.documentElement.style.fontSize = size + 'px';
    },

    async updateStorageInfo() {
        const sizeEl = document.getElementById('storageSize');
        const versionEl = document.getElementById('appVersion');
        if (versionEl) versionEl.textContent = APP.version;

        if (!sizeEl) return;

        try {
            // نحسب حجم البيانات المحلية فقط (localStorage)
            let total = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key) && key.startsWith('tarabot_')) {
                    total += (localStorage[key] || '').length;
                }
            }

            // نجيب عدد المشاركين من السيرفر
            let serverInfo = '';
            try {
                const count = await Storage.getParticipantsCount();
                serverInfo = ` • ${count} مشارك`;
            } catch {}

            const kb = (total / 1024).toFixed(1);
            sizeEl.textContent = kb + ' KB' + serverInfo;
        } catch {
            sizeEl.textContent = '—';
        }
    },

    clearAllData() {
        Participants._confirm({
            title: 'حذف كل البيانات',
            message: 'سيتم حذف كل الأسماء والإعدادات والصورة والنشاطات. لا يمكن التراجع!',
            icon: 'fa-exclamation-triangle',
            confirmText: 'حذف الكل',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await Storage.clearAll();
                    Utils.toast('تم حذف كل البيانات', 'success');
                    setTimeout(() => location.reload(), 800);
                } catch (e) {
                    Utils.toast('فشل الحذف', 'error');
                }
            }
        });
    },

    async update() {
        await this.updateStorageInfo();
    }
};

window.Settings = Settings;