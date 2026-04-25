document.addEventListener('DOMContentLoaded', () => {

    // 1. Theme & Name
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    document.getElementById('topBarName').innerText = adminName;
    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // 2. Config
    const API = 'https://transit-way.runasp.net/api/complaints/report';
    const reportsTableBody = document.getElementById('reportsTableBody');
    const searchInput = document.getElementById('reportSearchInput');
    let reportsData = [];
    let activeFilter = 'all';

    // 3. Rich Static Mock Data
    const mockReports = [
        { id: 'RPT-001', category: 'Vehicle Damage', busId: 'B-009', routeId: 'Route 14', reporter: 'Passenger #U-98', reporterType: 'Passenger', priority: 'critical', message: 'Multiple broken windows detected on the left side of the bus. Glass fragments pose safety risk to passengers.', date: '2026-04-20T08:30:00Z', status: 'pending', image: 'https://via.placeholder.com/600x400/ef4444/fff?text=Window+Damage', assignedTo: 'Maintenance Team A' },
        { id: 'RPT-002', category: 'Driver Complaint', busId: 'B-034', routeId: 'Route 7', reporter: 'Passenger #U-142', reporterType: 'Passenger', priority: 'high', message: 'Driver was using mobile phone while driving on the highway section. Passengers felt unsafe during the ride.', date: '2026-04-19T14:20:00Z', status: 'in-progress', image: null, assignedTo: 'HR Department' },
        { id: 'RPT-003', category: 'Cleanliness', busId: 'B-011', routeId: 'Route 3', reporter: 'Inspector #INS-05', reporterType: 'Inspector', priority: 'medium', message: 'Bus interior not cleaned properly. Seats have stains and the floor has trash. Needs deep cleaning before next route.', date: '2026-04-19T09:15:00Z', status: 'resolved', image: 'https://via.placeholder.com/600x400/f59e0b/fff?text=Cleanliness+Issue', assignedTo: 'Cleaning Crew' },
        { id: 'RPT-004', category: 'Mechanical Issue', busId: 'B-108', routeId: 'Route 21', reporter: 'Driver Ahmed Ali', reporterType: 'Driver', priority: 'critical', message: 'Brake system making unusual grinding noise. Bus pulled from service immediately for safety inspection.', date: '2026-04-18T16:45:00Z', status: 'in-progress', image: null, assignedTo: 'Mechanics Bay 3' },
        { id: 'RPT-005', category: 'Route Delay', busId: 'B-036', routeId: 'Route 9', reporter: 'Station Manager', reporterType: 'Staff', priority: 'low', message: 'Bus arrived 25 minutes late due to heavy traffic on Ring Road. Multiple passengers missed connections.', date: '2026-04-18T11:30:00Z', status: 'resolved', image: null, assignedTo: 'Operations' },
        { id: 'RPT-006', category: 'Safety Concern', busId: 'B-015', routeId: 'Route 5', reporter: 'Passenger #U-67', reporterType: 'Passenger', priority: 'high', message: 'Emergency exit door is jammed and cannot be opened. Reported by multiple passengers on different trips.', date: '2026-04-17T13:00:00Z', status: 'pending', image: 'https://via.placeholder.com/600x400/3b82f6/fff?text=Emergency+Exit+Issue', assignedTo: 'Safety Inspector' },
        { id: 'RPT-007', category: 'AC Malfunction', busId: 'B-027', routeId: 'Route 12', reporter: 'Passenger #U-203', reporterType: 'Passenger', priority: 'medium', message: 'Air conditioning not working in the rear section of the bus. Temperature inside was extremely uncomfortable.', date: '2026-04-17T10:00:00Z', status: 'resolved', image: null, assignedTo: 'Maintenance Team B' },
        { id: 'RPT-008', category: 'Vandalism', busId: 'B-031', routeId: 'Route 16', reporter: 'Driver Jumana', reporterType: 'Driver', priority: 'high', message: 'Seats slashed with sharp object. Graffiti on interior walls. Incident occurred during the night parking period.', date: '2026-04-16T07:20:00Z', status: 'pending', image: 'https://via.placeholder.com/600x400/8b5cf6/fff?text=Vandalism+Detected', assignedTo: 'Security Team' },
        { id: 'RPT-009', category: 'Overcrowding', busId: 'B-033', routeId: 'Route 18', reporter: 'Station Manager', reporterType: 'Staff', priority: 'medium', message: 'Bus consistently overcrowded during peak hours (7-9 AM). Need to assign additional bus to this route.', date: '2026-04-15T08:45:00Z', status: 'resolved', image: null, assignedTo: 'Fleet Planning' },
        { id: 'RPT-010', category: 'Accessibility', busId: 'B-010', routeId: 'Route 2', reporter: 'Passenger #U-88', reporterType: 'Passenger', priority: 'high', message: 'Wheelchair ramp is broken. Disabled passengers cannot board the bus safely. Urgent repair needed.', date: '2026-04-14T15:30:00Z', status: 'in-progress', image: 'https://via.placeholder.com/600x400/06b6d4/fff?text=Ramp+Broken', assignedTo: 'Accessibility Unit' },
        { id: 'RPT-011', category: 'Noise Pollution', busId: 'B-012', routeId: 'Route 6', reporter: 'Community Member', reporterType: 'Public', priority: 'low', message: 'Bus horn used excessively near residential areas during early morning hours. Multiple community complaints received.', date: '2026-04-13T06:00:00Z', status: 'resolved', image: null, assignedTo: 'Operations' },
        { id: 'RPT-012', category: 'Fare Dispute', busId: 'B-016', routeId: 'Route 8', reporter: 'Passenger #U-155', reporterType: 'Passenger', priority: 'low', message: 'Ticket machine charged double fare. Passenger requests refund of 15 EGP. Transaction ID: TXN-88432.', date: '2026-04-12T12:20:00Z', status: 'resolved', image: null, assignedTo: 'Finance Department' },
    ];

    // 4. Load Reports
    window.loadReports = async function() {
        reportsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--text-muted);"></i></td></tr>`;
        try {
            const res = await fetch(API);
            if (!res.ok) throw new Error('API not available');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                reportsData = data;
            } else {
                reportsData = mockReports;
            }
        } catch (e) {
            console.warn('Using static reports. Reason:', e.message);
            reportsData = mockReports;
        }
        updateSummary();
        applyFilter();
    };

    // 5. Update Summary Cards
    function updateSummary() {
        const total = reportsData.length;
        const pending = reportsData.filter(r => r.status === 'pending').length;
        const resolved = reportsData.filter(r => r.status === 'resolved').length;
        const critical = reportsData.filter(r => r.priority === 'critical').length;

        animateVal('rptTotal', total);
        animateVal('rptPending', pending);
        animateVal('rptResolved', resolved);
        animateVal('rptCritical', critical);
    }

    function animateVal(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const dur = 600;
        const start = performance.now();
        function step(now) {
            const p = Math.min((now - start) / dur, 1);
            const e = 1 - (1 - p) * (1 - p);
            el.textContent = Math.round(target * e);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // 6. Render Table
    function renderTable(list) {
        reportsTableBody.innerHTML = '';
        if (list.length === 0) {
            reportsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fas fa-inbox" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>No reports found</td></tr>`;
            return;
        }

        list.forEach((item, idx) => {
            const dateStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            // Priority
            const prClasses = { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
            const prIcons = { critical: 'fas fa-fire', high: 'fas fa-arrow-up', medium: 'fas fa-minus', low: 'fas fa-arrow-down' };
            const prBadge = `<span class="priority-badge ${prClasses[item.priority] || 'priority-low'}"><i class="${prIcons[item.priority] || ''}" style="margin-right:4px;"></i>${(item.priority || 'low').toUpperCase()}</span>`;

            // Status
            const stColors = { pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'fa-clock' }, 'in-progress': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'fa-spinner' }, resolved: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', icon: 'fa-check-circle' } };
            const st = stColors[item.status] || stColors.pending;
            const statusBadge = `<span style="background:${st.bg}; color:${st.color}; padding:6px 14px; border-radius:20px; font-weight:800; font-size:0.8rem; text-transform:uppercase;"><i class="fas ${st.icon}" style="margin-right:4px;"></i>${item.status.replace('-', ' ')}</span>`;

            // Category icon
            const catIcons = { 'Vehicle Damage': 'fa-car-crash', 'Driver Complaint': 'fa-user-times', 'Cleanliness': 'fa-broom', 'Mechanical Issue': 'fa-wrench', 'Route Delay': 'fa-clock', 'Safety Concern': 'fa-shield-alt', 'AC Malfunction': 'fa-snowflake', 'Vandalism': 'fa-spray-can', 'Overcrowding': 'fa-users', 'Accessibility': 'fa-wheelchair', 'Noise Pollution': 'fa-volume-up', 'Fare Dispute': 'fa-receipt' };
            const catIcon = catIcons[item.category] || 'fa-file-alt';

            const row = `
                <tr>
                    <td style="color:var(--primary-color); font-weight:800; font-family:monospace;">${item.id}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:32px; height:32px; border-radius:8px; background:rgba(86,142,116,0.08); display:flex; align-items:center; justify-content:center; color:var(--primary-color); font-size:0.8rem;"><i class="fas ${catIcon}"></i></div>
                            <span style="font-weight:700; font-size:0.88rem;">${item.category}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:700;">${item.busId || '—'}</div>
                        <div style="font-size:0.78rem; color:var(--text-muted); font-weight:600;">${item.routeId || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight:700; font-size:0.88rem;">${item.reporter || 'System'}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${item.reporterType || ''}</div>
                    </td>
                    <td>${prBadge}</td>
                    <td style="font-size:0.88rem; color:var(--text-muted); font-weight:600;">${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button onclick="openReportDetail(${idx})" style="background:transparent; border:none; cursor:pointer; color:var(--primary-color); font-size:1.1rem; transition:0.3s; padding:4px;" title="View Details" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-eye"></i></button>
                        ${item.status !== 'resolved' ? `<button onclick="resolveReport(${idx})" style="background:transparent; border:none; cursor:pointer; color:#22c55e; font-size:1.05rem; margin-left:8px; transition:0.3s; padding:4px;" title="Mark Resolved" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>
            `;
            reportsTableBody.innerHTML += row;
        });
    }

    // 7. Filter Logic
    function applyFilter() {
        let filtered = [...reportsData];
        if (activeFilter !== 'all') {
            if (activeFilter === 'critical') {
                filtered = filtered.filter(r => r.priority === 'critical');
            } else {
                filtered = filtered.filter(r => r.status === activeFilter);
            }
        }

        // Apply search
        const term = searchInput.value.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter(r =>
                (r.id || '').toLowerCase().includes(term) ||
                (r.busId || '').toLowerCase().includes(term) ||
                (r.category || '').toLowerCase().includes(term) ||
                (r.message || '').toLowerCase().includes(term) ||
                (r.reporter || '').toLowerCase().includes(term)
            );
        }
        renderTable(filtered);
    }

    // Filter chips
    document.getElementById('reportFilters').addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-chip')) return;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        activeFilter = e.target.dataset.filter;
        applyFilter();
    });

    // Search
    searchInput.addEventListener('input', applyFilter);

    // 8. Report Detail Modal
    window.openReportDetail = function(idx) {
        const item = reportsData[idx];
        if (!item) return;

        document.getElementById('rdTitle').textContent = item.category;
        document.getElementById('rdSubtitle').textContent = `${item.id} — Filed ${new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

        const prColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e' };
        const stLabels = { pending: '🟡 Pending', 'in-progress': '🔵 In Progress', resolved: '🟢 Resolved' };

        document.getElementById('rdGrid').innerHTML = `
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-bus"></i> Bus</div><div class="rd-field-value">${item.busId || '—'}</div></div>
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-route"></i> Route</div><div class="rd-field-value">${item.routeId || '—'}</div></div>
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-user"></i> Reporter</div><div class="rd-field-value">${item.reporter}</div></div>
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-tag"></i> Priority</div><div class="rd-field-value" style="color:${prColors[item.priority]}">${(item.priority || 'low').toUpperCase()}</div></div>
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-info-circle"></i> Status</div><div class="rd-field-value">${stLabels[item.status] || item.status}</div></div>
            <div class="rd-field"><div class="rd-field-label"><i class="fas fa-user-cog"></i> Assigned To</div><div class="rd-field-value">${item.assignedTo || 'Unassigned'}</div></div>
        `;

        document.getElementById('rdMessage').innerHTML = `<h4><i class="fas fa-comment-alt"></i> Description</h4><p>${item.message}</p>`;

        const imgBox = document.getElementById('rdImageBox');
        if (item.image) {
            document.getElementById('rdImage').src = item.image;
            imgBox.style.display = 'block';
        } else {
            imgBox.style.display = 'none';
        }

        document.getElementById('reportDetailModal').classList.add('active');
    };

    window.closeReportDetail = function() {
        document.getElementById('reportDetailModal').classList.remove('active');
    };

    // Close on overlay click
    document.getElementById('reportDetailModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeReportDetail();
    });

    // 9. Resolve Report
    window.resolveReport = function(idx) {
        const item = reportsData[idx];
        Swal.fire({
            title: 'Resolve Report?',
            text: `Mark ${item.id} (${item.category}) as resolved?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Resolve!',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        }).then(result => {
            if (result.isConfirmed) {
                reportsData[idx].status = 'resolved';
                updateSummary();
                applyFilter();
                Swal.fire({ icon: 'success', title: 'Resolved!', text: `${item.id} has been marked as resolved.`, timer: 1800, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        });
    };

    // Modal helpers
    window.openModal = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    // Initial load
    loadReports();

    window.addEventListener('languageChanged', () => loadReports());
});
