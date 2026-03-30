/**
 * js/backend.js - Capa de abstracción para persistencia de datos.
 * Maneja la sincronización entre LocalStorage y Firebase (si está configurado).
 */

class BackendManager {
    constructor() {
        this.isFirebaseEnabled = false;
        this.db = null;
        this.init();
    }

    async init() {
        // Intentar cargar la configuración de Firebase
        try {
            const configModule = await import('./config.js');
            const config = configModule.default;

            if (config.apiKey && config.apiKey !== "TU_API_KEY") {
                // Inicializar Firebase (usando SDK v8 compat para simplicidad en este proyecto)
                if (typeof firebase !== 'undefined') {
                    firebase.initializeApp(config);
                    this.db = firebase.database();
                    this.isFirebaseEnabled = true;
                    console.log("✅ Backend: Firebase habilitado (Datos globales sincronizados)");
                } else {
                    console.warn("⚠️ Backend: SDK de Firebase no detectado en el HTML. Usando LocalStorage.");
                }
            } else {
                console.log("ℹ️ Backend: Usando LocalStorage (Solo este navegador). Configura Firebase en js/config.js para modo global.");
            }
        } catch (e) {
            console.error("❌ Error inicializando el backend:", e);
        }
    }

    // --- USUARIOS ---

    async getUsers() {
        if (this.isFirebaseEnabled) {
            const snapshot = await this.db.ref('rp_users').once('value');
            return snapshot.val() || {};
        }
        return JSON.parse(localStorage.getItem('rp_users') || '{}');
    }

    async saveUser(userKey, userData) {
        // Siempre guardar en LocalStorage como respaldo/caché
        const localUsers = JSON.parse(localStorage.getItem('rp_users') || '{}');
        localUsers[userKey] = userData;
        localStorage.setItem('rp_users', JSON.stringify(localUsers));

        if (this.isFirebaseEnabled) {
            await this.db.ref('rp_users/' + userKey).set(userData);
        }
    }

    async updateUserField(userKey, field, value) {
        const users = await this.getUsers();
        if (users[userKey]) {
            users[userKey][field] = value;
            await this.saveUser(userKey, users[userKey]);
        }
    }

    // --- SESIÓN ---

    getCurrentUserKey() {
        return localStorage.getItem('currentUser');
    }

    async getCurrentUser() {
        const key = this.getCurrentUserKey();
        if (!key) return null;
        const users = await this.getUsers();
        return users[key] || null;
    }

    // --- TRANSFERENCIAS / EVENTOS ---

    async pushNotification(userKey, notification) {
        // Notificaciones en tiempo real
        if (this.isFirebaseEnabled) {
            await this.db.ref('notifications/' + userKey).push({
                ...notification,
                timestamp: Date.now(),
                read: false
            });
        } else {
            // Fallback local: Guardar en el objeto del usuario
            const users = await this.getUsers();
            if (users[userKey]) {
                if (!users[userKey].notifications) users[userKey].notifications = [];
                users[userKey].notifications.push({
                    ...notification,
                    timestamp: Date.now(),
                    read: false
                });
                await this.saveUser(userKey, users[userKey]);
            }
        }
    }

    // Escuchar cambios (Solo para Firebase)
    onUserChange(userKey, callback) {
        if (this.isFirebaseEnabled) {
            this.db.ref('rp_users/' + userKey).on('value', (snapshot) => {
                callback(snapshot.val());
            });
        }
    }
}

const Backend = new BackendManager();
window.Backend = Backend; // Hacerlo global para scripts que no son módulos
export default Backend;
