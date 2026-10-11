/* ============================================================
   ترابط v3.0 — إدارة المشاركين (نسخة API)
   ============================================================ */

const Participants = {

    /* ============================================================
       العرض
       ============================================================ */

    async render() {
        const tbody = document.getElementById('participantsTbody');
        const certTbody = document.getElementById('certPreviewTbody');

        let participants = [];
        try {
            participants = await Storage.getParticipants();
        } catch (e) {
            console.error('فشل تحميل المشاركين:', e);
            Utils.toast('فشل الاتصال بالسيرفر', 'error');
        }

        const query = (state.searchQuery || '').toLowerCase().trim();

        let filtered = participants;
        if (query) {
            filtered = participants.filter(p => p.name.toLowerCase().includes(query));
        }

        this.updateCounts(participants.length, filtered.length);

        // جدول المشاركين
        if (tbody) {
            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>${query ? 'لا توجد نتائج' : 'لا يوجد مشاركون'}</p>
                            <span>${query ? 'جرّب بحثاً آخر' : 'ابدأ بإضافة الأسماء'}</span>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = filtered.map((p, i) => `
                    <tr data-id="${p.id}">
                        <td data-label="#">${i + 1}</td>
                        <td data-label="الاسم"><strong>${Utils.escape(p.name)}</strong></td>
                        <td data-label="التاريخ">${Utils.formatDate(p.addedAt)}</td>
                        <td data-label="إجراءات" class="col-actions">
                            <div class="cell-actions">
                                <button class="btn btn-icon btn-xs btn-primary" data-action="pdf" data-id="${p.id}" title="تصدير PDF">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                                <button class="btn btn-icon btn-xs btn-danger" data-action="delete" data-id="${p.id}" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // معاينة الشهادات
        if (certTbody) {
            if (participants.length === 0) {
                certTbody.innerHTML = `
                    <tr>
                        <td colspan="2" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>لا توجد أسماء</p>
                        </td>
                    </tr>
                `;
            } else {
                certTbody.innerHTML = participants.slice(0, 20).map(p => `
                    <tr>
                        <td>${Utils.escape(p.name)}</td>
                        <td class="col-actions">
                            <button class="btn btn-icon btn-xs btn-primary" data-action="pdf" data-id="${p.id}" title="PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            const countEl = document.getElementById('certPreviewCount');
            if (countEl) countEl.textContent = participants.length;
        }

        this.bindActions();
        this.updateStats(participants.length);
    },

    bindActions() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'delete') this.confirmDelete(id);
                else if (action === 'pdf') this.exportSingle(id);
            });
        });
    },

    updateCounts(total, filtered) {
        const totalEl = document.getElementById('totalCount');
        const filteredBadge = document.getElementById('filteredBadge');
        const filteredEl = document.getElementById('filteredCount');
        const settingsCount = document.getElementById('settingsParticipantCount');

        if (totalEl) totalEl.textContent = total;
        if (settingsCount) settingsCount.textContent = total;

        if (filteredBadge && filteredEl) {
            if (total > 0 && filtered !== total) {
                filteredBadge.style.display = 'inline-flex';
                filteredEl.textContent = filtered;
            } else {
                filteredBadge.style.display = 'none';
            }
        }
    },

    updateStats(count) {
        const statParticipants = document.getElementById('statParticipants');
        const statCertificates = document.getElementById('statCertificates');
        if (statParticipants) statParticipants.textContent = count;
        if (statCertificates) statCertificates.textContent = count;

        if (window.UI && UI.updateBadges) UI.updateBadges();
    },

    /* ============================================================
       إضافة فردية
       ============================================================ */

    openAddModal() {
        this._openModal({
            title: 'إضافة مشارك',
            icon: 'fa-user-plus',
            body: `
                <div class="form-group">
                    <label class="form-label">الاسم الكامل <span class="req">*</span></label>
                    <input type="text" class="form-input" id="addNameInput" placeholder="مثال: أحمد محمد علي" autocomplete="off">
                </div>
            `,
            onConfirm: async (modal) => {
                const input = modal.querySelector('#addNameInput');
                const name = input.value.trim();
                if (!name) {
                    Utils.toast('الرجاء إدخال الاسم', 'warning');
                    input.focus();
                    return false;
                }
                return await this.addSingle(name, modal);
            }
        });
    },

    async addSingle(name, modal) {
        const confirmBtn = modal?.querySelector('[data-confirm]');
        if (confirmBtn) Utils.setButtonLoading(confirmBtn, true);

        try {
            const result = await Storage.addParticipant(name);

            if (!result) {
                Utils.toast('الرجاء إدخال الاسم', 'warning');
                return false;
            }

            if (result.duplicate) {
                Utils.toast(`⚠️ "${name}" موجود مسبقاً`, 'warning');
                if (confirmBtn) Utils.setButtonLoading(confirmBtn, false);
                return false;
            }

            await Storage.addActivity(`إضافة "${name}"`, 'user-plus');
            Utils.toast(`✅ تم إضافة "${name}"`, 'success');
            await this.render();
            return true;
        } catch (e) {
            Utils.toast('فشل الإضافة: ' + e.message, 'error');
            if (confirmBtn) Utils.setButtonLoading(confirmBtn, false);
            return false;
        }
    },

    /* ============================================================
       إضافة دفعة
       ============================================================ */

    openBulkModal() {
        this._openModal({
            title: 'إضافة دفعة واحدة',
            icon: 'fa-paste',
            size: 'md',
            body: `
                <div class="form-group">
                    <label class="form-label">الأسماء (كل اسم في سطر)</label>
                    <textarea class="form-textarea" id="bulkInput" placeholder="أحمد محمد&#10;سارة علي&#10;محمد حسن" style="min-height:180px;"></textarea>
                    <span class="form-hint">عدد الأسماء: <strong id="bulkCount" style="color:var(--primary);">0</strong></span>
                </div>
            `,
            onOpen: (modal) => {
                const textarea = modal.querySelector('#bulkInput');
                const countEl = modal.querySelector('#bulkCount');

                textarea.addEventListener('input', () => {
                    const count = textarea.value.split('\n').map(l => l.trim()).filter(Boolean).length;
                    countEl.textContent = count;
                });

                setTimeout(() => textarea.focus(), 100);
            },
            onConfirm: async (modal) => {
                const textarea = modal.querySelector('#bulkInput');
                const names = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);

                if (names.length === 0) {
                    Utils.toast('الرجاء إدخال اسم واحد على الأقل', 'warning');
                    return false;
                }

                return await this.addBulk(names, modal);
            }
        });
    },

    async addBulk(names, modal) {
        const confirmBtn = modal?.querySelector('[data-confirm]');
        if (confirmBtn) Utils.setButtonLoading(confirmBtn, true);

        try {
            const result = await Storage.addBulkParticipants(names);

            if (!result.added || result.added.length === 0) {
                Utils.toast('⚠️ كل الأسماء موجودة مسبقاً', 'warning');
                if (confirmBtn) Utils.setButtonLoading(confirmBtn, false);
                return false;
            }

            await Storage.addActivity(`إضافة ${result.added.length} اسم دفعة واحدة`, 'users');

            let msg = `✅ تم إضافة ${result.added.length} اسم`;
            if (result.skipped && result.skipped.length > 0) {
                msg += ` (تجاهل ${result.skipped.length} مكرر)`;
            }
            Utils.toast(msg, 'success');
            await this.render();
            return true;
        } catch (e) {
            Utils.toast('فشل الإضافة: ' + e.message, 'error');
            if (confirmBtn) Utils.setButtonLoading(confirmBtn, false);
            return false;
        }
    },

    /* ============================================================
       استيراد ملف
       ============================================================ */

    openImportModal() {
        this._openModal({
            title: 'استيراد من ملف',
            icon: 'fa-file-import',
            body: `
                <div style="text-align:center;padding:20px 0;">
                    <i class="fas fa-file-import" style="font-size:48px;color:var(--primary);opacity:0.4;margin-bottom:16px;display:block;"></i>
                    <p style="font-size:14px;color:var(--text-2);margin-bottom:16px;">
                        ارفع ملف Excel (.xlsx, .xls) أو نصي (.txt, .csv)
                    </p>
                    <input type="file" id="importFile" accept=".xlsx,.xls,.txt,.csv" style="display:none;">
                    <button class="btn btn-primary" id="selectFileBtn">
                        <i class="fas fa-folder-open"></i>
                        اختيار ملف
                    </button>
                    <p id="selectedFileName" style="font-size:13px;color:var(--text-3);margin-top:12px;"></p>
                </div>
            `,
            confirmText: 'استيراد',
            confirmIcon: 'fa-upload',
            confirmDisabled: true,
            onOpen: (modal) => {
                const fileInput = modal.querySelector('#importFile');
                const selectBtn = modal.querySelector('#selectFileBtn');
                const fileNameEl = modal.querySelector('#selectedFileName');
                const confirmBtn = modal.querySelector('[data-confirm]');

                selectBtn.addEventListener('click', () => fileInput.click());

                fileInput.addEventListener('change', () => {
                    const file = fileInput.files[0];
                    if (file) {
                        fileNameEl.textContent = `📎 ${file.name}`;
                        confirmBtn.disabled = false;
                    } else {
                        fileNameEl.textContent = '';
                        confirmBtn.disabled = true;
                    }
                });
            },
            onConfirm: async (modal) => {
                const fileInput = modal.querySelector('#importFile');
                const confirmBtn = modal.querySelector('[data-confirm]');
                const file = fileInput.files[0];
                if (!file) return false;

                Utils.setButtonLoading(confirmBtn, true);

                try {
                    const names = await this.readFile(file);
                    if (names.length === 0) {
                        Utils.toast('لم يتم العثور على أسماء', 'warning');
                        Utils.setButtonLoading(confirmBtn, false);
                        return false;
                    }
                    return await this.addBulk(names, modal);
                } catch (err) {
                    Utils.toast(err.message || 'فشل قراءة الملف', 'error');
                    Utils.setButtonLoading(confirmBtn, false);
                    return false;
                }
            }
        });
    },

    readFile(file) {
        const name = file.name.toLowerCase();

        if (name.endsWith('.txt') || name.endsWith('.csv')) {
            return Utils.readTextFile(file).then(text => {
                return text.split('\n').map(l => l.trim()).filter(Boolean);
            });
        }

        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            return Utils.readArrayBuffer(file).then(buffer => {
                if (!window.XLSX) throw new Error('مكتبة Excel غير محمّلة');
                const data = new Uint8Array(buffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const names = [];
                rows.forEach(row => {
                    row.forEach(cell => {
                        if (cell && String(cell).trim()) {
                            names.push(String(cell).trim());
                        }
                    });
                });
                return names;
            });
        }

        return Promise.reject(new Error('نوع الملف غير مدعوم'));
    },

    /* ============================================================
       حذف
       ============================================================ */

    async confirmDelete(id) {
        let p = null;
        try {
            const list = await Storage.getParticipants();
            p = list.find(x => x.id === id);
        } catch (e) {
            Utils.toast('فشل البحث', 'error');
            return;
        }
        if (!p) return;

        this._confirm({
            title: 'حذف مشارك',
            message: `هل أنت متأكد من حذف "${p.name}"؟`,
            icon: 'fa-trash',
            confirmText: 'حذف',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await Storage.removeParticipant(id);
                    await Storage.addActivity(`حذف "${p.name}"`, 'user-minus');
                    Utils.toast(`تم حذف "${p.name}"`, 'success');
                    await this.render();
                } catch (e) {
                    Utils.toast('فشل الحذف', 'error');
                }
            }
        });
    },

    async clearAll() {
        let count = 0;
        try {
            count = await Storage.getParticipantsCount();
        } catch (e) {
            Utils.toast('فشل الاتصال', 'error');
            return;
        }

        if (count === 0) {
            Utils.toast('لا توجد أسماء', 'warning');
            return;
        }

        this._confirm({
            title: 'حذف الكل',
            message: `سيتم حذف ${count} اسم. لا يمكن التراجع!`,
            icon: 'fa-exclamation-triangle',
            confirmText: 'حذف الكل',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await Storage.clearParticipants();
                    await Storage.addActivity(`حذف ${count} اسم`, 'trash');
                    Utils.toast(`تم حذف ${count} اسم`, 'success');
                    await this.render();
                } catch (e) {
                    Utils.toast('فشل الحذف', 'error');
                }
            }
        });
    },

    /* ============================================================
       بحث
       ============================================================ */

    initSearch() {
        const input = document.getElementById('searchInput');
        const box = document.getElementById('searchBox');
        const clearBtn = document.getElementById('clearSearchBtn');
        if (!input) return;

        const handler = Utils.debounce(() => {
            state.searchQuery = input.value;
            box?.classList.toggle('has-value', input.value.length > 0);
            this.render();
        }, 200);

        input.addEventListener('input', handler);

        clearBtn?.addEventListener('click', () => {
            input.value = '';
            state.searchQuery = '';
            box?.classList.remove('has-value');
            this.render();
            input.focus();
        });
    },

    /* ============================================================
       ترتيب
       ============================================================ */

    async toggleSort() {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        Utils.toast(
            state.sortDirection === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي',
            'success'
        );
        await this.render();
    },

    /* ============================================================
       تصدير فردي
       ============================================================ */

    async exportSingle(id) {
        try {
            const list = await Storage.getParticipants();
            const p = list.find(x => x.id === id);
            if (!p) return;

            await Export.exportNames([p.name]);
            await Storage.addActivity(`تصدير شهادة "${p.name}"`, 'file-pdf');
        } catch (e) {
            console.error(e);
        }
    },

    /* ============================================================
       مودال عام (داخلي)
       ============================================================ */

    _openModal({ title, icon, body, size, onOpen, onConfirm, confirmText = 'تأكيد', confirmIcon = 'fa-check', confirmDisabled = false }) {
        this._closeModal();

        const container = document.getElementById('modalContainer');
        if (!container) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-box ${size ? 'modal-' + size : ''}">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas ${icon}"></i>
                        ${Utils.escape(title)}
                    </h3>
                    <button class="modal-close" data-close>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">${body}</div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" data-cancel>إلغاء</button>
                    <button class="btn btn-primary" data-confirm ${confirmDisabled ? 'disabled' : ''}>
                        <i class="fas ${confirmIcon}"></i>
                        ${Utils.escape(confirmText)}
                    </button>
                </div>
            </div>
        `;

        container.appendChild(modal);
        this._currentModal = modal;

        requestAnimationFrame(() => modal.classList.add('active'));

        modal.querySelector('.modal-backdrop').addEventListener('click', () => this._closeModal());
        modal.querySelector('[data-close]').addEventListener('click', () => this._closeModal());
        modal.querySelector('[data-cancel]').addEventListener('click', () => this._closeModal());

        const confirmBtn = modal.querySelector('[data-confirm]');
        confirmBtn.addEventListener('click', async () => {
            if (confirmBtn.disabled) return;
            const result = onConfirm ? await onConfirm(modal) : true;
            if (result !== false) this._closeModal();
        });

        this._escHandler = (e) => {
            if (e.key === 'Escape') this._closeModal();
        };
        document.addEventListener('keydown', this._escHandler);

        document.body.style.overflow = 'hidden';

        if (onOpen) setTimeout(() => onOpen(modal), 100);
    },

    _closeModal() {
        if (!this._currentModal) return;
        const modal = this._currentModal;
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 250);
        this._currentModal = null;

        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        document.body.style.overflow = '';
    },

    _confirm({ title, message, icon, confirmText, type = 'primary', onConfirm }) {
        this._openModal({
            title,
            icon,
            body: `<p style="font-size:14px;color:var(--text-2);line-height:1.7;text-align:center;">${Utils.escape(message)}</p>`,
            confirmText,
            confirmIcon: 'fa-check',
            onConfirm: async () => {
                if (typeof onConfirm === 'function') await onConfirm();
                return true;
            }
        });

        const confirmBtn = this._currentModal?.querySelector('[data-confirm]');
        if (confirmBtn) {
            confirmBtn.className = `btn btn-${type}`;
        }
    }
};

window.Participants = Participants;