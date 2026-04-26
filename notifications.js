/**
 * TransitWay — Global Notification System
 * Polls the complaints/report API every 30 seconds.
 * Shows a toast popup when new reports arrive, from any page.
 */
(function () {
    'use strict';

    const REPORTS_API  = 'https://transit-way.runasp.net/api/complaints';
    const POLL_INTERVAL_MS = 15000;   // check every 15 s
    const STORAGE_KEY  = 'tw_seen_report_ids';

    // ────────────────────────────────────────────
    // 1. State helpers
    // ────────────────────────────────────────────
    function getSeenIds() {
        try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
        catch (_) { return new Set(); }
    }

    function saveSeenIds(set) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    }

    // ────────────────────────────────────────────
    // 2. Inject global CSS (toast + badge)
    // ────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        /* ── Notification Bell Badge ── */
        .notif-badge {
            position: absolute; top: -5px; right: -5px;
            background: #ef4444; color: #fff;
            font-size: 9px; font-weight: 900;
            min-width: 16px; height: 16px;
            border-radius: 999px; padding: 0 4px;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid var(--bg-card, #fff);
            animation: badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
            z-index: 9999;
        }
        @keyframes badge-pop {
            from { transform: scale(0); }
            to   { transform: scale(1); }
        }

        /* ── Toast Container ── */
        #tw-toast-container {
            position: fixed; bottom: 24px; right: 24px;
            z-index: 99999; display: flex; flex-direction: column;
            gap: 12px; pointer-events: none;
        }

        /* ── Single Toast ── */
        .tw-toast {
            pointer-events: all;
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #e2e8f0);
            border-left: 4px solid #ef4444;
            border-radius: 14px;
            padding: 14px 18px;
            min-width: 300px; max-width: 380px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.14);
            display: flex; align-items: flex-start; gap: 14px;
            animation: slide-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
            cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        }
        .tw-toast:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.18); }
        @keyframes slide-in {
            from { opacity: 0; transform: translateX(60px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-out {
            from { opacity: 1; transform: translateX(0); }
            to   { opacity: 0; transform: translateX(60px); }
        }

        .tw-toast-icon {
            width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
            background: rgba(239,68,68,0.1); color: #ef4444;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem;
        }
        .tw-toast-body { flex: 1; min-width: 0; }
        .tw-toast-title {
            font-weight: 800; font-size: 0.9rem;
            color: var(--text-main, #1e293b); margin-bottom: 3px;
        }
        .tw-toast-msg {
            font-size: 0.78rem; color: var(--text-muted, #64748b);
            font-weight: 600; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        }
        .tw-toast-time {
            font-size: 0.72rem; color: var(--text-muted, #94a3b8);
            font-weight: 600; margin-top: 5px;
        }
        .tw-toast-close {
            background: none; border: none; color: var(--text-muted, #94a3b8);
            cursor: pointer; font-size: 0.85rem; padding: 2px; line-height: 1;
            flex-shrink: 0; margin-top: 2px;
        }
        .tw-toast-close:hover { color: #ef4444; }

        /* Sound wave indicator */
        .tw-toast-wave { display: flex; align-items: flex-end; gap: 2px; height: 16px; }
        .tw-toast-wave span {
            width: 3px; border-radius: 2px; background: #ef4444;
            animation: wave-bar 0.8s ease-in-out infinite alternate;
        }
        .tw-toast-wave span:nth-child(1) { height: 6px;  animation-delay: 0s;    }
        .tw-toast-wave span:nth-child(2) { height: 12px; animation-delay: 0.15s; }
        .tw-toast-wave span:nth-child(3) { height: 8px;  animation-delay: 0.3s;  }
        .tw-toast-wave span:nth-child(4) { height: 14px; animation-delay: 0.45s; }
        @keyframes wave-bar {
            from { transform: scaleY(0.4); }
            to   { transform: scaleY(1);   }
        }
    `;
    document.head.appendChild(style);

    // ────────────────────────────────────────────
    // 3. Toast Container
    // ────────────────────────────────────────────
    let container = null;
    function ensureContainer() {
        if (container) return container;
        container = document.getElementById('tw-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tw-toast-container';
            if (document.body) {
                document.body.appendChild(container);
            }
        }
        return container;
    }

    // ────────────────────────────────────────────
    // 4. Show toast
    // ────────────────────────────────────────────
    function showToast(report) {
        const isAr = (localStorage.getItem('transitLang') || 'en') === 'ar';
        const title = isAr ? '🚨 تقرير جديد!' : '🚨 New Report!';
        const subMsg = report.message || report.Message || 'New complaint received.';
        const busId  = report.busId || report.BusId || report.id || '?';
        const label  = isAr ? `حافلة #${busId}` : `Bus #${busId}`;
        const now    = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const toast = document.createElement('div');
        toast.className = 'tw-toast';
        toast.innerHTML = `
            <div class="tw-toast-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="tw-toast-body">
                <div class="tw-toast-title">${title} <span style="color:#ef4444;font-size:0.78rem;">${label}</span></div>
                <div class="tw-toast-msg">${subMsg}</div>
                <div class="tw-toast-time" style="display:flex;align-items:center;gap:8px;">
                    ${now}
                    <div class="tw-toast-wave">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
            </div>
            <button class="tw-toast-close" title="Dismiss">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Click → go to reports
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.tw-toast-close')) {
                window.location.href = 'reports.html';
            }
        });

        // Close button
        toast.querySelector('.tw-toast-close').addEventListener('click', () => dismiss(toast));

        const targetContainer = ensureContainer();
        if (targetContainer) targetContainer.appendChild(toast);

        // Auto dismiss after 8 s
        setTimeout(() => dismiss(toast), 8000);
    }

    function dismiss(toast) {
        toast.style.animation = 'slide-out 0.3s forwards';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }

    // ────────────────────────────────────────────
    // 5. Update sidebar link badge
    // ────────────────────────────────────────────
    function updateBadge(count) {
        // Find the Reports link in the sidebar nav
        const link = document.querySelector('a[href="reports.html"]');
        if (!link) return;

        link.style.position = 'relative';
        let badge = link.querySelector('.notif-badge');
        if (count <= 0) {
            if (badge) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notif-badge';
            link.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
    }

    // ────────────────────────────────────────────
    // 6. Poll the API
    // ────────────────────────────────────────────
    let pendingCount = parseInt(localStorage.getItem('tw_pending_notifs') || '0');

    async function poll() {
        try {
            const res = await fetch(REPORTS_API);
            if (!res.ok) return;
            const data = await res.json();
            const reports = Array.isArray(data) ? data
                : Array.isArray(data.$values) ? data.$values
                : [];

            const seen   = getSeenIds();
            const newOnes = reports.filter(r => {
                const rid = String(r.id || r.Id || r.complaintId || r.ComplaintId || '');
                return rid && !seen.has(rid);
            });

            if (newOnes.length > 0) {
                newOnes.forEach(r => {
                    const rid = String(r.id || r.Id || r.complaintId || r.ComplaintId || '');
                    seen.add(rid);
                    showToast(r);
                });
                saveSeenIds(seen);

                pendingCount += newOnes.length;
                localStorage.setItem('tw_pending_notifs', pendingCount);
                updateBadge(pendingCount);

                // New: Dispatch event for reports-logic.js to show on-page popup
                window.dispatchEvent(new CustomEvent('newReportReceived', { detail: newOnes }));
            }
        } catch (e) {
            // Silently fail — don't interrupt the user
        }
    }

    // On reports page → mark all as seen and clear badge
    if (window.location.pathname.includes('reports')) {
        pendingCount = 0;
        localStorage.setItem('tw_pending_notifs', '0');
        updateBadge(0);
        
        // Also mark existing reports as seen so we don't get toasts for them
        fetch(REPORTS_API).then(res => res.json()).then(data => {
            const reports = Array.isArray(data) ? data : Array.isArray(data.$values) ? data.$values : [];
            const seen = getSeenIds();
            reports.forEach(r => {
                const rid = String(r.id || r.Id || r.complaintId || r.ComplaintId || '');
                if (rid) seen.add(rid);
            });
            saveSeenIds(seen);
        }).catch(()=>{});
    } else {
        updateBadge(pendingCount);
    }

    // Start polling after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // First poll after 5s (let page load first)
        setTimeout(poll, 5000);
        // Then every 30s
        setInterval(poll, POLL_INTERVAL_MS);
    });

})();
