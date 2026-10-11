/* ============================================================
   ترابط v3.0 — إدارة الشهادة (نسخة API)
   ============================================================ */

const Certificate = {

    imageData: null,
    bgCanvas: null,
    previewTimer: null,
    settings: null,

    async init() {
        try {
            this.imageData = await Storage.getCertificateImage();
        } catch (e) {
            console.error('فشل تحميل الصورة:', e);
            this.imageData = null;
        }

        await this.loadSettings();

        ['fontSize', 'textColor', 'fontFamily'].forEach(id => {
            const el = document.getElementById(id);
            el?.addEventListener('input', () => this.updatePreview());
            el?.addEventListener('change', () => this.updatePreview());
        });

        const fileInput = document.getElementById('certImageInput');
        fileInput?.addEventListener('change', e => this.handleImageUpload(e));

        this.updatePreview();
        this.updateStatus();
    },

    async loadSettings() {
        try {
            this.settings = await Storage.getSettings();
        } catch {
            this.settings = { coordX: 600, coordY: 425, fontSize: 60, textColor: '#1a1208', fontFamily: 'Cairo' };
        }

        const s = this.settings;
        const fontSize = document.getElementById('fontSize');
        const textColor = document.getElementById('textColor');
        const fontFamily = document.getElementById('fontFamily');
        const displayX = document.getElementById('displayX');
        const displayY = document.getElementById('displayY');

        if (fontSize) fontSize.value = s.fontSize;
        if (textColor) textColor.value = s.textColor;
        if (fontFamily) fontFamily.value = s.fontFamily;
        if (displayX) displayX.textContent = s.coordX;
        if (displayY) displayY.textContent = s.coordY;
    },

    async saveSettings() {
        const settings = {
            coordX: parseInt(document.getElementById('displayX')?.textContent) || 600,
            coordY: parseInt(document.getElementById('displayY')?.textContent) || 425,
            fontSize: parseInt(document.getElementById('fontSize')?.value) || 60,
            textColor: document.getElementById('textColor')?.value || '#1a1208',
            fontFamily: document.getElementById('fontFamily')?.value || 'Cairo'
        };

        try {
            await Storage.setSettings(settings);
        } catch (e) {
            console.error('فشل حفظ الإعدادات:', e);
        }

        this.settings = settings;
        return settings;
    },

    getSettings() {
        return this.settings || { coordX: 600, coordY: 425, fontSize: 60, textColor: '#1a1208', fontFamily: 'Cairo' };
    },

    /* ===== رفع الصورة ===== */

    uploadImage() {
        document.getElementById('certImageInput')?.click();
    },

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!Utils.isImageFile(file)) {
            Utils.toast('الرجاء اختيار صورة صالحة', 'error');
            return;
        }

        Utils.showLoading('جاري رفع الصورة...');

        try {
            const dataUrl = await Utils.readDataURL(file);
            this.imageData = dataUrl;
            this.bgCanvas = null;

            const saved = await Storage.setCertificateImage(dataUrl);
            if (!saved) {
                Utils.toast('⚠️ فشل حفظ الصورة على السيرفر', 'warning');
            }

            this.updateStatus(true);
            this.updatePreview();
            await Storage.addActivity('رفع صورة الشهادة', 'image');
            Utils.toast('✅ تم رفع الصورة', 'success');
        } catch (e) {
            Utils.toast('فشل رفع الصورة: ' + e.message, 'error');
        } finally {
            Utils.hideLoading();
            event.target.value = '';
        }
    },

    updateStatus(hasImage = null) {
        const status = document.getElementById('certStatus');
        if (!status) return;

        const has = hasImage !== null ? hasImage : !!this.imageData;

        if (has) {
            status.className = 'upload-status success';
            status.innerHTML = '<i class="fas fa-check-circle"></i> صورة محمّلة';
        } else {
            status.className = 'upload-status';
            status.innerHTML = '<i class="fas fa-exclamation-circle"></i> لا توجد صورة';
        }

        const statTemplate = document.getElementById('statTemplate');
        if (statTemplate) {
            statTemplate.textContent = has ? 'جاهزة' : '—';
        }
    },

    /* ===== المعاينة ===== */

    updatePreview() {
        clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => this._drawPreview(), 80);
    },

    async _drawPreview() {
        const canvas = document.getElementById('previewCanvas');
        const placeholder = document.getElementById('previewPlaceholder');
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        const settings = this.getSettings();

        const W = 800;
        const H = 566;

        canvas.width = W;
        canvas.height = H;

        if (this.imageData) {
            try {
                const img = await this.loadImage(this.imageData);
                ctx.drawImage(img, 0, 0, W, H);
            } catch {
                this.drawDefaultBg(ctx, W, H);
            }
        } else {
            this.drawDefaultBg(ctx, W, H);
        }

        const sampleName = 'أيهم خليل أبو شندي';
        const scaleX = W / 1200;
        const scaleY = H / 850;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${settings.fontSize * scaleY}px "${settings.fontFamily}", Arial, sans-serif`;
        ctx.fillStyle = settings.textColor;
        ctx.fillText(sampleName, settings.coordX * scaleX, settings.coordY * scaleY);

        canvas.classList.add('active');
        placeholder?.classList.add('hidden');
    },

    drawDefaultBg(ctx, W, H) {
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, '#fdf6e3');
        gradient.addColorStop(0.5, '#f5e6ca');
        gradient.addColorStop(1, '#fdf6e3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, W - 24, H - 24);

        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, W - 48, H - 48);

        ctx.fillStyle = '#b8860b';
        ctx.font = `bold ${W / 20}px "Cairo", Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🕌 شهادة مشاركة', W / 2, H / 4);

        ctx.fillStyle = '#555';
        ctx.font = `${W / 35}px "Cairo", Arial`;
        ctx.fillText('تشهد مبادرة ترابط بأن', W / 2, H / 2.5);
    },

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },

    /* ===== التحكم بالموقع ===== */

    async move(direction) {
        const settings = { ...this.getSettings() };
        const step = 5;

        let x = settings.coordX;
        let y = settings.coordY;

        if (direction === 'up') y -= step;
        else if (direction === 'down') y += step;
        else if (direction === 'left') x -= step;
        else if (direction === 'right') x += step;

        x = Math.max(0, Math.min(1200, x));
        y = Math.max(0, Math.min(850, y));

        settings.coordX = x;
        settings.coordY = y;
        this.settings = settings;

        Storage.setSettings(settings).catch(() => {});

        const displayX = document.getElementById('displayX');
        const displayY = document.getElementById('displayY');
        if (displayX) displayX.textContent = x;
        if (displayY) displayY.textContent = y;

        this.updatePreview();
    },

    reset() {
        Participants._confirm({
            title: 'إعادة ضبط',
            message: 'سيتم إعادة إعدادات الشهادة للوضع الافتراضي (لن تُحذف الصورة).',
            icon: 'fa-undo',
            confirmText: 'إعادة ضبط',
            type: 'warning',
            onConfirm: async () => {
                await Storage.resetSettings();
                await this.loadSettings();
                this.updatePreview();
                Utils.toast('تم إعادة الضبط', 'success');
                await Storage.addActivity('إعادة ضبط إعدادات الشهادة', 'settings');
            }
        });
    },

    /* ===== الخلفية عالية الدقة ===== */

    async getBackgroundCanvas() {
        const W = 1200;
        const H = 850;

        if (this.bgCanvas) return this.bgCanvas;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (this.imageData) {
            try {
                const img = await this.loadImage(this.imageData);
                ctx.drawImage(img, 0, 0, W, H);
                this.bgCanvas = canvas;
                return canvas;
            } catch {}
        }

        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, '#fdf6e3');
        gradient.addColorStop(0.5, '#f5e6ca');
        gradient.addColorStop(1, '#fdf6e3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, W - 80, H - 80);

        ctx.fillStyle = '#b8860b';
        ctx.font = `bold 60px "Cairo", Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🕌 شهادة مشاركة', W / 2, 150);

        ctx.fillStyle = '#333';
        ctx.font = `30px "Cairo", Arial`;
        ctx.fillText('تشهد مبادرة ترابط بأن', W / 2, 280);

        ctx.fillStyle = '#666';
        ctx.font = `22px "Cairo", Arial`;
        ctx.fillText(`📅 ${new Date().toLocaleDateString('ar-EG')}`, W / 2, 700);

        this.bgCanvas = canvas;
        return canvas;
    }
};

window.Certificate = Certificate;