// نغلف الكود بـ DOMContentLoaded عشان نتأكد إن الزرار اتحمل قبل ما الـ JS يدور عليه
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 1. جلب البيانات ومسح المسافات الزائدة
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            // 2. تفعيل حالة الـ Loading (شكل احترافي للزرار)
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                const response = await fetch('https://transit-way.runasp.net/api/Auth/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // 3. حفظ التوكن وبيانات الأدمن
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminName', data.userName || "Admin");
                    localStorage.setItem('adminEmail', email);
                    localStorage.setItem('activeAdminName', data.userName || "Admin");

                    // 4. رسالة نجاح شيك جداً باستخدام SweetAlert2
                    Swal.fire({
                        icon: 'success',
                        title: 'Welcome Back!',
                        text: 'Login successful, redirecting to dashboard...',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // 5. التحويل بعد انتهاء رسالة النجاح
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);

                } else {
                    // 6. رسالة خطأ احترافية
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: data.message || "Invalid Email or Password.",
                        confirmButtonColor: '#76a08a' // لون مشروعك
                    });
                    resetBtn(submitBtn);
                }

            } catch (error) {
                console.error("Server Issue:", error);
                Swal.fire({
                    icon: 'warning',
                    title: 'Server Error',
                    text: 'The server is not responding. Please try again later.',
                    confirmButtonColor: '#1a1a1a'
                });
                resetBtn(submitBtn);
            }
        });
    }
});

// دالة لإرجاع شكل الزرار الأصلي
function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = 'Login';
}
