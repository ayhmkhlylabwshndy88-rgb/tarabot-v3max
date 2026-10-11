/* ============================================================
   ترابط v3.0 — سجل النشاطات
   ============================================================ */

const Activities = {

    ICONS: {
        "user-plus":   "fa-user-plus",
        "user-minus":  "fa-user-minus",
        "users":       "fa-users",
        "trash":       "fa-trash",
        "file-pdf":    "fa-file-pdf",
        "file-image":  "fa-file-archive",
        "upload":      "fa-upload",
        "download":    "fa-download",
        "settings":    "fa-cog",
        "info":        "fa-info",
        "image":       "fa-image",
        "certificate": "fa-certificate"
    },

    async add(text, icon) {
        icon = icon || "info";
        try {
            await Storage.addActivity(text, icon);
            await this.render();
            if (window.UI && UI.updateBadges) UI.updateBadges();
        } catch (e) {
            console.error("فشل إضافة النشاط:", e);
        }
    },

    async clear() {
        try {
            await Storage.clearActivities();
            await this.render();
            Utils.toast("تم مسح النشاطات", "success");
        } catch (e) {
            Utils.toast("فشل مسح النشاطات", "error");
        }
    },

    async render() {
        const container = document.getElementById("activityList");
        if (!container) return;

        let activities = [];
        try {
            activities = await Storage.getActivities();
        } catch {
            activities = [];
        }

        if (activities.length === 0) {
            container.innerHTML = "<div style=\"text-align:center;padding:30px 20px;color:var(--text-3);\"><i class=\"fas fa-inbox\" style=\"font-size:32px;display:block;margin-bottom:12px;opacity:0.3;\"></i>لا توجد نشاطات بعد</div>";
            return;
        }

        container.innerHTML = activities.slice(0, 8).map(activity => {
            const iconClass = this.ICONS[activity.icon] || this.ICONS.info;
            const timeAgo = Utils.timeAgo(activity.time);

            return "<div class=\"activity-item\"><div class=\"activity-icon\"><i class=\"fas " + iconClass + "\"></i></div><div class=\"activity-content\"><p>" + Utils.escape(activity.text) + "</p><time>" + timeAgo + "</time></div></div>";
        }).join("");
    }
};

window.Activities = Activities;
