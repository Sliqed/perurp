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

// 2. Sistema de Notificaciones Global (Toast)
// Crea un div flotante si no existe para mostrar mensajes
window.showNotification = (message, type = 'info') => {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    // Estilos rápidos según tipo
    const colors = {
        success: '#00ff88', // Verde Neon
        error: '#ff0055', // Rojo Neon
        info: '#00bbff' // Azul
    };

    notif.style.cssText = `
        background: rgba(20, 20, 30, 0.95);
        color: #fff;
        padding: 15px 20px;
        border-left: 4px solid ${colors[type] || colors.info};
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        min-width: 250px;
        backdrop-filter: blur(5px);
        animation: slideIn 0.3s ease-out;
        font-family: 'Rajdhani', sans-serif;
    `;

    notif.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;

    container.appendChild(notif);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
};

// Estilo de animación para las notificaciones
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(styleSheet);