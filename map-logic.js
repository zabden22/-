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

    // ==========================================
    // 5. City-Based Color mapping
    // ==========================================
    const CITY_COLORS = {
        cairo: '#3b82f6',    // Blue
        shorouk: '#ef4444',  // Red
        badr: '#10b981',     // Green
        madinaty: '#f59e0b', // Orange
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
        if (rName.includes('cairo') || rName.includes('قاهره') || rName.includes('قاهرة')) return CITY_COLORS.cairo;
        if (rName.includes('shorouk') || rName.includes('شروق')) return CITY_COLORS.shorouk;
        if (rName.includes('badr') || rName.includes('بدر')) return CITY_COLORS.badr;
        if (rName.includes('madinaty') || rName.includes('مدينتي') || rName.includes('مدينتى')) return CITY_COLORS.madinaty;

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
                    routeId: getPropIgnoreCase(st, 'routeId') ?? getPropIgnoreCase(st, 'route_id') ?? 1,
                    routeName: getPropIgnoreCase(st, 'routeName') ?? getPropIgnoreCase(st, 'route') ?? '',
                    zone: getPropIgnoreCase(st, 'zone') ?? '',
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
            Object.keys(routeGroups).forEach(rId => {
                const rt = routeGroups[rId];
                if (rt.stations.length > 1) {
                    const color = getBusColor(rt.id, rt.name, null);
                    // Split into segments: if distance between consecutive stations > 0.05 deg (~5km), break the line
                    let segment = [rt.stations[0]];
                    for (let i = 1; i < rt.stations.length; i++) {
                        const prev = rt.stations[i - 1];
                        const curr = rt.stations[i];
                        const dist = Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2));
                        if (dist > 0.05) {
                            // Draw current segment if it has 2+ points
                            if (segment.length > 1) {
                                L.polyline(segment.map(s => [s.lat, s.lng]), {
                                    color, weight: 4, opacity: 0.6, dashArray: '10, 10', lineJoin: 'round'
                                }).addTo(map);
                            }
                            segment = [curr]; // start new segment
                        } else {
                            segment.push(curr);
                        }
                    }
                    // Draw the last segment
                    if (segment.length > 1) {
                        L.polyline(segment.map(s => [s.lat, s.lng]), {
                            color, weight: 4, opacity: 0.6, dashArray: '10, 10', lineJoin: 'round'
                        }).addTo(map);
                    }
                }
            });

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
    const PREDEFINED_ROUTES = [
        { id: 'R1', name: "Ain Shams Housing Bus Station- Al Asmarat", startStr: "Ain Shams", endStr: "Al Asmarat", color: "#3b82f6", numBuses: 3 },
        { id: 'R2', name: "El Shrouk Sports Clup- El Shrouk Academy", startStr: "Shorouk", endStr: "Academy", color: "#ef4444", numBuses: 3 },
        { id: 'R3', name: "Madinaty Main Station- Open Air Mall", startStr: "Madinaty", endStr: "Open Air Mall", color: "#f59e0b", numBuses: 3 },
        { id: 'R4', name: "El Haram Square- Al Horeyya Rd", startStr: "Haram", endStr: "Horeyya", color: "#8b5cf6", numBuses: 3 }
    ];

    async function fetchRealBuses() {
        try {
            const res = await fetch('https://transit-way.runasp.net/api/Bus');
            if (res.ok) {
                const data = await res.json();
                allRealBuses = data.$values || data || [];
            }
        } catch (e) {
            console.error('Fetch Buses Error:', e);
        }

        // Demo buses representing the 1 real bus connected to API per route
        const demoBuses = PREDEFINED_ROUTES.map((r, i) => ({
            id: `REAL_${r.id}`, busnumber: `API-${i+1}`, routeid: r.id, routeName: r.name, drivername: `API Driver ${i+1}`, platenumber: `API-${i+1}00`, status: 'Active', customColor: r.color
        }));
        demoBuses.forEach(vb => allRealBuses.push(vb));
    }

    // ==========================================
    // 10. Sync Fleet (live movement simulation)
    // ==========================================
    async function syncFleet() {
        if (allRealBuses.length === 0) return;
        // Don't update fleet markers while route simulation is playing
        if (isSimulationActive) return;

        let activeCount = 0;

        allRealBuses.forEach(bus => {
            const bId     = getPropIgnoreCase(bus, 'id');
            if (!bId) return;

            const bNum    = getPropIgnoreCase(bus, 'busnumber') ?? getPropIgnoreCase(bus, 'platenumber') ?? bId;
            const bRouteName = getPropIgnoreCase(bus, 'routeName') ?? getPropIgnoreCase(bus, 'route') ?? 'N/A';
            const bRouteId  = getPropIgnoreCase(bus, 'routeId')   ?? getPropIgnoreCase(bus, 'route_id') ?? 'N/A';
            const bDriver = getPropIgnoreCase(bus, 'drivername') ?? 'No Driver';
            const bPlate  = getPropIgnoreCase(bus, 'platenumber') ?? 'N/A';
            const bStatus = getPropIgnoreCase(bus, 'status')    ?? 'Inactive';
            
            // Determine color based on city line
            const color = getBusColor(bRouteId, bRouteName, bus.customColor || null);

            if (bStatus.toLowerCase() === 'active') activeCount++;

            // Constrain bus to its route — try matching by routeId, then routeName, then zone
            let validStations = allStations.filter(s => String(s.routeId) === String(bRouteId));
            if (validStations.length === 0) validStations = allStations.filter(s => s.routeName && bRouteName && s.routeName.toLowerCase() === bRouteName.toLowerCase());
            if (validStations.length === 0 && bRouteName) validStations = allStations.filter(s => s.zone && bRouteName.toLowerCase().includes(s.zone.toLowerCase()));
            
            // Map demo buses directly to predefined route stations
            if (bId.startsWith('REAL_')) {
                const pr = PREDEFINED_ROUTES.find(r => r.id === bRouteId);
                if (pr) {
                    const s1 = allStations.find(s => s.name.toLowerCase().includes(pr.startStr.toLowerCase()));
                    const s2 = allStations.find(s => s.name.toLowerCase().includes(pr.endStr.toLowerCase()));
                    if (s1 && s2) validStations = [s1, s2];
                }
            }

            if (validStations.length === 0) validStations = allStations; // fallback to all stations

            if (!bus._routeStations) {
                bus._routeStations = validStations;
                bus._currentIdx = Math.abs(parseInt(bId) || 0) % validStations.length;
            }

            if (!bus._simBase) {
                let initialStation = bus._routeStations[bus._currentIdx] || { lat: 30.069, lng: 31.338 };
                bus._simBase = [initialStation.lat, initialStation.lng];
            } else {
                // Move towards the next station on the route
                if (bus._routeStations.length > 1) {
                    const nextIdx = (bus._currentIdx + 1) % bus._routeStations.length;
                    const targetStation = bus._routeStations[nextIdx];
                    
                    const dx = targetStation.lat - bus._simBase[0];
                    const dy = targetStation.lng - bus._simBase[1];
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 0.002) {
                        bus._currentIdx = nextIdx; // Reached target station, move to next
                    } else {
                        // Move step
                        const stepSq = 0.001; 
                        bus._simBase[0] += (dx / dist) * stepSq;
                        bus._simBase[1] += (dy / dist) * stepSq;
                    }
                } else {
                    // If only 1 station, minor jitter
                    bus._simBase[0] += (Math.random() - 0.5) * 0.002;
                    bus._simBase[1] += (Math.random() - 0.5) * 0.002;
                }
            }

            const lat = bus._simBase[0];
            const lng = bus._simBase[1];
            const speed = Math.floor(Math.random() * 30) + 15;

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
                                <div class="bus-pulse bus-pulse-real" style="background:${color};"></div>
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

            if (st1.routeId !== st2.routeId) {
                Swal.fire('Error', 'Stations must belong to the same route.', 'error');
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
    let isGlobalSimulationOn = false;
    let globalSimBuses = [];
    let globalSimIntervals = [];

    window.toggleSimulation = function() {
        const btn = document.getElementById('toggleSimBtn');
        isGlobalSimulationOn = !isGlobalSimulationOn;
        if (isGlobalSimulationOn) {
            btn.classList.add('paused');
            btn.innerHTML = '<i class="fas fa-pause-circle"></i><span>Simulation OFF</span>';
            // Remove real bus markers before starting simulation
            realBusMarkers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
            realBusMarkers = [];
            startGlobalSimulation();
        } else {
            btn.classList.remove('paused');
            btn.innerHTML = '<i class="fas fa-play-circle"></i><span>Simulation ON</span>';
            stopGlobalSimulation();
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

    // Hardcoded station ID sequences for each route (from the API data)
    const ROUTE_STATION_IDS = {
        'R1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],       // Ain Shams Housing → Al Asmarat (Cairo zone)
        'R2': [27, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39],           // El Shrouk Sports Clup → El Shrouk Academy (El-Shrouk zone)
        'R3': [57, 58, 59, 60, 61, 62, 63, 64, 65, 66],               // Madinaty Main Station → Open Air Mall (Madinty zone)
        'R4': [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]  // El Haram Square → Al Horeyya Rd (Badr zone)
    };

    function startGlobalSimulation() {
        PREDEFINED_ROUTES.forEach(route => {
            const stationIds = ROUTE_STATION_IDS[route.id];
            if (!stationIds) return;

            // Get actual station objects in order
            const routeStations = stationIds
                .map(id => allStations.find(s => s.id === id))
                .filter(s => s && s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng));

            if (routeStations.length < 2) {
                console.warn(`Route ${route.name}: Not enough valid stations found (${routeStations.length})`);
                return;
            }

            const coords = routeStations.map(s => L.latLng(s.lat, s.lng));
            const interpolatedCoords = interpolatePoints(coords, 0.0002);
            console.log(`Route ${route.name}: Spawning ${route.numBuses} buses on ${routeStations.length} stations (${interpolatedCoords.length} interpolated points)`);
            spawnSimulatedBusesForRoute(route, interpolatedCoords);
        });
    }

    let realBusMarkers = [];

    function stopGlobalSimulation() {
        globalSimIntervals.forEach(id => clearInterval(id));
        globalSimIntervals = [];
        globalSimBuses.forEach(m => { try { map.removeLayer(m); } catch(e){} });
        globalSimBuses = [];

        // Remove previous real bus markers
        realBusMarkers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
        realBusMarkers = [];

        // Place 1 real bus at the first station of each route
        PREDEFINED_ROUTES.forEach(route => {
            const stationIds = ROUTE_STATION_IDS[route.id];
            if (!stationIds || stationIds.length === 0) return;

            const firstStation = allStations.find(s => s.id === stationIds[0]);
            if (!firstStation || !firstStation.lat || !firstStation.lng) return;

            const icon = L.divIcon({
                className: 'bus-marker-icon',
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="background:${route.color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);">REAL - ${route.name}</div>
                        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                            <div class="bus-pulse" style="background:${route.color};"></div>
                            <i class="fas fa-bus" style="color:${route.color};font-size:22px;z-index:2;position:relative;text-shadow:0 0 6px rgba(255,255,255,0.9);"></i>
                        </div>
                    </div>`,
                iconSize: [54, 58],
                iconAnchor: [27, 58]
            });

            const marker = L.marker([firstStation.lat, firstStation.lng], { icon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
                        <h4 style="color:${route.color};margin:0 0 8px;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                            <i class="fas fa-bus"></i> Real Bus
                        </h4>
                        <div style="font-size:12px;line-height:1.8;">
                            <b>Route:</b> ${route.name}<br>
                            <b>Station:</b> ${firstStation.name}<br>
                            <b>Status:</b> <span style="color:#22c55e;font-weight:800;">Waiting ●</span>
                        </div>
                    </div>`);
            realBusMarkers.push(marker);
        });
    }

    function spawnSimulatedBusesForRoute(route, coords) {
        // Create buses staggered along the route
        const busesCount = route.numBuses || 3;
        for (let i = 0; i < busesCount; i++) {
            const startIdx = Math.floor((coords.length / busesCount) * i);
            let idx = startIdx;
            
            const icon = L.divIcon({
                className: 'bus-marker-icon bus-no-pulse',
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="background:${route.color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);">SIM - ${route.name}</div>
                        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-bus" style="color:${route.color};font-size:20px;z-index:2;position:relative;text-shadow:0 0 6px rgba(255,255,255,0.9);"></i>
                        </div>
                    </div>`,
                iconSize: [54, 56],
                iconAnchor: [27, 56]
            });
            
            const marker = L.marker(coords[idx] || coords[0], { icon }).addTo(map);
            globalSimBuses.push(marker);
            
            const stepMs = 100 + Math.random() * 80; // random speed 100ms-180ms per tick
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
        fetchRealBuses().then(() => {
            syncFleet();
            setInterval(syncFleet, 4000);
            // Refresh real stats every 60s
            setInterval(fetchRealStats, 60000);
        });
    });

});
