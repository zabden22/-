// Login form handler removed - see implementation at the end of file
// دالة التبديل بين الصفحات
function showPage(pageId) {
    // إخفاء جميع الصفحات
    document.getElementById('signin-page').classList.add('hidden');
    document.getElementById('forgot-page').classList.add('hidden');

    // إظهار الصفحة المطلوبة
    document.getElementById(pageId).classList.remove('hidden');
}

// معالجة نسيان كلمة المرور
function handleForgot(event) {
    event.preventDefault();
    alert("تم إرسال كود التحقق إلى بريدك الإلكتروني!");
    // هنا يمكنك توجيهه لصفحة "إدخال الكود" إذا كانت جاهزة
}

// معالجة تسجيل الدخول
function handleLogin(event) {
    event.preventDefault();
    // منطق تسجيل الدخول
}
// Duplicate login form handlers removed - see consolidated implementation at end of file
// ابحث عن الجزء اللي بيطلع رسالة "تم تغيير كلمة المرور"
const changePassBtn = document.getElementById('changePassBtn');

if (changePassBtn) {
    changePassBtn.addEventListener('click', function() {
        // الكود اللي بيغير الباسورد هنا
        alert("جاري تغيير كلمة المرور...");
        
        setTimeout(() => {
            alert("تم تغيير كلمة المرور بنجاح! تمام 👍");
            // التوجيه لصفحة تسجيل الدخول مرة أخرى
            window.location.href = "index.html";
        }, 1000);
        alert("تم تغيير كلمة المرور بنجاح");
    });
}
    // تنفيذ طلبك: رسالة ثم تمام

// دالة إظهار وإخفاء الباسورد
document.querySelectorAll('.icon-right').forEach(eyeIcon => {
    eyeIcon.addEventListener('click', function() {
        // البحث عن حقل الإدخال (Input) المرتبط بهذه العين
        const input = this.parentElement.querySelector('input');
        
        if (input.type === "password") {
            input.type = "text";
            this.classList.replace('fa-eye-slash', 'fa-eye'); // تغيير شكل العين
        } else {
            input.type = "password";
            this.classList.replace('fa-eye', 'fa-eye-slash'); // إرجاع شكل العين مشطوبة
        }
    });
});
// حط الكود ده في آخر ملف script.js خالص
window.onload = function() {
   // التعديل المضمون للسطر 60
const chartCanvas = document.getElementById('mainChart');
if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    // ... كود الـ Chart بتاعك هنا
}
    
    // عمل تدرج ألوان (Gradient) زي اللي في الصورة
    const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
    gradient1.addColorStop(0, 'rgba(59, 76, 184, 0.2)');
    gradient1.addColorStop(1, 'rgba(59, 76, 184, 0)');

    const gradient2 = ctx.createLinearGradient(0, 0, 0, 400);
    gradient2.addColorStop(0, 'rgba(91, 163, 142, 0.2)');
    gradient2.addColorStop(1, 'rgba(91, 163, 142, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Series one',
                    data: [45, 82, 55, 45, 85, 45, 55, 75, 55, 65, 35, 85],
                    borderColor: '#3b4cb8', // اللون الأزرق
                    backgroundColor: gradient1,
                    fill: true,
                    tension: 0.4, // الانحناء المطلوب
                    pointRadius: 0 // إخفاء النقط عشان يبقى خط انسيابي
                },
                {
                    label: 'Series two',
                    data: [35, 65, 15, 45, 65, 25, 35, 95, 35, 45, 15, 55],
                    borderColor: '#5ba38e', // اللون الأخضر
                    backgroundColor: gradient2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // إخفاء الليجند زي التصميم
            },
            scales: {
                x: { grid: { display: false } }, // إخفاء الخطوط الرأسية
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
};
// نربط الزرار بتاع Add New اللي في الصفحة
const addNewBtn = document.querySelector('.btn-add'); // تأكد إن ده الكلاس بتاع الزرار عندك
const modal = document.getElementById('addAdminModal');

if (addNewBtn) {
    addNewBtn.onclick = function() {
        modal.style.display = 'flex'; // إظهار النافذة في نص الشاشة
    }
}

// دالة قفل النافذة
function closeModal() {
    modal.style.display = 'none';
}

// قفل النافذة لو دوست في أي حتة بره المربع الأبيض
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}
async function loadAdmins() {
    const tableBody = document.getElementById('adminTableBody'); // تأكد إن الـ ID ده موجود في <tbody>
    
    try {
        // نطلب قائمة الأدمينز من السيرفر الأونلاين
        const response = await fetch('https://transit-way.runasp.net/api/Admins');
        const admins = await response.json();

        if (response.ok) {
            tableBody.innerHTML = ''; // تفريغ الجدول من البيانات القديمة

            admins.forEach(admin => {
                const row = `
                    <tr>
                        <td>${admin.name}</td>
                        <td>${admin.id}</td>
                        <td>${admin.phoneNumber}</td>
                        <td>${admin.email}</td>
                        <td><span class="badge ${admin.status === 'Active' ? 'active' : 'inactive'}">${admin.status}</span></td>
                        <td><i class="fa-solid fa-trash btn-delete" onclick="deleteAdmin('${admin.id}')"></i></td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
}

// تشغيل الدالة أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', loadAdmins);
// داخل جزء الـ success في كود الإضافة:
if (response.ok) {
    alert("تمت الإضافة!");
    closeModal();
    loadAdmins(); // تحديث الجدول تلقائياً
}
async function deleteAdmin(adminId) {
    if (confirm("هل أنت متأكد من مسح هذا المسؤول؟")) {
        try {
            const response = await fetch(`https://transit-way.runasp.net/api/Admins/${adminId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadAdmins(); // تحديث الجدول بعد المسح
            }
        } catch (error) {
            alert("حدث خطأ أثناء الحذف");
        }
    }
}
async function displayAdmins() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return; // حماية لو الجدول مش في الصفحة دي

    try {
        const response = await fetch('https://transit-way.runasp.net/api/Admins');
        const admins = await response.json();

        tableBody.innerHTML = ''; // مسح البيانات القديمة

        admins.forEach(admin => {
            const row = `
                <tr>
                    <td>${admin.name}</td>
                    <td>${admin.id}</td>
                    <td>${admin.phoneNumber}</td>
                    <td>${admin.email}</td>
                    <td><span class="badge active">Active</span></td>
                    <td><i class="fa-solid fa-trash btn-delete" onclick="deleteAdmin('${admin.id}')"></i></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (err) {
        console.log("فشل تحميل البيانات:", err);
    }
}

// تشغيل الدالة أول ما تفتح الصفحة
document.addEventListener('DOMContentLoaded', displayAdmins);
// دوال فتح وقفل النافذة
function openAssignModal() {
    document.getElementById('assignModal').style.display = 'flex';
}

function closeAssignModal() {
    document.getElementById('assignModal').style.display = 'none';
}

// معالجة إرسال البيانات
const assignForm = document.getElementById('assignBusForm');
if (assignForm) {
    assignForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const busId = document.getElementById('assignBusId').value;
        const driverId = document.getElementById('assignDriverId').value;

        try {
            // ملاحظة: تأكد من رابط الـ API الصحيح من السواجر
            const response = await fetch(`https://transit-way.runasp.net/api/Buses/assign/${busId}/${driverId}`, {
                method: 'POST'
            });

            if (response.ok) {
                alert("تم تعيين الأتوبيس للسائق بنجاح!");
                closeAssignModal();
                location.reload(); // تحديث الجدول
            } else {
                alert("خطأ في عملية التعيين، تأكد من الـ IDs");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });
}
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        // 1. منع الصفحة من التحويل التلقائي
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message'); // مكان لعرض الخطأ

        try {
            // 2. إرسال البيانات للسيرفر للتأكد
            const response = await fetch('https://transit-way.runasp.net/api/Auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                // 3. لو الباسورد صح، حوله للداشبورد
                alert("تم تسجيل الدخول بنجاح!");
                window.location.href = 'dashboard.html'; 
            } else {
                // 4. لو الباسورد غلط، أظهر رسالة ومتحولوش
                errorMessage.innerText = "الباسورد غلط أو الحساب مش موجود!";
                errorMessage.style.color = "red";
            }
        } catch (error) {
            console.error("خطأ في الاتصال:", error);
            alert("السيرفر واقع حالياً، جرب تاني كمان شوية.");
        }
    });
}
