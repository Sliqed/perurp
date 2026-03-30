// js/config.js - Configuración del Backend Global (Firebase)
// Para que el portal funcione en diferentes dispositivos, necesitas una cuenta de Firebase (gratis).
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto nuevo.
// 3. Añade una "Web App".
// 4. Copia los valores de tu config aquí abajo.

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAICZJsNecO6j_XHmMAyJfuoEukCCB_EKY",
    authDomain: "rperu-77dbc.firebaseapp.com",
    databaseURL: "https://peru-rp-datos-default-rtdb.firebaseio.com/",
    projectId: "rperu-77dbc",
    storageBucket: "rperu-77dbc.firebasestorage.app",
    messagingSenderId: "567865574744",
    appId: "1:567865574744:web:54ea19cff8b30d843f512d"
};

// Si FIREBASE_CONFIG.apiKey es "TU_API_KEY", el sistema usará LocalStorage (solo este navegador).
// Una vez pongas tus datos reales, los datos se guardarán en la nube y serán visibles en todos los dispositivos.
export default FIREBASE_CONFIG;
