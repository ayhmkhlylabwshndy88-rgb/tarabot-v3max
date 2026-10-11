/* ============================================================
   ترابط v3.0 — نقطة البداية (نسخة API)
   ============================================================ */

const App = {

    async init() {
        console.log('🚀 بدء تشغيل التطبيق...');

        this.hideSplash();
        this.loadState();
        await this.initModules();
        this.initPageChanges();
        this.navigateStart();

        console.log('✅ التطبيق جاهز');
    },

    hideSplash() {
        setTimeout(() => {
            document.getElementById('splashScreen')?.classList.add('hidden');
        }, 1200);
    },

    loadState() {
        state.theme = Storage.getTheme();
        // لا نحمل الصورة هنا — Certificate.init() يتولاها
    },

    async initModules() {
        // الواجهة
        UI.init();

        // الشهادة (يحتاج يكون قبل المشاركين عشان getSettings)
        await Certificate.init();

        // المشاركون
        await Participants.render();
        Participants.initSearch();

        // الإعدادات
        Settings.init();

        // النشاطات
        await Activities.render();

        // إذا كانت أول مرة
        try {
            const count = await Storage.getParticipantsCount();
            const activities = await Storage.getActivities();
            if (count === 0 && activities.length === 0) {
                await Storage.addActivity('تم إنشاء المنصة', 'info');
            }
        } catch (e) {
            console.warn('لم نتمكن من التحقق من الحالة الأولية:', e);
        }
    },

    initPageChanges() {
        document.addEventListener('pagechange', async (e) => {
            const page = e.detail.page;

            if (page === 'dashboard') {
                await Activities.render();
            }
            if (page === 'participants' || page === 'certificates') {
                await Participants.render();
            }
            if (page === 'certificates') {
                Certificate.updatePreview();
            }
            if (page === 'settings') {
                Settings.update();
            }
        });
    },

    navigateStart() {
        const hash = location.hash.replace('#', '');
        const startPage = PAGES.includes(hash) ? hash : 'dashboard';
        UI.navigate(startPage);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

window.App = App;