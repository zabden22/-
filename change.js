document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPass').value;
    const confirmPassword = document.getElementById('confirmPass').value;
    const btn = document.querySelector('.btn-continue');

    // 1. التأكد إن الباسورد متطابق
    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // 2. سحب البيانات المحفوظة من الصفحات اللي فاتت
    const email = localStorage.getItem('userEmail');
    const code = localStorage.getItem('otpCode');

    if (!email || !code) {
        alert("Session expired. Please start the process again.");
        window.location.href = "forgot.html";
        return;
    }

    btn.innerText = "Updating...";
    btn.disabled = true;

    try {
        // 3. إرسال البيانات للسيرفر (تأكد من الـ API URL بتاعك)
        const response = await fetch('https://transit-way.runasp.net/api/Auth/Admin-confirm-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Email: email.trim(),
                Code: code.trim(),
                NewPassword: newPassword
            })
        });

        if (response.ok) {
            alert("Password changed successfully! Please login with your new password.");
            
            // 4. مسح البيانات المؤقتة عشان الأمان
            localStorage.removeItem('userEmail');
            localStorage.removeItem('otpCode');

            // 👈 السطر اللي طلبته: التحويل لصفحة اللوجن
            window.location.href = "index.html"; // أو login.html حسب اسم ملفك
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.message || "Invalid code or expired session."));
            btn.innerText = "Reset Password";
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Please try again later.");
        btn.innerText = "Reset Password";
        btn.disabled = false;
    }
});

// دالة إظهار/إخفاء الباسورد (العين)
function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
