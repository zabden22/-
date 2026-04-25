function handleVerifyAndRedirect() {
    // 1. تجميع الـ 6 أرقام من المربعات
    const inputs = document.querySelectorAll('.otp-input');
    let fullCode = "";
    inputs.forEach(input => {
        fullCode += input.value;
    });

    // 2. التأكد إن الكود كامل (6 أرقام)
    if (fullCode.length < 6) {
        alert("Please enter the full 6-digit code.");
        return;
    }

    // 3. حفظ الكود في الـ localStorage عشان نستخدمه في صفحة الـ Change
    localStorage.setItem('otpCode', fullCode);
    
    // 4. إظهار رسالة نجاح والتحويل فوراً
    console.log("Code Verified: ", fullCode);
    alert("Code Verified Successfully!");
    
    // 👈 السطر ده هو اللي هيدخلك على صفحة التغيير
    window.location.href = "change.html"; 
}

// حركة اختيارية: تخلي المؤشر ينقل للمربع اللي بعده أوتوماتيك وأنت بتكتب
document.querySelectorAll('.otp-input').forEach((input, index, array) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < array.length - 1) {
            array[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            array[index - 1].focus();
        }
    });
});