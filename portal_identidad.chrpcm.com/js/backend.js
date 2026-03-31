/**
 * js/backend.js - Capa de abstracción para persistencia de datos.
 * Maneja la sincronización entre LocalStorage y Firebase (si está configurado).
 */

class BackendManager {
    constructor() {
        this.isFirebaseEnabled = false;
        this.db = null;
        this.initialized = false;
        this._initPromise = this.init();
    }

    async init() {
        // Intentar cargar la configuración de Firebase
        try {
            const configModule = await import('./config.js');
            const config = configModule.default;

            if (config.apiKey && config.apiKey !== "TU_API_KEY") {
                // Inicializar Firebase (usando SDK v8 compat para simplicidad en este proyecto)
                if (typeof firebase !== 'undefined') {
                    if (firebase.apps.length === 0) {
                        firebase.initializeApp(config);
                    }
                    this.db = firebase.database();
                    this.isFirebaseEnabled = true;
                    console.log("✅ Backend: Firebase habilitado (Datos globales sincronizados)");
                    
                    // Prueba de conexión rápida
                    this.db.ref('.info/connected').on('value', (snap) => {
                        if (snap.val() === true) {
                            console.log("🌐 Backend: Conexión con Firebase establecida.");
                        } else {
                            console.warn("Lost connection to Firebase");
                        }
                    });
                } else {
                    console.warn("⚠️ Backend: SDK de Firebase no detectado en el HTML. Usando LocalStorage.");
                }
            } else {
                console.log("ℹ️ Backend: Usando LocalStorage (Solo este navegador). Configura Firebase en js/config.js para modo global.");
            }
        } catch (e) {
            console.error("❌ Error inicializando el backend:", e);
        } finally {
            this.initialized = true;
        }
    }

    async ensureInitialized() {
        await this._initPromise;
    }

    // --- USUARIOS ---

    async getUsers() {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            try {
                const snapshot = await this.db.ref('rp_users').once('value');
                return snapshot.val() || {};
            } catch (error) {
                console.error("Error fetching users from Firebase:", error);
                // Fallback to local if Firebase fails
            }
        }
        return JSON.parse(localStorage.getItem('rp_users') || '{}');
    }

    async saveUser(userKey, userData) {
        await this.ensureInitialized();
        // Siempre guardar en LocalStorage como respaldo/caché
        const localUsers = JSON.parse(localStorage.getItem('rp_users') || '{}');
        localUsers[userKey] = userData;
        localStorage.setItem('rp_users', JSON.stringify(localUsers));

        if (this.isFirebaseEnabled) {
            await this.db.ref('rp_users/' + userKey).set(userData);
        }
    }

    async deleteUser(userKey) {
        await this.ensureInitialized();
        const localUsers = JSON.parse(localStorage.getItem('rp_users') || '{}');
        delete localUsers[userKey];
        localStorage.setItem('rp_users', JSON.stringify(localUsers));

        if (this.isFirebaseEnabled) {
            await this.db.ref('rp_users/' + userKey).remove();
            // También limpiar notificaciones y chats si es necesario
            await this.db.ref('notifications/' + userKey).remove();
        }
    }

    async updateUserField(userKey, field, value) {
        await this.ensureInitialized();
        const users = await this.getUsers();
        if (users[userKey]) {
            users[userKey][field] = value;
            await this.saveUser(userKey, users[userKey]);
        }
    }

    // --- ROLES (Discord-style) ---

    async getRoles() {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('roles').once('value');
            return snap.val() || [];
        }
        return JSON.parse(localStorage.getItem('rp_roles') || '[]');
    }

    async saveRole(roleData) {
        await this.ensureInitialized();
        const roles = await this.getRoles();
        const index = roles.findIndex(r => r.id === roleData.id);
        if (index !== -1) roles[index] = roleData;
        else roles.push(roleData);
        
        localStorage.setItem('rp_roles', JSON.stringify(roles));
        if (this.isFirebaseEnabled) {
            await this.db.ref('roles').set(roles);
        }
    }

    async deleteRole(roleId) {
        await this.ensureInitialized();
        let roles = await this.getRoles();
        roles = roles.filter(r => r.id !== roleId);
        localStorage.setItem('rp_roles', JSON.stringify(roles));
        if (this.isFirebaseEnabled) {
            await this.db.ref('roles').set(roles);
        }
    }

    // --- ECONOMÍA (Concesionario, Tienda, BlackMarket) ---

    async getEconomyItems(category) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('economy/' + category).once('value');
            return snap.val() || [];
        }
        return JSON.parse(localStorage.getItem('rp_economy_' + category) || '[]');
    }

    async saveEconomyItem(category, itemData) {
        await this.ensureInitialized();
        const items = await this.getEconomyItems(category);
        const index = items.findIndex(i => i.id === itemData.id);
        if (index !== -1) items[index] = itemData;
        else items.push(itemData);

        localStorage.setItem('rp_economy_' + category, JSON.stringify(items));
        if (this.isFirebaseEnabled) {
            await this.db.ref('economy/' + category).set(items);
        }
    }

    async deleteEconomyItem(category, itemId) {
        await this.ensureInitialized();
        let items = await this.getEconomyItems(category);
        items = items.filter(i => i.id !== itemId);
        localStorage.setItem('rp_economy_' + category, JSON.stringify(items));
        if (this.isFirebaseEnabled) {
            await this.db.ref('economy/' + category).set(items);
        }
    }

    // --- SERVICIOS (Mecánicos, EMS, Policía) ---

    async sendServiceRequest(jobId, requestData) {
        await this.ensureInitialized();
        const request = {
            ...requestData,
            jobId,
            timestamp: Date.now(),
            status: 'pending', // pending, accepted, rejected, completed
            id: 'req_' + Date.now()
        };

        if (this.isFirebaseEnabled) {
            await this.db.ref('service_requests/' + jobId).child(request.id).set(request);
        } else {
            const requests = JSON.parse(localStorage.getItem('rp_requests_' + jobId) || '{}');
            requests[request.id] = request;
            localStorage.setItem('rp_requests_' + jobId, JSON.stringify(requests));
            window.dispatchEvent(new CustomEvent('rp_requests_updated', { detail: { jobId } }));
        }
        return request;
    }

    async getServiceRequests(jobId) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('service_requests/' + jobId).once('value');
            return snap.val() || {};
        }
        return JSON.parse(localStorage.getItem('rp_requests_' + jobId) || '{}');
    }

    async updateRequestStatus(jobId, requestId, status, workerData = null) {
        await this.ensureInitialized();
        const requests = await this.getServiceRequests(jobId);
        const req = requests[requestId];
        
        if (req) {
            req.status = status;
            if (workerData) req.worker = workerData;
            
            if (this.isFirebaseEnabled) {
                await this.db.ref('service_requests/' + jobId + '/' + requestId).update({ status, worker: workerData });
            } else {
                localStorage.setItem('rp_requests_' + jobId, JSON.stringify(requests));
                // Disparar evento personalizado para que la misma pestaña se entere
                window.dispatchEvent(new CustomEvent('rp_requests_updated', { detail: { jobId } }));
            }

            // Si se completa, realizar el cobro automático si hay precio
            if (status === 'completed' && req.price > 0) {
                const citizenKey = req.userKey;
                const users = await this.getUsers();
                const citizen = users[citizenKey];
                
                if (citizen) {
                    citizen.balance = (citizen.balance || 0) - req.price;
                    if (!citizen.history) citizen.history = [];
                    citizen.history.push({
                        date: new Date().toLocaleDateString(),
                        desc: `Pago de servicio: ${req.serviceName} (${jobId.toUpperCase()})`,
                        amount: -req.price
                    });
                    await this.saveUser(citizenKey, citizen);
                }

                // --- Lógica especial para DESGUACE ---
                if (jobId === 'staff' && req.serviceName.includes('Desguace')) {
                    const vehicleName = req.serviceName.split(': ')[1] || 'un vehículo';
                    await this.postEntorno(req.userKey, 'Punto de Desguace', `Se ha visto a ${req.userName} desguazando un ${vehicleName} en el desguace de Lima.`);
                }
            }

            // Notificar al ciudadano que hizo la solicitud
            const citizenKey = req.userKey;
            await this.pushNotification(citizenKey, {
                title: 'Estado de Solicitud',
                message: `Tu solicitud de ${req.serviceName} ha sido ${status === 'accepted' ? 'ACEPTADA' : (status === 'rejected' ? 'RECHAZADA' : 'COMPLETADA')}. ${status === 'completed' && req.price > 0 ? `Se han descontado $${req.price.toLocaleString()} de tu cuenta.` : ''}`,
                type: status === 'accepted' ? 'success' : (status === 'rejected' ? 'error' : 'info')
            });
        }
    }

    async onRequestsChange(jobId, callback) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const ref = this.db.ref('service_requests/' + jobId);
            const listener = ref.on('value', (snap) => {
                callback(snap.val() || {});
            });
            return () => ref.off('value', listener);
        } else {
            // Modo local: Polling y listener de storage
            const check = () => {
                const requests = JSON.parse(localStorage.getItem('rp_requests_' + jobId) || '{}');
                callback(requests);
            };
            
            const interval = setInterval(check, 3000);
            window.addEventListener('storage', (e) => {
                if (e.key === 'rp_requests_' + jobId) check();
            });
            window.addEventListener('rp_requests_updated', (e) => {
                if (e.detail.jobId === jobId) check();
            });
            
            check(); // Carga inicial
            return () => {
                clearInterval(interval);
            };
        }
    }

    // --- CONFIGURACIÓN GLOBAL / ADMIN ---

    async getGlobalConfig() {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('global_config').once('value');
            return snap.val() || {};
        }
        return JSON.parse(localStorage.getItem('global_config') || '{}');
    }

    async setGlobalConfig(key, value) {
        await this.ensureInitialized();
        const config = await this.getGlobalConfig();
        config[key] = value;
        localStorage.setItem('global_config', JSON.stringify(config));
        if (this.isFirebaseEnabled) {
            await this.db.ref('global_config/' + key).set(value);
        }
    }

    async sendGlobalAnnouncement(title, message, type = 'info') {
        await this.ensureInitialized();
        const users = await this.getUsers();
        const keys = Object.keys(users);
        
        // Notificar a todos los usuarios
        const promises = keys.map(key => this.pushNotification(key, {
            title: `📣 ${title}`,
            message: message,
            type: type,
            isGlobal: true
        }));
        
        await Promise.all(promises);
    }

    // --- SESIÓN ---

    getCurrentUserKey() {
        return localStorage.getItem('currentUser');
    }

    async getCurrentUser() {
        await this.ensureInitialized();
        const key = this.getCurrentUserKey();
        if (!key) return null;
        const users = await this.getUsers();
        return users[key] || null;
    }

    // --- TRANSFERENCIAS / EVENTOS ---

    async pushNotification(userKey, notification) {
        await this.ensureInitialized();
        // Notificaciones en tiempo real
        const notifData = {
            ...notification,
            timestamp: Date.now(),
            read: false,
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
        };

        if (this.isFirebaseEnabled) {
            await this.db.ref('notifications/' + userKey).push(notifData);
        } else {
            // Fallback local: Guardar en el objeto del usuario
            const users = await this.getUsers();
            if (users[userKey]) {
                if (!users[userKey].notifications) users[userKey].notifications = [];
                users[userKey].notifications.push(notifData);
                await this.saveUser(userKey, users[userKey]);
            }
        }
    }

    async onNotificationsChange(userKey, callback) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const ref = this.db.ref('notifications/' + userKey);
            const listener = ref.on('value', (snap) => {
                const data = snap.val() || {};
                // Convertir objeto a array manteniendo IDs si Firebase usa push()
                const notifs = Object.entries(data).map(([key, val]) => ({
                    ...val,
                    id: val.id || key
                }));
                callback(notifs);
            });
            return () => ref.off('value', listener);
        } else {
            // Modo local: Polling y listener de storage
            const check = async () => {
                const users = await this.getUsers();
                if (users[userKey] && users[userKey].notifications) {
                    callback(users[userKey].notifications);
                }
            };
            
            // Usar un ID de intervalo único por usuario para evitar duplicados locales
            if (this._notifInterval) clearInterval(this._notifInterval);
            this._notifInterval = setInterval(check, 2000);
            
            // Remover listener previo si existe para evitar duplicados
            if (this._storageListener) window.removeEventListener('storage', this._storageListener);
            this._storageListener = (e) => {
                if (e.key === 'rp_users') check();
            };
            window.addEventListener('storage', this._storageListener);
            
            check();
            return () => {
                clearInterval(this._notifInterval);
                window.removeEventListener('storage', this._storageListener);
            };
        }
    }

    async markNotificationRead(userKey, notifId) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            // En Firebase, el ID puede ser la clave del push o el campo id
            // Intentamos encontrar la clave si notifId es el campo id
            const ref = this.db.ref('notifications/' + userKey);
            const snap = await ref.once('value');
            const data = snap.val() || {};
            const entry = Object.entries(data).find(([key, val]) => key === notifId || val.id === notifId);
            if (entry) {
                await ref.child(entry[0]).update({ read: true });
            }
        } else {
            const users = await this.getUsers();
            if (users[userKey] && users[userKey].notifications) {
                const notif = users[userKey].notifications.find(n => n.id === notifId);
                if (notif) {
                    notif.read = true;
                    await this.saveUser(userKey, users[userKey]);
                }
            }
        }
    }

    // --- MENSAJERÍA (CausaApp) ---

    _getChatId(u1, u2) {
        return [u1, u2].sort().join('_');
    }

    async sendMessage(sender, receiver, content, isImage = false) {
        await this.ensureInitialized();
        const chatId = this._getChatId(sender, receiver);
        const msg = {
            sender,
            content,
            isImage,
            timestamp: Date.now(),
            id: 'msg_' + Date.now()
        };

        if (this.isFirebaseEnabled) {
            await this.db.ref('chats/' + chatId).push(msg);
        } else {
            const chats = JSON.parse(localStorage.getItem('rp_chats') || '{}');
            if (!chats[chatId]) chats[chatId] = [];
            chats[chatId].push(msg);
            localStorage.setItem('rp_chats', JSON.stringify(chats));
        }

        // Notificar al receptor (Tanto en Firebase como en Local)
        const users = await this.getUsers();
        const senderName = users[sender] ? users[sender].name : sender;
        
        await this.pushNotification(receiver, {
            title: `Nuevo mensaje de ${senderName}`,
            message: isImage ? '📷 Te ha enviado una imagen' : (content.length > 50 ? content.substring(0, 47) + '...' : content),
            type: 'message'
        });
    }

    async onChatChange(sender, receiver, callback) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const chatId = [sender, receiver].sort().join('_');
            const chatRef = this.db.ref('chats/' + chatId);
            
            const listener = chatRef.on('value', (snapshot) => {
                const msgs = snapshot.val() || {};
                callback(Object.values(msgs));
            });

            // Retornar función para desuscribirse
            return () => chatRef.off('value', listener);
        }
        return () => {};
    }

    // Escuchar cambios (Solo para Firebase)
    async onUserChange(userKey, callback) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            this.db.ref('rp_users/' + userKey).on('value', (snapshot) => {
                callback(snapshot.val());
            });
        }
    }

    // --- ENTORNOS Y ESCENAS ---

    async _cleanupOldEntries(refPath, localStorageKey) {
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (this.isFirebaseEnabled) {
            const ref = this.db.ref(refPath);
            const snap = await ref.once('value');
            const data = snap.val() || {};
            
            for (const [key, val] of Object.entries(data)) {
                if (val.timestamp && (now - val.timestamp > twentyFourHours)) {
                    await ref.child(key).remove();
                }
            }
        } else {
            let entries = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
            if (Array.isArray(entries)) {
                entries = entries.filter(e => e.timestamp && (now - e.timestamp <= twentyFourHours));
                localStorage.setItem(localStorageKey, JSON.stringify(entries));
            } else if (typeof entries === 'object') {
                // Para chats que están organizados por escena/chatId
                for (const id in entries) {
                    entries[id] = entries[id].filter(e => e.timestamp && (now - e.timestamp <= twentyFourHours));
                }
                localStorage.setItem(localStorageKey, JSON.stringify(entries));
            }
        }
    }

    async getEntornos() {
        await this.ensureInitialized();
        await this._cleanupOldEntries('entornos', 'rp_entornos');
        
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('entornos').once('value');
            const data = snap.val() || {};
            // Mantener el ID de Firebase para el borrado manual
            return Object.entries(data).map(([key, val]) => ({
                ...val,
                firebaseKey: key
            })).sort((a, b) => b.timestamp - a.timestamp);
        }
        return JSON.parse(localStorage.getItem('rp_entornos') || '[]');
    }

    async deleteEntorno(entornoId, firebaseKey = null) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled && firebaseKey) {
            await this.db.ref('entornos').child(firebaseKey).remove();
        } else {
            let entornos = await this.getEntornos();
            entornos = entornos.filter(e => e.id !== entornoId);
            localStorage.setItem('rp_entornos', JSON.stringify(entornos));
        }
    }

    async postEntorno(userKey, location, content) {
        await this.ensureInitialized();
        const users = await this.getUsers();
        const user = users[userKey] || { name: userKey, avatarUrl: '' };
        
        const entorno = {
            id: 'ent_' + Date.now(),
            userKey,
            userName: user.name,
            userAvatar: user.avatarUrl,
            location,
            content,
            timestamp: Date.now(),
            likes: 0
        };

        if (this.isFirebaseEnabled) {
            await this.db.ref('entornos').push(entorno);
        } else {
            const entornos = await this.getEntornos();
            entornos.unshift(entorno);
            localStorage.setItem('rp_entornos', JSON.stringify(entornos.slice(0, 50)));
        }
        return entorno;
    }

    async onEntornosChange(callback) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const ref = this.db.ref('entornos');
            const listener = ref.on('value', (snap) => {
                const data = snap.val() || {};
                // Asegurar que incluimos la firebaseKey para que el borrado funcione
                const list = Object.entries(data).map(([key, val]) => ({
                    ...val,
                    firebaseKey: key
                })).sort((a, b) => b.timestamp - a.timestamp);
                callback(list);
            });
            return () => ref.off('value', listener);
        } else {
            const check = async () => callback(await this.getEntornos());
            const interval = setInterval(check, 5000);
            window.addEventListener('storage', (e) => { if (e.key === 'rp_entornos') check(); });
            check();
            return () => clearInterval(interval);
        }
    }

    async getScenes() {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled) {
            const snap = await this.db.ref('scenes_config').once('value');
            return snap.val() || [
                { id: 'plaza', name: 'Plaza de Armas' },
                { id: 'hospital', name: 'Hospital Central' },
                { id: 'comisaria', name: 'Comisaría de Lima' },
                { id: 'muelle', name: 'Muelle de Pescadores' }
            ];
        }
        return [
            { id: 'plaza', name: 'Plaza de Armas' },
            { id: 'hospital', name: 'Hospital Central' },
            { id: 'comisaria', name: 'Comisaría de Lima' },
            { id: 'muelle', name: 'Muelle de Pescadores' }
        ];
    }

    async sendSceneMessage(sceneId, userKey, content) {
        await this.ensureInitialized();
        const users = await this.getUsers();
        const user = users[userKey] || { name: userKey };
        
        const msg = {
            id: 'scmsg_' + Date.now(),
            userKey,
            userName: user.name,
            content,
            timestamp: Date.now()
        };

        if (this.isFirebaseEnabled) {
            await this.db.ref('scenes_chat/' + sceneId).push(msg);
        } else {
            const chats = JSON.parse(localStorage.getItem('rp_scenes_chats') || '{}');
            if (!chats[sceneId]) chats[sceneId] = [];
            chats[sceneId].push(msg);
            localStorage.setItem('rp_scenes_chats', JSON.stringify(chats));
        }
        return msg;
    }

    async deleteSceneMessage(sceneId, messageId, firebaseKey = null) {
        await this.ensureInitialized();
        if (this.isFirebaseEnabled && firebaseKey) {
            await this.db.ref('scenes_chat/' + sceneId).child(firebaseKey).remove();
        } else {
            const chats = JSON.parse(localStorage.getItem('rp_scenes_chats') || '{}');
            if (chats[sceneId]) {
                chats[sceneId] = chats[sceneId].filter(m => m.id !== messageId);
                localStorage.setItem('rp_scenes_chats', JSON.stringify(chats));
            }
        }
    }

    async onSceneChatChange(sceneId, callback) {
        await this.ensureInitialized();
        await this._cleanupOldEntries('scenes_chat/' + sceneId, 'rp_scenes_chats');
        
        if (this.isFirebaseEnabled) {
            const ref = this.db.ref('scenes_chat/' + sceneId);
            const listener = ref.on('value', (snap) => {
                const data = snap.val() || {};
                const msgs = Object.entries(data).map(([key, val]) => ({
                    ...val,
                    firebaseKey: key
                }));
                callback(msgs);
            });
            return () => ref.off('value', listener);
        } else {
            const check = () => {
                const chats = JSON.parse(localStorage.getItem('rp_scenes_chats') || '{}');
                callback(chats[sceneId] || []);
            };
            const interval = setInterval(check, 3000);
            window.addEventListener('storage', (e) => { if (e.key === 'rp_scenes_chats') check(); });
            check();
            return () => clearInterval(interval);
        }
    }
}

const Backend = new BackendManager();
window.Backend = Backend; // Hacerlo global para scripts que no son módulos
export default Backend;
