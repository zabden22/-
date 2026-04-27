// ═══════════════════════════════════════════════════
// 🌍 Global — Photo Upload for Admin / User / Driver
// ═══════════════════════════════════════════════════

/**
 * triggerPhotoUpload(type, id)
 * type = 'admin' | 'User' | 'Driver'
 * id   = entity ID
 *
 * Opens a file picker, uploads the selected image to the API,
 * then updates the avatar image on the page instantly.
 */
function triggerPhotoUpload(type, id) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) { input.remove(); return; }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                icon: 'warning',
                title: 'File Too Large',
                text: 'Please select an image smaller than 5MB.',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
            });
            input.remove();
            return;
        }

        // Determine correct API URL and Method based on entity type
        const typeLower = type.toLowerCase();
        let API_URL = '';
        let apiMethod = 'PUT';
        let formField = 'Photo'; // Driver & User expect 'Photo'

        if (typeLower === 'admin') {
            API_URL = `https://transit-way.runasp.net/api/admin/${id}/photo`;
            apiMethod = 'POST';
            formField = 'photo'; // Admin expects 'photo'
        } else if (typeLower === 'driver') {
            API_URL = `https://transit-way.runasp.net/api/Driver/${id}`;
        } else if (typeLower === 'user') {
            API_URL = `https://transit-way.runasp.net/api/User/${id}/profile`;
        }

        // Optimistic UI Update: Show the image immediately
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: 'var(--bg-card)', color: 'var(--text-main)' });
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;

            // Update UI instantly
            const avatarEl = document.getElementById(`${typeLower}-avatar-${id}`);
            if (avatarEl) avatarEl.src = base64;

            const dpAvatar = document.getElementById('dpAvatar');
            if (dpAvatar && dpAvatar.src.includes(`/${id}/`)) {
                dpAvatar.src = base64;
            }

            Toast.fire({ icon: 'info', title: `Uploading ${type} photo...` });

            // Upload in background
            const formData = new FormData();
            formData.append(formField, file);

            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            try {
                if (typeLower === 'admin') {
                    let res = await fetch(API_URL, { method: 'POST', headers, body: formData });
                    if (!res.ok) res = await fetch(API_URL, { method: 'PUT', headers, body: formData });
                    if (!res.ok) throw new Error(`Server ${res.status}`);
                } else if (typeLower === 'driver') {
                    // Try dedicated photo endpoint first (POST)
                    let photoRes = await fetch(`https://transit-way.runasp.net/api/Driver/${id}/photo`, { method: 'POST', headers, body: formData });
                    
                    if (!photoRes.ok) {
                        // Fallback: PUT with full payload to /api/Driver/{id}
                        // Fetch existing driver data first since PUT requires full payload
                        const currentRes = await fetch(`https://transit-way.runasp.net/api/Driver/${id}`, { headers });
                        if (currentRes.ok) {
                            const driver = await currentRes.json();
                            formData.append('FullName', driver.name || driver.fullName || '');
                            formData.append('PhoneNumber', driver.phone || driver.phoneNumber || '');
                            formData.append('Email', driver.email || '');
                            formData.append('LicenseNumber', driver.licenseNumber || driver.license || '');
                        }
                        let res = await fetch(API_URL, { method: 'PUT', headers, body: formData });
                        if (!res.ok) throw new Error(`Server ${res.status}`);
                    }
                } else if (typeLower === 'user') {
                    // Fetch existing user data first
                    const currentRes = await fetch(`https://transit-way.runasp.net/api/User/${id}/profile`, { headers });
                    if (currentRes.ok) {
                        const user = await currentRes.json();
                        formData.append('FullName', user.name || user.fullName || '');
                        formData.append('Phone', user.phone || user.phoneNumber || '');
                        formData.append('Email', user.email || '');
                    }
                    let res = await fetch(API_URL, { method: 'PUT', headers, body: formData });
                    if (!res.ok) throw new Error(`Server ${res.status}`);
                }

                Toast.fire({ icon: 'success', title: 'Photo Uploaded! ✅' });

                // Small delay then reload page to fetch fresh DB URLs and ensure consistency
                setTimeout(() => window.location.reload(), 1500);

            } catch (err) {
                console.warn('Photo API failed:', err);
                Toast.fire({ icon: 'error', title: 'Upload Failed!' });
                // Revert optimistic UI on failure
                const avatarEl = document.getElementById(`${typeLower}-avatar-${id}`);
                if (avatarEl && avatarEl.dataset.originalSrc) avatarEl.src = avatarEl.dataset.originalSrc;
            } finally {
                input.remove();
            }
        };
        
        // Store original src for rollback
        const avatarEl = document.getElementById(`${typeLower.toLowerCase()}-avatar-${id}`);
        if (avatarEl) avatarEl.dataset.originalSrc = avatarEl.src;
        
        reader.readAsDataURL(file);
    });

    input.click();
}

/**
 * getPhotoUrl(type, id, dbPhotoUrl)
 * Returns the true photo URL from the DB. No more localStorage caching to avoid desync!
 */
function getPhotoUrl(type, id, dbPhotoUrl) {
    if (dbPhotoUrl && dbPhotoUrl.trim() !== '' && dbPhotoUrl !== 'null') {
        return dbPhotoUrl;
    }
    // Fallback UI avatar if no DB photo exists
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(type)}&background=random&color=fff&size=150&bold=true`;
}
