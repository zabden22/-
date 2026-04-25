// دالة لتحديث الاسم في كل مكان في الصفحة
function refreshUserName() {
    // 1. بنجيب الاسم من الخزنة (لو مفيش اسم، بنخلي الافتراضي Moscow)
    const savedName = localStorage.getItem('activeAdminName') || 'Moscow Admin';

    // 2. بندور على أي مكان فيه اسم اليوزر (السبان اللي في التوب بار مثلاً)
    // اتأكد إنك مدي الـ span بتاع الاسم id="userNameDisplay" أو كلاس ثابت
    const nameElements = document.querySelectorAll('.user-info span, #adminNameDisplay, .welcome-msg b');

    nameElements.forEach(el => {
        // لو العنصر ده جواه كلمة Hello، بنحافظ عليها ونغير الاسم بس
        if (el.classList.contains('welcome-msg')) {
            el.innerHTML = `Hello, ${savedName}`;
        } else {
            el.innerText = savedName;
        }
    });
}

// تشغيل الدالة أول ما الصفحة تحمل
document.addEventListener('DOMContentLoaded', refreshUserName);