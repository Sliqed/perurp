
import Backend from './js/backend.js';

async function testSendMessage() {
    console.log("--- TEST DE MENSAJERÍA ---");
    
    // Mocking localStorage
    const senderKey = 'sender_user';
    const receiverKey = 'receiver_user';
    
    localStorage.setItem('currentUser', senderKey);
    localStorage.setItem('rp_users', JSON.stringify({ 
        'sender_user': { name: "Sender", balance: 1000, notifications: [] },
        'receiver_user': { name: "Receiver", balance: 1000, notifications: [] }
    }));
    
    await Backend.ensureInitialized();
    
    console.log("1. Enviando mensaje...");
    await Backend.sendMessage(senderKey, receiverKey, "Hola amigo!");
    
    const users = await Backend.getUsers();
    const receiverNotifs = users[receiverKey].notifications;
    console.log("Notificaciones del receptor:", receiverNotifs);
    
    if (receiverNotifs.length > 0 && receiverNotifs[0].title === 'Nuevo mensaje de Sender') {
        console.log("✅ sendMessage genera notificaciones localmente.");
    } else {
        console.error("❌ sendMessage NO generó notificaciones.");
    }
    
    const chats = JSON.parse(localStorage.getItem('rp_chats') || '{}');
    const chatId = [senderKey, receiverKey].sort().join('_');
    console.log("Chats en storage:", chats[chatId]);
    
    if (chats[chatId] && chats[chatId].length > 0) {
        console.log("✅ sendMessage guarda el chat localmente.");
    } else {
        console.error("❌ sendMessage NO guardó el chat.");
    }
    
    console.log("--- FIN DE TESTS ---");
}

// testSendMessage();
