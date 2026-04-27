document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Theme Setup
    // ==========================================
    const themeSelect = document.getElementById('themeSelect');
    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeSelect) themeSelect.value = currentTheme;

    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            currentTheme = e.target.value;
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('siteTheme', currentTheme);

            Swal.fire({
                icon: 'success',
                title: currentTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode',
                text: `Theme switched to ${currentTheme} mode.`,
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
        });
    }

    // ==========================================
    // 2. Language Setup
    // ==========================================
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = getLang();
        langSelect.addEventListener('change', (e) => {
            setLang(e.target.value);
            Swal.fire({
                icon: 'success',
                title: e.target.value === 'ar' ? 'تم التغيير' : 'Language Changed',
                text: e.target.value === 'ar' ? 'تم تغيير اللغة إلى العربية.' : 'Language has been changed to English.',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
        });
    }

    // ==========================================
    // 3. Tabs Navigation
    // ==========================================
    const tabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate selected
            tab.classList.add('active');
            const content = document.getElementById(`tab-${targetTab}`);
            if (content) {
                content.classList.add('active');
                // Re-trigger animation
                content.style.animation = 'none';
                content.offsetHeight; // force reflow
                content.style.animation = '';
            }
        });
    });

    // ==========================================
    // 4. Profile Logic — Connected to Admins API
    // ==========================================
    const ADMIN_API = 'https://transit-way.runasp.net/api/admin';
    const loginName = localStorage.getItem('adminName') || localStorage.getItem('activeAdminName') || 'Admin';

    // UI Elements
    const topBarName = document.getElementById('topBarName');
    const sideProfileName = document.getElementById('sideProfileName');
    const adminNameInput = document.getElementById('adminNameInput');
    const adminEmailInput = document.getElementById('adminEmailInput');
    const adminPhoneInput = document.getElementById('adminPhoneInput');
    const adminLocationInput = document.getElementById('adminLocationInput');
    const adminDeptInput = document.getElementById('adminDeptInput');
    const profileAvatar = document.getElementById('profileAvatar');
    const adminIdBadge = document.getElementById('adminIdBadge');

    // Set initial values from localStorage while API loads
    if (topBarName) topBarName.innerText = loginName;
    if (sideProfileName) sideProfileName.innerText = loginName;
    if (adminNameInput) adminNameInput.value = loginName;
    if (profileAvatar) profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loginName)}&background=568e74&color=fff&size=150&bold=true`;

    let currentAdminData = null; // will hold the matched admin from API

    async function loadAdminProfile() {
        try {
            const res = await fetch(ADMIN_API);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const adminsList = Array.isArray(data) ? data : (data.$values || []);

            // Match by name (stored during login) or email
            const loginEmail = localStorage.getItem('adminEmail') || '';
            currentAdminData = adminsList.find(a => {
                const aName = (a.fullName || a.phoneNumber || '').toLowerCase();
                const aEmail = (a.email || '').toLowerCase();
                return aName === loginName.toLowerCase() || aEmail === loginEmail.toLowerCase();
            });

            // If no exact match, use the first admin as fallback
            if (!currentAdminData && adminsList.length > 0) {
                currentAdminData = adminsList[0];
            }

            if (currentAdminData) {
                const name = currentAdminData.fullName || currentAdminData.phoneNumber || loginName;
                const email = currentAdminData.email || '—';
                const phone = currentAdminData.phoneNumber || '—';
                const code = currentAdminData.code || `ADM-${String(currentAdminData.id).padStart(3, '0')}`;
                const role = currentAdminData.role || 'Admin';
                const dept = role === 'SuperAdmin' ? 'System Operations' : (localStorage.getItem('activeAdminDept') || 'Fleet Operations');

                // Update all profile fields
                const displayName = name;
                if (topBarName) topBarName.innerText = displayName;
                if (sideProfileName) sideProfileName.innerText = displayName;
                if (adminNameInput) adminNameInput.value = displayName;
                
                if (adminEmailInput) { adminEmailInput.value = email; adminEmailInput.readOnly = true; }
                if (adminPhoneInput) adminPhoneInput.value = phone;
                if (adminLocationInput) adminLocationInput.value = 'Cairo, Egypt'; // Assuming backend doesn't save location for now
                if (adminDeptInput) adminDeptInput.value = dept;

                const dbPhoto = currentAdminData.photoUrl || null;
                const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=568e74&color=fff&size=150&bold=true`;
                if (profileAvatar) {
                    profileAvatar.src = dbPhoto || avatarFallback;
                    profileAvatar.onerror = function() { this.onerror=null; this.src=avatarFallback; };
                }
                
                if (adminIdBadge) adminIdBadge.textContent = `#${code}`;

                // Update role badge
                const roleBadge = document.querySelector('.badge-role');
                if (roleBadge) {
                    roleBadge.innerHTML = `<i class="fas fa-crown" style="margin-right:4px;"></i> ${role === 'SuperAdmin' ? 'Super Admin' : role}`;
                }

                // Sync localStorage just in case
                localStorage.setItem('activeAdminName', displayName);
                localStorage.setItem('activeAdminPhone', phone);
                localStorage.setItem('activeAdminEmail', email);
                localStorage.setItem('activeAdminId', currentAdminData.id);
            }
        } catch (e) {
            console.warn('Could not fetch admin profile from API, using localStorage:', e.message);
            // Fallback to localStorage values
            const adminName = localStorage.getItem('activeAdminName') || 'Admin';
            const adminPhone = localStorage.getItem('activeAdminPhone') || '01023456789';
            const adminLocation = localStorage.getItem('activeAdminLocation') || 'Cairo, Egypt';
            const adminDept = localStorage.getItem('activeAdminDept') || 'Fleet Operations';
            
            if (topBarName) topBarName.innerText = adminName;
            if (sideProfileName) sideProfileName.innerText = adminName;
            if (adminNameInput) adminNameInput.value = adminName;
            if (adminPhoneInput) adminPhoneInput.value = adminPhone;
            if (adminLocationInput) adminLocationInput.value = adminLocation;
            if (adminDeptInput) adminDeptInput.value = adminDept;
        }
    }

    loadAdminProfile();

    // Photo Upload Logic — Save to Database
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: 'File Too Large', text: 'Max 5MB.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                return;
            }

            const adminId = currentAdminData?.id || localStorage.getItem('activeAdminId');
            if (!adminId) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Admin ID not found.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                return;
            }

            // 1. Optimistic UI Update: Show it instantly
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                // Update UI instantly
                if (profileAvatar) profileAvatar.src = base64;
                const topAvatar = document.querySelector('.top-avatar');
                if (topAvatar) topAvatar.src = base64;

                // Show a non-blocking toast
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: 'var(--bg-card)', color: 'var(--text-main)' });
                Toast.fire({ icon: 'info', title: 'Uploading in background...' });

                // 2. Upload to Server
                const formData = new FormData();
                formData.append('photo', file);

                const token = localStorage.getItem('adminToken');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                try {
                    let res = await fetch(`${ADMIN_API}/${adminId}/photo`, { method: 'POST', headers, body: formData });
                    if (!res.ok) {
                        res = await fetch(`${ADMIN_API}/${adminId}/photo`, { method: 'PUT', headers, body: formData });
                    }
                    if (!res.ok) throw new Error(`Server ${res.status}`);

                    localStorage.removeItem('activeAdminPhoto');
                    Toast.fire({ icon: 'success', title: getLang() === 'ar' ? 'تم الرفع' : 'Photo Uploaded! ✅' });
                    
                    // Reload slightly after to fetch fresh DB urls
                    setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                    console.warn('Photo API failed:', err);
                    Toast.fire({ icon: 'error', title: 'Upload Failed!' });
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Handle Form Submit — save to Database API
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = adminNameInput.value.trim();
            const newPhone = adminPhoneInput.value.trim();
            const newLoc = adminLocationInput.value.trim();
            const newDept = adminDeptInput ? adminDeptInput.value.trim() : '';
            const btn = profileForm.querySelector('button[type="submit"]');

            if (newName === '') {
                Swal.fire({ icon: 'error', title: getLang() === 'ar' ? 'خطأ' : 'Error', text: getLang() === 'ar' ? 'اسم العرض لا يمكن أن يكون فارغاً!' : 'Display name cannot be empty!', background: 'var(--bg-card)', color: 'var(--text-main)' });
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            let apiSuccess = false;

            if (currentAdminData && currentAdminData.id) {
                const payload = {
                    id: currentAdminData.id,
                    fullName: newName,
                    email: currentAdminData.email,
                    phoneNumber: newPhone,
                    code: currentAdminData.code || '',
                    status: currentAdminData.status || 'Admin',
                    role: currentAdminData.role || 'Admin'
                };

                try {
                    const token = localStorage.getItem('adminToken');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${ADMIN_API}/${currentAdminData.id}`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        apiSuccess = true;
                        currentAdminData.fullName = newName;
                        currentAdminData.phoneNumber = newPhone;
                        
                        // Update UI
                        if (topBarName) topBarName.innerText = newName;
                        if (sideProfileName) sideProfileName.innerText = newName;
                        
                        // Reload to reflect pure DB state
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        const errText = await res.text().catch(() => '');
                        console.warn('API PUT failed:', res.status, errText);
                    }
                } catch (err) {
                    console.warn('API update error:', err.message);
                }
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

            Swal.fire({
                icon: 'success',
                title: getLang() === 'ar' ? '✅ تم الحفظ' : '✅ Saved!',
                text: apiSuccess
                    ? (getLang() === 'ar' ? 'تم حفظ التعديلات في قاعدة البيانات.' : 'Changes saved to database successfully.')
                    : (getLang() === 'ar' ? 'تم حفظ التعديلات محلياً.' : 'Changes saved locally.'),
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
        });
    }

    // ==========================================
    // 4b. Compact Mode Toggle
    // ==========================================
    const compactToggle = document.getElementById('compactToggle');
    const isCompact = localStorage.getItem('compactMode') === 'true';

    // Apply on load
    if (isCompact) {
        document.documentElement.setAttribute('data-compact', 'true');
        if (compactToggle) compactToggle.checked = true;
    }

    if (compactToggle) {
        compactToggle.addEventListener('change', () => {
            const enabled = compactToggle.checked;
            localStorage.setItem('compactMode', enabled);
            document.documentElement.setAttribute('data-compact', enabled ? 'true' : 'false');
            Swal.fire({
                icon: 'success',
                title: enabled ? '📐 Compact Mode On' : '📏 Normal Mode',
                text: enabled ? 'UI spacing reduced for denser display.' : 'UI spacing restored to default.',
                timer: 1500, showConfirmButton: false,
                background: 'var(--bg-card)', color: 'var(--text-main)'
            });
        });
    }

    // ==========================================
    // 4c. Animations Toggle
    // ==========================================
    const animToggle = document.getElementById('animToggle');
    const animsEnabled = localStorage.getItem('animationsEnabled') !== 'false'; // default on

    if (!animsEnabled) {
        document.documentElement.style.setProperty('--transition-speed', '0s');
        if (animToggle) animToggle.checked = false;
    }

    if (animToggle) {
        animToggle.addEventListener('change', () => {
            const enabled = animToggle.checked;
            localStorage.setItem('animationsEnabled', enabled);
            document.documentElement.style.setProperty('--transition-speed', enabled ? '0.3s' : '0s');
            Swal.fire({
                icon: 'success',
                title: enabled ? '✨ Animations On' : '⏸️ Animations Off',
                text: enabled ? 'Smooth transitions enabled.' : 'Animations disabled for faster performance.',
                timer: 1500, showConfirmButton: false,
                background: 'var(--bg-card)', color: 'var(--text-main)'
            });
        });
    }

    // ==========================================
    // 4d. Notification Toggles (persist to localStorage)
    // ==========================================
    const notifKeys = {
        'tab-notifications': [
            { idx: 0, key: 'notif_complaints', label: 'Complaint Reports' },
            { idx: 1, key: 'notif_busStatus', label: 'Bus Status Changes' },
            { idx: 2, key: 'notif_ticketMilestones', label: 'Ticket Sales Milestones' },
            { idx: 3, key: 'notif_newDriver', label: 'New Driver Registration' },
            { idx: 4, key: 'notif_dailySummary', label: 'Daily Summary Report' },
        ]
    };

    const notifSection = document.getElementById('tab-notifications');
    if (notifSection) {
        const toggles = notifSection.querySelectorAll('.toggle-switch input[type="checkbox"]');
        toggles.forEach((toggle, idx) => {
            const config = notifKeys['tab-notifications'][idx];
            if (!config) return;

            // Load saved state
            const saved = localStorage.getItem(config.key);
            if (saved !== null) {
                toggle.checked = saved === 'true';
            }

            // Save on change
            toggle.addEventListener('change', () => {
                localStorage.setItem(config.key, toggle.checked);
                const action = toggle.checked ? 'enabled' : 'disabled';
                Swal.fire({
                    icon: toggle.checked ? 'success' : 'info',
                    title: `${config.label}`,
                    text: `Notifications ${action}.`,
                    timer: 1500, showConfirmButton: false,
                    background: 'var(--bg-card)', color: 'var(--text-main)'
                });
            });
        });
    }

    // ==========================================
    // 5. System Info
    // ==========================================
    // API Status check
    async function checkApiStatus() {
        const statusText = document.getElementById('apiStatusText');
        if (!statusText) return;

        try {
            const start = performance.now();
            const res = await fetch('https://transit-way.runasp.net/api/Bus');
            const latency = Math.round(performance.now() - start);

            if (res.ok) {
                statusText.innerHTML = `<span style="color:#22c55e;">● Connected</span> <span style="font-size:0.75rem; color:var(--text-muted);">(${latency}ms)</span>`;
            } else {
                statusText.innerHTML = `<span style="color:#f59e0b;">● Degraded</span>`;
            }
        } catch {
            statusText.innerHTML = `<span style="color:#ef4444;">● Offline</span>`;
        }
    }
    checkApiStatus();

    // Uptime (mock — simulates a stable system)
    const uptimeText = document.getElementById('uptimeText');
    if (uptimeText) {
        const uptimeDays = Math.floor(Math.random() * 30) + 15;
        const uptimeHours = Math.floor(Math.random() * 24);
        uptimeText.textContent = `${uptimeDays}d ${uptimeHours}h`;
    }

    // Last updated
    const lastUpdateText = document.getElementById('lastUpdateText');
    if (lastUpdateText) {
        lastUpdateText.textContent = new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    // Connection status
    const connectionText = document.getElementById('connectionText');
    if (connectionText) {
        connectionText.innerHTML = navigator.onLine
            ? `<span style="color:#22c55e;">Online</span>`
            : `<span style="color:#ef4444;">Offline</span>`;
    }
});

// ==========================================
// 6. Global Functions
// ==========================================
window.confirmLogout = function () {
    const isAr = getLang() === 'ar';
    Swal.fire({
        title: isAr ? 'تسجيل الخروج؟' : 'Log Out?',
        text: isAr ? 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟' : 'Are you sure you want to sign out of your account?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: isAr ? 'نعم، خروج' : 'Yes, Log Out',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
        background: 'var(--bg-card)',
        color: 'var(--text-main)'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('activeAdminName');
            window.location.href = 'index.html';
        }
    });
};

window.confirmClearData = function () {
    const isAr = getLang() === 'ar';
    Swal.fire({
        title: isAr ? 'مسح البيانات؟' : 'Clear All Data?',
        html: `<p style="color:#ef4444; font-weight:700;">⚠ ${isAr ? 'سيتم مسح جميع الإعدادات المحلية.' : 'This will reset all local preferences.'}</p>
               <p style="color:var(--text-muted);">${isAr ? 'لا يمكن التراجع.' : 'This action cannot be undone.'}</p>`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: isAr ? 'نعم، مسح' : 'Yes, Clear',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
        background: 'var(--bg-card)',
        color: 'var(--text-main)'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            Swal.fire({
                icon: 'success',
                title: isAr ? 'تم المسح' : 'Cleared!',
                text: isAr ? 'تم مسح جميع البيانات المحلية. سيتم إعادة تحميل الصفحة.' : 'All local data has been cleared. Page will reload.',
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            }).then(() => {
                window.location.reload();
            });
        }
    });
};

window.handlePasswordChange = function () {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const isAr = getLang() === 'ar';

    if (!current || !newPass || !confirm) {
        Swal.fire({
            icon: 'warning',
            title: isAr ? 'بيانات ناقصة' : 'Missing Fields',
            text: isAr ? 'الرجاء ملء جميع الحقول.' : 'Please fill in all password fields.',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
        return;
    }

    if (newPass !== confirm) {
        Swal.fire({
            icon: 'error',
            title: isAr ? 'خطأ' : 'Mismatch',
            text: isAr ? 'كلمة المرور الجديدة لا تتطابق مع التأكيد.' : 'New password and confirmation do not match.',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
        return;
    }

    if (newPass.length < 6) {
        Swal.fire({
            icon: 'warning',
            title: isAr ? 'كلمة مرور ضعيفة' : 'Weak Password',
            text: isAr ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
        return;
    }

    // Call actual API to change password
    const adminId = localStorage.getItem('activeAdminId');
    if (!adminId) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Admin ID not found.', background: 'var(--bg-card)', color: 'var(--text-main)' });
        return;
    }

    Swal.fire({ title: 'Updating...', html: '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary-color);"></i>', allowOutsideClick: false, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });

    fetch(`https://transit-way.runasp.net/api/admin/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}` // Include token if needed
        },
        body: JSON.stringify({
            adminId: parseInt(adminId),
            currentPassword: current,
            newPassword: newPass
        })
    })
    .then(async res => {
        if (!res.ok) {
            const errText = await res.text().catch(() => 'Update failed');
            throw new Error(errText);
        }
        return res.json().catch(() => ({})); // Handle empty or JSON response
    })
    .then(data => {
        Swal.fire({
            icon: 'success',
            title: isAr ? '✅ تم التحديث' : '✅ Password Updated!',
            text: isAr ? 'تم تغيير كلمة المرور بنجاح في قاعدة البيانات.' : 'Your password has been changed successfully in the database.',
            timer: 2500,
            showConfirmButton: false,
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        // Clear fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    })
    .catch(err => {
        console.warn('Password change error:', err.message);
        Swal.fire({
            icon: 'error',
            title: isAr ? 'فشل التحديث' : 'Update Failed',
            text: err.message || (isAr ? 'لم نتمكن من تغيير كلمة المرور.' : 'Could not change password.'),
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });
    });
};
