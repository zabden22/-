document.getElementById('forgetForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const email = document.getElementById('userEmail').value;
    const btn = document.getElementById('sendBtn');
    
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        const response = await fetch('https://transit-way.runasp.net/api/Auth/Admin-request-reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            // ✅ السطر ده مكانه الصح هنا (جوه دالة النجاح)
            localStorage.setItem('userEmail', email); 
            console.log("تم حفظ الإيميل بنجاح:", email);

            alert("تم إرسال كود التحقق لجيميلك بنجاح!");
            window.location.href = "verfiy.html"; 
        } else {
            const errorData = await response.json();
            alert("خطأ: " + (errorData.message || "هذا الإيميل غير موجود"));
            btn.innerText = "Send Code";
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        alert("السيرفر لا يستجيب، تأكد من اتصالك بالإنترنت");
        btn.innerText = "Send Code";
        btn.disabled = false;
    }
});
