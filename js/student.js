/* ============================================================
   ترابط v3.0 — صفحة الطالب (نسخة API)
   ============================================================ */

const Student = {

    participantsCache: [],

    async init() {
        console.log('🎓 بدء صفحة الطالب...');

        this.hideSplash();
        this.initTheme();
        await this.initSearch();
        this.initDownloadAll();
        this.initYear();

        console.log('✅ صفحة الطالب جاهزة');
    },

    hideSplash() {
        setTimeout(() => {
            document.getElementById('splashScreen')?.classList.add('hidden');
        }, 1200);
    },

    initTheme() {
        const saved = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);

        document.getElementById('themeBtn')?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            Storage.setTheme(next);
            this.updateThemeIcon(next);
        });
    },

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeBtn i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },

    async initSearch() {
        const input = document.getElementById('studentSearch');
        const box = input?.closest('.student-search-box');
        const clearBtn = document.getElementById('clearBtn');
        if (!input) return;

        try {
            this.participantsCache = await Storage.getParticipants();
        } catch (e) {
            console.error('فشل تحميل الأسماء:', e);
            this.participantsCache = [];
        }

        const handler = Utils.debounce(() => {
            const query = input.value.trim();
            box?.classList.toggle('has-value', query.length > 0);
            this.search(query);
        }, 200);

        input.addEventListener('input', handler);

        clearBtn?.addEventListener('click', () => {
            input.value = '';
            box?.classList.remove('has-value');
            this.search('');
            input.focus();
        });

        this.search('');
    },

    search(query) {
        const resultsSection = document.getElementById('resultsSection');
        const bulkSection = document.getElementById('bulkSection');
        if (!resultsSection) return;

        const participants = this.participantsCache;

        if (participants.length === 0) {
            resultsSection.innerHTML = `
                <div class="student-no-result">
                    <i class="fas fa-database"></i>
                    <h3>لا توجد بيانات بعد</h3>
                    <p>لم يقم المسؤول بإضافة المشاركين بعد</p>
                </div>
            `;
            if (bulkSection) bulkSection.style.display = 'none';
            return;
        }

        if (!query || query.length === 0) {
            resultsSection.innerHTML = `
                <div class="student-empty">
                    <i class="fas fa-user-graduate"></i>
                    <h3>ابدأ بكتابة اسمك</h3>
                    <p>سيظهر لك زر التحميل بعد العثور على شهادتك</p>
                </div>
            `;
            if (bulkSection) bulkSection.style.display = 'block';
            return;
        }

        const matches = participants.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length === 0) {
            resultsSection.innerHTML = `
                <div class="student-no-result">
                    <i class="fas fa-search"></i>
                    <h3>لم يتم العثور على نتائج</h3>
                    <p>تأكد من كتابة الاسم بالشكل الصحيح<br>أو جرّب كتابة جزء من الاسم</p>
                </div>
            `;
            if (bulkSection) bulkSection.style.display = 'none';
            return;
        }

        resultsSection.innerHTML = matches.map((p, i) => `
            <div class="student-result-card" style="animation-delay: ${i * 0.05}s;">
                <div class="student-result-icon">
                    <i class="fas fa-award"></i>
                </div>
                <div class="student-result-info">
                    <strong>${Utils.escape(p.name)}</strong>
                    <span>شهادة جاهزة للتحميل</span>
                </div>
                <button class="student-result-download" data-id="${p.id}">
                    <i class="fas fa-download"></i>
                    <span>تحميل</span>
                </button>
            </div>
        `).join('');

        if (bulkSection) bulkSection.style.display = 'none';

        resultsSection.querySelectorAll('[data-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.dataset.id;
                await this.downloadOne(id, btn);
            });
        });
    },

    async downloadOne(id, button) {
        const p = this.participantsCache.find(x => x.id === id);
        if (!p) {
            Utils.toast('لم يتم العثور على الاسم', 'error');
            return;
        }

        Utils.setButtonLoading(button, true);
        Utils.showLoading('جاري إنشاء الشهادة...', true);

        try {
            const settings = await Storage.getSettings();

            if (!Certificate.imageData) {
                Certificate.imageData = await Storage.getCertificateImage();
            }

            Certificate.settings = settings;
            const bgCanvas = await Certificate.getBackgroundCanvas();

            const canvas = await Export.createCertificateCanvas(p.name, settings, bgCanvas);
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            canvas.width = 0;
            canvas.height = 0;

            const link = document.createElement('a');
            link.download = `شهادة_${Utils.safeFileName(p.name)}.jpg`;
            link.href = imgData;
            link.click();

            Utils.toast('✅ تم تحميل الشهادة', 'success');
        } catch (e) {
            console.error(e);
            Utils.toast('فشل إنشاء الشهادة: ' + e.message, 'error');
        } finally {
            Utils.setButtonLoading(button, false);
            Utils.hideLoading();
        }
    },

    initDownloadAll() {
        const btn = document.getElementById('downloadAllBtn');
        btn?.addEventListener('click', () => this.downloadAll());
    },

    async downloadAll() {
        const names = this.participantsCache.map(p => p.name);
        if (names.length === 0) {
            Utils.toast('لا توجد شهادات للتحميل', 'warning');
            return;
        }

        const btn = document.getElementById('downloadAllBtn');
        Utils.setButtonLoading(btn, true);
        Utils.showLoading(`جاري إنشاء ${names.length} شهادة...`, true);

        try {
            const settings = await Storage.getSettings();

            if (!Certificate.imageData) {
                Certificate.imageData = await Storage.getCertificateImage();
            }

            Certificate.settings = settings;
            const bgCanvas = await Certificate.getBackgroundCanvas();

            if (!window.JSZip) throw new Error('مكتبة ZIP غير محمّلة');
            const zip = new JSZip();

            for (let i = 0; i < names.length; i++) {
                const canvas = await Export.createCertificateCanvas(names[i], settings, bgCanvas);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64 = dataUrl.split(',')[1];

                const safeName = Utils.safeFileName(names[i]);
                zip.file(`${String(i + 1).padStart(3, '0')}_${safeName}.jpg`, base64, { base64: true });

                canvas.width = 0;
                canvas.height = 0;

                Utils.updateLoading(((i + 1) / names.length) * 100, `معالجة ${i + 1} من ${names.length}`);

                if (i % 5 === 0) await Utils.sleep(0);
            }

            Utils.updateLoading(100, 'جاري ضغط الملف...');
            const blob = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (meta) => Utils.updateLoading(meta.percent, 'جاري الضغط...')
            );

            Utils.downloadBlob(blob, `شهادات_ترابط_${Date.now()}.zip`);
            Utils.toast(`✅ تم تحميل ${names.length} شهادة`, 'success');

        } catch (e) {
            console.error(e);
            Utils.toast('فشل التحميل: ' + e.message, 'error');
        } finally {
            Utils.setButtonLoading(btn, false);
            Utils.hideLoading();
        }
    },

    initYear() {
        const el = document.getElementById('year');
        if (el) el.textContent = new Date().getFullYear();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Student.init());
} else {
    Student.init();
}

window.Student = Student;