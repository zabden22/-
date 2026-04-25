document.addEventListener('DOMContentLoaded', () => {

    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (localStorage.getItem('compactMode') === 'true') document.documentElement.setAttribute('data-compact', 'true');

    window.openModal = function (id) { document.getElementById(id)?.classList.add('active'); };
    window.closeModal = function (id) { document.getElementById(id)?.classList.remove('active'); };

    let allRoutesData = [];
    let allStationsData = [];

    // ===================== Fetch Data =====================
    async function fetchRoutes() {
        const tbody = document.getElementById('routeTableBody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--text-muted);"></i></td></tr>`;

        try {
            const [routesRes, stationsRes] = await Promise.allSettled([
                fetch('https://transit-way.runasp.net/api/Routes'),
                fetch('https://transit-way.runasp.net/api/Stations')
            ]);

            if (routesRes.status === 'fulfilled' && routesRes.value.ok) {
                const data = await routesRes.value.json();
                allRoutesData = data.$values || data.value || data || [];
            }
            if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
                const data = await stationsRes.value.json();
                allStationsData = data.$values || data.value || data || [];
            }

            if (allRoutesData.length > 0) {
                displayRoutes(allRoutesData);
                updateStats();
                return;
            }
        } catch (error) {
            console.warn('API Error:', error);
        }

        // Fallback mock
        allRoutesData = [
            { id: 1, number: '50', name: 'Route 50', zone: 'Zone A', station: 'Al Arab', status: 'Active' },
            { id: 2, number: 'Q9', name: 'Route Q9', zone: 'Zone B', station: 'Alf Maskan', status: 'Inactive' },
            { id: 3, number: 'Q7', name: 'Route Q7', zone: 'Zone A', station: 'Al Hegaz Square', status: 'Inactive' },
            { id: 4, number: '3', name: 'Line 3', zone: 'Zone C', station: 'Al Galaa Bridge', status: 'Active' },
            { id: 5, number: '1109', name: 'Line 1109', zone: 'Zone D', station: "Al Saa'a Square", status: 'Active' },
        ];
        displayRoutes(allRoutesData);
        updateStats();
    }

    // ===================== Helpers =====================
    function gp(obj, prop) {
        if (!obj) return null;
        const key = Object.keys(obj).find(k => k.toLowerCase() === prop.toLowerCase());
        return key ? obj[key] : null;
    }

    function animV(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const dur = 500, s = performance.now();
        function step(now) {
            const p = Math.min((now - s) / dur, 1);
            el.textContent = Math.round(target * (1 - (1 - p) * (1 - p)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ===================== Stats =====================
    function updateStats() {
        const total = allRoutesData.length;
        const active = allRoutesData.filter(r => {
            const st = String(gp(r, 'status') || '').toLowerCase();
            return st === 'active';
        }).length;
        animV('rtStatTotal', total);
        animV('rtStatActive', active);
        animV('rtStatInactive', total - active);
        animV('rtStatStations', allStationsData.length);
    }

    // ===================== Display =====================
    function displayRoutes(routesArray) {
        const tbody = document.getElementById('routeTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (routesArray.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:50px; color:var(--text-muted);"><i class="fas fa-route" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.3;"></i>No routes found</td></tr>`;
            return;
        }

        routesArray.forEach(route => {
            const rId = gp(route, 'id') ?? gp(route, 'routeid') ?? '—';
            const rNum = gp(route, 'number') ?? gp(route, 'routeNumber') ?? rId;
            const rName = gp(route, 'name') ?? gp(route, 'routeName') ?? '—';
            const rZone = gp(route, 'zone') ?? '';
            const rStatus = gp(route, 'status') ?? 'Active';
            const isActive = String(rStatus).toLowerCase() === 'active';

            // Stations in zone
            let stationHtml = '<span style="color:var(--text-muted); font-style:italic;">No stations</span>';
            if (rZone) {
                const matching = allStationsData.filter(s => {
                    const sZone = gp(s, 'zone') ?? '';
                    return sZone.toLowerCase() === rZone.toLowerCase();
                });
                if (matching.length > 0) {
                    const first4 = matching.slice(0, 4);
                    const rest = matching.slice(4);
                    let html = `<div class="station-pills-wrap" style="position: relative;">`;
                    html += first4.map(s => `<span class="station-pill"><i class="fas fa-map-pin"></i>${gp(s, 'name') || '—'}</span>`).join('');
                    if (rest.length > 0) {
                        html += `<span class="station-pill" onclick="this.nextElementSibling.style.display='inline-flex'; this.style.display='none';" style="background:rgba(86,142,116,0.1); color:var(--primary-color); cursor:pointer;">+${rest.length} more</span>`;
                        html += `<span style="display:none; gap:6px; flex-wrap:wrap;">`;
                        html += rest.map(s => `<span class="station-pill"><i class="fas fa-map-pin"></i>${gp(s, 'name') || '—'}</span>`).join('');
                        html += `<span class="station-pill" onclick="this.parentElement.style.display='none'; this.parentElement.previousElementSibling.style.display='inline-flex';" style="background:rgba(239,68,68,0.1); color:#ef4444; cursor:pointer;">Show less</span>`;
                        html += `</span>`;
                    }
                    html += `</div>`;
                    stationHtml = html;
                }
            } else {
                const fallback = gp(route, 'station') ?? gp(route, 'stations');
                if (fallback) {
                    stationHtml = `<div class="station-pills-wrap">${fallback.split(', ').map(s =>
                        `<span class="station-pill"><i class="fas fa-map-pin"></i>${s}</span>`
                    ).join('')}</div>`;
                }
            }

            const statusBadge = `
                <div class="status-pill-wrap">
                    <span class="pulse-dot ${isActive ? 'active' : ''}"></span>
                    <span style="color: ${isActive ? '#059669' : '#dc2626'}; font-weight: 700; font-size: 0.88rem;">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>`;

            const zoneBadge = rZone
                ? `<span class="route-zone-badge"><i class="fas fa-layer-group"></i> ${rZone}</span>`
                : '<span style="color:var(--text-muted);">—</span>';

            const row = `
                <tr>
                    <td style="font-weight:800; color:var(--text-muted); font-family:monospace;">#${rId}</td>
                    <td><span class="route-num-badge"><i class="fas fa-hashtag"></i> ${rNum}</span></td>
                    <td style="font-weight:700; color:var(--text-main);">${rName}</td>
                    <td>${zoneBadge}</td>
                    <td>${stationHtml}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="route-actions">
                            <button class="route-action-btn danger delete-route" data-id="${rId}" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    // ===================== Init =====================
    fetchRoutes();

    // Search
    const searchInput = document.getElementById('routeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allRoutesData.filter(r => JSON.stringify(r).toLowerCase().includes(term));
            displayRoutes(filtered);
        });
    }

    // Delete
    const tbody = document.getElementById('routeTableBody');
    if (tbody) {
        tbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.delete-route');
            if (!btn) return;

            const rId = btn.getAttribute('data-id');
            const conf = await Swal.fire({
                title: 'Delete Route?',
                text: `Remove route #${rId} permanently?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, Delete!',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });

            if (conf.isConfirmed) {
                try {
                    const res = await fetch(`https://transit-way.runasp.net/api/Routes/${rId}`, { method: 'DELETE' });
                    if (res.ok) {
                        fetchRoutes();
                        Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    } else { throw new Error('API'); }
                } catch {
                    allRoutesData = allRoutesData.filter(r => String(gp(r, 'id') ?? gp(r, 'routeid')) !== String(rId));
                    displayRoutes(allRoutesData);
                    updateStats();
                    Swal.fire({ title: 'Removed!', icon: 'success', timer: 1500, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        });
    }

    // Add Route
    const addRouteForm = document.getElementById('addRouteForm');
    if (addRouteForm) {
        addRouteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                routeNumber: document.getElementById('routeNumberInput').value.trim(),
                routeName: document.getElementById('routeNameInput').value.trim(),
                station: document.getElementById('routeStationInput').value.trim(),
                status: 'Active'
            };

            try {
                const res = await fetch('https://transit-way.runasp.net/api/Routes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    closeModal('addRouteModal');
                    addRouteForm.reset();
                    fetchRoutes();
                    Swal.fire({ icon: 'success', title: 'Route Added! ✅', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else { throw new Error('API'); }
            } catch {
                allRoutesData.push({
                    id: allRoutesData.length + 100,
                    number: payload.routeNumber,
                    name: payload.routeName,
                    station: payload.station,
                    status: payload.status
                });
                displayRoutes(allRoutesData);
                updateStats();
                closeModal('addRouteModal');
                addRouteForm.reset();
                Swal.fire({ icon: 'success', title: 'Added Locally ✅', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        });
    }
});
