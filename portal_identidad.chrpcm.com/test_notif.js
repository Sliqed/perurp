
import Backend from './js/backend.js';

async function testNotifications() {
    console.log("--- TEST DE NOTIFICACIONES ---");
    
    // Mocking localStorage
    const mockUser = { name: "Test User", balance: 1000, notifications: [] };
    localStorage.setItem('currentUser', 'test_user');
    localStorage.setItem('rp_users', JSON.stringify({ 'test_user': mockUser }));
    
    await Backend.ensureInitialized();
    
    console.log("1. Probando pushNotification...");
    await Backend.pushNotification('test_user', {
        title: 'Test Title',
        message: 'Test Message',
        type: 'info'
    });
    
    const users = await Backend.getUsers();
    const notifs = users['test_user'].notifications;
    console.log("Notificaciones guardadas:", notifs);
    
    if (notifs.length > 0 && notifs[0].title === 'Test Title') {
        console.log("✅ pushNotification funciona localmente.");
    } else {
        console.error("❌ pushNotification falló.");
    }
    
    console.log("2. Probando onNotificationsChange...");
    let callbackCalled = false;
    const unsubscribe = await Backend.onNotificationsChange('test_user', (updatedNotifs) => {
        console.log("Callback de onNotificationsChange llamado con:", updatedNotifs.length, "notificaciones");
        if (updatedNotifs.length > 0) callbackCalled = true;
    });
    
    // Esperar un poco para el polling o el trigger
    await new Promise(r => setTimeout(r, 2500));
    
    if (callbackCalled) {
        console.log("✅ onNotificationsChange funciona localmente.");
    } else {
        console.error("❌ onNotificationsChange falló o no detectó cambios.");
    }
    
    console.log("3. Probando markNotificationRead...");
    const notifId = notifs[0].id;
    await Backend.markNotificationRead('test_user', notifId);
    
    const updatedUsers = await Backend.getUsers();
    if (updatedUsers['test_user'].notifications[0].read === true) {
        console.log("✅ markNotificationRead funciona localmente.");
    } else {
        console.error("❌ markNotificationRead falló.");
    }
    
    unsubscribe();
    console.log("--- FIN DE TESTS ---");
}

// Para que funcione en Node si lo intentamos, pero esto es para navegador
// testNotifications();
