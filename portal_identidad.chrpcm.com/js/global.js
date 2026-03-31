// public/js/global.js

// 1. Función Maestra para llamar a la API
window.apiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error en la solicitud');
        }
        return data;
    } catch (error) {
        console.error("Error en apiCall:", error);
        // Si tienes una función de notificaciones, la usamos:
        if (window.showNotification) {
            window.showNotification(error.message, 'error');
        }
        throw error; // Re-lanzamos el error para que lo maneje el script específico
    }
};

// 2. Sistema de Notificaciones Global (Toast mejorado con sonido)
window.showNotification = (message, type = 'info', title = null) => {
    // Cargar configuraciones de notificaciones
    const settings = JSON.parse(localStorage.getItem('rp_notif_settings') || '{"muted": false, "volume": 0.5}');
    
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 12px; pointer-events: none;";
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    const colors = {
        success: '#22c55e', 
        error: '#ef4444', 
        info: '#3b82f6',
        emergency: '#dc2626',
        money: '#22c55e',
        message: '#dc2626'
    };

    const icons = {
        success: 'bx-check-circle',
        error: 'bx-x-circle',
        info: 'bx-info-circle',
        emergency: 'bx-error',
        money: 'bx-dollar-circle',
        message: 'bx-message-rounded-dots'
    };

    notif.style.cssText = `
        background: rgba(10, 10, 10, 0.95);
        color: #fff;
        padding: 16px 20px;
        border-left: 4px solid ${colors[type] || colors.info};
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        min-width: 300px;
        max-width: 400px;
        backdrop-filter: blur(10px);
        animation: slideInNotif 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 15px;
        border: 1px solid rgba(255,255,255,0.05);
        pointer-events: auto;
        cursor: pointer;
    `;

    const iconHtml = `<i class='bx ${icons[type] || icons.info}' style="font-size: 1.8rem; color: ${colors[type] || colors.info};"></i>`;
    const titleText = title || type.toUpperCase();

    notif.innerHTML = `
        ${iconHtml}
        <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; color: ${colors[type] || colors.info}; margin-bottom: 2px;">${titleText}</div>
            <div style="font-size: 0.9rem; color: #e2e8f0; line-height: 1.4;">${message}</div>
        </div>
    `;

    // Reproducir sonido si no está silenciado
    if (!settings.muted) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'); // Sonido tipo "pop/blip"
        audio.volume = settings.volume || 0.5;
        audio.play().catch(e => console.log("Audio play blocked by browser"));
    }

    container.appendChild(notif);

    // Auto-eliminar
    setTimeout(() => {
        notif.style.animation = 'slideOutNotif 0.4s ease forwards';
        setTimeout(() => notif.remove(), 400);
    }, 5000);

    notif.onclick = () => {
        notif.style.animation = 'slideOutNotif 0.2s ease forwards';
        setTimeout(() => notif.remove(), 200);
    };
};

// 3. Menú de Configuración de Notificaciones
window.toggleSettings = () => {
    let modal = document.getElementById('settings-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'bnk-modal-overlay';
        modal.innerHTML = `
            <div class="bnk-modal" style="max-width: 400px;">
                <div class="bnk-modal-head">
                    <h3><i class='bx bx-cog'></i> Configuración</h3>
                    <button class="close-modal-btn" onclick="window.toggleSettings()"><i class='bx bx-x'></i></button>
                </div>
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: white; font-weight: 700;">Silenciar Notificaciones</div>
                            <div style="font-size: 0.75rem; color: #666;">Desactiva el sonido de alerta</div>
                        </div>
                        <input type="checkbox" id="notif-mute-check" style="width: 20px; height: 20px; accent-color: #dc2626;">
                    </div>
                    <div>
                        <div style="color: white; font-weight: 700; margin-bottom: 10px;">Volumen de Alerta</div>
                        <input type="range" id="notif-vol-range" min="0" max="1" step="0.1" style="width: 100%; accent-color: #dc2626;">
                    </div>
                    <button class="auth-btn" style="width: 100%; margin: 0;" onclick="saveNotifSettings()">Guardar Cambios</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const settings = JSON.parse(localStorage.getItem('rp_notif_settings') || '{"muted": false, "volume": 0.5}');
    document.getElementById('notif-mute-check').checked = settings.muted;
    document.getElementById('notif-vol-range').value = settings.volume;
    
    modal.classList.toggle('hidden');
};

window.saveNotifSettings = () => {
    const muted = document.getElementById('notif-mute-check').checked;
    const volume = parseFloat(document.getElementById('notif-vol-range').value);
    localStorage.setItem('rp_notif_settings', JSON.stringify({ muted, volume }));
    window.toggleSettings();
    window.showNotification('Configuración guardada correctamente', 'success', 'SISTEMA');
};

// 4. Escuchador Global de Notificaciones (Firebase o Local)
window.initNotifListener = async () => {
    // Evitar inicialización doble
    if (window._notifListenerInitialized) return;
    
    const Backend = window.Backend;
    if (!Backend) {
        // Re-intentar si el backend no ha cargado aún (para sistemas lentos)
        setTimeout(window.initNotifListener, 1000);
        return;
    }
    await Backend.ensureInitialized();
    
    const userKey = Backend.getCurrentUserKey();
    if (!userKey) return;

    window._notifListenerInitialized = true;

    // Escuchar nuevas notificaciones (Firebase o Local)
    Backend.onNotificationsChange(userKey, (notifs) => {
        if (!notifs) return;
        
        // Solo mostrar las que son "nuevas" (no leídas y recientes de los últimos 10 segundos)
        const now = Date.now();
        const notifArray = Array.isArray(notifs) ? notifs : Object.values(notifs);
        
        notifArray.forEach(n => {
            if (!n.read && (now - n.timestamp < 10000)) {
                window.showNotification(n.message, n.type || 'info', n.title);
                // Marcar como leída para que no vuelva a saltar
                Backend.markNotificationRead(userKey, n.id);
            }
        });
    });
};

// Iniciar chequeos al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // window.checkSalaries(); // Desactivado si no existe
        window.initNotifListener();
    }, 1000); // Reducir a 1s para mejor respuesta
});

// Estilos de animación
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes slideInNotif {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutNotif {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
    }
    .hidden { display: none !important; }
`;
document.head.appendChild(styleSheet);