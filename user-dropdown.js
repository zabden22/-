/**
 * user-dropdown.js — Global User Info Dropdown
 * Auto-injects into any page with .user-info
 * Include this script on every page BEFORE page-specific logic.
 */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const userInfo = document.querySelector('.user-info');
        if (!userInfo) return;

        const adminName = localStorage.getItem('activeAdminName') || 'Admin';

        // Set initial temporary values
        const nameSpan = userInfo.querySelector('#topBarName');
        const topAvatarImg = userInfo.querySelector('.top-avatar');
        const savedPhoto = localStorage.getItem('activeAdminPhoto');
        if (nameSpan) nameSpan.innerText = adminName;
        if (topAvatarImg && savedPhoto) topAvatarImg.src = savedPhoto;

        // Inject dropdown HTML structure
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.id = 'userDropdown';
        const avatarSrc = savedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=568e74&color=fff&size=80&bold=true`;
        
        dropdown.innerHTML = `
            <div class="ud-header">
                <img class="ud-avatar" id="dropdownAvatar" src="${avatarSrc}" alt="${adminName}">
                <div>
                    <p class="ud-name" id="dropdownName">${adminName}</p>
                    <p class="ud-role">System Administrator</p>
                </div>
            </div>
            <a href="dashboard.html" class="ud-item"><i class="fas fa-th-large"></i> Dashboard</a>
            <a href="settings.html" class="ud-item"><i class="fas fa-cog"></i> Settings</a>
            <a href="settings.html" class="ud-item"><i class="fas fa-user-edit"></i> Edit Profile</a>
            <div class="ud-divider"></div>
            <div class="ud-item danger" id="udLogout"><i class="fas fa-sign-out-alt"></i> Log Out</div>
        `;
        userInfo.appendChild(dropdown);

        // Fetch real data from DB asynchronously to keep top bar strictly synced
        async function syncTopBarWithDB() {
            try {
                const token = localStorage.getItem('adminToken');
                const email = localStorage.getItem('adminEmail');
                if (!email) return;

                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch('https://transit-way.runasp.net/api/admin', { headers });
                if (!res.ok) return;

                const data = await res.json();
                const adminsList = Array.isArray(data) ? data : (data.$values || []);
                const currentAdmin = adminsList.find(a => (a.email || '').toLowerCase() === email.toLowerCase());

                if (currentAdmin) {
                    const realName = currentAdmin.fullName || currentAdmin.phoneNumber || adminName;
                    const realPhoto = currentAdmin.photoUrl;

                    // Update UI elements directly
                    if (nameSpan) nameSpan.innerText = realName;
                    const dropName = document.getElementById('dropdownName');
                    if (dropName) dropName.innerText = realName;

                    if (realPhoto) {
                        const newAvatar = realPhoto + (realPhoto.includes('?') ? '' : `?t=${Date.now()}`);
                        if (topAvatarImg) topAvatarImg.src = newAvatar;
                        const dropAvatar = document.getElementById('dropdownAvatar');
                        if (dropAvatar) dropAvatar.src = newAvatar;
                        // Save latest to localStorage for fast initial load next time
                        localStorage.setItem('activeAdminPhoto', realPhoto);
                    }
                    localStorage.setItem('activeAdminName', realName);
                }
            } catch (err) {
                console.warn('Failed to sync top bar profile:', err);
            }
        }
        syncTopBarWithDB();

        // Toggle dropdown on click
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            userInfo.classList.toggle('open');
            dropdown.classList.toggle('show');
        });

        // Sidebar Toggle Logic
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('collapsed');
            });
        }

        // Close on outside click
        document.addEventListener('click', () => {
            userInfo.classList.remove('open');
            dropdown.classList.remove('show');
        });

        // Prevent dropdown from closing when clicking inside it
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Logout
        const logoutBtn = document.getElementById('udLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof Swal !== 'undefined') {
                    const isAr = (typeof getLang === 'function' && getLang() === 'ar');
                    Swal.fire({
                        title: isAr ? 'تسجيل الخروج من لوحة التحكم' : 'Log Out from Dashboard',
                        text: isAr ? 'سيتم تسجيل خروجك والعودة إلى صفحة تسجيل الدخول' : 'You will be signed out and returned to the login page.',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: isAr ? 'تسجيل الخروج' : 'Yes, Log Out',
                        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            localStorage.removeItem('activeAdminName');
                            window.location.href = 'index.html';
                        }
                    });
                } else {
                    if (confirm('Log out?')) {
                        localStorage.removeItem('activeAdminName');
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    });
})();
