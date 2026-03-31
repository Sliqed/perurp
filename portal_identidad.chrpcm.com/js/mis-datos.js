// js/mis-datos.js — Peru RP Community
// Totalmente reprogramado para máxima compatibilidad local

document.addEventListener('DOMContentLoaded', () => {
    
    // ── ESTADO GLOBAL ──
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ── LÓGICA DE PERFIL (EL CORAZÓN DEL PORTAL) ──
    const updateProfileUI = async () => {
        const Backend = window.Backend;
        if (!Backend) return; 

        await Backend.ensureInitialized();
        const users = await Backend.getUsers();
        const currentUserKey = Backend.getCurrentUserKey();
        const userData = users[currentUserKey];

        if (!userData) {
            window.location.href = './auth.html';
            return;
        }

        // 1. Nombres (Header y Perfil)
        const displayName = userData.name || 'Ciudadano';
        if ($('header-name')) $('header-name').textContent = displayName;
        if ($('profile-name')) $('profile-name').textContent = displayName;

        // 2. Avatar (Header y Perfil)
        const avatarUrl = userData.avatarUrl || 'https://i.imgur.com/3mRhMBw.png';
        const avatars = ['header-avatar', 'profile-avatar', 'cedula-foto-principal', 'cedula-foto-pequena'];
        avatars.forEach(id => {
            const img = $(id);
            if (img) {
                img.src = avatarUrl;
                img.onerror = () => { img.src = 'https://i.imgur.com/3mRhMBw.png'; };
            }
        });

        // 3. Rango y Trabajo (Soporte para múltiples roles tipo Discord)
        const currentRoles = await Backend.getRoles();
        const roles = userData.roles || [userData.role || 'unemployed'];
        const rankEl = $('profile-rank');
        const jobEl = $('profile-job');
        
        // Mapeo de roles para UI (Usar los del backend si están disponibles)
        const primaryRoleId = roles.find(r => r !== 'unemployed') || roles[0] || 'unemployed';
        const primaryRole = currentRoles.find(r => r.id === primaryRoleId) || { name: 'Ciudadano', color: '#64748b', icon: 'bx-user' };

        if (rankEl) {
            rankEl.textContent = primaryRole.name.toUpperCase();
            rankEl.style.background = primaryRole.color;
        }
        
        if (jobEl) {
            jobEl.innerHTML = `<i class='bx ${primaryRole.icon.startsWith('bx-') ? primaryRole.icon : 'bx-' + primaryRole.icon}'></i> ${primaryRole.name}`;
        }

        // 4. Dinero y Nivel
        const balanceEl = $('finance-balance');
        const levelEl = $('citizen-level');
        const levelFill = $('level-fill');

        if (balanceEl) {
            const balance = userData.balance || 0;
            balanceEl.textContent = `$ ${balance.toLocaleString()}`;
        }
        if (levelEl) levelEl.textContent = userData.level || '1';
        if (levelFill) levelFill.style.width = '15%';

        // 5. Desbloqueo de Paneles por Rol
        const isStaff = roles.includes('owner') || roles.includes('admin') || roles.includes('mod');
        const isPolice = roles.includes('police');
        const isMechanic = roles.includes('mechanic');

        // Panel de Staff
        const staffCard = $('staff-panel-card');
        if (staffCard) {
            if (isStaff) {
                staffCard.classList.remove('exp-portal--locked');
                staffCard.href = './admin.html';
                const label = $('staff-label-text');
                const lockIcon = $('staff-lock-icon');
                if (label) label.textContent = 'Panel de Administración Activo';
                if (lockIcon) {
                    lockIcon.className = 'bx bx-chevron-right exp-portal-arrow';
                }
            } else {
                staffCard.onclick = (e) => {
                    e.preventDefault();
                    alert('Acceso denegado: Se requieren permisos de Staff.');
                };
            }
        }

        // Panel Punto de Desguace (Abierto para todos)
        const mechanicCard = $('mecanico-ilegal-card');
        if (mechanicCard) {
            mechanicCard.classList.remove('exp-portal--locked');
            mechanicCard.href = './desguace.html';
            const label = mechanicCard.querySelector('.exp-ilegal-label');
            if (label) label.textContent = 'Reciclaje y piezas de vehículos';
            const lockIcon = mechanicCard.querySelector('.exp-portal-arrow');
            if (lockIcon) {
                lockIcon.className = 'bx bx-chevron-right exp-portal-arrow';
            }
            mechanicCard.onclick = null;
        }

        // Portales Policiales
        const policeBtn = $('police-toggle-btn');
        if (policeBtn) {
            if (isPolice || isStaff) {
                policeBtn.classList.remove('exp-portal--locked');
            } else {
                policeBtn.onclick = (e) => {
                    e.preventDefault();
                    alert('Acceso denegado: Solo personal de la Policía Nacional.');
                };
            }
        }

        // Portal SAMU
        const samuCard = $('samu-portal-card');
        if (samuCard) {
            const isEMS = roles.includes('ems') || isStaff;
            if (isEMS) {
                samuCard.classList.remove('exp-portal--locked');
                const label = $('samu-label-text');
                const lockIcon = $('samu-lock-icon');
                if (label) label.textContent = 'Portal Médico Activo';
                if (lockIcon) {
                    lockIcon.className = 'bx bx-chevron-right exp-portal-arrow';
                }
            } else {
                samuCard.onclick = (e) => {
                    e.preventDefault();
                    alert('Acceso denegado: Se requieren credenciales de SAMU.');
                };
            }
        }
    };

    // ── CAMBIO DE FOTO ──
    const avatarContainer = $('avatar-container');
    if (avatarContainer) {
        avatarContainer.addEventListener('click', async () => {
            const newUrl = prompt('Ingresa la URL de tu foto (JPG, PNG, WEBP):');
            if (newUrl && newUrl.trim().startsWith('http')) {
                const Backend = window.Backend;
                const currentUserKey = Backend.getCurrentUserKey();
                const users = await Backend.getUsers();
                
                if (users[currentUserKey]) {
                    users[currentUserKey].avatarUrl = newUrl.trim();
                    await Backend.saveUser(currentUserKey, users[currentUserKey]);
                    updateProfileUI(); // Actualizar todo al instante
                }
            }
        });
    }

    // ── CONSEJOS (TIPS) ──
    const TIPS = [
        'Mantén tu DNI actualizado para evitar problemas con la PNP.',
        'Visita el Centro de Empleos para ganar dinero extra.',
        'El Mercado Negro es peligroso, ten cuidado.',
        'Usa el banco para transferencias seguras.',
        'Recuerda que las licencias vencen, renuévalas en la Municipalidad.'
    ];
    let currentTip = 0;
    const showTip = () => {
        if ($('tip-text')) $('tip-text').textContent = TIPS[currentTip];
    };
    if ($('tip-next-btn')) {
        $('tip-next-btn').onclick = () => {
            currentTip = (currentTip + 1) % TIPS.length;
            showTip();
        };
    }
    showTip();

    // ── CÉDULA (DATOS) ──
    const updateCedula = async () => {
        const Backend = window.Backend;
        const users = await Backend.getUsers();
        const currentUserKey = Backend.getCurrentUserKey();
        const userData = users[currentUserKey];
        if (!userData) return;

        const setText = (id, val) => { if ($(id)) $(id).textContent = val; };
        
        const nameParts = userData.name.split(' ');
        setText('cedula-apellidos', nameParts.slice(1).join(' ').toUpperCase() || 'PERUANO');
        setText('cedula-nombres', nameParts[0].toUpperCase() || 'CIUDADANO');
        setText('cedula-nacionalidad', 'PERUANA');
        setText('cedula-run-text', '20.' + Math.floor(Math.random() * 10000000) + '-1');
    };

    // ── NAVEGACIÓN ENTRE PESTAÑAS ──
    const navItems = $$('.exp-nav-item[data-view]');
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            navItems.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const viewId = btn.dataset.view;
            $$('.exp-view').forEach(v => v.classList.remove('is-active'));
            if ($(`view-${viewId}`)) $(`view-${viewId}`).classList.add('is-active');
            if (viewId === 'identidad') updateCedula();
        });
    });

    // ── PORTALES POLICIALES (TOGGLE) ──
    const policeBtn = $('police-toggle-btn');
    const policePanel = $('police-panel');
    if (policeBtn && policePanel) {
        policeBtn.addEventListener('click', () => {
            policeBtn.classList.toggle('is-open');
            policePanel.classList.toggle('is-open');
        });
    }

    // ── INICIALIZACIÓN ──
    setTimeout(updateProfileUI, 500);

    // Escuchar cambios en tiempo real si Firebase está activo
    setTimeout(() => {
        const Backend = window.Backend;
        if (Backend && Backend.isFirebaseEnabled) {
            Backend.onUserChange(Backend.getCurrentUserKey(), (data) => {
                if (data) updateProfileUI();
            });
        }
    }, 1000);

});

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = './auth.html';
}