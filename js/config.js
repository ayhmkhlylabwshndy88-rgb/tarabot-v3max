/* ============================================================
   ترابط v3.0 — الإعدادات والثوابت
   ============================================================ */

const APP = {
    name: 'ترابط',
    version: '3.0.0',
    author: 'فريق ترابط',
    description: 'منصة إدارة الشهادات للمبادرات التعليمية'
};

/* الإعدادات الافتراضية */
const DEFAULTS = {
    certificate: {
        coordX: 600,
        coordY: 425,
        fontSize: 60,
        textColor: '#1a1208',
        fontFamily: 'Cairo'
    },
    canvas: {
        width: 1200,
        height: 850,
        previewWidth: 800,
        previewHeight: 566
    },
    app: {
        theme: 'light',
        fontSize: 15
    }
};

/* مفاتيح التخزين */
const STORAGE_KEYS = {
    participants: 'tarabot_participants_v3',
    settings: 'tarabot_settings_v3',
    activities: 'tarabot_activities_v3',
    certificateImage: 'tarabot_cert_image_v3',
    theme: 'tarabot_theme_v3',
    fontSize: 'tarabot_fontsize_v3'
};

/* الصفحات */
const PAGES = [
    'dashboard',
    'certificates',
    'participants',
    'export',
    'settings',
    'guide',
    'about'
];

/* الرسائل */
const MESSAGES = {
    welcome: 'مرحباً بك في منصة ترابط',
    noNames: 'لا توجد أسماء مسجلة',
    noData: 'لا توجد بيانات',
    addSuccess: 'تم الإضافة بنجاح',
    deleteSuccess: 'تم الحذف بنجاح',
    updateSuccess: 'تم التحديث بنجاح',
    exportSuccess: 'تم التصدير بنجاح',
    uploadSuccess: 'تم رفع الملف بنجاح',
    error: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    confirmClearAll: 'سيتم حذف جميع الأسماء. متابعة؟',
    enterName: 'الرجاء إدخال الاسم',
    enterOneName: 'الرجاء إدخال اسم واحد على الأقل',
    noFile: 'الرجاء اختيار ملف',
    loading: 'جاري المعالجة...'
};

/* أنواع الملفات المدعومة */
const SUPPORTED_FILES = {
    images: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    data: ['.xlsx', '.xls', '.txt', '.csv']
};

/* الخطوط المتاحة */
const FONT_FAMILIES = [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Amiri', label: 'Amiri' },
    { value: 'Tajawal', label: 'Tajawal' },
    { value: 'Almarai', label: 'Almarai' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Tahoma', label: 'Tahoma' }
];

/* حالة التطبيق */
const state = {
    currentPage: 'dashboard',
    sidebarOpen: false,
    theme: 'light',
    searchQuery: '',
    sortDirection: 'asc',
    isExporting: false,
    certificateImage: null
};

console.log(
    `%c🚀 ${APP.name} v${APP.version}`,
    'color: #b8860b; font-size: 16px; font-weight: bold;'
);