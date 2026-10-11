/* ============================================================
   ترابط v3.0 — التصدير (نسخة API - محسّنة)
   ============================================================ */

const Export = {

    async createCertificateCanvas(name, settings, bgCanvas) {
        const W = 1200;
        const H = 850;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { alpha: false });

        ctx.drawImage(bgCanvas, 0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${settings.fontSize}px "${settings.fontFamily}", Arial, sans-serif`;
        ctx.fillStyle = settings.textColor;
        ctx.fillText(name, settings.coordX, settings.coordY);

        return canvas;
    },

    /* ===== PDF ===== */

    async exportAllPDF() {
        const participants = await Storage.getParticipants();
        const names = participants.map(p => p.name);
        if (names.length === 0) {
            Utils.toast('لا توجد أسماء للتصدير', 'warning');
            return;
        }
        await this.exportNames(names);
    },

    async exportNames(names) {
        if (state.isExporting) {
            Utils.toast('يوجد تصدير جاري...', 'warning');
            return;
        }

        state.isExporting = true;
        const total = names.length;
        const settings = Certificate.getSettings();

        const btn = document.getElementById('exportPdfBtn');
        if (btn) Utils.setButtonLoading(btn, true);

        Utils.showLoading(`جاري إنشاء ${total} شهادة...`, true);

        try {
            const bgCanvas = await Certificate.getBackgroundCanvas();

            if (!window.jspdf) throw new Error('مكتبة PDF غير محمّلة');
            const { jsPDF } = window.jspdf;

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const CHUNK = 5;

            for (let i = 0; i < total; i++) {
                if (i > 0) pdf.addPage();

                const canvas = await this.createCertificateCanvas(names[i], settings, bgCanvas);
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

                canvas.width = 0;
                canvas.height = 0;

                Utils.updateLoading(((i + 1) / total) * 100, `معالجة ${i + 1} من ${total}`);

                if (i % CHUNK === 0) {
                    await Utils.sleep(0);
                }
            }

            Utils.updateLoading(100, 'جاري الحفظ...');
            await Utils.sleep(200);

            pdf.save(`شهادات_ترابط_${Date.now()}.pdf`);

            await Storage.addActivity(`تصدير ${total} شهادة PDF`, 'file-pdf');
            Utils.toast(`✅ تم تصدير ${total} شهادة`, 'success');

        } catch (e) {
            console.error(e);
            Utils.toast('فشل التصدير: ' + e.message, 'error');
        } finally {
            Utils.hideLoading();
            if (btn) Utils.setButtonLoading(btn, false);
            state.isExporting = false;
        }
    },

    /* ===== صور ZIP ===== */

    async exportAllImages() {
        const participants = await Storage.getParticipants();
        const names = participants.map(p => p.name);
        if (names.length === 0) {
            Utils.toast('لا توجد أسماء للتصدير', 'warning');
            return;
        }

        if (state.isExporting) {
            Utils.toast('يوجد تصدير جاري...', 'warning');
            return;
        }

        state.isExporting = true;
        const total = names.length;
        const settings = Certificate.getSettings();

        const btn = document.getElementById('exportZipBtn');
        if (btn) Utils.setButtonLoading(btn, true);

        Utils.showLoading(`جاري إنشاء ${total} صورة...`, true);

        try {
            if (!window.JSZip) throw new Error('مكتبة ZIP غير محمّلة');
            const zip = new JSZip();
            const bgCanvas = await Certificate.getBackgroundCanvas();

            for (let i = 0; i < total; i++) {
                const canvas = await this.createCertificateCanvas(names[i], settings, bgCanvas);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64 = dataUrl.split(',')[1];

                const safeName = Utils.safeFileName(names[i]);
                zip.file(`${String(i + 1).padStart(3, '0')}_${safeName}.jpg`, base64, { base64: true });

                canvas.width = 0;
                canvas.height = 0;

                Utils.updateLoading(((i + 1) / total) * 100, `معالجة ${i + 1} من ${total}`);

                if (i % 5 === 0) await Utils.sleep(0);
            }

            Utils.updateLoading(100, 'جاري ضغط الملف...');
            const blob = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (meta) => Utils.updateLoading(meta.percent, 'جاري الضغط...')
            );

            Utils.downloadBlob(blob, `شهادات_ترابط_${Date.now()}.zip`);

            await Storage.addActivity(`تصدير ${total} صورة`, 'file-image');
            Utils.toast(`✅ تم تصدير ${total} صورة`, 'success');

        } catch (e) {
            console.error(e);
            Utils.toast('فشل التصدير: ' + e.message, 'error');
        } finally {
            Utils.hideLoading();
            if (btn) Utils.setButtonLoading(btn, false);
            state.isExporting = false;
        }
    },

    /* ===== Excel ===== */

    async exportExcel() {
        const participants = await Storage.getParticipants();
        if (participants.length === 0) {
            Utils.toast('لا توجد أسماء', 'warning');
            return;
        }

        try {
            if (!window.XLSX) throw new Error('مكتبة Excel غير محمّلة');

            const data = participants.map((p, i) => ({
                '#': i + 1,
                'الاسم': p.name,
                'تاريخ الإضافة': Utils.formatDate(p.addedAt)
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 20 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'المشاركون');
            XLSX.writeFile(wb, `اسماء_ترابط_${Date.now()}.xlsx`);

            await Storage.addActivity('تصدير Excel', 'download');
            Utils.toast('✅ تم تصدير Excel', 'success');
        } catch (e) {
            Utils.toast('فشل التصدير: ' + e.message, 'error');
        }
    },

    /* ===== شهادة واحدة ===== */

    async exportSinglePDF() {
        const input = document.getElementById('singleNameInput');
        const name = input?.value.trim();

        if (!name) {
            Utils.toast('الرجاء إدخال الاسم', 'warning');
            return;
        }

        await this.exportNames([name]);
        input.value = '';
    },

    /* ===== نسخة احتياطية ===== */

    async backup() {
        try {
            const data = await Storage.exportBackup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            Utils.downloadBlob(blob, `نسخة_احتياطية_ترابط_${Date.now()}.json`);
            Utils.toast('✅ تم إنشاء النسخة الاحتياطية', 'success');
            await Storage.addActivity('نسخة احتياطية', 'download');
        } catch (e) {
            Utils.toast('فشل النسخ الاحتياطي', 'error');
        }
    },

    openRestore() {
        Participants._openModal({
            title: 'استعادة من نسخة احتياطية',
            icon: 'fa-upload',
            body: `
                <div style="text-align:center;padding:20px 0;">
                    <i class="fas fa-upload" style="font-size:48px;color:var(--primary);opacity:0.4;margin-bottom:16px;display:block;"></i>
                    <p style="font-size:14px;color:var(--text-2);margin-bottom:16px;">
                        اختر ملف JSON (نسخة احتياطية سابقة)
                    </p>
                    <input type="file" id="restoreFile" accept=".json" style="display:none;">
                    <button class="btn btn-primary" id="selectRestoreBtn">
                        <i class="fas fa-folder-open"></i>
                        اختيار ملف
                    </button>
                    <p id="restoreFileName" style="font-size:13px;color:var(--text-3);margin-top:12px;"></p>
                </div>
            `,
            confirmText: 'استعادة',
            confirmIcon: 'fa-upload',
            confirmDisabled: true,
            onOpen: (modal) => {
                const fileInput = modal.querySelector('#restoreFile');
                const selectBtn = modal.querySelector('#selectRestoreBtn');
                const nameEl = modal.querySelector('#restoreFileName');
                const confirmBtn = modal.querySelector('[data-confirm]');

                selectBtn.addEventListener('click', () => fileInput.click());

                fileInput.addEventListener('change', () => {
                    const file = fileInput.files[0];
                    if (file) {
                        nameEl.textContent = `📎 ${file.name}`;
                        confirmBtn.disabled = false;
                    }
                });
            },
            onConfirm: async (modal) => {
                const fileInput = modal.querySelector('#restoreFile');
                const file = fileInput.files[0];
                if (!file) return false;

                try {
                    const text = await Utils.readTextFile(file);
                    const data = JSON.parse(text);
                    await Storage.importBackup(data);
                    await Participants.render();
                    await Certificate.init();
                    Utils.toast('✅ تم الاستعادة بنجاح', 'success');
                    await Storage.addActivity('استعادة نسخة احتياطية', 'upload');
                    return true;
                } catch (e) {
                    Utils.toast('فشل الاستعادة: ملف غير صالح', 'error');
                    return false;
                }
            }
        });
    }
};

window.Export = Export;