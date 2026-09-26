/* Sesión de la intranet: Firebase (login con Google institucional), tema y menú de las páginas
   login.html y perfil.html. Expone window.SESION. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const DOMINIO = window.FYA_DOMINIO;

  // Modo prueba: solo en localhost y con ?emu, usa los emuladores de Firebase (firebase emulators:start).
  // Se recuerda durante la pestaña para pasar de login.html a perfil.html.
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  let emu = false;
  try {
    if (local && new URLSearchParams(location.search).has("emu")) sessionStorage.setItem("fya14-emu", "1");
    emu = local && sessionStorage.getItem("fya14-emu") === "1";
  } catch (e) {}
  const cfg = emu ? { apiKey: "emulador", authDomain: "localhost", projectId: "demo-fya14", appId: "emulador", storageBucket: "demo-fya14.appspot.com" } : window.FYA_FIREBASE || {};
  const conectada = !!cfg.apiKey && !/PEGAR_AQUI/.test(cfg.apiKey) && typeof firebase !== "undefined";

  let auth = null, db = null, storage = null;
  if (conectada) {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
    // Storage solo se carga en las páginas que suben archivos (comunidad.html)
    if (firebase.storage) storage = firebase.storage();
    if (emu) {
      auth.useEmulator("http://127.0.0.1:9099");
      db.useEmulator("127.0.0.1", 8081);
      if (storage) storage.useEmulator("127.0.0.1", 9199);
    }
  }

  const esInstitucional = (correo) => typeof correo === "string" && correo.toLowerCase().endsWith("@" + DOMINIO);

  const SESION = {
    conectada, DOMINIO, esInstitucional,

    /* Abre la ventana de Google; el parámetro hd sugiere el dominio, las reglas lo exigen */
    async entrar() {
      const prov = new firebase.auth.GoogleAuthProvider();
      prov.setCustomParameters({ hd: DOMINIO, prompt: "select_account" });
      const { user } = await auth.signInWithPopup(prov);
      if (!esInstitucional(user.email)) {
        await auth.signOut();
        const e = new Error("dominio"); e.code = "fya/dominio"; throw e;
      }
      return user;
    },
    salir: () => (auth ? auth.signOut() : Promise.resolve()),

    /* Llama cb(usuario | null) cuando se sabe si hay sesión */
    alCambiar(cb) {
      if (!auth) return cb(null);
      auth.onAuthStateChanged((u) => cb(u && esInstitucional(u.email) ? u : null));
    },

    /* Documento del estudiante: estudiantes/{correo} */
    async datos(user) {
      const snap = await db.collection("estudiantes").doc(user.email.toLowerCase()).get();
      return snap.exists ? snap.data() : null;
    },

    /* Ficha del docente: docentes/{correo}. null si la cuenta no es de un docente */
    async docente(user) {
      try {
        const snap = await db.collection("docentes").doc(user.email.toLowerCase()).get();
        return snap.exists ? snap.data() : null;
      } catch (e) { return null; }
    },

    /* ¿La cuenta es de administración? (admins/{correo}) */
    async esAdmin(user) {
      try { return (await db.collection("admins").doc(user.email.toLowerCase()).get()).exists; } catch (e) { return false; }
    },

    /* A dónde va cada cuenta al entrar por login.html. La administración tiene su propio acceso (admin-login.html) */
    async destino(user) {
      return (await SESION.docente(user)) ? "docente.html" : "perfil.html";
    },

    /* Ficha pública para la Comunidad: usuarios/{correo} */
    async usuario(user) {
      const snap = await db.collection("usuarios").doc(user.email.toLowerCase()).get();
      return snap.exists ? snap.data() : null;
    },

    db: () => db,
    storage: () => storage,
  };

  /* ---------- Tema ---------- */
  const themeBtn = $("#themeToggle");
  if (themeBtn) {
    const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
    const paint = () => {
      themeBtn.innerHTML = `<i class="ph ph-${isDark() ? "sun" : "moon"}" aria-hidden="true"></i>`;
      themeBtn.setAttribute("aria-pressed", String(isDark()));
      $$("meta[name=theme-color]").forEach((m) => { m.content = isDark() ? "#121011" : "#ffffff"; m.removeAttribute("media"); });
    };
    paint();
    themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("fya14-theme", next); } catch (e) {}
      paint();
      themeBtn.classList.remove("spin"); void themeBtn.offsetWidth; themeBtn.classList.add("spin");
    });
  }

  /* ---------- Menú ---------- */
  const burger = $("#burger"), menu = $("#menu");
  if (burger && menu) {
    const setMenu = (open) => {
      menu.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };
    burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  window.SESION = SESION;
})();
