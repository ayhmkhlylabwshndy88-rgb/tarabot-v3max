/* ============================================================
   ترابط v3.0 — إدارة البيانات (API)
   ============================================================ */

const API_URL = 'https://tarabot-api.onrender.com';

const Storage = {

    /* ===== دوال API داخلية ===== */

    async _api(endpoint, options = {}) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'خطأ في الاتصال');
        }
        return await response.json();
    },

    /* ============================================================
       المشاركون
       ============================================================ */

    async getParticipants() {
        try {
            return await this._api('/api/participants');
        } catch (e) {
            console.warn('⚠️ فشل الاتصال بالسيرفر');
            return [];
        }
    },

    async addParticipant(name) {
        const cleanName = String(name).trim();
        if (!cleanName) return null;

        try {
            return await this._api('/api/participants', {
                method: 'POST',
                body: JSON.stringify({ name: cleanName })
            });
        } catch (e) {
            if (e.message.includes('موجود') || e.message.includes('already')) {
                return { duplicate: true, name: cleanName };
            }
            throw e;
        }
    },

    async addBulkParticipants(names) {
        return await this._api('/api/participants/bulk', {
            method: 'POST',
            body: JSON.stringify({ names })
        });
    },

    async removeParticipant(id) {
        await this._api(`/api/participants/${id}`, { method: 'DELETE' });
        return { id };
    },

    async clearParticipants() {
        const result = await this._api('/api/participants', { method: 'DELETE' });
        return result.deleted || 0;
    },

    async sortParticipants(direction = 'asc') {
        const list = await this.getParticipants();
        list.sort((a, b) => {
            const r = a.name.localeCompare(b.name, 'ar');
            return direction === 'asc' ? r : -r;
        });
        return list;
    },

    async getParticipantsCount() {
        const list = await this.getParticipants();
        return list.length;
    },

    /* ============================================================
       الإعدادات
       ============================================================ */

    async getSettings() {
        try {
            return await this._api('/api/settings');
        } catch {
            return {
                coordX: 600,
                coordY: 425,
                fontSize: 60,
                textColor: '#1a1208',
                fontFamily: 'Cairo'
            };
        }
    },

    async setSettings(settings) {
        try {
            return await this._api('/api/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
        } catch {
            return settings;
        }
    },

    async resetSettings() {
        try {
            return await this._api('/api/settings', {
                method: 'POST',
                body: JSON.stringify({
                    coordX: 600,
                    coordY: 425,
                    fontSize: 60,
                    textColor: '#1a1208',
                    fontFamily: 'Cairo'
                })
            });
        } catch {
            return {
                coordX: 600,
                coordY: 425,
                fontSize: 60,
                textColor: '#1a1208',
                fontFamily: 'Cairo'
            };
        }
    },

    /* ============================================================
       صورة الشهادة
       ============================================================ */

    async getCertificateImage() {
        try {
            const result = await this._api('/api/certificate-image');
            return result.exists ? result.dataUrl : null;
        } catch {
            return null;
        }
    },

    async setCertificateImage(dataUrl) {
        try {
            const result = await this._api('/api/certificate-image', {
                method: 'POST',
                body: JSON.stringify({ dataUrl })
            });
            return result.ok;
        } catch (e) {
            console.error('فشل حفظ الصورة:', e);
            return false;
        }
    },

    /* ============================================================
       الثيم وحجم الخط (محلية)
       ============================================================ */

    getTheme() {
        return localStorage.getItem('tarabot_theme_v3') || 'light';
    },

    setTheme(theme) {
        localStorage.setItem('tarabot_theme_v3', theme);
    },

    getFontSize() {
        const v = localStorage.getItem('tarabot_fontsize_v3');
        return v ? parseInt(v) : 15;
    },

    setFontSize(size) {
        localStorage.setItem('tarabot_fontsize_v3', String(size));
    },

    /* ============================================================
       النشاطات
       ============================================================ */

    async getActivities() {
        try {
            return await this._api('/api/activities');
        } catch {
            return [];
        }
    },

    async addActivity(text, icon = 'info') {
        try {
            await this._api('/api/activities', {
                method: 'POST',
                body: JSON.stringify({ text, icon })
            });
            return true;
        } catch {
            return false;
        }
    },

    async clearActivities() {
        try {
            await this._api('/api/activities', { method: 'DELETE' });
            return true;
        } catch {
            return false;
        }
    },

    /* ============================================================
       نسخ احتياطي
       ============================================================ */

    async exportBackup() {
        try {
            return await this._api('/api/backup');
        } catch {
            return {
                version: '3.0.0',
                participants: [],
                settings: {},
                activities: []
            };
        }
    },

    async importBackup(data) {
        return await this._api('/api/backup/import', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /* ============================================================
       حذف كل شيء
       ============================================================ */

    async clearAll() {
        try {
            await this._api('/api/clear-all', { method: 'DELETE' });
            return true;
        } catch {
            return false;
        }
    }
};

window.Storage = Storage;