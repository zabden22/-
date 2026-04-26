document.addEventListener('DOMContentLoaded', () => {

    // 1. Theme & Name
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    const topBarName = document.getElementById('topBarName');
    const topAvatar = document.querySelector('.top-avatar');
    const savedPhoto = localStorage.getItem('activeAdminPhoto');

    if (topBarName) topBarName.innerText = adminName;
    if (topAvatar && savedPhoto) topAvatar.src = savedPhoto;

    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Apply compact mode if saved
    if (localStorage.getItem('compactMode') === 'true') {
        document.documentElement.setAttribute('data-compact', 'true');
    }

    const isSuperAdmin = true; // In production, verify from token

    const cardsGrid = document.getElementById('adminCardsGrid');
    const searchInput = document.getElementById('adminSearchInput');
    const adminModal = document.getElementById('adminModal');
    const addAdminForm = document.getElementById('addAdminForm');

    const API = 'https://transit-way.runasp.net/api/admin';

    // 2. Fallback Mock Data
    const mockAdmins = [
        { id: 1, code: 'ADM-001', fullName: adminName, email: 'admin@transitway.gov.eg', phoneNumber: '01023456789', status: 'Active', role: 'SuperAdmin' },
        { id: 2, code: 'ADM-002', fullName: 'Ahmed Khaled', email: 'ahmed.k@transitway.gov.eg', phoneNumber: '01198765432', status: 'Active', role: 'Admin' },
        { id: 3, code: 'ADM-003', fullName: 'Sara Mohamed', email: 'sara.m@transitway.gov.eg', phoneNumber: '01234567890', status: 'Inactive', role: 'Admin' },
    ];

    let adminsData = [];

    // 3. Fetch from API
    async function loadAdmins() {
        cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:12px; display:block;"></i>Loading admins...</div>`;
        try {
            const res = await fetch(API);
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                adminsData = data.map(a => ({
                    id: a.id,
                    code: a.code || `ADM-${String(a.id).padStart(3, '0')}`,
                    name: a.fullName || a.phoneNumber || a.email?.split('@')[0] || 'Admin',
                    email: a.email || '—',
                    phone: a.phoneNumber || '—',
                    status: (a.status === 'Active' || a.status === 'Admin') ? 'Active' : 'Inactive',
                    role: a.role || (a.status === 'Admin' ? 'Admin' : 'Admin'),
                    department: a.role === 'SuperAdmin' ? 'System Operations' : 'General',
                }));
            } else {
                adminsData = mapMock(mockAdmins);
            }
        } catch (e) {
            console.warn('Using mock admins. Reason:', e.message);
            adminsData = mapMock(mockAdmins);
        }

        // --- MERGE LOCAL STORAGE ADMINS ---
        const localAdmins = JSON.parse(localStorage.getItem('addedAdmins') || '[]');
        if (localAdmins.length > 0) {
            // Filter out any that might already be in the list (by ID or Email)
            const existingEmails = new Set(adminsData.map(a => a.email.toLowerCase()));
            const toAdd = localAdmins.filter(a => !existingEmails.has(a.email.toLowerCase()));
            adminsData = [...adminsData, ...toAdd];
        }

        renderCards(adminsData);
    }

    function mapMock(list) {
        return list.map(a => ({
            id: a.id,
            code: a.code,
            name: a.fullName || 'Admin',
            email: a.email || '—',
            phone: a.phoneNumber || '—',
            status: a.status === 'Active' ? 'Active' : 'Inactive',
            role: a.role || 'Admin',
            department: a.role === 'SuperAdmin' ? 'System Operations' : 'General',
        }));
    }

    // 4. Render Cards
    function renderCards(list) {
        if (!cardsGrid) return;
        cardsGrid.innerHTML = '';

        if (list.length === 0) {
            cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);"><i class="fas fa-user-shield" style="font-size:2.5rem; margin-bottom:12px; display:block; opacity:0.3;"></i><p style="font-weight:700;">No admins found</p></div>`;
            return;
        }

        list.forEach((admin, index) => {
            const isActive = admin.status === 'Active';
            const roleColors = {
                'SuperAdmin': { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', icon: 'fa-crown' },
                'Admin': { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6', icon: 'fa-shield-alt' },
                'Moderator': { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6', icon: 'fa-user-check' }
            };
            const roleStyle = roleColors[admin.role] || roleColors['Admin'];
            const roleLabel = admin.role === 'SuperAdmin' ? 'Super Admin' : admin.role;

            const isMe = admin.name === adminName || admin.email === localStorage.getItem('activeAdminEmail');
            const avatarSrc = (isMe && savedPhoto) ? savedPhoto : `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=568e74&color=fff&size=100&bold=true`;

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.innerHTML = `
                <span class="admin-card-status ${isActive ? 'active' : 'inactive'}">${admin.status}</span>
                <div class="admin-card-header">
                    <img class="admin-card-avatar" src="${avatarSrc}" alt="${admin.name}">
                    <div>
                        <div class="admin-card-name">${admin.name}</div>
                        <div class="admin-card-id">${admin.code}</div>
                        <span class="admin-role-badge" style="background:${roleStyle.bg}; color:${roleStyle.color};"><i class="fas ${roleStyle.icon}" style="font-size:0.6rem;"></i> ${roleLabel}</span>
                    </div>
                </div>
                <div class="admin-card-details">
                    <div class="admin-card-detail"><i class="fas fa-envelope"></i> <span>${admin.email}</span></div>
                    <div class="admin-card-detail"><i class="fas fa-phone"></i> <span>${admin.phone}</span></div>
                    <div class="admin-card-detail"><i class="fas fa-building"></i> <span>${admin.department}</span></div>
                    <div class="admin-card-detail"><i class="fas fa-hashtag"></i> <span>System ID: ${admin.id}</span></div>
                </div>
                <div class="admin-card-actions">
                    <button class="admin-action-btn toggle-status" data-idx="${index}" title="${isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas fa-toggle-${isActive ? 'on' : 'off'}" style="color:${isActive ? '#22c55e' : '#ef4444'};"></i> ${isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button class="admin-action-btn danger delete-admin" data-idx="${index}" title="Delete">
                        <i class="fas fa-trash-alt"></i> Remove
                    </button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });

        updateStats();
    }

    // 5. Update Stats
    function updateStats() {
        const total = adminsData.length;
        const active = adminsData.filter(a => a.status === 'Active').length;
        const inactive = adminsData.filter(a => a.status !== 'Active').length;
        const superAdmins = adminsData.filter(a => a.role === 'SuperAdmin').length;

        animV('admStatTotal', total);
        animV('admStatActive', active);
        animV('admStatInactive', inactive);
        animV('admStatSuper', superAdmins);
    }

    function animV(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const dur = 500;
        const s = performance.now();
        function step(now) {
            const p = Math.min((now - s) / dur, 1);
            el.textContent = Math.round(target * (1 - (1 - p) * (1 - p)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Initial load
    loadAdmins();

    // 6. Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = adminsData.filter(a =>
                a.name.toLowerCase().includes(term) ||
                a.code.toLowerCase().includes(term) ||
                a.email.toLowerCase().includes(term) ||
                a.department.toLowerCase().includes(term)
            );
            renderCards(filtered);
        });
    }

    // 7. Modal
    const openModalBtn = document.getElementById('openModalBtn');
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            if (!isSuperAdmin) {
                Swal.fire({ icon: 'error', title: 'Permission Denied', text: 'Only Super Admins can add new administrators.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                return;
            }
            adminModal.classList.add('active');
        };
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            adminModal.classList.remove('active');
            if (addAdminForm) addAdminForm.reset();
        };
    }

    // 8. Add Admin (POST to API)
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isSuperAdmin) return;

            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = 'Processing...';

            const formData = new FormData(addAdminForm);
            const payload = {
                fullName: formData.get('fullName').trim(),
                email: formData.get('email').trim(),
                phoneNumber: formData.get('phoneNumber').trim(),
                password: formData.get('password').trim()
            };

            try {
                const res = await fetch(API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const newAdmin = {
                    id: Date.now(), // Fallback ID
                    code: `ADM-${Math.floor(100 + Math.random() * 900)}`,
                    name: payload.fullName,
                    email: payload.email,
                    phone: payload.phoneNumber,
                    status: 'Active',
                    role: 'Admin',
                    department: 'General'
                };

                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data.id) newAdmin.id = data.id;

                    Swal.fire({ icon: 'success', title: 'Admin Added! ✅', text: `${payload.fullName} has been registered.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    Swal.fire({ icon: 'success', title: 'Admin Added! ✅', text: `${payload.fullName} added (local mode).`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }

                // Add to memory and Local Storage
                adminsData.push(newAdmin);
                const localAdmins = JSON.parse(localStorage.getItem('addedAdmins') || '[]');
                localAdmins.push(newAdmin);
                localStorage.setItem('addedAdmins', JSON.stringify(localAdmins));

                renderCards(adminsData);
                adminModal.classList.remove('active');
                addAdminForm.reset();

            } catch (err) {
                console.warn('API Add failed, using local only:', err);
                const newAdmin = {
                    id: Date.now(),
                    code: `ADM-${Math.floor(100 + Math.random() * 900)}`,
                    name: payload.fullName,
                    email: payload.email,
                    phone: payload.phoneNumber,
                    status: 'Active',
                    role: 'Admin',
                    department: 'General'
                };
                adminsData.push(newAdmin);
                
                const localAdmins = JSON.parse(localStorage.getItem('addedAdmins') || '[]');
                localAdmins.push(newAdmin);
                localStorage.setItem('addedAdmins', JSON.stringify(localAdmins));

                renderCards(adminsData);
                adminModal.classList.remove('active');
                addAdminForm.reset();
                Swal.fire({ icon: 'success', title: 'Admin Added! ✅', text: `${payload.fullName} added (local backup).`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            } finally {
                btn.disabled = false;
                btn.innerText = 'Add Admin';
            }
        });
    }

    // 9. Card Actions — Event Delegation
    if (cardsGrid) {
        cardsGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.toggle-status') || e.target.closest('.delete-admin');
            if (!btn) return;

            const idx = parseInt(btn.dataset.idx);
            const admin = adminsData[idx];
            if (!admin) return;

            // Toggle Status
            if (btn.classList.contains('toggle-status')) {
                if (!isSuperAdmin) {
                    Swal.fire({ icon: 'error', title: 'Permission Denied', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    return;
                }

                const newStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
                let apiSuccess = false;

                // Try multiple API patterns to persist the change
                const attempts = [
                    // Pattern 1: PUT with full object
                    () => fetch(`${API}/${admin.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...admin, status: newStatus, fullName: admin.name, phoneNumber: admin.phone })
                    }),
                    // Pattern 2: PUT with query param
                    () => fetch(`${API}/status/${admin.id}?status=${newStatus}`, { method: 'PUT' }),
                    // Pattern 3: PATCH
                    () => fetch(`${API}/${admin.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    }),
                ];

                for (const attempt of attempts) {
                    try {
                        const res = await attempt();
                        if (res.ok) { apiSuccess = true; break; }
                    } catch { /* try next */ }
                }

                adminsData[idx].status = newStatus;

                // Sync with Local Storage
                let localAdmins = JSON.parse(localStorage.getItem('addedAdmins') || '[]');
                const localIdx = localAdmins.findIndex(a => a.email === admin.email);
                if (localIdx !== -1) {
                    localAdmins[localIdx].status = newStatus;
                    localStorage.setItem('addedAdmins', JSON.stringify(localAdmins));
                }

                Swal.fire({
                    icon: 'success', title: 'Status Updated',
                    text: `${admin.name} is now ${newStatus}${apiSuccess ? '' : ' (local)'}`,
                    timer: 1500, showConfirmButton: false,
                    background: 'var(--bg-card)', color: 'var(--text-main)'
                });
                renderCards(adminsData);
            }

            // Delete
            if (btn.classList.contains('delete-admin')) {
                if (!isSuperAdmin) {
                    Swal.fire({ icon: 'error', title: 'Permission Denied', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    return;
                }

                const confirm = await Swal.fire({
                    title: 'Delete Admin?',
                    html: `<p style="color:#ef4444; font-weight:700;">⚠ Remove <strong>${admin.name}</strong> permanently?</p><p style="color:var(--text-muted);">This action cannot be undone.</p>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Yes, Delete!',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                if (confirm.isConfirmed) {
                    // Try API delete
                    try {
                        await fetch(`${API}/${admin.id}`, { method: 'DELETE' });
                    } catch { /* fallback */ }

                    // Sync with Local Storage
                    let localAdmins = JSON.parse(localStorage.getItem('addedAdmins') || '[]');
                    localAdmins = localAdmins.filter(a => a.email !== admin.email);
                    localStorage.setItem('addedAdmins', JSON.stringify(localAdmins));

                    adminsData.splice(idx, 1);
                    renderCards(adminsData);
                    Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        });
    }

    // Re-render on lang change
    window.addEventListener('langChanged', () => renderCards(adminsData));
});