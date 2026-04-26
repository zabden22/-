document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Theme + Admin Name
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    document.getElementById('topBarName').innerText = adminName;

    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // ==========================================
    // 2. Config & State
    // ==========================================
    const API = 'https://transit-way.runasp.net';
    const driverTableBody = document.getElementById('driverTableBody');
    const searchInput     = document.getElementById('driverSearchInput');

    let driversData = [];
    let busesData   = [];

    // Chart instances for the profile modal
    let weeklyChartInstance = null;
    let performanceChartInstance = null;

    // ==========================================
    // 3. Helpers
    // ==========================================
    function showTableLoading() {
        driverTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    Loading drivers...
                </td>
            </tr>`;
    }

    function showTableError(msg) {
        driverTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    ${msg}
                </td>
            </tr>`;
    }

    // Seeded random number generator (consistent per driver ID)
    function seededRandom(seed) {
        let x = Math.sin(seed * 9301 + 49297) * 49573;
        return x - Math.floor(x);
    }

    function seededRange(seed, min, max) {
        return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
    }

    // Animated counter
    function animateValue(el, target, suffix = '') {
        const duration = 800;
        const startTime = performance.now();
        const startVal = 0;

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(startVal + (target - startVal) * eased);
            el.textContent = current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ==========================================
    // 4. Generate Mock Driver Statistics
    // ==========================================
    function generateDriverStats(driverId) {
        const id = parseInt(driverId) || 0;
        const totalHours = seededRange(id * 1, 120, 2400);
        const tripsCompleted = seededRange(id * 2, 50, 800);
        const safetyRating = (3.5 + seededRandom(id * 3) * 1.5).toFixed(1);
        const onTimeRate = seededRange(id * 4, 78, 99);

        // Weekly hours (Sun-Sat)
        const weeklyHours = [];
        for (let i = 0; i < 7; i++) {
            weeklyHours.push(seededRange(id * 10 + i, 4, 10));
        }

        // Performance breakdown
        const excellent = seededRange(id * 5, 45, 75);
        const good = seededRange(id * 6, 15, 35);
        const average = 100 - excellent - good;

        // Recent trips
        const routeNames = [
            'Cairo → Giza', 'Helwan → Maadi', 'Nasr City → Downtown',
            'October → Dokki', 'Shubra → Ramses', 'Heliopolis → Airport',
            'Mohandessin → Zamalek', 'Haram → Faisal', 'Ain Shams → Abbassia',
            'Tagamoa → Rehab', 'Maadi → Old Cairo', 'Smart Village → 6th Oct'
        ];
        const tripStatuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Delayed', 'Completed'];
        const recentTrips = [];
        for (let i = 0; i < 5; i++) {
            const daysAgo = seededRange(id * 20 + i, 0, 14);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const durationMins = seededRange(id * 30 + i, 35, 120);
            const distanceKm = seededRange(id * 40 + i, 8, 45);
            recentTrips.push({
                route: routeNames[seededRange(id * 50 + i, 0, routeNames.length - 1)],
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                duration: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
                distance: `${distanceKm} km`,
                status: tripStatuses[seededRange(id * 60 + i, 0, tripStatuses.length - 1)]
            });
        }

        // Joined date (mock)
        const joinYear = seededRange(id * 7, 2020, 2025);
        const joinMonth = seededRange(id * 8, 0, 11);
        const joinedDate = new Date(joinYear, joinMonth, seededRange(id * 9, 1, 28));

        // Route name
        const assignedRoute = routeNames[seededRange(id * 11, 0, routeNames.length - 1)];

        return {
            totalHours, tripsCompleted, safetyRating, onTimeRate,
            weeklyHours, excellent, good, average: Math.max(average, 5),
            recentTrips, joinedDate, assignedRoute
        };
    }

    // ==========================================
    // 5. Update Summary Stats Bar
    // ==========================================
    function updateSummaryBar() {
        const total = driversData.length;
        const active = driversData.filter(d => d.status === 'Active').length;
        const onDuty = driversData.filter(d => d.busName).length;
        const unassigned = driversData.filter(d => !d.busName).length;

        const totalEl = document.getElementById('sumTotalDrivers');
        const activeEl = document.getElementById('sumActiveDrivers');
        const onDutyEl = document.getElementById('sumOnDutyDrivers');
        const unassignedEl = document.getElementById('sumUnassignedDrivers');

        if (totalEl) animateValue(totalEl, total);
        if (activeEl) animateValue(activeEl, active);
        if (onDutyEl) animateValue(onDutyEl, onDuty);
        if (unassignedEl) animateValue(unassignedEl, unassigned);
    }

    // ==========================================
    // 6. GET /api/Driver — جلب كل السواقين
    // ==========================================
    async function loadDrivers(silent = false) {
        try {
            if (!silent) showTableLoading();

            // تأكد إن الباصات اتحملت الأول (محتاجينها عشان نطابق الـ busNumber)
            if (busesData.length === 0) {
                await loadBuses();
            }

            const res = await fetch(`https://transit-way.runasp.net/api/Driver`);
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();

            driversData = data.map(d => {
                // جرب كل الأسماء الممكنة للـ busId في الـ API response
                const busId = d.busId || d.bus?.id || d.assignedBusId || d.assignedBus?.id || null;

                // ابحث عن الباص في busesData عشان تاخد busNumber الصح
                let busName = null;
                if (d.busNumber) {
                    busName = `Bus #${d.busNumber}`;
                } else if (d.bus?.busNumber) {
                    busName = `Bus #${d.bus.busNumber}`;
                } else if (busId) {
                    const matchedBus = busesData.find(b => b.id == busId);
                    busName = matchedBus
                        ? `Bus #${matchedBus.busNumber || matchedBus.id}`
                        : `Bus #${busId}`;
                }

                return {
                    id:      d.id,
                    name:    d.fullName    || d.name     || 'Driver',
                    license: d.licenseNumber || d.license || '—',
                    phone:   d.phoneNumber || d.phone    || '—',
                    email:   d.email || '—',
                    busId,
                    busName,
                    status:  d.isActive === false ? 'Inactive' : (d.status || 'Active')
                };
            });
            renderTable();
            updateSummaryBar();
        } catch (err) {
            console.error('Load drivers error:', err);
            if (!silent) showTableError('Could not load drivers. ' + err.message);
        }
    }

    // ==========================================
    // 7. GET /api/Bus — جلب الباصات للـ assign dropdowns
    // ==========================================
    async function loadBuses() {
        try {
            const res = await fetch(`https://transit-way.runasp.net/api/Bus`);
            if (!res.ok) return;
            busesData = await res.json();
        } catch (e) {
            console.warn('Could not load buses:', e);
        }
    }

    // ==========================================
    // 8. Render Table
    // ==========================================
    function renderTable(list = driversData) {
        driverTableBody.innerHTML = '';

        if (list.length === 0) {
            driverTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-users" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        No drivers found
                    </td>
                </tr>`;
            return;
        }

        list.forEach(driver => {
            const isActive   = driver.status === 'Active';
            const statusBadge = isActive
                ? `<span style="background:rgba(34,197,94,0.1); color:#22c55e; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Active</span>`
                : `<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:800; text-transform:uppercase;">Inactive</span>`;

            const busBadge = driver.busName
                ? `<span style="background:var(--bg-main); border:1px solid var(--border-color); padding:5px 10px; border-radius:8px; font-weight:800; font-size:0.85rem;"><i class="fas fa-bus" style="color:var(--primary-color); margin-right:5px;"></i>${driver.busName}</span>`
                : `<span style="color:var(--text-muted); font-weight:bold;">Unassigned</span>`;

            const row = `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=random&color=fff&rounded=true&bold=true"
                                 alt="Avatar" style="width:38px; height:38px; border-radius:50%; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                            <span style="font-weight:700;">${driver.name}</span>
                        </div>
                    </td>
                    <td style="color:var(--primary-color); font-family:monospace; font-weight:bold;">#${driver.id}</td>
                    <td style="font-family:monospace;">${driver.license}</td>
                    <td>${driver.phone}</td>
                    <td>${busBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <i class="fas fa-eye view-driver"
                           style="color:var(--text-muted); cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="View Details"
                           onmouseover="this.style.color='var(--primary-color)'"
                           onmouseout="this.style.color='var(--text-muted)'"
                           data-id="${driver.id}"></i>
                        <i class="fas fa-toggle-${isActive ? 'on' : 'off'} toggle-driver-status"
                           style="color:${isActive ? '#22c55e' : '#ef4444'}; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                           title="${isActive ? 'Deactivate' : 'Activate'}"
                           onmouseover="this.style.filter='brightness(0.75)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${driver.id}"></i>
                        ${driver.busName
                            ? `<i class="fas fa-unlink unassign-driver"
                                  style="color:#f59e0b; cursor:pointer; margin-right:12px; font-size:1.1rem; transition:0.3s;"
                                  title="Unassign Bus"
                                  onmouseover="this.style.filter='brightness(0.75)'"
                                  onmouseout="this.style.filter='brightness(1)'"
                                  data-id="${driver.id}"></i>`
                            : ''}
                        <i class="fas fa-trash-alt delete-driver"
                           style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;"
                           title="Delete Driver"
                           onmouseover="this.style.filter='brightness(0.8)'"
                           onmouseout="this.style.filter='brightness(1)'"
                           data-id="${driver.id}"></i>
                    </td>
                </tr>`;
            driverTableBody.innerHTML += row;
        });
    }

    // Initial load
    loadDrivers();
    loadBuses();

    // Auto-refresh كل 20 ثانية
    setInterval(() => loadDrivers(true), 20000);

    // ==========================================
    // 9. Search — GET /api/Driver/search
    // ==========================================
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (!term) {
            renderTable(driversData);
            return;
        }

        // بحث محلي فوري
        const local = driversData.filter(d =>
            d.name.toLowerCase().includes(term.toLowerCase()) ||
            String(d.id).includes(term) ||
            d.license.toLowerCase().includes(term.toLowerCase())
        );
        renderTable(local);

        // بحث من الـ API بعد 500ms — param اسمه 'name'
        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://transit-way.runasp.net/api/Driver/search?name=${encodeURIComponent(term)}`);
                if (res.ok) {
                    const data = await res.json();
                    const mapped = data.map(d => {
                        const busId = d.busId || null;
                        let busName = null;
                        if (d.busNumber) {
                            busName = `Bus #${d.busNumber}`;
                        } else if (busId) {
                            const matchedBus = busesData.find(b => b.id == busId);
                            busName = matchedBus
                                ? `Bus #${matchedBus.busNumber || matchedBus.id}`
                                : `Bus #${busId}`;
                        }
                        return {
                            id:      d.id,
                            name:    d.fullName    || d.name     || 'Driver',
                            license: d.licenseNumber || d.license || '—',
                            phone:   d.phoneNumber || d.phone    || '—',
                            email:   d.email || '—',
                            busId,
                            busName,
                            status:  d.isActive === false ? 'Inactive' : (d.status || 'Active')
                        };
                    });
                    renderTable(mapped);
                }
            } catch (e) { /* keep local results */ }
        }, 500);
    });

    // ==========================================
    // 10. Modals
    // ==========================================
    window.openModal  = (id) => document.getElementById(id).classList.add('active');
    window.closeModal = (id) => document.getElementById(id).classList.remove('active');

    document.getElementById('openAddDriverModalBtn').onclick = () => openModal('addDriverModal');
    document.getElementById('openAssignModalBtn').onclick    = () => {
        populateAssignDropdowns();
        openModal('assignModal');
    };

    function populateAssignDropdowns() {
        const driverSel = document.getElementById('assignDriverSelect');
        const busSel    = document.getElementById('assignBusSelect');

        // الباصات اللي عندها سواق مربوطين بيها (محجوزة)
        const assignedBusIds = new Set(
            driversData
                .filter(d => d.busId)
                .map(d => String(d.busId))
        );

        // Drivers dropdown — بس اللي مش عندهم باص
        driverSel.innerHTML = '<option value="">Select Driver</option>';
        driversData
            .filter(d => !d.busName)
            .forEach(d => {
                driverSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });

        // Buses dropdown — بس اللي مش عندها سواق (مش محجوزة)
        busSel.innerHTML = '<option value="">Select Bus</option>';
        busesData
            .filter(b => !assignedBusIds.has(String(b.id)))
            .forEach(b => {
                const label = b.busNumber ? `Bus #${b.busNumber}` : `Bus #${b.id}`;
                busSel.innerHTML += `<option value="${b.id}">${label}</option>`;
            });
    }

    // ==========================================
    // 11. POST /api/Driver — إضافة سواق جديد
    // ==========================================
    document.getElementById('addDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Processing...';

        const inputs  = e.target.querySelectorAll('input');
        const payload = {
            fullName:      inputs[0].value.trim(),
            email:         inputs[1].value.trim(),
            licenseNumber: inputs[2].value.trim(),
            phoneNumber:   inputs[3].value.trim(),
            password:      inputs[4].value.trim()
        };

        if (!payload.fullName || !payload.email || !payload.licenseNumber || !payload.password) {
            Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please fill all required fields.', background: 'var(--bg-card)', color: 'var(--text-main)' });
            btn.disabled = false;
            btn.innerText = 'Add Driver';
            return;
        }

        try {
            const res = await fetch(`https://transit-way.runasp.net/api/Driver`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Driver Added! ✅', text: `${payload.fullName} has been registered.`, timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('addDriverModal');
                e.target.reset();
                loadDrivers();
            } else {
                const err = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${err}`);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Add Driver';
        }
    };

    // ==========================================
    // 12. POST /api/Bus/assign-driver — ربط سواق بباص
    // ==========================================
    document.getElementById('assignDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn      = e.target.querySelector('button[type="submit"]');
        const driverId = document.getElementById('assignDriverSelect').value;
        const busId    = document.getElementById('assignBusSelect').value;

        if (!driverId || !busId) {
            Swal.fire({ icon: 'warning', title: 'Select both driver and bus', background: 'var(--bg-card)', color: 'var(--text-main)' });
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Assigning...';

        try {
            // POST /api/Driver/assign بيستخدم query params مش body
            const res = await fetch(`https://transit-way.runasp.net/api/Driver/assign?driverId=${driverId}&busId=${busId}`, {
                method: 'POST'
            });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Assigned! ✅', text: 'Driver has been linked to the bus.', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                closeModal('assignModal');
                e.target.reset();
                loadDrivers();
            } else {
                const err = await res.text().catch(() => '');
                throw new Error(`Server ${res.status}: ${err}`);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Assign Now';
        }
    };

    // ==========================================
    // 13. Driver Profile Modal — Open & Populate
    // ==========================================
    async function openDriverProfile(driverId) {
        const driverObj = driversData.find(d => d.id == driverId);
        if (!driverObj) return;

        const modal = document.getElementById('driverProfileModal');
        
        // Fetch Real Data from API
        let realDetails = null;
        try {
            // Pattern: /api/Driver/details/{id}
            const res = await fetch(`https://transit-way.runasp.net/api/Driver/details/${driverId}`);
            if (res.ok) {
                realDetails = await res.json();
            }
        } catch (e) {
            console.warn('Driver details API failed:', e);
        }

        const stats = generateDriverStats(driverId);
        
        // Use real details with the nested structure: driver, bus, stats
        const displayData = {
            name: realDetails?.driver?.name || driverObj.name,
            license: realDetails?.driver?.licenseNumber || driverObj.license,
            phone: realDetails?.driver?.phone || driverObj.phone,
            email: realDetails?.driver?.email || driverObj.email || '—',
            busName: realDetails?.bus?.busNumber ? `Bus #${realDetails.bus.busNumber}` : (driverObj.busName || 'Unassigned'),
            totalHours: realDetails?.stats?.totalHours ?? stats.totalHours,
            trips: realDetails?.stats?.totalTrips ?? stats.tripsCompleted,
            rating: realDetails?.stats?.rating ?? stats.safetyRating,
            onTime: realDetails?.stats?.onTimeRate ?? stats.onTimeRate,
            joined: (realDetails?.driver?.joinedDate) ? new Date(realDetails.driver.joinedDate) : stats.joinedDate,
            route: realDetails?.bus?.route || stats.assignedRoute
        };

        // Header
        document.getElementById('dpAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayData.name)}&background=568e74&color=fff&size=150&bold=true`;
        document.getElementById('dpName').textContent = displayData.name;
        document.getElementById('dpId').textContent = `#${driverId}`;

        const isActive = driverObj.status === 'Active';
        document.getElementById('dpStatusBadge').innerHTML = `<span class="dp-header-badge ${isActive ? 'dp-badge-active' : 'dp-badge-inactive'}">${driverObj.status}</span>`;

        // Info Grid
        document.getElementById('dpLicense').textContent = displayData.license;
        document.getElementById('dpPhone').textContent = displayData.phone;
        document.getElementById('dpBus').textContent = displayData.busName;
        document.getElementById('dpEmail').textContent = displayData.email;
        document.getElementById('dpJoined').textContent = displayData.joined.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('dpRoute').textContent = displayData.route;

        // Animated Stats
        animateValue(document.getElementById('dpTotalHours'), displayData.totalHours, 'h');
        animateValue(document.getElementById('dpTrips'), displayData.trips);
        
        // Safety rating with decimal
        const safetyEl = document.getElementById('dpSafety');
        const safetyTarget = parseFloat(displayData.rating);
        const sfDuration = 800;
        const sfStart = performance.now();
        function sfStep(now) {
            const p = Math.min((now - sfStart) / sfDuration, 1);
            const e = 1 - (1 - p) * (1 - p);
            safetyEl.textContent = (safetyTarget * e).toFixed(1) + '★';
            if (p < 1) requestAnimationFrame(sfStep);
        }
        requestAnimationFrame(sfStep);

        animateValue(document.getElementById('dpOnTime'), displayData.onTime, '%');

        // Weekly Activity Chart
        const weeklyCtx = document.getElementById('dpWeeklyChart').getContext('2d');
        if (weeklyChartInstance) weeklyChartInstance.destroy();

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? '#334155' : 'rgba(148,163,184,0.15)';
        const textColor = isDark ? '#f8fafc' : '#1e293b';

        // Map API weekly activity to days
        const dayMap = { 'Sunday':0, 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5, 'Saturday':6 };
        let weeklyDataArr = [0,0,0,0,0,0,0];
        if (realDetails?.weeklyActivity && Array.isArray(realDetails.weeklyActivity)) {
            realDetails.weeklyActivity.forEach(act => {
                const idx = dayMap[act.day];
                if (idx !== undefined) weeklyDataArr[idx] = act.count;
            });
        } else {
            weeklyDataArr = stats.weeklyHours;
        }

        weeklyChartInstance = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Hours',
                    data: weeklyDataArr,
                    backgroundColor: [
                        'rgba(86,142,116,0.7)', 'rgba(59,130,246,0.7)', 'rgba(139,92,246,0.7)',
                        'rgba(245,158,11,0.7)', 'rgba(86,142,116,0.7)', 'rgba(239,68,68,0.7)',
                        'rgba(100,116,139,0.7)'
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.9)',
                        padding: 10, cornerRadius: 10,
                        callbacks: {
                            label: (ctx) => `${ctx.raw} hours`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.max(...weeklyDataArr, 5) + 2,
                        ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' }, color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { font: { family: 'Plus Jakarta Sans', weight: '700' }, color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });

        // Performance Doughnut
        const perfCtx = document.getElementById('dpPerformanceChart').getContext('2d');
        if (performanceChartInstance) performanceChartInstance.destroy();

        // Use real performance data if available (Doughnut)
        const perfData = realDetails?.performance || [stats.excellent, stats.good, stats.average];

        performanceChartInstance = new Chart(perfCtx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Average'],
                datasets: [{
                    data: perfData,
                    backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Plus Jakarta Sans', weight: '700', size: 11 },
                            color: textColor,
                            padding: 14,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.9)',
                        padding: 10, cornerRadius: 10,
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.raw}%`
                        }
                    }
                }
            }
        });

        // Trip History Table
        const tripsBody = document.getElementById('dpTripsBody');
        tripsBody.innerHTML = '';
        
        // Use real trips from API
        const history = realDetails?.recentTrips || stats.recentTrips;

        history.forEach(trip => {
            const statusLower = (trip.status || '').toLowerCase();
            const statusClass = (statusLower === 'completed' || statusLower === 'done' || statusLower === 'sold') ? 'dp-trip-completed'
                : (statusLower === 'delayed' || statusLower === 'late') ? 'dp-trip-delayed' : 'dp-trip-ongoing';
            
            tripsBody.innerHTML += `
                <tr>
                    <td style="font-weight:700;"><i class="fas fa-route" style="color:var(--primary-color); margin-right:6px;"></i>${trip.route || 'Unknown'}</td>
                    <td style="color:var(--text-muted);">${trip.date || '—'}</td>
                    <td>${trip.duration || '—'}</td>
                    <td>${trip.distance || '—'}</td>
                    <td><span class="dp-trip-badge ${statusClass}">${trip.status || 'Unknown'}</span></td>
                </tr>`;
        });

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close profile modal
    document.getElementById('dpCloseBtn').onclick = () => {
        document.getElementById('driverProfileModal').classList.remove('active');
        document.body.style.overflow = '';
    };

    // Close on overlay click
    document.getElementById('driverProfileModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('driverProfileModal');
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });

    // ==========================================
    // 14. Table Click Events
    // ==========================================
    driverTableBody.addEventListener('click', async (e) => {
        const target   = e.target;
        const driverId = target.getAttribute('data-id');
        if (!driverId) return;

        const driverObj = driversData.find(d => d.id == driverId);

        // ── View Driver — Open Profile Modal ──
        if (target.classList.contains('view-driver')) {
            openDriverProfile(driverId);
        }

        // ── PUT /api/Driver/status/{id} — تغيير الحالة ──
        if (target.classList.contains('toggle-driver-status')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;
            const isActive    = driverObj?.status === 'Active';
            const action      = isActive ? 'Deactivate' : 'Activate';

            const confirm = await Swal.fire({
                title:              `${action} Driver?`,
                text:               `Are you sure you want to ${action.toLowerCase()} ${displayName}?`,
                icon:               'question',
                showCancelButton:   true,
                confirmButtonColor: isActive ? '#ef4444' : '#22c55e',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  `Yes, ${action}!`,
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    // status بيجي كـ query parameter مش body
                    const newStatus = isActive ? 'Inactive' : 'Active';
                    const res = await fetch(`https://transit-way.runasp.net/api/Driver/status/${driverId}?status=${newStatus}`, {
                        method: 'PUT'
                    });
                    if (res.ok) {
                        Swal.fire({ title: 'Updated!', text: `${displayName} is now ${newStatus}.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        loadDrivers();
                    } else {
                        const body = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${body}`);
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ── POST /api/Driver/unassign/{driverId} — فك الربط ──
        if (target.classList.contains('unassign-driver')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;

            const confirm = await Swal.fire({
                title:              'Unassign Bus?',
                text:               `Remove ${displayName} from their current bus?`,
                icon:               'warning',
                showCancelButton:   true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  'Yes, Unassign!',
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    const res = await fetch(`https://transit-way.runasp.net/api/Driver/unassign/${driverId}`, { method: 'POST' });
                    if (res.ok) {
                        Swal.fire({ title: 'Unassigned!', text: `${displayName} has been unassigned from their bus.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                        loadDrivers();
                    } else {
                        throw new Error(`Server ${res.status}`);
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }

        // ── DELETE /api/Driver/{id} — حذف سواق ──
        if (target.classList.contains('delete-driver')) {
            const displayName = driverObj?.name || `Driver #${driverId}`;
            const isAssigned  = !!driverObj?.busName;

            const confirm = await Swal.fire({
                title:              'Delete Driver?',
                html:               `<p style="color:#ef4444; font-weight:700;">⚠ Permanently remove <strong>${displayName}</strong>?</p>
                                     ${isAssigned ? `<p style="color:#f59e0b; font-size:0.9rem;"><i class="fas fa-exclamation-circle"></i> This driver is assigned to a bus — they will be unassigned automatically.</p>` : ''}
                                     <p style="color:var(--text-muted);">This action cannot be undone.</p>`,
                icon:               'error',
                showCancelButton:   true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor:  'var(--text-muted)',
                confirmButtonText:  'Yes, DELETE!',
                background: 'var(--bg-card)',
                color:      'var(--text-main)'
            });

            if (confirm.isConfirmed) {
                try {
                    // دايماً نحاول نفك الربط الأول — بنتجاهل نتيجته
                    await fetch(`https://transit-way.runasp.net/api/Driver/unassign/${driverId}`, { method: 'POST' }).catch(() => {});

                    // دلوقتي امسح السواق
                    const res = await fetch(`https://transit-way.runasp.net/api/Driver/${driverId}`, { method: 'DELETE' });
                    if (res.ok) {
                        driversData = driversData.filter(d => d.id != driverId);
                        renderTable();
                        updateSummaryBar();
                        Swal.fire({ title: 'Deleted!', text: `${displayName} has been permanently removed.`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                    } else {
                        const body = await res.text().catch(() => '');
                        throw new Error(`Server ${res.status}: ${body}`);
                    }
                } catch (err) {
                    console.error('Delete driver error:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            }
        }
    });
});
