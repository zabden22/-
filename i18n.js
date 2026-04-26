const translations = {
    en: {
        "dashboard": "Dashboard",
        "live_map": "Live Map",
        "admins": "Admins",
        "buses": "Buses",
        "drivers": "Drivers",
        "stations": "Stations",
        "tickets": "Tickets",
        "routes": "Routes",
        "reports": "Reports",
        "settings": "Settings",
        "logout": "Log Out",
        "bus_added_success": "Bus Added! 🚌",
        "error": "Error",
        "preferences": "Preferences",
        "language": "Language",
        "theme": "Theme"
    },
    ar: {
        "dashboard": "لوحة التحكم",
        "live_map": "الخريطة",
        "admins": "المشرفين",
        "buses": "الحافلات",
        "drivers": "السائقين",
        "stations": "المحطات",
        "tickets": "التذاكر",
        "routes": "المسارات",
        "reports": "الإشعارات والتقارير",
        "settings": "الإعدادات",
        "logout": "تسجيل الخروج",
        "bus_added_success": "تمت إضافة الحافلة! 🚌",
        "error": "خطأ",
        "preferences": "تفضيلات النظام",
        "language": "اللغة",
        "theme": "المظهر"
    }
};

const strictTextMappings = {
    // Exact mapping for auto-translate
    "Add New Bus": "إضافة حافلة جديدة",
    "Assign driver to bus": "تعيين سائق لحافلة",
    "Bus ID": "معرف الحافلة",
    "Bus Number": "رقم الحافلة",
    "Plate Number": "رقم اللوحة",
    "License Number": "رقم الرخصة",
    "Route ID": "معرف المسار",
    "Capacity": "السعة",
    "Current Driver": "السائق الحالي",
    "Live Speed": "السرعة الحالية",
    "Status": "الحالة",
    "Actions": "إجراءات",
    "Active": "نشط",
    "Inactive": "غير نشط",
    "Add New Admin": "إضافة مشرف جديد",
    "Admin Name": "اسم المشرف",
    "Admin ID": "معرف المشرف",
    "Email": "البريد الإلكتروني",
    "Phone Number": "رقم الهاتف",
    "Email Address": "البريد الإلكتروني",
    "Generate Ticket": "إصدار تذكرة",
    "Export CSV": "تصدير CSV",
    "Search by name, ID or email...": "ابحث بالاسم، المعرف، أو البريد...",
    "Search by Bus ID, Route, or Driver...": "ابحث بمعرف الحافلة، المسار، الخ...",
    "Search Ticket ID or User...": "ابحث بمعرف التذكرة أوالراكب...",
    "Live Tracking Intelligence": "التتبع الذكي المباشر",
    "Fleet Management": "إدارة الأسطول",
    "Admins Management": "إدارة المشرفين",
    "Drivers Management": "إدارة السائقين",
    "Stations Network": "شبكة المحطات",
    "Tickets & Sales": "التذاكر والمبيعات",
    "Reports / Complaints": "التقارير والإشعارات",
    "Display Name": "اسم العرض",
    "Location": "الموقع الجغرافي",
    "Admin Profile Details": "بيانات حساب المشرف",
    "Save Changes": "حفظ التعديلات",
    "By User": "بواسطة الراكب",
    "Use QR": "مسح QR",
    "Report ID": "معرف التقرير",
    "User ID": "معرف المستخدم",
    "Message / Prediction": "الرسالة / التنبؤ",
    "Status Date": "تاريخ الحالة",
    "Departure Station": "محطة الانطلاق",
    "Destination Station": "محطة الوصول",
    "TRACK ROUTE": "تتبع المسار",
    "Total Buses": "إجمالي الحافلات",
    "Active Routes": "المسارات النشطة",
    "Total Stations": "عدد المحطات",
    "Total Tickets": "إجمالي التذاكر",
    "Search by Bus ID, Route, or Driver...": "ابحث بمعرف الحافلة، المسار...",
    "Dashboard": "لوحة التحكم",
    "Sold Tickets": "إجمالي المباعة",
    "Total Drivers": "إجمالي السائقين",
    "Active Buses": "الحافلات النشطة",
    "Crowd Stations": "المحطات المزدحمة",
    "Item approvals in": "الموافقات في",
    "This week": "هذا الأسبوع",
    "This month": "هذا الشهر",
    "Hello": "مرحباً",
    // Stations page
    "Stations Network": "شبكة المحطات",
    "All Stations": "جميع المحطات",
    "Station ID": "معرف المحطة",
    "Station Name": "اسم المحطة",
    "Coordinates (Lat, Lng)": "الإحداثيات",
    "Assigned Lines": "الخطوط",
    "Manage bus stops and locations": "إدارة محطات الحافلات",
    "View on Map": "عرض على الخريطة",
    "Add Station": "إضافة محطة",
    "Save Station": "حفظ المحطة",
    "Add New Station": "إضافة محطة جديدة",
    // Routes page
    "Routes": "المسارات",
    "Route's List": "قائمة المسارات",
    "Route Id": "معرف المسار",
    "Route Number": "رقم المسار",
    "Name": "الاسم",
    "Add New": "إضافة جديد",
    "Add New Route": "إضافة مسار جديد",
    "Route Name": "اسم المسار",
    "Main Station": "المحطة الرئيسية",
    "Save Route": "حفظ المسار",
    "Cancel": "إلغاء",
    // Account / Logout card
    "Account": "الحساب",
    "Log Out": "تسجيل الخروج",
    "Sign out of your admin account": "الخروج من حساب المشرف",
    // Dashboard Calendar & Tickets
    "Daily": "يومي",
    "Weekly": "أسبوعي",
    "Monthly": "شهري",
    "Yearly": "سنوي",
    "Revenue": "إجمالي الإيرادات",
    "Revenue (EGP)": "إجمالي الإيرادات (ج.م)",
    "Used Tickets": "التذاكر المستخدمة",
    "Available Tickets": "التذاكر المتاحة",
    "Available": "المتاحة",
    "Sold": "المباعة",
    "Recent Transactions": "سجل المعاملات الأخير",
    "View All": "عرض الكل",
    "Ticket ID": "رقم التذكرة",
    "Passenger": "الراكب",
    "Route": "المسار",
    "Date": "التاريخ",
    "Price": "السعر",
    "Price (EGP)": "السعر (ج.م)",
    "Invalid Price": "سعر غير صالح",
    "Profile": "الملف الشخصي",
    "Appearance": "المظهر",
    "Notifications": "الإشعارات",
    "System": "النظام",
    "Security": "الأمان",
    "System Administrator — Ministry of Public Transport": "مسؤول النظام — وزارة النقل العام",
    "Super Admin": "مشرف فائق",
    "Online": "متصل",
    "Personal Information": "المعلومات الشخصية",
    "Update your personal details and contact information": "قم بتحديث بياناتك الشخصية ومعلومات الاتصال",
    "Department": "القسم",
    "Employee ID": "معرف الموظف",
    "Appearance & Language": "المظهر واللغة",
    "Customize how TransitWay looks and feels": "قم بتخصيص مظهر وتجربة TransitWay",
    "Choose between light and dark mode": "اختر بين الوضع المضيء والداكن",
    "Select your preferred display language": "اختر لغة العرض المفضلة لديك",
    "Compact Mode": "الوضع المدمج",
    "Reduce spacing for denser data display": "تقليل المسافات لعرض بيانات بكثافة أكبر",
    "Animations": "الرسوم المتحركة",
    "Enable smooth UI transitions and effects": "تفعيل الانتقالات والتأثيرات المرئية السلسة",
    "Notification Preferences": "تفضيلات الإشعارات",
    "Control which alerts and updates you receive": "تحكم في التنبيهات والتحديثات التي تتلقاها",
    "Complaint Reports": "تقارير الشكاوى",
    "Get notified when new bus complaints are filed": "تلقي إشعار عند تقديم شكاوى جديدة عن الحافلات",
    "Bus Status Changes": "تغييرات حالة الحافلات",
    "Alerts when buses go inactive or return to service": "تنبيهات عند تعطل الحافلات أو عودتها للخدمة",
    "Ticket Sales Milestones": "مراحل مبيعات التذاكر",
    "Notifications when daily sales targets are reached": "إشعارات عند تحقيق أهداف المبيعات اليومية",
    "New Driver Registration": "تسجيل سائق جديد",
    "Get notified when new drivers join the system": "تلقي إشعار عند انضمام سائقين جدد للنظام",
    "Daily Summary Report": "الملخص اليومي",
    "Receive end-of-day operational summary": "تلقي ملخص تشغيلي في نهاية اليوم",
    "System Information": "معلومات النظام",
    "Technical details about the TransitWay platform": "التفاصيل الفنية المتعلقة بمنصة TransitWay",
    "Version": "الإصدار",
    "API Status": "حالة API",
    "Backend": "الخادم الخلفي",
    "Uptime": "مدة التشغيل",
    "Connection": "الاتصال",
    "Checking...": "جاري الفحص...",
    "Security & Account": "الأمان والحساب",
    "Manage your passwords and security preferences": "إدارة كلمات المرور وتفضيلات الأمان الخـاصة بك",
    "Change Password": "تغيير كلمة المرور",
    "Update your login password regularly for security": "قم بتحديث كلمة مرورك بانتظام لمزيد من الأمان",
    "Current Password": "كلمة المرور الحالية",
    "New Password": "كلمة المرور الجديدة",
    "Confirm New Password": "تأكيد كلمة المرور الجديدة",
    "Update Password": "تحديث كلمة المرور",
    "Danger Zone": "منطقة الخطر",
    "Irreversible actions for your account": "إجراءات لا يمكن التراجع عنها في حسابك",
    "Clear Cache & Local Data": "مسح الذاكرة المؤقتة",
    "Resets unsaved preferences and local app storage": "إعادة تعيين التفضيلات غير المحفوظة والمساحة المحلية",
    "Clear Data": "مسح البيانات",
    "Delete Account": "حذف الحساب",
    "Permanently remove your admin access from the system": "إزالة وصولك كمسؤول من النظام بشكل دائم",
    "Update Report Status": "تحديث حالة التقرير",
    "Change Status": "تغيير الحالة",
    "Save Status": "حفظ الحالة",
    "New Report Received": "تم استلام تقرير جديد",
    "A new report has just arrived. Refresh to see it.": "لقد وصل تقرير جديد للتو. قم بالتحديث للمشاهدة.",
    "Refresh": "تحديث",
    "Pending": "قيد الانتظار",
    "In Progress": "قيد التنفيذ",
    "Resolved": "تم الحل",
    "Your Strategic Command Center for Transit Excellence.": "مركز القيادة الاستراتيجي الخاص بك للتميز في النقل."
};

function getLang() {
    return localStorage.getItem('transitLang') || 'en';
}

function setLang(lang) {
    localStorage.setItem('transitLang', lang);
    applyLang();
}

function t(key, params = {}) {
    let str = translations[getLang()][key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

function walkTextNodesAndTranslate(node, toAr) {
    if (node.nodeType === 3) { // Text node
        let originalText = node.nodeValue.trim();
        if(!originalText) return;

        // If translating to Arabic
        if(toAr) {
            for (const [enTerm, arTerm] of Object.entries(strictTextMappings)) {
                if(originalText === enTerm) {
                    node.nodeValue = node.nodeValue.replace(enTerm, arTerm);
                    // Store original for reversing
                    node.parentElement.setAttribute('data-original-en', enTerm);
                }
            }
        } 
        // If translating back to English
        else {
            const storedEn = node.parentElement.getAttribute('data-original-en');
            if(storedEn) {
                const arTerm = strictTextMappings[storedEn];
                if(arTerm && node.nodeValue.includes(arTerm)) {
                    node.nodeValue = node.nodeValue.replace(arTerm, storedEn);
                }
            }
        }
    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE") {
        
        // Translate placeholders
        let placeholder = node.getAttribute('placeholder');
        if(placeholder) {
            if(toAr) {
                for (const [enTerm, arTerm] of Object.entries(strictTextMappings)) {
                    if(placeholder === enTerm) {
                        node.setAttribute('placeholder', arTerm);
                        node.setAttribute('data-orig-ph', enTerm);
                    }
                }
            } else {
                let origPh = node.getAttribute('data-orig-ph');
                if(origPh) node.setAttribute('placeholder', origPh);
            }
        }
        
        for (let i = 0; i < node.childNodes.length; i++) {
            walkTextNodesAndTranslate(node.childNodes[i], toAr);
        }
    }
}

function applyLang() {
    const lang = getLang();
    document.documentElement.setAttribute('lang', lang);
    
    const isAr = (lang === 'ar');
    
    if (isAr) {
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl-mode');
    } else {
        document.documentElement.removeAttribute('dir');
        document.body.classList.remove('rtl-mode');
    }

    // Standard data-i18n replacements (sidebar nav, etc.)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            const icon = el.querySelector('i');
            if (icon) {
                const textSpan = document.createElement('span');
                textSpan.innerText = ' ' + translations[lang][key];
                el.innerHTML = '';
                el.appendChild(icon);
                el.appendChild(textSpan);
            } else {
                el.innerText = translations[lang][key];
            }
        }
    });

    // data-i18n-text: swap innerText using strictTextMappings
    document.querySelectorAll('[data-i18n-text]').forEach(el => {
        const enText = el.getAttribute('data-i18n-text');
        if (isAr && strictTextMappings[enText]) {
            el.innerText = strictTextMappings[enText];
        } else {
            el.innerText = enText;
        }
    });

    // Advanced Global Auto-Translate
    walkTextNodesAndTranslate(document.body, isAr);

    // Broadcast
    window.dispatchEvent(new Event('langChanged'));
}

document.addEventListener('DOMContentLoaded', () => {
    applyLang();
});

// Powerful RTL Styling Injection
const rtlStyles = `
<style>
  html[dir="rtl"] .sidebar {
      border-right: none;
      border-left: 1px solid var(--border-color);
  }
  html[dir="rtl"] .side-nav a i {
      margin-right: 0;
      margin-left: 15px;
  }
  html[dir="rtl"] .top-bar {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .user-info {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] table th, html[dir="rtl"] table td {
      text-align: right;
  }
  html[dir="rtl"] .stat-card {
      text-align: right;
  }
  html[dir="rtl"] .modal-content, html[dir="rtl"] .modal-card {
      text-align: right;
  }
  html[dir="rtl"] .modal-header .close-btn {
      margin-left: 0;
      margin-right: auto;
  }
  html[dir="rtl"] .actions-bar {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .search-box {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .search-box i {
      margin-left: 10px;
      margin-right: 0;
  }
  html[dir="rtl"] .modal-input input, html[dir="rtl"] .modal-input select, html[dir="rtl"] .input-group input {
      text-align: right;
  }
  html[dir="rtl"] .form-grid {
      direction: rtl;
  }
</style>
`;
document.head.insertAdjacentHTML('beforeend', rtlStyles);
