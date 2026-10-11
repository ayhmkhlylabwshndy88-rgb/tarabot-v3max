/* ============================================================
   ترابط v3.0 — واجهة المستخدم
   ============================================================ */

const UI = {

    init() {
        this.initSidebar();
        this.initTheme();
        this.initNavigation();
        this.initHeader();
        this.initDate();
        this.initFontSize();
    },

    /* ===== السايدبار ===== */

    initSidebar() {
        const menuBtn  = document.getElementById('menuBtn');
        const closeBtn = document.getElementById('sidebarCloseBtn');
        const backdrop = document.getElementById('sidebarBackdrop');

        menuBtn?.addEventListener('click', () => this.toggleSidebar(true));
        closeBtn?.addEventListener('click', () => this.toggleSidebar(false));
        backdrop?.addEventListener('click', () => this.toggleSidebar(false));

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && state.sidebarOpen) {
                this.toggleSidebar(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024 && state.sidebarOpen) {
                this.toggleSidebar(false);
            }
        });
    },

    toggleSidebar(open = null) {
        const sidebar  = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (!sidebar) return;

        state.sidebarOpen = open === null ? !state.sidebarOpen : open;

        sidebar.classList.toggle('open', state.sidebarOpen);
        backdrop?.classList.toggle('active', state.sidebarOpen);
        document.body.style.overflow = state.sidebarOpen ? 'hidden' : '';
    },

    /* ===== الثيم ===== */

    initTheme() {
        const themeBtn        = document.getElementById('themeBtn');
        const sidebarThemeBtn = document.getElementById('sidebarThemeBtn');

        themeBtn?.addEventListener('click', () => this.toggleTheme());
        sidebarThemeBtn?.addEventListener('click', () => this.toggleTheme());

        const savedTheme = Storage.getTheme();
        this.setTheme(savedTheme, false);
    },

    setTheme(theme, notify = true) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        Storage.setTheme(theme);

        const isDark = theme === 'dark';
        const iconClass = isDark ? 'fa-sun' : 'fa-moon';

        document.querySelectorAll('#themeBtn i, #sidebarThemeBtn i')
            .forEach(icon => {
                icon.className = `fas ${iconClass}`;
            });

        const sidebarThemeText = document.querySelector('#sidebarThemeBtn span');
        if (sidebarThemeText) {
            sidebarThemeText.textContent = isDark ? 'الوضع النهاري' : 'الوضع الليلي';
        }

        if (notify) {
            Utils.toast(
                isDark ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري',
                'info',
                2000
            );
        }
    },

    toggleTheme() {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    /* ===== التنقل ===== */

    initNavigation() {
        Utils.$$('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigate(page);
            });
        });

        Utils.$$('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigate(page);
            });
        });

        const hash = location.hash.replace('#', '');
        if (PAGES.includes(hash)) {
            state.currentPage = hash;
        }
    },

    navigate(page) {
        if (!PAGES.includes(page)) return;

        state.currentPage = page;
        location.hash = '#' + page;

        Utils.$$('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        Utils.$$('.mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        Utils.$$('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        if (window.innerWidth < 1024 && state.sidebarOpen) {
            this.toggleSidebar(false);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.dispatchEvent(new CustomEvent('pagechange', {
            detail: { page }
        }));
    },

    /* ===== الهيدر ===== */

    initHeader() {
        const notifBtn = document.getElementById('notifBtn');
        notifBtn?.addEventListener('click', () => {
            Utils.toast('مرحباً بك في منصة ترابط 👋', 'info', 2500);
        });
    },

    initDate() {
        this.updateDate();
        setInterval(() => this.updateDate(), 60000);
    },

    updateDate() {
        const el = document.getElementById('headerDate');
        if (!el) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-EG', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        el.textContent = dateStr;
    },

    /* ===== حجم الخط ===== */

    initFontSize() {
        const saved = Storage.getFontSize();
        document.documentElement.style.fontSize = saved + 'px';
    },

    /* ===== الشارات ===== */

    updateBadges() {
        const count = Storage.getParticipantsCount();

        const navCertificates = document.getElementById('navCertificatesCount');
        const navParticipants = document.getElementById('navParticipantsCount');

        if (navCertificates) {
            navCertificates.textContent = count > 0 ? count : '';
            navCertificates.dataset.count = count;
        }

        if (navParticipants) {
            navParticipants.textContent = count > 0 ? count : '';
            navParticipants.dataset.count = count;
        }
    }
};

window.UI = UI;