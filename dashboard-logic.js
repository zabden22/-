document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. نظام الاسم الدايناميك (Dynamic Name)
    // ==========================================
    // بنجيب الاسم من الخزنة، لو مفيش بنحط 'Moscow' افتراضي
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;
    
    const savedPhoto = localStorage.getItem('activeAdminPhoto');
    if (savedPhoto) {
        if (document.getElementById('welcomeAvatar')) document.getElementById('welcomeAvatar').src = savedPhoto;
        const topAvatar = document.querySelector('.top-avatar');
        if (topAvatar) topAvatar.src = savedPhoto;
    }
    
    const lang = localStorage.getItem('transitLang') || 'en';
    document.getElementById('welcomeMessage').innerText = (lang === 'ar' ? 'مرحباً بعودتك، ' : 'Welcome Back, ') + adminName + ' !';


    // ==========================================
    // 2. نظام الـ Dark Mode / Light Mode
    // ==========================================
    let currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);


    // ==========================================
    // 3. نظام التقويم والفلترة بالتاريخ
    // ==========================================
    const datePickerInput = document.getElementById('datePickerInput');
    const periodTabs = document.getElementById('periodTabs');
    const dateRangeLabel = document.getElementById('dateRangeLabel');

    // تعيين التاريخ الافتراضي — اليوم
    const today = new Date();
    datePickerInput.value = today.toISOString().split('T')[0];

    let selectedDate = new Date(today);
    let selectedPeriod = 'daily'; // daily | weekly | monthly | yearly

    // كل التذاكر المحمّلة من الـ API
    let allTickets = [];
    let allBuses = [];
    let allDrivers = [];
    let allStations = [];
    let allComplaints = []; // New

    // ─── أحداث التقويم ───
    datePickerInput.addEventListener('change', (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        refreshDashboard();
    });

    // ─── أحداث الفترة (يومي/أسبوعي/شهري/سنوي) ───
    periodTabs.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            periodTabs.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedPeriod = tab.dataset.period;
            refreshDashboard();
        });
    });

    // ─── حساب بداية ونهاية الفترة ───
    function getDateRange() {
        const d = new Date(selectedDate);
        let start, end;

        switch (selectedPeriod) {
            case 'daily':
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
                break;
            case 'weekly':
                const dayOfWeek = d.getDay();
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek, 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - dayOfWeek), 23, 59, 59);
                break;
            case 'monthly':
                start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'yearly':
                start = new Date(d.getFullYear(), 0, 1, 0, 0, 0);
                end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
                break;
        }
        return { start, end };
    }

    // ─── تنسيق التاريخ للعرض ───
    function formatDateRange() {
        const { start, end } = getDateRange();
        const opts = { year: 'numeric', month: 'short', day: 'numeric' };
        const currentLang = localStorage.getItem('transitLang') || 'en';
        const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';

        switch (selectedPeriod) {
            case 'daily':
                return start.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            case 'weekly':
                return start.toLocaleDateString(locale, opts) + ' → ' + end.toLocaleDateString(locale, opts);
            case 'monthly':
                return start.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
            case 'yearly':
                return start.getFullYear().toString();
        }
    }

    // ─── فلترة التذاكر حسب الفترة المختارة ───
    function filterTicketsByPeriod(tickets) {
        const { start, end } = getDateRange();
        return tickets.filter(t => {
            const ticketDate = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
            return ticketDate >= start && ticketDate <= end;
        });
    }


    // ==========================================
    // 4. جلب البيانات من الـ API
    // ==========================================
    const API_BASE = 'https://transit-way.runasp.net/api';

    async function fetchAllData() {
        // عرض حالة التحميل
        document.querySelectorAll('.stat-loader').forEach(el => el.style.display = 'inline-block');

        try {
            // جلب كل البيانات بالتوازي
            const [ticketsRes, busesRes, driversRes, stationsRes, ticketDashRes, complaintsRes] = await Promise.allSettled([
                fetch(`${API_BASE}/Tickets`),
                fetch(`${API_BASE}/Bus`),
                fetch(`${API_BASE}/Driver`),
                fetch(`${API_BASE}/Stations`),
                fetch(`${API_BASE}/Tickets/dashboard`),
                fetch(`${API_BASE}/complaints`) // New
            ]);

            // ─── التذاكر ───
            if (ticketsRes.status === 'fulfilled' && ticketsRes.value.ok) {
                const data = await ticketsRes.value.json();
                allTickets = Array.isArray(data) ? data : (data.$values || []);
            }

            // ─── الباصات ───
            if (busesRes.status === 'fulfilled' && busesRes.value.ok) {
                const data = await busesRes.value.json();
                allBuses = Array.isArray(data) ? data : (data.$values || []);
            }

            // ─── السواقين ───
            if (driversRes.status === 'fulfilled' && driversRes.value.ok) {
                const data = await driversRes.value.json();
                allDrivers = Array.isArray(data) ? data : (data.$values || []);
            }
            // ─── المحطات ───
            if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
                const data = await stationsRes.value.json();
                allStations = Array.isArray(data) ? data : (data.$values || []);
            }

            // ─── إحصائيات التذاكر (API جديد) ───
            if (ticketDashRes.status === 'fulfilled' && ticketDashRes.value.ok) {
                ticketDashboardData = await ticketDashRes.value.json();
            }

            // ─── الشكاوى (Activity Feed) ───
            if (complaintsRes && complaintsRes.status === 'fulfilled' && complaintsRes.value.ok) {
                const data = await complaintsRes.value.json();
                allComplaints = Array.isArray(data) ? data : (data.$values || []);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }

        // بعد التحميل — تحديث كل حاجة
        refreshDashboard();
    }


    // ==========================================
    // 5. تحديث الداشبورد (الكروت + الشارت + الجدول)
    // ==========================================
    function refreshDashboard() {
        // تحديث label الفترة
        dateRangeLabel.textContent = formatDateRange();

        // فلترة التذاكر
        const filtered = filterTicketsByPeriod(allTickets);

        // ─── تحديث الكروت ───
        const soldCount = filtered.length;
        const revenue = filtered.reduce((sum, t) => sum + (t.price || 15), 0);

        animateCount('ticketsCount', soldCount);
        animateCount('revenueCount', revenue.toLocaleString());

        // الباصات و السواقين والمحطات (بدون فلترة — أرقام ثابتة)
        animateCount('busesCount', allBuses.length);
        animateCount('driversCount', allDrivers.length);
        animateCount('stationsCount', allStations.length);

        // إخفاء اللودر
        document.querySelectorAll('.stat-loader').forEach(el => el.style.display = 'none');

        // ─── تحديث الشارت الرئيسي ───
        updateChart(filtered);

        // ─── تحديث الشارتات الثانوية (النظام الجديد) ───
        updateSecondaryCharts();

        // ─── تحديث جدول آخر التذاكر ───
        renderRecentTickets(filtered);
    }

    // ─── أنيميشن العدادات ───
    function animateCount(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;

        // لو النص فيه لودر شيله
        el.innerHTML = '';

        const targetNum = typeof targetValue === 'number' ? targetValue : parseInt(String(targetValue).replace(/,/g, ''), 10);
        
        if (isNaN(targetNum)) {
            el.textContent = targetValue;
            return;
        }

        const duration = 600;
        const startTime = performance.now();
        const startVal = parseInt(el.textContent) || 0;

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(startVal + (targetNum - startVal) * eased);
            el.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }


    // ==========================================
    // 6. الرسم البياني (Chart.js) — متصل بالتذاكر والتقويم
    // ==========================================
    const ctx = document.getElementById('myChart').getContext('2d');

    // Gradient fills
    const gradientSold = ctx.createLinearGradient(0, 0, 0, 400);
    gradientSold.addColorStop(0, 'rgba(86, 142, 116, 0.3)');
    gradientSold.addColorStop(1, 'rgba(86, 142, 116, 0.01)');

    const gradientRevenue = ctx.createLinearGradient(0, 0, 0, 400);
    gradientRevenue.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradientRevenue.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const gradientAvailable = ctx.createLinearGradient(0, 0, 0, 400);
    gradientAvailable.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradientAvailable.addColorStop(1, 'rgba(34, 197, 94, 0.01)');

    const gradientUsed = ctx.createLinearGradient(0, 0, 0, 400);
    gradientUsed.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    gradientUsed.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Sold Tickets',
                    data: [],
                    borderColor: '#568e74',
                    backgroundColor: gradientSold,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#568e74',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    fill: true
                },
                {
                    label: 'Revenue (EGP)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: gradientRevenue,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false // بنعمل legend custom
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 },
                    bodyFont: { family: 'Plus Jakarta Sans', weight: '600', size: 12 },
                    padding: 14,
                    cornerRadius: 12,
                    displayColors: true,
                    boxPadding: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });

    // بناء legend مخصص
    function buildCustomLegend() {
        const legendEl = document.getElementById('chartLegend');
        legendEl.innerHTML = `
            <span class="legend-item"><span class="legend-dot" style="background:#568e74;"></span> Sold</span>
            <span class="legend-item"><span class="legend-dot" style="background:#3b82f6;"></span> Revenue</span>
        `;
    }
    buildCustomLegend();

    // تحديث ألوان الشارت حسب الثيم
    function updateChartColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#1e293b';
        const gridColor = isDark ? '#334155' : 'rgba(148, 163, 184, 0.15)';

        myChart.options.scales.x.ticks.color = textColor;
        myChart.options.scales.y.ticks.color = textColor;
        myChart.options.scales.y.grid.color = gridColor;
        myChart.update();
    }

    // ─── تحديث الشارت حسب الفترة ───
    function updateChart(filteredTickets) {
        let labels = [];
        let soldData = [];
        let revenueData = [];

        const { start, end } = getDateRange();
        const currentLang = localStorage.getItem('transitLang') || 'en';

        switch (selectedPeriod) {
            case 'daily': {
                // 24 ساعة
                for (let h = 0; h < 24; h++) {
                    labels.push(h.toString().padStart(2, '0') + ':00');
                    const hourTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.getHours() === h;
                    });
                    soldData.push(hourTickets.length);
                    revenueData.push(hourTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'weekly': {
                const dayNames = currentLang === 'ar'
                    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
                    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(start);
                    dayDate.setDate(start.getDate() + i);
                    labels.push(dayNames[dayDate.getDay()]);
                    const dayTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.toDateString() === dayDate.toDateString();
                    });
                    soldData.push(dayTickets.length);
                    revenueData.push(dayTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'monthly': {
                const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    labels.push(day.toString());
                    const dayDate = new Date(start.getFullYear(), start.getMonth(), day);
                    const dayTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.toDateString() === dayDate.toDateString();
                    });
                    soldData.push(dayTickets.length);
                    revenueData.push(dayTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
            case 'yearly': {
                const monthNames = currentLang === 'ar'
                    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                for (let m = 0; m < 12; m++) {
                    labels.push(monthNames[m]);
                    const monthTickets = filteredTickets.filter(t => {
                        const d = new Date(t.createdAt || t.purchaseDate || t.CreatedAt);
                        return d.getMonth() === m;
                    });
                    soldData.push(monthTickets.length);
                    revenueData.push(monthTickets.reduce((s, t) => s + (t.price || 15), 0));
                }
                break;
            }
        }

        // تحديث عنوان الشارت
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const periodLabels = {
            daily: currentLang === 'ar' ? 'مبيعات التذاكر — يومي' : 'Ticket Sales — Daily',
            weekly: currentLang === 'ar' ? 'مبيعات التذاكر — أسبوعي' : 'Ticket Sales — Weekly',
            monthly: currentLang === 'ar' ? 'مبيعات التذاكر — شهري' : 'Ticket Sales — Monthly',
            yearly: currentLang === 'ar' ? 'مبيعات التذاكر — سنوي' : 'Ticket Sales — Yearly'
        };
        titleEl.textContent = periodLabels[selectedPeriod];
        subtitleEl.textContent = formatDateRange();

        // تحديث بيانات الشارت
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = soldData;
        myChart.data.datasets[1].data = revenueData;
        myChart.update('active');

        updateChartColors();
    }

    // ───── Secondary Status Charts (Doughnut) — NEW ─────
    let busStatusChart, driverStatusChart, stationStatusChart, statusTicketChart;
    let ticketDashboardData = { total: 0, sold: 0, cancelled: 0, expired: 0 };

    function initSecondaryCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 10,
                    cornerRadius: 8
                } 
            }
        };

        const busCtx = document.getElementById('statusBusChart').getContext('2d');
        statusBusChart = new Chart(busCtx, {
            type: 'doughnut',
            data: { labels: ['Moving', 'Idle', 'Inactive'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#3b82f6', '#22c55e', '#f97316'], borderWidth: 0 }] },
            options: commonOptions
        });

        const driverCtx = document.getElementById('statusDriverChart').getContext('2d');
        driverStatusChart = new Chart(driverCtx, {
            type: 'doughnut',
            data: { labels: ['On Duty', 'Available', 'Inactive'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#8b5cf6', '#10b981', '#94a3b8'], borderWidth: 0 }] },
            options: commonOptions
        });

        const ticketCtx = document.getElementById('statusTicketChart').getContext('2d');
        statusTicketChart = new Chart(ticketCtx, {
            type: 'doughnut',
            data: { labels: ['Sold', 'Expired', 'Cancelled'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#568e74', '#f59e0b', '#ef4444'], borderWidth: 0 }] },
            options: commonOptions
        });

        const stationCtx = document.getElementById('statusStationChart').getContext('2d');
        stationStatusChart = new Chart(stationCtx, {
            type: 'doughnut',
            data: { labels: ['Active', 'Maintenance'], datasets: [{ data: [0, 0], backgroundColor: ['#0ea5e9', '#f97316'], borderWidth: 0 }] },
            options: commonOptions
        });
    }
    // initSecondaryCharts() will be called right before fetchAllData() below

    function updateSecondaryCharts() {
        if (!statusBusChart || !driverStatusChart || !stationStatusChart || !statusTicketChart) {
            console.warn("Charts not initialized yet.");
            return;
        }

        const currentLang = localStorage.getItem('transitLang') || 'en';
        const totalText = currentLang === 'ar' ? 'الإجمالي' : 'Total';

        const labels = currentLang === 'ar' ? {
            moving: 'متحرك', idle: 'انتظار', inactive: 'غير نشط',
            onDuty: 'في الخدمة', available: 'متوفر',
            sold: 'مباع', expired: 'منتهي', cancelled: 'ملغي',
            active: 'نشط', maintenance: 'صيانة'
        } : {
            moving: 'Moving', idle: 'Idle', inactive: 'Inactive',
            onDuty: 'On Duty', available: 'Available',
            sold: 'Sold', expired: 'Expired', cancelled: 'Cancelled',
            active: 'Active', maintenance: 'Maintenance'
        };

        // 1. Bus Status [Moving, Idle, Inactive]
        const movingBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            const speed = parseFloat(b.speed) || 0;
            return speed > 0 && statusStr === 'active';
        }).length;

        const idleBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            const speed = parseFloat(b.speed) || 0;
            return speed <= 0 && statusStr === 'active';
        }).length;

        const inactiveBuses = allBuses.filter(b => {
            const statusStr = String(b.status || 'Active').trim().toLowerCase();
            return statusStr !== 'active';
        }).length;

        const busData = [movingBuses, idleBuses, inactiveBuses];
        statusBusChart.data.datasets[0].data = busData;
        statusBusChart.update('none');
        document.getElementById('busTotalLabel').textContent = `${totalText}: ${allBuses.length}`;
        
        renderCardLegend('busLegend', [
            { label: labels.moving, color: '#3b82f6', value: movingBuses },
            { label: labels.idle, color: '#22c55e', value: idleBuses },
            { label: labels.inactive, color: '#f97316', value: inactiveBuses }
        ]);

        // 2. Station Status [Active, Maintenance]
        const activeStations = allStations.filter(s => {
             const statusStr = String(s.status || 'Active').trim().toLowerCase();
             return statusStr === 'active';
        }).length;
        const maintStations = allStations.length - activeStations;
        
        stationStatusChart.data.datasets[0].data = [activeStations, maintStations];
        stationStatusChart.update('none');
        document.getElementById('stationTotalLabel').textContent = `${totalText}: ${allStations.length}`;
        renderCardLegend('stationLegend', [
            { label: labels.active, color: '#0ea5e9', value: activeStations },
            { label: labels.maintenance, color: '#f97316', value: maintStations }
        ]);

        // 3. Driver Status [On Duty, Available, Inactive]
        const inactiveDrivers = allDrivers.filter(d => {
             const statusStr = String(d.status || 'Active').trim().toLowerCase();
             return statusStr !== 'active';
        }).length;
        const onDutyDrivers = allDrivers.filter(d => {
             const statusStr = String(d.status || 'Active').trim().toLowerCase();
             // Check for busId or nested bus object
             const hasBus = d.busId || d.BusId || d.bus;
             return statusStr === 'active' && hasBus;
        }).length;
        const availableDrivers = allDrivers.length - (inactiveDrivers + onDutyDrivers);
        
        driverStatusChart.data.datasets[0].data = [onDutyDrivers, availableDrivers, inactiveDrivers];
        driverStatusChart.update('none');
        document.getElementById('driverTotalLabel').textContent = `${totalText}: ${allDrivers.length}`;
        renderCardLegend('driverLegend', [
            { label: labels.onDuty, color: '#8b5cf6', value: onDutyDrivers },
            { label: labels.available, color: '#10b981', value: availableDrivers },
            { label: labels.inactive, color: '#94a3b8', value: inactiveDrivers }
        ]);

        // 4. Ticket Status [Sold, Expired, Cancelled]
        const tTotal = ticketDashboardData.total || 0;
        const tSold = ticketDashboardData.sold || 0;
        const tExpired = ticketDashboardData.expired || 0;
        const tCancelled = ticketDashboardData.cancelled || 0;
        
        statusTicketChart.data.datasets[0].data = [tSold, tExpired, tCancelled];
        statusTicketChart.update('none');
        document.getElementById('ticketTotalLabel').textContent = `${totalText}: ${tTotal}`;
        renderCardLegend('ticketLegend', [
            { label: labels.sold, color: '#568e74', value: tSold },
            { label: labels.expired, color: '#f59e0b', value: tExpired },
            { label: labels.cancelled, color: '#ef4444', value: tCancelled }
        ]);
    }

    function renderCardLegend(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(item => `
            <div class="status-legend-item">
                <span class="status-legend-dot" style="background:${item.color};"></span>
                <span>${item.label}: <span style="color:var(--text-main); font-weight:800;">${item.value}</span></span>
            </div>
        `).join('');
    }


    // ==========================================
    // 7. جدول آخر التذاكر
    // ==========================================
    function renderRecentTickets(filteredTickets) {
        const tbody = document.getElementById('recentTicketsBody');

        // ترتيب حسب التاريخ الأحدث وأخذ أول 8
        const sorted = [...filteredTickets].sort((a, b) => {
            return new Date(b.createdAt || b.purchaseDate || 0) - new Date(a.createdAt || a.purchaseDate || 0);
        });
        const recent = sorted.slice(0, 8);

        if (recent.length === 0) {
            const currentLang = localStorage.getItem('transitLang') || 'en';
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-ticket-alt" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.4;"></i>
                        ${currentLang === 'ar' ? 'لا توجد تذاكر في هذه الفترة' : 'No tickets in this period'}
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';
        recent.forEach(t => {
            const status = t.status || (t.isUsed ? 'Used' : 'Valid');
            const statusLower = status.toLowerCase();
            let badgeClass = '';
            if (statusLower === 'valid' || statusLower === 'active') badgeClass = 'badge-valid';
            else if (statusLower === 'used') badgeClass = 'badge-used';
            else if (statusLower === 'expired') badgeClass = 'badge-expired';
            else badgeClass = 'badge-canceled';

            const routeName = t.routeName || 'General';
            const dateStr = new Date(t.createdAt || t.purchaseDate || new Date()).toLocaleString();
            const price = `${t.price || 15} EGP`;

            tbody.innerHTML += `
                <tr>
                    <td style="font-family:monospace; font-weight:800; color:var(--text-main);">
                        <i class="fas fa-qrcode" style="color:var(--text-muted); margin-right:5px;"></i> TCK-${t.id}
                    </td>
                    <td style="font-weight:700;">${t.userName || 'Passenger'}</td>
                    <td><span class="route-badge">${routeName}</span></td>
                    <td style="color:var(--text-muted); font-weight:600; font-size:0.88rem;">${dateStr}</td>
                    <td style="font-weight:900; color:var(--primary-color);">${price}</td>
                    <td><span class="ticket-badge ${badgeClass}">${status}</span></td>
                </tr>
            `;
        });
    }


    // ==========================================
    // 8. System Activity Feed
    // ==========================================
    function populateActivityFeed() {
        const feedList = document.getElementById('activityFeedList');
        if (!feedList) return;

        const currentLang = localStorage.getItem('transitLang') || 'en';
        const isAr = currentLang === 'ar';
        const activities = [];

        // 1. Process Recent Tickets
        const recentTickets = [...allTickets].sort((a, b) => new Date(b.createdAt || b.purchaseDate || 0) - new Date(a.createdAt || a.purchaseDate || 0)).slice(0, 4);
        recentTickets.forEach(t => {
            const timeStr = formatRelativeTime(t.createdAt || t.purchaseDate);
            activities.push({
                type: 'ticket', dot: 'dot-ticket',
                timestamp: new Date(t.createdAt || t.purchaseDate || 0),
                text: isAr 
                    ? `تم شراء تذكرة بواسطة <strong>${t.userName || 'راكب'}</strong> للمسار <strong>${t.routeName || 'عام'}</strong>`
                    : `Ticket purchased by <strong>${t.userName || 'Passenger'}</strong> for <strong>${t.routeName || 'General'}</strong>`,
                time: timeStr
            });
        });

        // 2. Process Recent Complaints/Reports
        const recentComplaints = [...allComplaints].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 4);
        recentComplaints.forEach(c => {
            const timeStr = formatRelativeTime(c.date);
            activities.push({
                type: 'report', dot: 'dot-report',
                timestamp: new Date(c.date || 0),
                text: isAr
                    ? `تقرير جديد: <strong>${c.category}</strong> لباص <strong>${c.busId || '—'}</strong>`
                    : `New report: <strong>${c.category}</strong> for Bus <strong>${c.busId || '—'}</strong>`,
                time: timeStr
            });
        });

        // 3. Process New Buses (Guessing by ID)
        const recentBuses = [...allBuses].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 2);
        recentBuses.forEach(b => {
            activities.push({
                type: 'bus', dot: 'dot-bus',
                timestamp: new Date(Date.now() - 3600000 * 5), // Mock timestamp for visual variety
                text: isAr
                    ? `تم إضافة حافلة جديدة للأسطول رقم <strong>${b.busNumber || b.id}</strong>`
                    : `New bus added to fleet: <strong>#${b.busNumber || b.id}</strong>`,
                time: isAr ? 'منذ 5 ساعات' : '5 hours ago'
            });
        });

        // Sort everything by timestamp
        activities.sort((a, b) => b.timestamp - a.timestamp);

        // Render
        if (activities.length === 0) {
            feedList.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">${isAr ? 'لا يوجد نشاط مسجل' : 'No recent activity'}</div>`;
            return;
        }

        feedList.innerHTML = activities.slice(0, 10).map(act => `
            <div class="activity-item">
                <div class="activity-dot-wrap">
                    <div class="activity-dot ${act.dot}"></div>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time"><i class="fas fa-clock"></i> ${act.time}</div>
                </div>
            </div>
        `).join('');
    }

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        const isAr = (localStorage.getItem('transitLang') || 'en') === 'ar';

        if (diffMin < 1) return isAr ? 'الآن' : 'Just now';
        if (diffMin < 60) return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin} min ago`;
        if (diffHr < 24) return isAr ? `منذ ${diffHr} ساعة` : `${diffHr} hours ago`;
        return isAr ? `منذ ${diffDay} يوم` : `${diffDay} days ago`;
    }


    // ==========================================
    // 9. تشغيل أول مرة
    // ==========================================
    initSecondaryCharts(); // تأكد من التهيئة أولاً
    fetchAllData();

    // Populate activity feed after data loads (with a small delay)
    setTimeout(populateActivityFeed, 3000);

    // تحديث تلقائي كل 15 ثانية
    setInterval(() => {
        fetchAllData();
    }, 15000);

    // Refresh activity feed every 60 seconds
    setInterval(populateActivityFeed, 60000);

    // الاستماع لتغيير اللغة
    window.addEventListener('langChanged', () => {
        const newLang = localStorage.getItem('transitLang') || 'en';
        document.getElementById('welcomeMessage').innerText = (newLang === 'ar' ? 'مرحباً ' : 'Hello ') + adminName + ' !';
        refreshDashboard();
        populateActivityFeed();
    });

    // الاستماع لتغيير الثيم
    const observer = new MutationObserver(() => {
        updateChartColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

});

