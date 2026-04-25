document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. نظام الاسم الدايناميك والدارك مود
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    const topBarNameEl = document.getElementById('topBarName');
    if (topBarNameEl) topBarNameEl.innerText = adminName;

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        let currentTheme = localStorage.getItem('siteTheme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);

        function updateThemeUI(theme) {
            if(theme === 'dark') {
                themeIcon.classList.replace('fa-moon', 'fa-sun');
                themeIcon.style.color = '#f1c40f';
            } else {
                themeIcon.classList.replace('fa-sun', 'fa-moon');
                themeIcon.style.color = 'var(--text-main)';
            }
        }
        updateThemeUI(currentTheme);

        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('siteTheme', currentTheme);
            updateThemeUI(currentTheme);
        });
    }

    // ==========================================
    // 2. سحب الباصات من الـ API (GET)
    // ==========================================
    const busTableBody = document.getElementById('busTableBody');
    const searchInput = document.getElementById('busSearchInput'); // لو عندك خانة بحث

    async function fetchBuses() {
        const token = localStorage.getItem('adminToken'); // لو شغالين بتوكن

        try {
            const response = await fetch('https://transit-way.runasp.net/api/Bus', {
                method: 'GET',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });

            console.log("Status Code (Buses):", response.status);

            if (response.ok) {
                const buses = await response.json();
                console.log("تم سحب الباصات بنجاح:", buses);
                displayBuses(buses);
            } else {
                throw new Error(`خطأ رقم ${response.status}`);
            }
        } catch (error) {
            console.error("فشل التحميل:", error);
            if (busTableBody) {
                busTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">فشل تحميل بيانات الباصات. تأكد من اتصال السيرفر.</td></tr>`;
            }
        }
    }

    function displayBuses(buses) {
        if (!busTableBody) return; 
        busTableBody.innerHTML = ""; 

        if(buses.length === 0) {
            busTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">لا يوجد باصات في قاعدة البيانات حالياً.</td></tr>`;
            return;
        }

        buses.forEach(bus => {
            // تظبيط أسماء الحقول عشان لو الباك إند باعتها كابيتال أو سمول
            const bId = bus.id || bus.Id || "N/A";
            const bNumber = bus.busNumber || bus.BusNumber || bus.plateNumber || "غير محدد";
            const bCapacity = bus.capacity || bus.Capacity || 0;
            const bDriver = bus.driverName || bus.DriverName || "بدون سائق";
            const bStatus = bus.status || bus.Status || "Active"; 

            const statusClass = bStatus.toLowerCase() === "active" ? "active" : "inactive";

            const row = `
                <tr>
                    <td style="font-weight: bold; color: var(--text-main);"><i class="fas fa-bus" style="color:var(--primary-color); margin-right:8px;"></i>Bus #${bId}</td>
                    <td style="font-family: monospace; font-size: 1rem;">${bNumber}</td>
                    <td><i class="fas fa-users" style="color:var(--text-muted); margin-right:5px;"></i>${bCapacity} Seats</td>
                    <td style="font-weight: 600;">${bDriver}</td>
                    <td><span class="status ${statusClass}">${bStatus}</span></td>
                    <td>
                        <i class="fas fa-edit" style="color:var(--text-muted); cursor:pointer; margin-right:15px; font-size:1.1rem; transition:0.3s;" onclick="openModal('editBusModal')" title="Edit Bus"></i>
                        <i class="fas fa-trash-alt delete-bus" data-id="${bId}" style="color:#ef4444; cursor:pointer; font-size:1.1rem; transition:0.3s;" title="Remove Bus"></i>
                    </td>
                </tr>
            `;
            busTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    // نشغل الدالة أول ما الصفحة تفتح
    fetchBuses();

    // ==========================================
    // 3. التفاعل مع البحث والمودال
    // ==========================================
    if (searchInput) {
        searchInput.addEventListener('input', (e) => { 
            const term = e.target.value.toLowerCase();
            const rows = busTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    window.openModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    };
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    };

    // فتح مودال إضافة باص
    const openAddBtn = document.getElementById('openAddBusModalBtn');
    if (openAddBtn) openAddBtn.onclick = () => openModal('addBusModal');

    // ==========================================
    // 4. إضافة باص جديد (POST API)
    // ==========================================
    const addBusForm = document.getElementById('addBusForm');
    
    if (addBusForm) {
        addBusForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // تأكد إن الـ IDs دي موجودة في الـ HTML بتاعك في نافذة الإضافة
            const numberInput = document.getElementById('busNumberInput').value;
            const capacityInput = document.getElementById('busCapacityInput').value;

            // الداتا اللي هتروح للسيرفر (غير الأسماء لو الباك إند طالب حاجة تانية)
            const newBusPayload = {
                BusNumber: numberInput,
                Capacity: parseInt(capacityInput)
            };

            Swal.fire({
                title: 'Saving Bus...',
                allowOutsideClick: false,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const response = await fetch('https://transit-way.runasp.net/api/Bus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBusPayload)
                });

                if (response.ok) {
                    closeModal('addBusModal');
                    addBusForm.reset();
                    await fetchBuses(); // ريفريش للجدول أوتوماتيك
                    Swal.fire({ icon: 'success', title: 'Bus Added!', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    const errorText = await response.text();
                    Swal.fire({ icon: 'error', title: 'Failed to Add', text: errorText, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Connection Error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        });
    }

    // ==========================================
    // 5. السحر: فتح مودال الـ Assign وملء السواقين والباصات لايف
    // ==========================================
    const openAssignBtn = document.getElementById('openAssignModalBtn');
    if (openAssignBtn) {
        openAssignBtn.onclick = async () => {
            const driverSelect = document.getElementById('assignDriverId');
            const busSelect = document.getElementById('assignBusId');

            if(driverSelect) driverSelect.innerHTML = '<option value="">Loading Drivers...</option>';
            if(busSelect) busSelect.innerHTML = '<option value="">Loading Buses...</option>';
            
            openModal('assignModal');

            // 1. جلب السواقين من API السواقين اللي عملناه الصفحة اللي فاتت
            try {
                const driversRes = await fetch('https://transit-way.runasp.net/api/Driver');
                if (driversRes.ok) {
                    const drivers = await driversRes.json();
                    if(driverSelect) {
                        driverSelect.innerHTML = '<option value="">Select Driver</option>';
                        drivers.forEach(d => {
                            const dName = d.fullName || d.FullName || d.name || "Unknown Driver";
                            const dId = d.id || d.Id;
                            if(dId) driverSelect.innerHTML += `<option value="${dId}">${dName} (ID: ${dId})</option>`;
                        });
                    }
                }
            } catch (error) {
                if(driverSelect) driverSelect.innerHTML = '<option value="">Error loading drivers</option>';
            }

            // 2. جلب الباصات من الـ API الجديد
            try {
                const busesRes = await fetch('https://transit-way.runasp.net/api/Bus');
                if (busesRes.ok) {
                    const buses = await busesRes.json();
                    if(busSelect) {
                        busSelect.innerHTML = '<option value="">Select Bus</option>';
                        buses.forEach(b => {
                            const bId = b.id || b.Id;
                            const bNum = b.busNumber || b.BusNumber || "No Plate";
                            if(bId) busSelect.innerHTML += `<option value="${bId}">Bus #${bId} (${bNum})</option>`;
                        });
                    }
                }
            } catch (error) {
                if(busSelect) busSelect.innerHTML = '<option value="">Error loading buses</option>';
            }
        };
    }

    // إرسال طلب الـ Assign
    const assignForm = document.getElementById('assignBusForm'); // تأكد إن ده الـ ID بتاع فورم الربط
    if (assignForm) {
        assignForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const driverIdStr = document.getElementById('assignDriverId').value;
            const busIdStr = document.getElementById('assignBusId').value;

            const assignPayload = {
                driverId: parseInt(driverIdStr), 
                busId: parseInt(busIdStr) 
            };

            Swal.fire({ title: 'Assigning...', allowOutsideClick: false, background: 'var(--bg-card)', color: 'var(--text-main)', didOpen: () => { Swal.showLoading(); } });

            try {
                // بنبعت على نفس لينك الربط اللي استخدمناه في صفحة السواقين
                const response = await fetch('https://transit-way.runasp.net/api/Driver/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignPayload)
                });

                if (response.ok) {
                    closeModal('assignModal');
                    assignForm.reset();
                    await fetchBuses(); // ريفريش لباصات
                    Swal.fire({ icon: 'success', title: 'Assigned Successfully!', timer: 2000, showConfirmButton: false, background: 'var(--bg-card)', color: 'var(--text-main)' });
                } else {
                    const errorText = await response.text();
                    Swal.fire({ icon: 'error', title: 'Assignment Failed', text: errorText, background: 'var(--bg-card)', color: 'var(--text-main)' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Connection Error', background: 'var(--bg-card)', color: 'var(--text-main)' });
            }
        });
    }

    // ==========================================
    // 6. حذف الباص (DELETE API)
    // ==========================================
    if (busTableBody) {
        busTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-bus')) {
                const busId = e.target.getAttribute('data-id');
                const row = e.target.closest('tr');

                Swal.fire({
                    title: 'Delete Bus?',
                    text: `Are you sure you want to remove Bus #${busId}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonText: 'Yes, delete it!'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
                        try {
                            const response = await fetch(`https://transit-way.runasp.net/api/Bus/${busId}`, { method: 'DELETE' });
                            if (response.ok) {
                                row.remove();
                                Swal.fire({ title: 'Deleted!', icon: 'success', background: 'var(--bg-card)', color: 'var(--text-main)' });
                            } else {
                                Swal.fire({ icon: 'error', title: 'Delete Failed', background: 'var(--bg-card)', color: 'var(--text-main)' });
                            }
                        } catch (error) {
                            Swal.fire({ icon: 'error', title: 'Connection Error', background: 'var(--bg-card)', color: 'var(--text-main)' });
                        }
                    }
                    // فتح مودال إضافة باص
                    const openAddBusBtn = document.getElementById('openAddBusModalBtn');
                    if (openAddBusBtn) {
                        openAddBusBtn.onclick = () => window.openModal('addBusModal');
                    } else {
                        console.warn("زرار إضافة باص مش موجود.. اتأكد إن الـ ID بتاعه في الـ HTML هو: openAddBusModalBtn");
                    }
                });
            }
        });
    }

});
