/* Configuración de Firebase. Los pasos completos están en INTRANET.md (sección "Cómo publicar").
   Mientras apiKey diga "PEGAR_AQUI", el login muestra "Intranet sin conectar" y solo funcionan
   las demostraciones con datos ficticios (?demo). Al pegar los datos reales, las demostraciones se apagan solas. */
window.FYA_FIREBASE = {
  apiKey: "PEGAR_AQUI",
  authDomain: "PEGAR_AQUI.firebaseapp.com",
  projectId: "PEGAR_AQUI",
  storageBucket: "PEGAR_AQUI.appspot.com",
  appId: "PEGAR_AQUI",
};

/* Solo entran cuentas de este dominio. Las reglas de Firestore lo vuelven a comprobar en el servidor. */
window.FYA_DOMINIO = "feyalegria14.edu.pe";
