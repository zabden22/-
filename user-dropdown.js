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

        // Set the top bar name and avatar
        const nameSpan = userInfo.querySelector('#topBarName');
        const topAvatarImg = userInfo.querySelector('.top-avatar');
        if (nameSpan) nameSpan.innerText = adminName;
        
        const savedPhoto = localStorage.getItem('activeAdminPhoto');
        if (topAvatarImg && savedPhoto) {
            topAvatarImg.src = savedPhoto;
        }

        // Inject dropdown HTML
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.id = 'userDropdown';
        const avatarSrc = savedPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=568e74&color=fff&size=80&bold=true`;
        
        dropdown.innerHTML = `
            <div class="ud-header">
                <img class="ud-avatar" src="${avatarSrc}" alt="${adminName}">
                <div>
                    <p class="ud-name">${adminName}</p>
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
                        title: isAr ? 'تسجيل الخروج؟' : 'Log Out?',
                        text: isAr ? 'هل أنت متأكد؟' : 'Are you sure you want to sign out?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: isAr ? 'نعم' : 'Yes, Log Out',
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
