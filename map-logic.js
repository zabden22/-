document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Admin Name & Theme
    // ==========================================
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // ==========================================
    // 2. Map Tile Layer Definitions
    // ==========================================
    const TILE_LAYERS = {
        default: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://cartodb.com">CartoDB</a>',
            maxZoom: 19
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
            maxZoom: 19
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://cartodb.com">CartoDB</a>',
            maxZoom: 19
        },
        terrain: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        },
        traffic: {
            // OSM + Stadia Alidade smooth for traffic-feel look
            url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
            maxZoom: 19
        }
    };

    // ==========================================
    // 3. Initialize Map
    // ==========================================
    const map = L.map('map', { zoomControl: false }).setView([30.0691, 31.3381], 12);

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    let currentTileLayer = null;

    function applyTileLayer(layerKey) {
        const def = TILE_LAYERS[layerKey] || TILE_LAYERS.default;
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(def.url, {
            attribution: def.attribution,
            maxZoom: def.maxZoom
        }).addTo(map);
    }

    // Default based on site theme
    const defaultLayer = currentTheme === 'dark' ? 'dark' : 'default';
    applyTileLayer(defaultLayer);

    // Highlight the right button
    if (defaultLayer === 'dark') {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        const darkBtn = document.querySelector('[data-layer="dark"]');
        if (darkBtn) darkBtn.classList.add('active');
    }

    // Global switchLayer function (called from HTML)
    window.switchLayer = function(layerKey, btn) {
        applyTileLayer(layerKey);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    };

    // ==========================================
    // 4. Global State
    // ==========================================
    let allStations = [];
    let allRealBuses = [];
    let busMarkers = {};
    let routingControl = null;
    let heatLayer = null;
    let heatmapOn = false;
    let isSimulationActive = false; // true while route animation is running
    let realBusRouteMarkers = {};      // markers for real buses placed on routes (no GPS fallback)
    let realBusRouteIntervals = [];    // animation intervals for route-placed real buses
    let routeIdToZoneMap = {};         // numeric routeId → zone name mapping

    // ==========================================
    // 5. City-Based Color mapping
    // ==========================================
    const CITY_COLORS = {
        cairo: '#3b82f6',    // Blue
        shorouk: '#ef4444',  // Red
        badr: '#8b5cf6',     // Purple (Updated)
        madinaty: '#ff6b00', // Orange
        default: '#94a3b8'
    };

    const routeColorCache = {};
    let routeColorIndex = 0;
    const MAP_PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16']; // secondary palette

    function getBusColor(routeId, routeName, customColor) {
        if (customColor) return customColor;
        
        const rName = (routeName || "").toLowerCase();
        const rIdStr = String(routeId || "").toLowerCase();
        
        // Match by Name or Zone identifiers
        if (rName.includes('cairo') || rName.includes('ain shams') || rName.includes('asmarat')) return CITY_COLORS.cairo;
        if (rName.includes('shrouk') || rName.includes('shorouk') || rName.includes('شروق') || rName.includes('academy')) return CITY_COLORS.shorouk;
        if (rName.includes('badr') || rName.includes('بدر') || rName.includes('haram') || rName.includes('horeyya')) return CITY_COLORS.badr;
        if (rName.includes('madinaty') || rName.includes('madinty') || rName.includes('مدينتي') || rName.includes('مدينتى') || rName.includes('open air mall')) return CITY_COLORS.madinaty;

        // Fallback to rotating palette
        if (!routeId) return CITY_COLORS.default;
        if (!routeColorCache[routeId]) {
            routeColorCache[routeId] = MAP_PALETTE[routeColorIndex % MAP_PALETTE.length];
            routeColorIndex++;
        }
        return routeColorCache[routeId];
    }

    // ==========================================
    // 6. Helpers
    // ==========================================
    function getPropIgnoreCase(obj, propName) {
        if (!obj) return null;
        const key = Object.keys(obj).find(k => k.toLowerCase() === propName.toLowerCase());
        return key ? obj[key] : null;
    }

    // ==========================================
    // 7. Fetch & Render Stations
    // ==========================================
    async function fetchStationsAndInitMap() {
        const s1 = document.getElementById('startStationId');
        const s2 = document.getElementById('endStationId');

        try {
            const response = await fetch('https://transit-way.runasp.net/api/Stations');
            if (!response.ok) return;

            const data = await response.json();
            let fetchedStations = [];
            if (Array.isArray(data)) fetchedStations = data;
            else if (data && Array.isArray(data.$values)) fetchedStations = data.$values;
            else if (data && Array.isArray(data.data)) fetchedStations = data.data;

            allStations = fetchedStations.map(st => {
                let parsedLat = 0, parsedLng = 0;
                const latLongStr = getPropIgnoreCase(st, 'latlong');
                if (latLongStr && latLongStr.includes('&')) {
                    const parts = latLongStr.split('&');
                    parsedLat = parseFloat(parts[0].trim());
                    parsedLng = parseFloat(parts[1].trim());
                } else {
                    parsedLat = parseFloat(getPropIgnoreCase(st, 'latitude') ?? getPropIgnoreCase(st, 'lat') ?? 0);
                    parsedLng = parseFloat(getPropIgnoreCase(st, 'longitude') ?? getPropIgnoreCase(st, 'lng') ?? 0);
                }
                return {
                    id: getPropIgnoreCase(st, 'id'),
                    name: getPropIgnoreCase(st, 'name') ?? 'Unknown Station',
                    zone: getPropIgnoreCase(st, 'zone') ?? '',
                    routeId: getPropIgnoreCase(st, 'zone') || getPropIgnoreCase(st, 'routeId') || 'Unknown',
                    routeName: getPropIgnoreCase(st, 'zone') || getPropIgnoreCase(st, 'routeName') || 'Unknown',
                    lat: parsedLat,
                    lng: parsedLng
                };
            });

            if (s1) s1.innerHTML = '<option value="">Select Station</option>';
            if (s2) s2.innerHTML = '<option value="">Select Station</option>';

            let validStations = 0;
            allStations.forEach(st => {
                if (st.lat && st.lng && !isNaN(st.lat) && !isNaN(st.lng) && st.lat !== 0) {
                    validStations++;
                    // Colored circle marker
                    L.circleMarker([st.lat, st.lng], {
                        radius: 7, color: '#fff', weight: 2,
                        fillOpacity: 1, fillColor: '#568e74'
                    }).addTo(map).bindPopup(`
                        <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:140px;">
                            <b style="color:#568e74; font-size:14px;"><i class="fas fa-map-marker-alt"></i> ${st.name}</b>
                            <div style="font-size:12px; color:#64748b; margin-top:4px;">
                                <i class="fas fa-location-arrow"></i> ${st.lat.toFixed(4)}, ${st.lng.toFixed(4)}
                            </div>
                        </div>`);

                    const opt = `<option value="${st.id}">${st.name}</option>`;
                    if (s1) s1.innerHTML += opt;
                    if (s2) s2.innerHTML += opt;
                }
            });

            // Update stats
            const statEl = document.getElementById('statStations');
            if (statEl) statEl.innerText = `${validStations} Stations`;

            // Build initial heatmap data (will be updated by syncFleet too)
            buildHeatmap();

            // Draw route lines connecting stations for each route INDEPENDENTLY
            const routeGroups = {};
            allStations.forEach(st => {
                if (st.lat && st.lng && st.routeId != null) {
                    const rId = String(st.routeId);
                    if (!routeGroups[rId]) routeGroups[rId] = { id: st.routeId, name: st.routeName, stations: [] };
                    routeGroups[rId].stations.push(st);
                }
            });

            // Each route draws its own separate polyline — split at large gaps to avoid cross-route lines
            // Each route draws its own separate polyline — using OSRM for real road path
            const routeIds = Object.keys(routeGroups);
            
            // Process routes sequentially to avoid rate limiting
            for (const rId of routeIds) {
                const rt = routeGroups[rId];
                if (rt.stations.length > 1) {
                    const color = getBusColor(rt.id, rt.name, null);
                    
                    // Split into segments if stations are too far (e.g. across cities)
                    let currentSegment = [rt.stations[0]];
                    for (let i = 1; i < rt.stations.length; i++) {
                        const prev = rt.stations[i - 1];
                        const curr = rt.stations[i];
                        const dist = Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2));
                        
                        if (dist > 0.08) { // Threshold for jumping across cities
                            if (currentSegment.length > 1) await drawOSRMRoute(currentSegment, color);
                            currentSegment = [curr];
                        } else {
                            currentSegment.push(curr);
                        }
                    }
                    if (currentSegment.length > 1) await drawOSRMRoute(currentSegment, color);
                }
            }

            async function drawOSRMRoute(stations, color) {
                try {
                    const coords = stations.map(s => `${s.lng},${s.lat}`).join(';');
                    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.code === 'Ok' && data.routes?.length > 0) {
                        const geometry = data.routes[0].geometry;
                        // Main line
                        L.geoJSON(geometry, {
                            style: { color, weight: 4, opacity: 0.65, dashArray: '8, 8', lineJoin: 'round' }
                        }).addTo(map);
                        // Glow line
                        L.geoJSON(geometry, {
                            style: { color, weight: 10, opacity: 0.15, lineCap: 'round' }
                        }).addTo(map);
                    } else {
                        throw new Error('OSRM fallback');
                    }
                } catch (e) {
                    // Fallback to straight lines if OSRM fails
                    L.polyline(stations.map(s => [s.lat, s.lng]), {
                        color, weight: 4, opacity: 0.5, dashArray: '10, 10', lineJoin: 'round'
                    }).addTo(map);
                }
            }

        } catch (error) {
            console.error('Fetch Stations Error:', error);
        }
    }

    // ==========================================
    // 8. Heatmap
    // ==========================================
    function buildHeatmap() {
        if (allStations.length === 0) return;

        // Generate heatmap points: stations weighted by how many buses are nearby
        const heatPoints = allStations
            .filter(st => st.lat && st.lng && st.lat !== 0)
            .map(st => {
                // Count how many buses are within ~0.01 deg of this station
                const nearbyBuses = allRealBuses.filter(b => {
                    if (!b._simBase) return false;
                    const dlat = (b._simBase[0] || 0) - st.lat;
                    const dlng = (b._simBase[1] || 0) - st.lng;
                    return Math.sqrt(dlat * dlat + dlng * dlng) < 0.02;
                }).length;

                // Add some randomness to make it look realistic
                const intensity = 0.2 + nearbyBuses * 0.4 + Math.random() * 0.3;
                return [st.lat, st.lng, Math.min(intensity, 1.0)];
            });

        // Add extra points around Cairo center for demo realism
        const extraHotspots = [
            [30.0691, 31.3381, 0.8],  // El Saa'a Sq
            [30.0626, 31.2497, 0.7],  // Tahrir
            [30.0459, 31.2243, 0.6],  // Giza Sq
            [30.0880, 31.3339, 0.9],  // Heliopolis
            [30.0762, 31.3264, 0.75], // Nasr City
            [30.0215, 31.3441, 0.65], // Maadi
        ];
        const allHeatPoints = [...heatPoints, ...extraHotspots];

        if (heatLayer) map.removeLayer(heatLayer);

        heatLayer = L.heatLayer(allHeatPoints, {
            radius: 35,
            blur: 25,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: '#22c55e',  // green  = low traffic
                0.4: '#f59e0b',  // amber  = moderate
                0.7: '#ef4444',  // red    = heavy
                1.0: '#7f1d1d'   // dark red = extreme
            }
        });

        // Only add if toggle is on
        if (heatmapOn) heatLayer.addTo(map);

        // Update crowded stations count
        const crowded = heatPoints.filter(p => p[2] > 0.5).length + extraHotspots.filter(p => p[2] > 0.6).length;
        const statCrowded = document.getElementById('statCrowded');
        if (statCrowded) statCrowded.innerText = `${crowded} Crowded Stations`;
    }

    window.toggleHeatmap = function() {
        const btn = document.getElementById('heatToggle');
        heatmapOn = !heatmapOn;
        if (heatmapOn) {
            buildHeatmap();
            if (heatLayer) heatLayer.addTo(map);
            if (btn) btn.classList.add('on');
        } else {
            if (heatLayer) map.removeLayer(heatLayer);
            if (btn) btn.classList.remove('on');
        }
    };

    window.toggleFullMap = function() {
        const btn = document.getElementById('fullScreenToggle');
        const isFull = document.body.classList.toggle('full-map-mode');
        if (btn) btn.classList.toggle('active', isFull);
        
        // Trigger map resize to fix layout issues
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 300);
    };

    // ==========================================
    // 9. Fetch Real Buses
    // ==========================================
    async function fetchRealBuses() {
        try {
            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const [resPrimary, resAdmin] = await Promise.allSettled([
                fetch('https://transit-way.runasp.net/api/Bus', { headers }),
                fetch('https://transit-way.runasp.net/api/admin/buses', { headers })
            ]);

            async function extract(res) {
                if (res.status !== 'fulfilled' || !res.value.ok) return [];
                const data = await res.value.json();
                if (Array.isArray(data)) return data;
                return data.$values || data.value || data.data || [];
            }

            const primaryBuses = await extract(resPrimary);
            const adminBuses   = await extract(resAdmin);

            const adminMap = {};
            adminBuses.forEach(item => {
                const loc = item.latestLocation || item;
                if (loc && loc.busId) adminMap[loc.busId] = loc;
            });

            allRealBuses = primaryBuses.map(pb => {
                const live = adminMap[pb.id];
                return {
                    ...pb,
                    latitude: live?.latitude || pb.latitude || pb.lat || 0,
                    longitude: live?.longitude || pb.longitude || pb.lng || 0,
                    speed: live?.speed ?? pb.speed ?? 0,
                    status: live?.status || pb.status || 'Active'
                };
            });

            // Add any admin-only buses
            Object.keys(adminMap).forEach(id => {
                if (!allRealBuses.find(b => b.id == id)) {
                    const live = adminMap[id];
                    allRealBuses.push({
                        id: live.busId,
                        busNumber: live.busNumber || `Bus #${live.busId}`,
                        latitude: live.latitude,
                        longitude: live.longitude,
                        speed: live.speed,
                        status: 'Active'
                    });
                }
            });

        } catch (e) {
            console.error('Fetch Buses Error:', e);
        }
    }

    // ==========================================
    // 10. Sync Fleet (live movement simulation)
    // ==========================================
    async function syncFleet() {
        if (allRealBuses.length === 0) return;
        // Don't update fleet markers while route simulation is playing
        if (isSimulationActive) return;

        let activeCount = 0;

        allRealBuses.forEach(item => {
            // The API returns objects with a 'latestLocation' property
            const bus = item.latestLocation || item;
            const bId = getPropIgnoreCase(bus, 'busId') || getPropIgnoreCase(bus, 'id');
            if (!bId) return;

            const bNum    = getPropIgnoreCase(bus, 'busNumber') ?? getPropIgnoreCase(bus, 'plateNumber') ?? bId;
            const bRouteName = getPropIgnoreCase(bus, 'routeName') ?? getPropIgnoreCase(bus, 'route') ?? 'N/A';
            const bRouteId  = getPropIgnoreCase(bus, 'routeId')   ?? getPropIgnoreCase(bus, 'route_id') ?? 'N/A';
            const bDriver = getPropIgnoreCase(bus, 'driverName') ?? 'No Driver';
            const bPlate  = getPropIgnoreCase(bus, 'plateNumber') ?? 'N/A';
            const bStatus = getPropIgnoreCase(bus, 'status')    ?? 'Active';
            
            // Determine color based on city line
            const color = getBusColor(bRouteId, bRouteName, bus.customColor || null);

            if (bStatus.toLowerCase() === 'active') activeCount++;

            // Use real GPS coordinates from the latestLocation object
            const lat = getPropIgnoreCase(bus, 'latitude') || getPropIgnoreCase(bus, 'lat') || 0;
            const lng = getPropIgnoreCase(bus, 'longitude') || getPropIgnoreCase(bus, 'lng') || 0;
            const speed = getPropIgnoreCase(bus, 'speed') || 0;

            if (!lat || !lng || lat === 0) return; // Skip buses without location data

            // Popup HTML
            const popupHtml = `
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:190px;">
                    <h4 style="color:${color}; margin:0 0 10px; font-size:15px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="fas fa-bus"></i> Bus #${bNum}
                    </h4>
                    <div style="font-size:13px; line-height:1.9;">
                        <b><i class="fas fa-route" style="color:#8b5cf6;"></i> Route:</b> ${bRouteName}<br>
                        <b><i class="fas fa-id-card" style="color:#3b82f6;"></i> Plate:</b> ${bPlate}<br>
                        <b><i class="fas fa-user-tie" style="color:#f59e0b;"></i> Driver:</b> ${bDriver}<br>
                        <b><i class="fas fa-tachometer-alt" style="color:#ef4444;"></i> Speed:</b> ${speed} km/h<br>
                        <b><i class="fas fa-circle" style="color:${color};"></i> Status:</b> <b>${bStatus}</b>
                    </div>
                </div>`;

            if (busMarkers[bId]) {
                busMarkers[bId].setLatLng([lat, lng]).getPopup().setContent(popupHtml);
                // Update icon colors
                const el = busMarkers[bId].getElement();
                if (el) {
                    const pulse = el.querySelector('.bus-pulse');
                    const busIcon = el.querySelector('.fa-bus');
                    const label  = el.querySelector('.bus-id-label');
                    if (pulse)   pulse.style.background = color;
                    if (busIcon) busIcon.style.color = color;
                    if (label)   { label.style.background = color; }
                }
            } else {
                const divIcon = L.divIcon({
                    className: 'bus-marker-icon',
                    html: `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                            <div class="bus-id-label" style="
                                background:${color};color:#fff;
                                font-size:10px;font-weight:900;
                                padding:2px 8px;border-radius:8px;
                                box-shadow:0 2px 6px rgba(0,0,0,0.25);
                                font-family:'Plus Jakarta Sans',sans-serif;
                                white-space:nowrap;
                            ">#${bId}</div>
                            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-bus" style="color:${color};font-size:22px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                            </div>
                        </div>`,
                    iconSize: [50, 58],
                    iconAnchor: [25, 58]
                });
                busMarkers[bId] = L.marker([lat, lng], { icon: divIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);
            }
        });

        // Update live stats
        const statActive = document.getElementById('statActiveBuses');
        if (statActive) statActive.innerText = activeCount;

        // Refresh heatmap every sync if on
        if (heatmapOn) buildHeatmap();
    }

    // ==========================================
    // 10a. Place Real Buses on Routes (no-GPS fallback)
    // ==========================================
    async function buildRouteZoneMap() {
        try {
            const res = await fetch('https://transit-way.runasp.net/api/Routes');
            if (!res.ok) return;
            const routes = await res.json();
            const arr = Array.isArray(routes) ? routes : (routes.$values || []);
            arr.forEach(r => { routeIdToZoneMap[r.id] = (r.zone || '').toLowerCase().trim(); });
        } catch(e) { console.warn('Could not fetch routes for zone mapping:', e); }
    }

    async function placeRealBusesOnRoutes() {
        // Clear previous
        realBusRouteIntervals.forEach(id => clearInterval(id));
        realBusRouteIntervals = [];
        Object.values(realBusRouteMarkers).forEach(m => { try { map.removeLayer(m); } catch(e){} });
        realBusRouteMarkers = {};

        if (isGlobalSimulationActive || isSimulationActive) return;

        let placed = 0;
        for (const bus of allRealBuses) {
            const lat = bus.latitude || bus.lat || 0;
            const lng = bus.longitude || bus.lng || 0;
            if (lat && lng && lat !== 0) continue; // syncFleet handles GPS buses

            const routeId = bus.routeId || bus.route_id;
            if (!routeId) continue;

            const zone = routeIdToZoneMap[routeId];
            if (!zone) continue;

            // Match stations by zone
            const routeStations = allStations.filter(st =>
                (st.routeId || '').toLowerCase().trim() === zone ||
                (st.zone || '').toLowerCase().trim() === zone
            );
            if (routeStations.length < 1) continue;

            const routeName = routeStations[0]?.routeName || routeStations[0]?.zone || '';
            const color = getBusColor(routeId, routeName, null);

            // Park the bus at the FIRST station of its route (no movement)
            const firstStation = routeStations[0];
            if (!firstStation || !firstStation.lat || !firstStation.lng) continue;

            const bId = bus.id, bNum = bus.busNumber || bus.plateNumber || bId;
            const bDriver = bus.driverName || 'No Driver';
            const bPlate = bus.plateNumber || 'N/A';

            const popupHtml = `
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:190px;">
                    <h4 style="color:${color}; margin:0 0 10px; font-size:15px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="fas fa-bus"></i> Bus #${bNum}
                    </h4>
                    <div style="font-size:13px; line-height:1.9;">
                        <b><i class="fas fa-route" style="color:#8b5cf6;"></i> Route:</b> ${routeName}<br>
                        <b><i class="fas fa-id-card" style="color:#3b82f6;"></i> Plate:</b> ${bPlate}<br>
                        <b><i class="fas fa-user-tie" style="color:#f59e0b;"></i> Driver:</b> ${bDriver}<br>
                        <b><i class="fas fa-map-marker-alt" style="color:#22c55e;"></i> Station:</b> ${firstStation.name}<br>
                        <b><i class="fas fa-circle" style="color:${color};"></i> Status:</b> <b>Parked</b>
                    </div>
                </div>`;

            const icon = L.divIcon({
                className: 'bus-marker-icon',
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div class="bus-id-label" style="
                            background:${color};color:#fff;
                            font-size:10px;font-weight:900;
                            padding:2px 8px;border-radius:8px;
                            box-shadow:0 2px 6px rgba(0,0,0,0.25);
                            font-family:'Plus Jakarta Sans',sans-serif;
                            white-space:nowrap;
                        ">#${bId}</div>
                        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-bus" style="color:${color};font-size:22px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                        </div>
                    </div>`,
                iconSize: [50, 58],
                iconAnchor: [25, 58]
            });

            // Place marker at first station — NO animation interval
            const marker = L.marker([firstStation.lat, firstStation.lng], { icon }).addTo(map).bindPopup(popupHtml);
            realBusRouteMarkers[bId] = marker;
            placed++;
        }

        // Update active bus count
        const statActive = document.getElementById('statActiveBuses');
        if (statActive && placed > 0) statActive.innerText = placed + Object.keys(busMarkers).length;
        console.log(`Parked ${placed} real buses at their first station`);
    }

    // ==========================================
    // 10b. Fetch Real Stats (APIs)
    // ==========================================
    async function fetchRealStats() {
        try {
            const [busRes, stRes, rtRes, drRes] = await Promise.allSettled([
                fetch('https://transit-way.runasp.net/api/Bus'),
                fetch('https://transit-way.runasp.net/api/Stations'),
                fetch('https://transit-way.runasp.net/api/Routes'),
                fetch('https://transit-way.runasp.net/api/Driver')
            ]);

            const getCount = async (res) => {
                if (res.status !== 'fulfilled' || !res.value.ok) return '—';
                const d = await res.value.json();
                const arr = d.$values || d;
                return Array.isArray(arr) ? arr.length : '—';
            };

            const [buses, stations, routes, drivers] = await Promise.all([
                getCount(busRes), getCount(stRes), getCount(rtRes), getCount(drRes)
            ]);

            const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            set('statActiveBuses', buses);
            set('statTotalStations', stations);
            set('statTotalRoutes', routes);
            set('statTotalDrivers', drivers);
        } catch (e) {
            console.warn('Stats fetch error:', e);
        }
    }

    // ==========================================
    // 11. Route Tracking — Animated Dual Buses
    // ==========================================

    // State for animated route buses
    let routeBusMarkers = [];
    let routeAnimIntervals = [];
    let routePolyline = null;

    /** Hide all fleet bus markers from map */
    function hideFleet() {
        Object.values(busMarkers).forEach(m => {
            try { map.removeLayer(m); } catch(e) {}
        });
    }

    /** Restore all fleet bus markers back to map */
    function showFleet() {
        Object.values(busMarkers).forEach(m => {
            try { map.addLayer(m); } catch(e) {}
        });
    }

    /** Remove all previous route-specific objects + restore fleet */
    function clearRouteAnimation() {
        routeAnimIntervals.forEach(id => clearInterval(id));
        routeAnimIntervals = [];
        routeBusMarkers.forEach(m => { try { map.removeLayer(m); } catch(e) {} });
        routeBusMarkers = [];
        if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
        if (routingControl) { map.removeControl(routingControl); routingControl = null; }

        // Restore fleet & update state
        isSimulationActive = false;
        showFleet();
        const banner = document.getElementById('simBanner');
        if (banner) banner.style.display = 'none';
    }

    window.stopRouteSimulation = function() { clearRouteAnimation(); };

    /** Build a Leaflet DivIcon for a route bus */
    function makeRouteBusIcon(color, label) {
        return L.divIcon({
            className: 'bus-marker-icon',
            html: `
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                    <div style="
                        background:${color};color:#fff;
                        font-size:10px;font-weight:900;
                        padding:2px 8px;border-radius:8px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.3);
                        font-family:'Plus Jakarta Sans',sans-serif;
                        white-space:nowrap;
                        border:1px solid rgba(255,255,255,0.4);
                    ">${label}</div>
                    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                        <div class="bus-pulse" style="background:${color};"></div>
                        <i class="fas fa-bus" style="color:${color};font-size:20px;z-index:2;position:relative;text-shadow:0 0 6px rgba(255,255,255,0.9);"></i>
                    </div>
                </div>`,
            iconSize: [54, 56],
            iconAnchor: [27, 56]
        });
    }

    /**
     * Animate a single bus along an array of L.LatLng coords.
     * stepMs = milliseconds between each step
     * reverse = if true, walk coords backwards
     */
    function animateBusAlongRoute(coords, color, label, popupHtml, stepMs, reverse) {
        const path = reverse ? [...coords].reverse() : [...coords];
        let idx = 0;

        const marker = L.marker(path[0], { icon: makeRouteBusIcon(color, label) })
            .addTo(map)
            .bindPopup(popupHtml);
        routeBusMarkers.push(marker);

        const ivl = setInterval(() => {
            idx = (idx + 1) % path.length;   // loop endlessly
            marker.setLatLng(path[idx]);
        }, stepMs);
        routeAnimIntervals.push(ivl);

        return marker;
    }

    const searchBtn = document.getElementById('searchRouteBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async function () {
            const sId = parseInt(document.getElementById('startStationId').value);
            const eId = parseInt(document.getElementById('endStationId').value);

            if (!sId || !eId) {
                Swal.fire('Warning', 'Please select both Departure and Destination stations.', 'warning');
                return;
            }
            if (sId === eId) {
                Swal.fire('Warning', 'Cannot select the same station for both!', 'warning');
                return;
            }

            const st1 = allStations.find(s => s.id === sId);
            const st2 = allStations.find(s => s.id === eId);

            if (!st1 || !st2) {
                Swal.fire('Error', 'Station coordinates are missing.', 'error');
                return;
            }

            // Clear any previous route animation
            clearRouteAnimation();

            // Hide fleet buses & mark simulation active
            isSimulationActive = true;
            hideFleet();
            const banner = document.getElementById('simBanner');
            if (banner) banner.style.display = 'flex';

            // Build waypoints passing through all stations on the same route between st1 and st2
            let waypoints = [];
            if (st1.routeId && st1.routeId === st2.routeId) {
                // If they belong to the same route, get all stations of this route
                const routeSts = allStations.filter(s => s.routeId === st1.routeId);
                const idx1 = routeSts.findIndex(s => s.id === st1.id);
                const idx2 = routeSts.findIndex(s => s.id === st2.id);
                if (idx1 !== -1 && idx2 !== -1) {
                    const startIdx = Math.min(idx1, idx2);
                    const endIdx = Math.max(idx1, idx2);
                    const subset = routeSts.slice(startIdx, endIdx + 1);
                    // if st1 was after st2, we reverse so it starts from st1
                    if (idx1 > idx2) subset.reverse();
                    
                    waypoints = subset.map(s => L.latLng(s.lat, s.lng));
                }
            }
            
            // Fallback to simple direct routing if they don't match or aren't found
            if (waypoints.length === 0) {
                waypoints = [L.latLng(st1.lat, st1.lng), L.latLng(st2.lat, st2.lng)];
            }

            // ── Draw blue route line via Routing Machine ──
            routingControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                addWaypoints: false,
                show: false,
                lineOptions: {
                    styles: [
                        { color: '#ffffff', opacity: 0.4, weight: 11 }, // white glow
                        { color: '#3b82f6', opacity: 0.95, weight: 7 }  // blue line
                    ]
                },
                createMarker: function () { return null; }
            }).addTo(map);

            // ── Station endpoint markers ──
            const stationIcon = (name, color) => L.divIcon({
                className: '',
                html: `<div style="
                    background:${color};color:#fff;
                    font-size:11px;font-weight:800;
                    padding:5px 10px;border-radius:10px;
                    box-shadow:0 3px 10px rgba(0,0,0,0.25);
                    white-space:nowrap;
                    font-family:'Plus Jakarta Sans',sans-serif;
                "><i class="fas fa-map-marker-alt"></i> ${name}</div>`,
                iconAnchor: [0, 0]
            });

            const m1 = L.marker([st1.lat, st1.lng], { icon: stationIcon(st1.name, '#3b82f6') }).addTo(map);
            const m2 = L.marker([st2.lat, st2.lng], { icon: stationIcon(st2.name, '#ef4444') }).addTo(map);
            routeBusMarkers.push(m1, m2);

            // ── Wait for route coordinates, then animate 2 buses ──
            routingControl.on('routesfound', function (e) {
                const coords = e.routes[0].coordinates; // array of L.LatLng
                map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });

                // ── Bus A: from st1 → st2 (forward) ──
                const popupA = `
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
                        <h4 style="color:#3b82f6;margin:0 0 8px;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                            <i class="fas fa-bus"></i> Route Bus A
                        </h4>
                        <div style="font-size:12px;line-height:1.8;">
                            <b>Direction:</b> ${st1.name} → ${st2.name}<br>
                            <b>Status:</b> <span style="color:#22c55e;font-weight:800;">Moving ▶</span>
                        </div>
                    </div>`;

                // ── Bus B: from st2 → st1 (reverse) ──
                const popupB = `
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
                        <h4 style="color:#ef4444;margin:0 0 8px;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                            <i class="fas fa-bus"></i> Route Bus B
                        </h4>
                        <div style="font-size:12px;line-height:1.8;">
                            <b>Direction:</b> ${st2.name} → ${st1.name}<br>
                            <b>Status:</b> <span style="color:#22c55e;font-weight:800;">Moving ◀</span>
                        </div>
                    </div>`;

                // Bus A: forward, step every 80ms
                animateBusAlongRoute(coords, '#3b82f6', '🚌 A', popupA, 80, false);
                // Bus B: reverse, step every 90ms (slightly different speed for realism)
                animateBusAlongRoute(coords, '#ef4444', '🚌 B', popupB, 90, true);
            });

            // Also try the API (optional, doesn't block the route draw)
            try {
                const res = await fetch('https://transit-way.runasp.net/api/UserTrip/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startStationId: sId, endStationId: eId })
                });
                if (!res.ok) console.info('UserTrip search:', await res.text());
            } catch (e) {
                console.warn('UserTrip endpoint not available:', e.message);
            }
        });
    }

    
    // ==========================================
    // GLOBAL SIMULATION STATE & TOGGLE
    // ==========================================
    let isGlobalSimulationActive = false;
    let globalSimBuses = [];
    let globalSimIntervals = [];

    window.toggleSimulation = function() {
        const btn = document.getElementById('toggleSimBtn');
        isGlobalSimulationActive = !isGlobalSimulationActive;
        isSimulationActive = isGlobalSimulationActive; // sync with existing flag
        
        if (isGlobalSimulationActive) {
            if (btn) {
                btn.classList.add('paused');
                btn.innerHTML = '<i class="fas fa-pause-circle"></i><span>Simulation OFF</span>';
            }
            
            // Hide real buses (GPS-based)
            Object.values(busMarkers).forEach(m => { try { map.removeLayer(m); } catch(e){} });
            busMarkers = {};
            // Hide real buses (route-animated)
            realBusRouteIntervals.forEach(id => clearInterval(id));
            realBusRouteIntervals = [];
            Object.values(realBusRouteMarkers).forEach(m => { try { map.removeLayer(m); } catch(e){} });
            realBusRouteMarkers = {};

            startGlobalSimulation();
        } else {
            if (btn) {
                btn.classList.remove('paused');
                btn.innerHTML = '<i class="fas fa-play-circle"></i><span>Simulation ON</span>';
            }
            
            stopGlobalSimulation();
            syncFleet(); // Restore GPS buses
            placeRealBusesOnRoutes(); // Restore route-animated real buses
        }
    };

    function interpolatePoints(points, maxDist = 0.0002) {
        if (points.length < 2) return points;
        const interpolated = [];
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dist = Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2));
            const steps = Math.max(1, Math.ceil(dist / maxDist));
            for (let j = 0; j < steps; j++) {
                interpolated.push(L.latLng(
                    p1.lat + (p2.lat - p1.lat) * (j / steps),
                    p1.lng + (p2.lng - p1.lng) * (j / steps)
                ));
            }
        }
        interpolated.push(points[points.length - 1]);
        return interpolated;
    }

    async function startGlobalSimulation() {
        const routeGroups = {};
        allStations.forEach(st => {
            if (st.lat && st.lng && st.routeId != null) {
                const rId = String(st.routeId);
                if (!routeGroups[rId]) routeGroups[rId] = { id: st.routeId, name: st.routeName || 'Route '+st.routeId, stations: [] };
                routeGroups[rId].stations.push(st);
            }
        });

        const routesToSimulate = Object.values(routeGroups);
        
        for (const route of routesToSimulate) {
            if (route.stations.length < 2) continue;

            const rName = (route.name || '').toLowerCase();
            let routeColor = null;
            
            if (rName.includes('shrouk') || rName.includes('shorouk') || rName.includes('academy')) {
                routeColor = CITY_COLORS.shorouk;
            } else if (rName.includes('madinaty') || rName.includes('madinty') || rName.includes('open air mall')) {
                routeColor = CITY_COLORS.madinaty;
            } else if (rName.includes('cairo') || rName.includes('ain shams') || rName.includes('asmarat')) {
                routeColor = CITY_COLORS.cairo;
            } else if (rName.includes('badr') || rName.includes('haram') || rName.includes('horeyya')) {
                routeColor = CITY_COLORS.badr;
            } else {
                continue;
            }
            
            // Find the main valid segment
            let bestSegment = [];
            let currentSegment = [route.stations[0]];
            
            for (let i = 1; i < route.stations.length; i++) {
                const prev = route.stations[i - 1];
                const curr = route.stations[i];
                const dist = Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2));
                
                if (dist > 0.08) {
                    if (currentSegment.length > bestSegment.length) bestSegment = currentSegment;
                    currentSegment = [curr];
                } else {
                    currentSegment.push(curr);
                }
            }
            if (currentSegment.length > bestSegment.length) bestSegment = currentSegment;

            if (bestSegment.length < 2) continue;

            // Fetch OSRM path for simulation to follow roads exactly
            try {
                const osrmCoords = bestSegment.map(s => `${s.lng},${s.lat}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.code === 'Ok' && data.routes?.length > 0) {
                    const geometry = data.routes[0].geometry.coordinates;
                    const latLngs = geometry.map(c => L.latLng(c[1], c[0]));
                    // Interpolate for smoother movement
                    const interpolatedCoords = interpolatePoints(latLngs, 0.0001);
                    spawnSimulatedBusesForRoute(route, routeColor, interpolatedCoords);
                } else {
                    throw new Error('OSRM fail');
                }
            } catch (e) {
                // Fallback to straight lines
                const coords = bestSegment.map(s => L.latLng(s.lat, s.lng));
                const interpolatedCoords = interpolatePoints(coords, 0.0002);
                spawnSimulatedBusesForRoute(route, routeColor, interpolatedCoords);
            }
        }
    }

    function stopGlobalSimulation() {
        globalSimIntervals.forEach(id => clearInterval(id));
        globalSimIntervals = [];
        globalSimBuses.forEach(m => { try { map.removeLayer(m); } catch(e){} });
        globalSimBuses = [];
    }

    function spawnSimulatedBusesForRoute(route, color, coords) {
        const busesCount = 3;
        for (let i = 0; i < busesCount; i++) {
            const startIdx = Math.floor((coords.length / busesCount) * i);
            let idx = startIdx;
            
            const icon = L.divIcon({
                className: 'bus-marker-icon bus-no-pulse',
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="background:${color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.25);">SIM - ${route.name}</div>
                        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-bus" style="color:${color};font-size:20px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                        </div>
                    </div>`,
                iconSize: [54, 56],
                iconAnchor: [27, 56]
            });
            
            const marker = L.marker(coords[idx] || coords[0], { icon }).addTo(map);
            globalSimBuses.push(marker);
            
            const stepMs = 100 + Math.random() * 50; 
            const ivl = setInterval(() => {
                idx = (idx + 1) % coords.length;
                marker.setLatLng(coords[idx]);
            }, stepMs);
            globalSimIntervals.push(ivl);
        }
    }


    // ==========================================
    // 12. Initialize
    // ==========================================
    fetchStationsAndInitMap().then(() => {
        fetchRealStats();
        buildRouteZoneMap().then(() => {
            fetchRealBuses().then(() => {
                syncFleet();
                placeRealBusesOnRoutes(); // Place real buses on routes (no-GPS fallback)
                setInterval(syncFleet, 4000);
                // Refresh real stats every 60s
                setInterval(fetchRealStats, 60000);
            });
        });
    });

});