// js/mis-datos.js — Peru RP Community
// Totalmente reprogramado para máxima compatibilidad local

document.addEventListener('DOMContentLoaded', () => {
    
    // ── ESTADO GLOBAL ──
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ── LÓGICA DE PERFIL (EL CORAZÓN DEL PORTAL) ──
    const updateProfileUI = async () => {
        const Backend = window.Backend;
        if (!Backend) return; // Esperar a que cargue

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

        // 3. Rango y Trabajo
        const role = userData.role || 'user';
        const rankEl = $('profile-rank');
        const jobEl = $('profile-job');
        
        if (rankEl) {
            rankEl.textContent = role.toUpperCase();
            rankEl.style.background = role === 'owner' ? '#dc2626' : (role === 'admin' ? '#dc2626' : '#dc2626');
        }
        
        if (jobEl) {
            let jobName = 'Civil';
            let icon = 'bxs-briefcase';
            if (role === 'owner') { jobName = 'Propietario'; icon = 'bxs-crown'; }
            else if (role === 'admin') { jobName = 'Administrador'; icon = 'bxs-shield-quarter'; }
            else if (role === 'mod') { jobName = 'Moderador'; icon = 'bxs-user-voice'; }
            jobEl.innerHTML = `<i class='bx ${icon}'></i> ${jobName}`;
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

        // 5. Panel de Staff (Desbloqueo)
        const staffCard = $('staff-panel-card');
        if (staffCard) {
            if (role === 'owner' || role === 'admin') {
                staffCard.classList.remove('exp-portal--locked');
                const label = $('staff-label-text');
                const lockIcon = $('staff-lock-icon');
                if (label) label.textContent = 'Acceso concedido (Staff)';
                if (lockIcon) {
                    lockIcon.classList.remove('bxs-lock-alt');
                    lockIcon.classList.add('bx-chevron-right');
                }
            } else {
                staffCard.onclick = (e) => {
                    e.preventDefault();
                    alert('No tienes permisos de Staff.');
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