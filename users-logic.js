document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme & Name
    const userName = localStorage.getItem('activeAdminName') || 'Admin';
    const topBarName = document.getElementById('topBarName');
    const topAvatar = document.querySelector('.top-avatar');
    const savedPhoto = localStorage.getItem('activeAdminPhoto');

    if (topBarName) topBarName.innerText = userName;
    if (topAvatar && savedPhoto) topAvatar.src = savedPhoto;

    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (localStorage.getItem('compactMode') === 'true') {
        document.documentElement.setAttribute('data-compact', 'true');
    }

    const cardsGrid = document.getElementById('userCardsGrid');
    const searchInput = document.getElementById('userSearchInput');

    const API_BASE = 'https://transit-way.runasp.net/api/User';

    let usersData = [];

    // 2. Fetch from API (DB is single source of truth)
    async function loadUsers() {
        if (!cardsGrid) return;
        cardsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:12px; display:block;"></i>Loading users...</div>';
        
        try {
            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE}/all`, { headers });
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.$values || []);

            usersData = list.map(a => ({
                id: a.id,
                code: `USR-${String(a.id).padStart(3, '0')}`,
                name: a.fullName || 'User',
                email: a.email || '—',
                phone: a.phone || '—',
                balance: a.balance || 0,
                photo: a.photo || null,
                warningCount: a.warningCount || 0,
                isBanned: a.isBanned || false,
                ticketCount: a.ticketCount || 0,
                soldTickets: a.soldTickets || 0,
                expiredTickets: a.expiredTickets || 0
            }));

            renderCards(usersData);

        } catch (e) {
            cardsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:12px; display:block;"></i>Failed to load users<br><small style="color:var(--text-muted);">${e.message}</small></div>`;
            console.error(e);
        }
    }

    // 3. Render Cards
    function renderCards(list) {
        if (!cardsGrid) return;
        cardsGrid.innerHTML = '';

        if (list.length === 0) {
            cardsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);"><i class="fas fa-user" style="font-size:2.5rem; margin-bottom:12px; display:block; opacity:0.3;"></i><p style="font-weight:700;">No users found</p></div>';
            return;
        }

        list.forEach((user, index) => {
            const avatarSrc = user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=568e74&color=fff&size=100&bold=true`;
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=568e74&color=fff&size=100&bold=true`;
            
            const bannedStyle = user.isBanned ? 'opacity:0.7; filter:grayscale(0.8);' : '';
            const banBadge = user.isBanned ? '<span class="user-role-badge" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid #ef4444; margin-left:10px;"><i class="fas fa-ban"></i> Banned</span>' : '';
            const statusBadge = user.isBanned 
                ? '<span class="user-card-status inactive">Banned</span>'
                : '<span class="user-card-status active">Active</span>';

            // Active tickets = ticketCount - expiredTickets
            const activeTickets = Math.max(0, user.ticketCount - user.expiredTickets);

            const card = document.createElement('div');
            card.className = 'user-card';
            card.style.cssText = bannedStyle;
            card.innerHTML = `
                ${statusBadge}
                <div class="user-card-header">
                    <div style="position:relative;">
                        <img class="user-card-avatar" src="${avatarSrc}" alt="${user.name}" id="user-avatar-${user.id}" onerror="this.onerror=null; this.src='${fallbackAvatar}'">
                        <button class="change-photo-btn" onclick="triggerPhotoUpload('User', ${user.id})" style="position:absolute; bottom:0; right:0; width:22px; height:22px; border-radius:50%; background:var(--primary-color); color:white; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.6rem; box-shadow:0 2px 5px rgba(0,0,0,0.2);" title="Change Photo">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div>
                        <div class="user-card-name">${user.name} ${banBadge}</div>
                        <div class="user-card-id">${user.code}</div>
                    </div>
                </div>
                <div class="user-card-details">
                    <div class="user-card-detail"><i class="fas fa-envelope"></i> <span>${user.email}</span></div>
                    <div class="user-card-detail"><i class="fas fa-phone"></i> <span>${user.phone}</span></div>
                    <div class="user-card-detail"><i class="fas fa-wallet"></i> <span style="color:${user.balance > 0 ? '#22c55e' : 'var(--text-main)'}; font-weight:800;">${Number(user.balance).toLocaleString()} EGP</span></div>
                    <div class="user-card-detail"><i class="fas fa-hashtag"></i> <span>System ID: ${user.id}</span></div>

                    <!-- Ticket Stats Row -->
                    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color);">
                        <div class="user-card-detail" style="font-size:0.8rem; flex:1; min-width:80px;">
                            <i class="fas fa-ticket-alt" style="color:#3b82f6;"></i>
                            <div><small style="color:var(--text-muted);">Tickets</small><br><strong style="color:var(--text-main);">${user.ticketCount}</strong></div>
                        </div>
                        <div class="user-card-detail" style="font-size:0.8rem; flex:1; min-width:80px;">
                            <i class="fas fa-check-circle" style="color:#22c55e;"></i>
                            <div><small style="color:var(--text-muted);">Active</small><br><strong style="color:#22c55e;">${activeTickets}</strong></div>
                        </div>
                        <div class="user-card-detail" style="font-size:0.8rem; flex:1; min-width:80px;">
                            <i class="fas fa-clock" style="color:#ef4444;"></i>
                            <div><small style="color:var(--text-muted);">Expired</small><br><strong style="color:#ef4444;">${user.expiredTickets}</strong></div>
                        </div>
                    </div>

                    <!-- Warnings Row -->
                    <div style="display:flex; gap:15px; margin-top:8px;">
                        <div class="user-card-detail" style="font-size:0.8rem;">
                            <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i>
                            <span>Warnings:</span> <strong style="color:${user.warningCount > 0 ? '#f59e0b' : 'var(--text-muted)'}; margin-left:4px;">${user.warningCount}</strong>
                        </div>
                    </div>
                </div>
                <div class="user-card-actions">
                    ${user.photo ? `<button class="user-action-btn view-photo" data-idx="${index}" title="View Photo">
                        <i class="fas fa-image" style="color:#8b5cf6;"></i> <span>Photo</span>
                    </button>` : ''}
                    ${user.photo ? `<button class="user-action-btn danger delete-photo" data-idx="${index}" title="Delete Photo">
                        <i class="fas fa-trash-alt" style="color:#ef4444;"></i> <span>Del Photo</span>
                    </button>` : ''}
                    <button class="user-action-btn warn-user" data-idx="${index}" title="Warn">
                        <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> <span>Warning</span>
                    </button>
                    <button class="user-action-btn view-actions" data-idx="${index}" title="View Actions">
                        <i class="fas fa-history" style="color:#3b82f6;"></i> <span>Actions</span>
                    </button>
                    ` + (user.isBanned ? 
                    `<button class="user-action-btn unban-user" data-idx="${index}" title="Unban" style="border-color:#22c55e; color:#22c55e;">
                        <i class="fas fa-check-circle"></i> <span>Unban</span>
                    </button>` : 
                    `<button class="user-action-btn danger ban-user" data-idx="${index}" title="Ban">
                        <i class="fas fa-ban"></i> <span>Ban</span>
                    </button>`
                    ) + `
                </div>
            `;
            cardsGrid.appendChild(card);
        });

        updateStats();
    }

    // 4. Update Stats
    function updateStats() {
        const total = usersData.length;
        const active = usersData.filter(u => !u.isBanned).length;
        const banned = usersData.filter(u => u.isBanned).length;
        const totalBalance = usersData.reduce((sum, u) => sum + (u.balance || 0), 0);

        animV('admStatTotal', total);
        animV('statActiveUsers', active);
        animV('statBannedUsers', banned);
        animV('statTotalBalance', Math.round(totalBalance));
    }

    function animV(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const dur = 500;
        const steps = 20;
        const stepTime = dur / steps;
        let curr = parseInt(el.innerText) || 0;
        const diff = target - curr;
        if (diff === 0) { el.innerText = target; return; }
        const inc = diff / steps;
        let c = 0;
        const timer = setInterval(() => {
            c++;
            curr += inc;
            el.innerText = Math.round(curr).toLocaleString();
            if (c >= steps) { el.innerText = target.toLocaleString(); clearInterval(timer); }
        }, stepTime);
    }

    // 5. Search filtering
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = usersData.filter(a => 
                a.name.toLowerCase().includes(val) || 
                a.code.toLowerCase().includes(val) || 
                a.email.toLowerCase().includes(val) ||
                a.phone.toLowerCase().includes(val)
            );
            renderCards(filtered);
        });
    }

    // 6. Card Actions — Event Delegation
    if (cardsGrid) {
        cardsGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.warn-user') || e.target.closest('.ban-user') || e.target.closest('.unban-user') || e.target.closest('.view-actions') || e.target.closest('.view-photo') || e.target.closest('.delete-photo');
            if (!btn) return;

            const idx = parseInt(btn.dataset.idx);
            const user = usersData[idx];
            if (!user) return;

            const token = localStorage.getItem('adminToken');
            const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

            // ═══ View Photo ═══
            if (btn.classList.contains('view-photo')) {
                if (!user.photo) return;
                Swal.fire({
                    title: `${user.name}'s Photo`,
                    html: `
                        <div style="text-align:center;">
                            <img src="${user.photo}" alt="${user.name}" style="max-width:100%; max-height:400px; border-radius:16px; box-shadow:0 8px 30px rgba(0,0,0,0.15); object-fit:cover;">
                            <p style="margin-top:12px; color:var(--text-muted); font-size:0.85rem;">
                                <i class="fas fa-link" style="margin-right:5px;"></i>
                                <a href="${user.photo}" target="_blank" style="color:var(--primary-color); text-decoration:none;">Open Full Image</a>
                            </p>
                        </div>
                    `,
                    showCloseButton: true,
                    showConfirmButton: false,
                    width: '500px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }

            // ═══ Delete Photo ═══
            if (btn.classList.contains('delete-photo')) {
                const confirm = await Swal.fire({
                    title: 'Delete User Photo?',
                    html: `<p style="color:#ef4444; font-weight:700;">⚠ Remove <strong>${user.name}</strong>'s profile photo?</p><p style="color:var(--text-muted);">This will delete the photo from the database.</p>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Yes, Delete Photo!',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                if (confirm.isConfirmed) {
                    try {
                        // Try DELETE endpoint for photo
                        let res = await fetch(`${API_BASE}/${user.id}/photo`, {
                            method: 'DELETE',
                            headers: authHeaders
                        });

                        // If DELETE not available, try PUT with empty photo
                        if (!res.ok) {
                            res = await fetch(`${API_BASE}/${user.id}/profile`, {
                                method: 'PUT',
                                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fullName: user.name, phone: user.phone, email: user.email, photo: '' })
                            });
                        }

                        Swal.fire({
                            icon: 'success',
                            title: 'Photo Deleted!',
                            text: `${user.name}'s photo has been removed.`,
                            timer: 1500,
                            showConfirmButton: false,
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)'
                        });

                        // Reload from DB
                        await loadUsers();
                    } catch (err) {
                        console.error('Delete photo failed:', err);
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete photo.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            }

            // ═══ Warn User ═══
            if (btn.classList.contains('warn-user')) {
                const { value: text } = await Swal.fire({
                    title: 'Send Warning',
                    input: 'textarea',
                    inputLabel: 'Warning Message for ' + user.name,
                    inputPlaceholder: 'Type your message here...',
                    showCancelButton: true,
                    confirmButtonText: 'Send Warning',
                    confirmButtonColor: '#f59e0b',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                if (text) {
                    try {
                        const res = await fetch(`${API_BASE}/${user.id}/warn`, {
                            method: 'POST',
                            headers: { ...authHeaders, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: text })
                        });
                        if (res.ok) {
                            Swal.fire({ icon: 'success', title: 'Warning Sent!', text: `Warning sent to ${user.name}`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            // Reload from DB to get updated warningCount
                            await loadUsers();
                        } else throw new Error('Failed');
                    } catch (e) {
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to send warning.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            }

            // ═══ Ban User ═══
            if (btn.classList.contains('ban-user')) {
                const confirmResult = await Swal.fire({
                    title: 'Ban User?',
                    html: `<p style="color:#ef4444; font-weight:700;">⚠ Ban <strong>${user.name}</strong> permanently?</p>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Yes, Ban!',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                if (confirmResult.isConfirmed) {
                    try {
                        const res = await fetch(`${API_BASE}/${user.id}/ban`, {
                            method: 'POST',
                            headers: { ...authHeaders, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: 'Admin Action' })
                        });
                        if (res.ok) {
                            Swal.fire({ title: 'Banned!', text: `${user.name} has been banned.`, icon: 'success', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            await loadUsers();
                        } else throw new Error('Failed');
                    } catch (e) {
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to ban user.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            }

            // ═══ View Actions Log ═══
            if (btn.classList.contains('view-actions')) {
                Swal.fire({
                    title: 'Loading Actions Log...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); },
                    background: 'var(--bg-card)', color: 'var(--text-main)'
                });

                try {
                    const res = await fetch(`${API_BASE}/${user.id}/actions`, { headers: authHeaders });
                    if (!res.ok) throw new Error('Fetch failed');
                    const actions = await res.json();
                    const actionList = actions.$values || actions || [];

                    let html = `<div style="text-align:left; max-height:400px; overflow-y:auto; padding:10px;">`;
                    if (actionList.length === 0) {
                        html += `<p style="text-align:center; color:var(--text-muted);">No actions found for this user.</p>`;
                    } else {
                        actionList.forEach(act => {
                            const date = act.createdAt ? new Date(act.createdAt).toLocaleString() : '—';
                            html += `
                                <div style="padding:12px; border-bottom:1px solid var(--border-color); margin-bottom:8px; background:rgba(0,0,0,0.02); border-radius:8px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                        <strong style="color:var(--primary-color);">${act.actionType || 'Action'}</strong>
                                        <span style="font-size:0.75rem; color:var(--text-muted);">${date}</span>
                                    </div>
                                    <div style="font-size:0.85rem; color:var(--text-main);">${act.description || act.reason || 'No description'}</div>
                                </div>`;
                        });
                    }
                    html += `</div>`;

                    Swal.fire({
                        title: `Actions Log: ${user.name}`,
                        html: html,
                        width: '500px',
                        confirmButtonText: 'Close',
                        confirmButtonColor: 'var(--primary-color)',
                        background: 'var(--bg-card)', color: 'var(--text-main)'
                    });
                } catch (e) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load actions log.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }

            // ═══ Unban User ═══
            if (btn.classList.contains('unban-user')) {
                const confirmResult = await Swal.fire({
                    title: 'Unban User?',
                    html: `<p style="color:#22c55e; font-weight:700;">Restore access for <strong>${user.name}</strong>?</p>`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#22c55e',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Yes, Unban!',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });

                if (confirmResult.isConfirmed) {
                    try {
                        const res = await fetch(`${API_BASE}/${user.id}/unban`, {
                            method: 'POST',
                            headers: { ...authHeaders, 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                            Swal.fire({ title: 'Unbanned!', text: `${user.name} has been restored.`, icon: 'success', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                            await loadUsers();
                        } else throw new Error('Failed');
                    } catch (e) {
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to unban user.', background: 'var(--bg-card)', color: 'var(--text-main)' });
                    }
                }
            }
        });
    }

    // Re-render on lang change
    window.addEventListener('langChanged', () => renderCards(usersData));

    // Init
    loadUsers();
});