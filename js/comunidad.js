/* El Patio: red social interna. Publicaciones con texto, fotos, video y encuestas; me gusta,
   comentarios, perfiles con grado y sección oficiales, reportes y moderación docente.
   Con Firebase conectado usa Firestore y Storage (reglas en firestore.rules y storage.rules).
   Sin conexión solo existe la demostración (?demo, o ?demo=docente para ver la moderación). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const S = window.SESION;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const q = new URLSearchParams(location.search);
  const LIM = { texto: 2000, fotos: 4, fotoMB: 10, videoMB: 50, lado: 1600, pagina: 10 };

  /* ---------- Utilidades de presentación ---------- */
  // Nombre y primer apellido: "Rosa Elena Paredes Villanueva" -> RP
  const iniciales = (n) => { const p = String(n || "?").split(" ").filter(Boolean); return ((p[0] || "?")[0] + ((p.length >= 4 ? p[2] : p[1]) || "").charAt(0)).toUpperCase(); };
  const seccionDe = (u) => (u.rol === "docente" ? "doc" : (u.aula || "A").slice(-1));
  // Con foto oficial (usuarios/{correo}.foto) se muestra la foto; si no, las iniciales en el color de su sección
  const avatar = (u, cls = "") => `<span class="avatar ${cls}" data-sec="${seccionDe(u)}" data-autor="${esc(u.autor || u.correo || "")}" aria-hidden="true">${u.foto ? `<img src="${esc(u.foto)}" alt="" loading="lazy">` : esc(iniciales(u.nombre))}</span>`;
  const chip = (u) => u.rol === "docente"
    ? `<span class="chip-rol chip-rol--doc"><i class="ph ph-chalkboard-teacher" aria-hidden="true"></i>${esc(u.etiqueta || "Docente")}</span>`
    : `<span class="chip-rol" data-sec="${seccionDe(u)}"><b>${esc(corto(u.aula))}</b>${esc((u.etiqueta || "").split(",")[1] || "")}</span>`;
  const corto = (aula) => (aula ? `${aula.slice(1, -1)}.° ${aula.slice(-1)}` : "");
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const fmtFecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });
  const hace = (d) => {
    if (!d) return "ahora";
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return "ahora";
    if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
    if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
    if (s < 86400 * 6) return rtf.format(-Math.round(s / 86400), "day");
    return fmtFecha.format(d);
  };
  // Texto seguro: primero se escapa, luego se enlazan las direcciones web
  const conEnlaces = (t) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)"'])/g, '<a href="$1" target="_blank" rel="noopener nofollow ugc">$1</a>').replace(/\n/g, "<br>");
  let toastT = 0;
  const toast = (txt, tipo) => {
    const t = $("#toast"); t.textContent = txt; t.dataset.tipo = tipo || ""; t.hidden = false;
    t.classList.remove("is-in"); void t.offsetWidth; t.classList.add("is-in");
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("is-in"); setTimeout(() => { t.hidden = true; }, 300); }, 3200);
  };
  const mostrar = (id) => ["cargando", "vacio", "app"].forEach((x) => { $("#" + x).hidden = x !== id; });

  /* ================= Demostración (datos ficticios, en memoria) ================= */
  const demoApi = (comoDocente) => {
    const D = "@" + S.DOMINIO;
    const U = {
      ["thiago.quispe" + D]: { nombre: "Thiago Quispe Huamán", rol: "estudiante", aula: "s3B", etiqueta: "3.° año B, secundaria" },
      ["valeria.castillo" + D]: { nombre: "Valeria Castillo Rojas", rol: "estudiante", aula: "s3B", etiqueta: "3.° año B, secundaria" },
      ["mateo.alva" + D]: { nombre: "Mateo Alva Paredes", rol: "estudiante", aula: "s3A", etiqueta: "3.° año A, secundaria" },
      ["kiara.flores" + D]: { nombre: "Kiara Flores León", rol: "estudiante", aula: "s5C", etiqueta: "5.° año C, secundaria" },
      ["gael.reyes" + D]: { nombre: "Gael Reyes Polo", rol: "estudiante", aula: "p6D", etiqueta: "6.° grado D, primaria" },
      ["camila.ruiz" + D]: { nombre: "Camila Ruiz Guevara", rol: "estudiante", aula: "s4A", etiqueta: "4.° año A, secundaria" },
      ["rosa.paredes" + D]: { nombre: "Rosa Elena Paredes Villanueva", rol: "docente", aula: "", etiqueta: "Docente, tutoría de 3.° año B" },
      ["jorge.cerna" + D]: { nombre: "Jorge Cerna Alva", rol: "docente", aula: "", etiqueta: "Docente de Educación Física" },
    };
    const yo = comoDocente ? "rosa.paredes" + D : "thiago.quispe" + D;
    const min = (m) => new Date(Date.now() - m * 60000);
    const foto = (u, w, h) => ({ tipo: "imagen", url: u, path: "", w, h });
    const un = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`;
    let seq = 0;
    const P = [];
    const pub = (autor, m, texto, extra = {}) => {
      const u = U[autor];
      P.push({ id: "d" + ++seq, autor, nombre: u.nombre, rol: u.rol, aula: u.aula, etiqueta: u.etiqueta, texto, media: [], encuesta: null, likes: {}, votos: {}, oculto: false, creado: min(m), comentarios: [], ...extra });
    };
    const likes = (...c) => Object.fromEntries(c.map((x) => [x + D, true]));
    const com = (autor, m, texto) => ({ id: "c" + ++seq, autor, ...U[autor], texto, creado: min(m) });
    pub("jorge.cerna" + D, 25, "¡Así se vivió la final del campeonato interaulas bajo el techo del patio! Felicitaciones a 5.° C, campeones de este año. Gracias a las familias que vinieron a alentar.", {
      media: [foto("img/colegio-3.jpg", 596, 335), foto("img/colegio-2.jpg", 596, 335)],
      likes: likes("kiara.flores", "mateo.alva", "valeria.castillo", "camila.ruiz", "gael.reyes"),
      comentarios: [com("kiara.flores" + D, 20, "¡Vamos 5.° C! Gracias profe por organizarlo."), com("mateo.alva" + D, 12, "El próximo año la copa es de 3.° A 😤")],
    });
    pub("valeria.castillo" + D, 95, "Terminamos la maqueta del horno solar para Ciencia y Tecnología. Mañana medimos la temperatura al mediodía, crucen los dedos para que haya sol.", {
      media: [foto(un("1588072432836-e10032774350"), 1200, 800)],
      likes: likes("thiago.quispe", "rosa.paredes", "camila.ruiz"),
      comentarios: [com("rosa.paredes" + D, 80, "¡Excelente trabajo, equipo! Anoten todo en la bitácora.")],
    });
    pub("rosa.paredes" + D, 180, "Encuesta para 3.° B: ¿a dónde vamos en el paseo de integración?", {
      encuesta: { pregunta: "¿A dónde vamos en el paseo de integración?", opciones: ["Playa Tortugas", "Isla Blanca en bote", "Museo de Sitio de Chavín", "Parque Ecológico de Nuevo Chimbote"] },
      votos: { ["valeria.castillo" + D]: 0, ["mateo.alva" + D]: 1, ["camila.ruiz" + D]: 0, ["gael.reyes" + D]: 3, ["kiara.flores" + D]: 0 },
      likes: likes("valeria.castillo"),
    });
    pub("gael.reyes" + D, 60 * 26, "Hoy en Plan lector terminamos «El caballero Carmelo». ¿Quién más lloró al final? 🐓", {
      likes: likes("camila.ruiz", "valeria.castillo", "jorge.cerna"),
      comentarios: [com("camila.ruiz" + D, 60 * 25, "Yo lo leí en 6.° también, es de los mejores."), com("thiago.quispe" + D, 60 * 24, "Nooo, no hagas spoiler jaja")],
    });
    pub("camila.ruiz" + D, 60 * 50, "Mural terminado en el pasillo del segundo piso. Pasen a verlo en el recreo.", {
      media: [foto(un("1546410531-bb4caa6b424d"), 1200, 800), foto(un("1497633762265-9d179a990aa6"), 1200, 800), foto("img/colegio-1.jpg", 615, 325)],
      likes: likes("kiara.flores", "gael.reyes", "rosa.paredes", "mateo.alva"),
    });
    pub("mateo.alva" + D, 60 * 70, "¿Alguien de 3.° A tiene la ficha de fracciones de Matemática? La dejé en el salón. Pueden dejarla en secretaría, gracias.", {
      comentarios: [com("thiago.quispe" + D, 60 * 69, "Yo la tengo, mañana te la paso en la formación.")],
    });
    // Publicación reportada y oculta: solo la ve un docente, para mostrar la moderación
    pub("kiara.flores" + D, 60 * 5, "Publicación de prueba que fue reportada.", { oculto: true, ocultoPor: "rosa.paredes" + D });
    const reportes = [{ id: "r1", pub: P[P.length - 1].id, motivo: "Burla o acoso", por: "anon", creado: min(30) }];

    const copia = (x) => (x == null ? x : { ...x, media: [...(x.media || [])], likes: { ...x.likes }, votos: { ...x.votos }, comentarios: undefined });
    const visible = (p) => !p.oculto || p.autor === yo || comoDocente;
    return {
      demo: true, correo: yo,
      yo: async () => ({ correo: yo, ...U[yo] }),
      usuario: async (c) => U[c] || null,
      feed: async ({ filtro, yoU, despues }) => {
        let l = P.filter(visible);
        if (filtro === "aula") l = l.filter((p) => p.aula === yoU.aula);
        if (filtro === "grado") l = l.filter((p) => p.aula && p.aula.slice(0, -1) === yoU.aula.slice(0, -1));
        if (filtro === "docentes") l = l.filter((p) => p.rol === "docente");
        if (filtro === "ocultas") l = P.filter((p) => p.oculto);
        if (filtro && filtro.startsWith("autor:")) l = l.filter((p) => p.autor === filtro.slice(6));
        l = l.sort((a, b) => b.creado - a.creado);
        const i = despues ? l.findIndex((p) => p.id === despues) + 1 : 0;
        const items = l.slice(i, i + LIM.pagina).map(copia);
        return { items, ultimo: items.length ? items[items.length - 1].id : null, hayMas: i + LIM.pagina < l.length };
      },
      publicar: async ({ texto, archivos, encuesta }, progreso) => {
        for (let k = 1; k <= 10; k++) { await new Promise((r) => setTimeout(r, 60)); progreso(k / 10); }
        const media = archivos.map((a) => ({ tipo: a.tipo, url: URL.createObjectURL(a.blob), path: "", w: a.w, h: a.h }));
        const u = U[yo];
        const p = { id: "d" + ++seq, autor: yo, nombre: u.nombre, rol: u.rol, aula: u.aula, etiqueta: u.etiqueta, texto, media, encuesta, likes: {}, votos: {}, oculto: false, creado: new Date(), comentarios: [] };
        P.push(p); return copia(p);
      },
      like: async (id, on) => { const p = P.find((x) => x.id === id); if (on) p.likes[yo] = true; else delete p.likes[yo]; },
      votar: async (id, i) => { P.find((x) => x.id === id).votos[yo] = i; },
      comentarios: async (id) => P.find((x) => x.id === id).comentarios.slice(),
      comentar: async (id, texto) => { const c = { id: "c" + ++seq, autor: yo, ...U[yo], texto, creado: new Date() }; P.find((x) => x.id === id).comentarios.push(c); return c; },
      borrarComentario: async (id, cid) => { const p = P.find((x) => x.id === id); p.comentarios = p.comentarios.filter((c) => c.id !== cid); },
      borrar: async (id) => { const i = P.findIndex((x) => x.id === id); P.splice(i, 1); },
      ocultar: async (id, on) => { const p = P.find((x) => x.id === id); p.oculto = on; p.ocultoPor = yo; },
      reportar: async (id, motivo) => { reportes.push({ id: "r" + ++seq, pub: id, motivo, por: yo, creado: new Date() }); },
      reportes: async () => reportes.slice().reverse(),
      cerrarReporte: async (rid) => { const i = reportes.findIndex((r) => r.id === rid); if (i >= 0) reportes.splice(i, 1); },
      ranking: async () => P.filter((p) => !p.oculto && p.aula).reduce((m, p) => (m[p.aula] = (m[p.aula] || 0) + 1, m), {}),
      escucharNuevas: () => () => {},
    };
  };

  /* ================= Firebase ================= */
  const fbApi = (user) => {
    const db = S.db(), st = S.storage(), FS = firebase.firestore;
    const yo = user.email.toLowerCase();
    let docente = false;
    const col = db.collection("publicaciones");
    const aObj = (d) => { const x = d.data({ serverTimestamps: "estimate" }); return { id: d.id, ...x, creado: x.creado ? x.creado.toDate() : new Date() }; };
    const cacheU = new Map();
    const base = (filtro, yoU) => {
      let r = col;
      if (filtro === "ocultas") return r.where("oculto", "==", true).orderBy("creado", "desc");
      if (!docente) r = r.where("oculto", "==", false);
      if (filtro === "aula") r = r.where("aula", "==", yoU.aula);
      if (filtro === "grado") r = r.where("aula", "in", ["A", "B", "C", "D"].map((s) => yoU.aula.slice(0, -1) + s));
      if (filtro === "docentes") r = r.where("rol", "==", "docente");
      if (filtro && filtro.startsWith("autor:")) r = r.where("autor", "==", filtro.slice(6));
      return r.orderBy("creado", "desc");
    };
    const cursores = new Map();
    return {
      demo: false, correo: yo,
      yo: async () => { const u = await S.usuario(user); docente = !!(u && u.rol === "docente"); return u && { correo: yo, ...u }; },
      usuario: async (c) => {
        if (!cacheU.has(c)) cacheU.set(c, db.collection("usuarios").doc(c).get().then((s) => (s.exists ? s.data() : null)).catch(() => null));
        return cacheU.get(c);
      },
      feed: async ({ filtro, yoU, despues }) => {
        let r = base(filtro, yoU);
        if (despues && cursores.has(despues)) r = r.startAfter(cursores.get(despues));
        const snap = await r.limit(LIM.pagina + 1).get();
        const docs = snap.docs.slice(0, LIM.pagina);
        docs.forEach((d) => cursores.set(d.id, d));
        return { items: docs.map(aObj), ultimo: docs.length ? docs[docs.length - 1].id : null, hayMas: snap.docs.length > LIM.pagina };
      },
      publicar: async ({ texto, archivos, encuesta }, progreso, yoU) => {
        const ref = col.doc();
        const total = archivos.reduce((n, a) => n + a.blob.size, 0) || 1;
        let subido = 0;
        const media = [], rutas = [];
        try {
          for (const [i, a] of archivos.entries()) {
            const path = `publicaciones/${yo}/${ref.id}-${i}.${a.ext}`;
            rutas.push(path);
            const tarea = st.ref(path).put(a.blob, { contentType: a.blob.type, cacheControl: "public,max-age=31536000" });
            const antes = subido;
            tarea.on("state_changed", (s) => progreso((antes + s.bytesTransferred) / total * 0.95));
            await tarea;
            subido += a.blob.size;
            media.push({ tipo: a.tipo, path, url: await st.ref(path).getDownloadURL(), w: a.w, h: a.h });
          }
          await ref.set({ autor: yo, nombre: yoU.nombre, rol: yoU.rol, aula: yoU.aula, etiqueta: yoU.etiqueta, texto, media, encuesta, likes: {}, votos: {}, oculto: false, creado: FS.FieldValue.serverTimestamp() });
          progreso(1);
          return aObj(await ref.get());
        } catch (e) {
          // Si la publicación no se guardó, se borran los archivos que alcanzaron a subir
          await Promise.all(rutas.map((p) => st.ref(p).delete().catch(() => {})));
          throw e;
        }
      },
      like: (id, on) => col.doc(id).update(new FS.FieldPath("likes", yo), on ? true : FS.FieldValue.delete()),
      votar: (id, i) => col.doc(id).update(new FS.FieldPath("votos", yo), i),
      comentarios: async (id) => (await col.doc(id).collection("comentarios").orderBy("creado").limit(200).get()).docs.map(aObj),
      comentar: async (id, texto, yoU) => {
        const ref = col.doc(id).collection("comentarios").doc();
        await ref.set({ autor: yo, nombre: yoU.nombre, rol: yoU.rol, aula: yoU.aula, etiqueta: yoU.etiqueta, texto, creado: FS.FieldValue.serverTimestamp() });
        return aObj(await ref.get());
      },
      borrarComentario: (id, cid) => col.doc(id).collection("comentarios").doc(cid).delete(),
      borrar: async (id, p) => {
        // Primero los comentarios (Firestore no los borra solos), luego la publicación y sus archivos
        const coms = await col.doc(id).collection("comentarios").get();
        await Promise.all(coms.docs.map((d) => d.ref.delete()));
        await col.doc(id).delete();
        await Promise.all((p.media || []).map((m) => st.ref(m.path).delete().catch(() => {})));
      },
      ocultar: (id, on) => col.doc(id).update({ oculto: on, ocultoPor: yo }),
      reportar: (id, motivo) => db.collection("reportes").add({ pub: id, motivo, por: yo, creado: FS.FieldValue.serverTimestamp() }),
      reportes: async () => (await db.collection("reportes").orderBy("creado", "desc").limit(30).get()).docs.map(aObj),
      cerrarReporte: (rid) => db.collection("reportes").doc(rid).delete(),
      ranking: async () => {
        const s = await base("", null).limit(80).get();
        return s.docs.map(aObj).filter((p) => p.aula).reduce((m, p) => (m[p.aula] = (m[p.aula] || 0) + 1, m), {});
      },
      // Aviso de publicaciones nuevas mientras se lee
      escucharNuevas: (desde, cb) => base("", null).limit(5).onSnapshot((s) => cb(s.docs.map(aObj).filter((p) => p.creado > desde && p.autor !== yo).length), () => {}),
    };
  };

  /* ================= Estado ================= */
  let api, yoU, filtro = "todo", ultimo = null, perfilDe = null;
  const posts = new Map(); // id -> publicación
  const esDoc = () => yoU.rol === "docente";

  /* ================= Cabecera, filtros y perfil ================= */
  const pintarYo = () => {
    const url = `comunidad.html?u=${encodeURIComponent(yoU.correo)}${api.demo ? "&" + demoQ : ""}`;
    $("#yoCard").href = url; $("#yoMini").href = url;
    $("#yoCard").innerHTML = `<span class="yo-card__banda" data-sec="${seccionDe(yoU)}"></span>${avatar(yoU, "avatar--xl")}
      <strong>${esc(yoU.nombre)}</strong>${chip(yoU)}<span class="yo-card__ver">Ver mi perfil <i class="ph ph-arrow-right" aria-hidden="true"></i></span>`;
    $("#yoMini").innerHTML = avatar(yoU, "avatar--sm");
    $("#compAvatar").outerHTML = avatar(yoU);
    $("#compTexto").placeholder = `¿Qué quieres compartir, ${yoU.nombre.split(" ")[0]}?`;
    $("#linkIntranet").href = api.demo ? (esDoc() ? "docente.html?demo" : "perfil.html?demo") : (esDoc() ? "docente.html" : "perfil.html");
    const F = esDoc()
      ? [["todo", "house", "Todo el colegio"], ["docentes", "chalkboard-teacher", "Docentes"], ["ocultas", "eye-slash", "Ocultas"]]
      : [["todo", "house", "Todo el colegio"], ["grado", "users-three", `Mi grado (${yoU.aula.slice(1, -1)}.°)`], ["aula", "chalkboard", `Mi aula (${corto(yoU.aula)})`], ["docentes", "chalkboard-teacher", "Docentes"]];
    $("#filtros").innerHTML = F.map(([k, i, t]) => `<button type="button" data-f="${k}" aria-pressed="${k === filtro}"><i class="ph ph-${i}" aria-hidden="true"></i><span>${t}</span></button>`).join("");
  };
  $("#filtros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    filtro = b.dataset.f;
    $$("#filtros [data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    cargar(true);
  });

  const pintarPerfil = async (correo) => {
    const u = await api.usuario(correo);
    const cont = $("#perfilSocial");
    if (!u) { cont.hidden = false; cont.innerHTML = `<div class="ps-vacio">Esta persona no está en el Patio.</div>`; return false; }
    const mio = correo === yoU.correo;
    cont.hidden = false;
    cont.innerHTML = `<div class="ps-portada" data-sec="${seccionDe(u)}"><span class="ps-grado" aria-hidden="true">${u.rol === "docente" ? '<i class="ph ph-chalkboard-teacher"></i>' : esc(corto(u.aula))}</span></div>
      <div class="ps-cuerpo">
        ${avatar(u, "avatar--xxl")}
        <div class="ps-datos">
          <h1 id="psNombre">${esc(u.nombre)}</h1>
          ${chip(u)}
          <ul class="ps-meta">
            ${u.rol === "docente" ? `<li><i class="ph ph-chalkboard-teacher" aria-hidden="true"></i>${esc(u.etiqueta)}</li>` : `<li><i class="ph ph-student" aria-hidden="true"></i>Estudiante de ${esc(u.etiqueta)}</li>`}
            <li><i class="ph ph-images" aria-hidden="true"></i><span id="psConteo">Publicaciones</span></li>
          </ul>
        </div>
        ${u.rol === "estudiante" ? `<a class="btn btn--ghost btn--sm" href="aula.html?g=${u.aula.slice(0, -1)}&s=${u.aula.slice(-1)}"><i class="ph ph-door-open" aria-hidden="true"></i>Portal de ${esc(corto(u.aula))}</a>` : ""}
      </div>
      <a class="ps-volver link" href="comunidad.html${api.demo ? "?" + demoQ : ""}"><i class="ph ph-arrow-left" aria-hidden="true"></i> Volver a todas las publicaciones</a>`;
    document.documentElement.dataset.seccion = u.rol === "docente" ? "A" : u.aula.slice(-1);
    document.title = `${u.nombre} | El Patio`;
    $("#compositor").hidden = !mio;
    return true;
  };

  /* ================= Publicaciones ================= */
  const mediaHtml = (p) => {
    const m = p.media || [];
    if (!m.length) return "";
    if (m[0].tipo === "video") return `<div class="media media--video"><video src="${esc(m[0].url)}" controls preload="metadata" playsinline ${m[0].w ? `width="${m[0].w}" height="${m[0].h}"` : ""}></video></div>`;
    return `<div class="media media--${Math.min(m.length, 4)}">${m.map((x, i) => `<button type="button" class="media__item" data-foto="${i}" aria-label="Ver foto ${i + 1} de ${m.length} en grande"><img src="${esc(x.url)}" alt="" loading="lazy" ${x.w ? `width="${x.w}" height="${x.h}"` : ""}></button>`).join("")}</div>`;
  };
  const encuestaHtml = (p) => {
    if (!p.encuesta) return "";
    const votos = Object.values(p.votos || {}), total = votos.length, mio = (p.votos || {})[yoU.correo];
    const yaVote = mio !== undefined;
    return `<div class="encuesta${yaVote ? " is-votada" : ""}"><p class="encuesta__q"><i class="ph ph-chart-bar-horizontal" aria-hidden="true"></i>${esc(p.encuesta.pregunta)}</p>
      <ul>${p.encuesta.opciones.map((o, i) => {
        const n = votos.filter((v) => v === i).length, pct = total ? Math.round((n / total) * 100) : 0;
        return `<li><button type="button" class="enc-op${mio === i ? " is-mia" : ""}" data-voto="${i}" aria-pressed="${mio === i}" ${p.oculto ? "disabled" : ""}>
          <span class="enc-op__barra" style="--p:${yaVote ? pct : 0}"></span><span class="enc-op__txt">${mio === i ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>' : ""}${esc(o)}</span>${yaVote ? `<b>${pct}%</b>` : ""}</button></li>`;
      }).join("")}</ul>
      <p class="encuesta__pie">${total} ${total === 1 ? "voto" : "votos"}${yaVote ? ". Puedes cambiar tu voto." : ". Vota para ver los resultados."}</p></div>`;
  };
  const likesDe = (p) => Object.keys(p.likes || {}).length;
  const postHtml = (p) => {
    const mio = p.autor === yoU.correo, yaLike = !!(p.likes || {})[yoU.correo];
    const acciones = [
      mio ? `<button type="button" role="menuitem" data-acc="borrar"><i class="ph ph-trash" aria-hidden="true"></i>Eliminar</button>` : "",
      esDoc() ? `<button type="button" role="menuitem" data-acc="ocultar"><i class="ph ph-eye${p.oculto ? "" : "-slash"}" aria-hidden="true"></i>${p.oculto ? "Volver a mostrar" : "Ocultar a estudiantes"}</button>` : "",
      !mio ? `<button type="button" role="menuitem" data-acc="reportar"><i class="ph ph-flag" aria-hidden="true"></i>Reportar</button>` : "",
    ].join("");
    const perfilUrl = `comunidad.html?u=${encodeURIComponent(p.autor)}${api.demo ? "&" + demoQ : ""}`;
    return `<li class="pub${p.oculto ? " is-oculto" : ""}" data-id="${esc(p.id)}" data-sec="${seccionDe(p)}">
      ${p.oculto ? `<p class="pub__oculto"><i class="ph ph-eye-slash" aria-hidden="true"></i>Oculta para estudiantes por moderación.</p>` : ""}
      <header class="pub__cab">
        <a href="${perfilUrl}" class="pub__autor">${avatar(p)}<span><strong>${esc(p.nombre)}</strong>${chip(p)}</span></a>
        <time class="pub__hora" datetime="${p.creado.toISOString()}" title="${p.creado.toLocaleString("es-PE")}">${hace(p.creado)}</time>
        <div class="pub__menu">
          <button type="button" class="icon-btn icon-btn--sm" data-menu aria-label="Opciones de la publicación" aria-haspopup="menu" aria-expanded="false"><i class="ph ph-dots-three" aria-hidden="true"></i></button>
          <div class="menu-pop" role="menu" hidden>${acciones}</div>
        </div>
      </header>
      ${p.texto ? `<div class="pub__texto${p.texto.length < 90 && !(p.media || []).length && !p.encuesta ? " pub__texto--grande" : ""}">${conEnlaces(p.texto)}</div>` : ""}
      ${mediaHtml(p)}${encuestaHtml(p)}
      <div class="pub__barra">
        <button type="button" class="reac${yaLike ? " is-on" : ""}" data-like aria-pressed="${yaLike}" ${p.oculto ? "disabled" : ""}><i class="${yaLike ? "ph-fill" : "ph"} ph-heart" aria-hidden="true"></i><span class="reac__n">${likesDe(p) || ""}</span><span class="sr-only">Me gusta</span></button>
        <button type="button" class="reac" data-coment aria-expanded="false"><i class="ph ph-chat-circle" aria-hidden="true"></i><span class="reac__n" data-ncom></span><span class="sr-only">Comentarios</span></button>
      </div>
      <section class="comentarios" aria-label="Comentarios">
        <ol class="comentarios__lista"></ol>
        <button type="button" class="link comentarios__todos" hidden></button>
        ${p.oculto ? "" : `<form class="comentar"><label class="sr-only" for="c-${esc(p.id)}">Escribe un comentario</label>${avatar(yoU, "avatar--sm")}<input id="c-${esc(p.id)}" maxlength="500" placeholder="Escribe un comentario…" autocomplete="off"><button type="submit" class="icon-btn icon-btn--sm" aria-label="Enviar comentario"><i class="ph ph-paper-plane-right" aria-hidden="true"></i></button></form>`}
      </section>
    </li>`;
  };

  // Comentarios: se muestran los 2 últimos; "Ver todos" despliega el resto
  const comentarioHtml = (c) => `<li class="coment" data-cid="${esc(c.id)}">
      <a href="comunidad.html?u=${encodeURIComponent(c.autor)}${api.demo ? "&" + demoQ : ""}">${avatar(c, "avatar--sm")}</a>
      <div class="coment__burbuja"><p><a class="coment__autor" href="comunidad.html?u=${encodeURIComponent(c.autor)}${api.demo ? "&" + demoQ : ""}">${esc(c.nombre)}</a> <span class="coment__rol">${c.rol === "docente" ? "Docente" : esc(corto(c.aula))}</span></p><p>${conEnlaces(c.texto)}</p></div>
      <span class="coment__hora">${hace(c.creado)}${c.autor === yoU.correo || esDoc() ? ` <button type="button" class="coment__borrar" data-borrar-com>Eliminar</button>` : ""}</span>
    </li>`;
  const pintarComentarios = (li, lista, todos) => {
    const p = posts.get(li.dataset.id);
    p._com = lista;
    const vis = todos ? lista : lista.slice(-2);
    $(".comentarios__lista", li).innerHTML = vis.map(comentarioHtml).join("");
    const b = $(".comentarios__todos", li);
    b.hidden = todos || lista.length <= 2;
    b.textContent = `Ver los ${lista.length} comentarios`;
    $("[data-ncom]", li).textContent = lista.length || "";
    ponerFotos(lista.map((c) => c.autor));
  };
  const cargarComentarios = async (li, todos) => {
    try { pintarComentarios(li, await api.comentarios(li.dataset.id), todos); } catch (e) { /* sin comentarios visibles */ }
  };

  const agregar = (lista, alInicio) => {
    const html = lista.map(postHtml).join("");
    const ol = $("#lista");
    ol.insertAdjacentHTML(alInicio ? "afterbegin" : "beforeend", html);
    lista.forEach((p) => {
      posts.set(p.id, p);
      const li = $(`.pub[data-id="${CSS.escape(p.id)}"]`, ol);
      cargarComentarios(li, false);
    });
    ponerFotos(lista.map((p) => p.autor));
  };
  // Las publicaciones no guardan la foto; se toma de la ficha de cada autor (en caché)
  const ponerFotos = (autores) => [...new Set(autores)].forEach(async (c) => {
    const u = await api.usuario(c).catch(() => null);
    if (!u || !u.foto) return;
    $$(`.avatar[data-autor="${CSS.escape(c)}"]:not(:has(img))`).forEach((el) => { el.innerHTML = `<img src="${esc(u.foto)}" alt="" loading="lazy">`; });
  });

  const cargar = async (reiniciar) => {
    if (reiniciar) { $("#lista").innerHTML = skeleton(); posts.clear(); ultimo = null; }
    $("#verMas").disabled = true;
    try {
      const f = perfilDe ? "autor:" + perfilDe : filtro;
      const r = await api.feed({ filtro: f, yoU, despues: ultimo });
      if (reiniciar) $("#lista").innerHTML = "";
      agregar(r.items, false);
      ultimo = r.ultimo;
      $("#verMas").hidden = !r.hayMas;
      $("#feedFin").hidden = r.hayMas || !posts.size;
      if (!posts.size) $("#lista").innerHTML = `<li class="feed-vacio"><i class="ph ph-sparkle" aria-hidden="true"></i><p>${perfilDe ? "Todavía no hay publicaciones aquí." : filtro === "ocultas" ? "No hay publicaciones ocultas." : "Nadie publicó todavía. ¡Sé la primera persona!"}</p></li>`;
      if (perfilDe && $("#psConteo")) $("#psConteo").textContent = `${posts.size}${r.hayMas ? "+" : ""} ${posts.size === 1 ? "publicación" : "publicaciones"}`;
    } catch (e) {
      console.error(e);
      $("#lista").innerHTML = `<li class="feed-vacio"><i class="ph ph-wifi-slash" aria-hidden="true"></i><p>No se pudieron cargar las publicaciones. Revisa tu conexión.</p></li>`;
    }
    $("#verMas").disabled = false;
  };
  const skeleton = () => Array.from({ length: 3 }, () => `<li class="pub pub--esqueleto" aria-hidden="true"><div class="esq esq--cab"></div><div class="esq esq--l"></div><div class="esq esq--l esq--corta"></div><div class="esq esq--media"></div></li>`).join("");
  $("#verMas").addEventListener("click", () => cargar(false));

  /* ---------- Acciones sobre una publicación ---------- */
  let reportando = null;
  const cerrarMenus = (salvo) => $$(".menu-pop").forEach((m) => { if (m !== salvo) { m.hidden = true; m.previousElementSibling.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".pub__menu")) cerrarMenus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenus(); });

  $("#lista").addEventListener("click", async (e) => {
    const li = e.target.closest(".pub"); if (!li || li.classList.contains("pub--esqueleto")) return;
    const id = li.dataset.id, p = posts.get(id);

    const menuBtn = e.target.closest("[data-menu]");
    if (menuBtn) {
      const pop = menuBtn.nextElementSibling;
      cerrarMenus(pop);
      pop.hidden = !pop.hidden; menuBtn.setAttribute("aria-expanded", String(!pop.hidden));
      if (!pop.hidden) { const f = $("button", pop); if (f) f.focus(); }
      return;
    }
    const acc = e.target.closest("[data-acc]");
    if (acc) {
      cerrarMenus();
      if (acc.dataset.acc === "borrar") {
        if (!confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
        try { await api.borrar(id, p); li.classList.add("is-saliendo"); setTimeout(() => li.remove(), reduce ? 0 : 300); posts.delete(id); toast("Publicación eliminada."); }
        catch (err) { toast("No se pudo eliminar.", "error"); }
      } else if (acc.dataset.acc === "ocultar") {
        try {
          await api.ocultar(id, !p.oculto); p.oculto = !p.oculto;
          li.outerHTML = postHtml(p); cargarComentarios($(`.pub[data-id="${CSS.escape(id)}"]`), false);
          toast(p.oculto ? "Publicación oculta para estudiantes." : "Publicación visible otra vez.", "ok"); pintarReportes();
        } catch (err) { toast("No tienes permiso para moderar.", "error"); }
      } else if (acc.dataset.acc === "reportar") {
        reportando = id; $("#formReporte").reset(); $("#dlgReporte").showModal();
      }
      return;
    }
    if (e.target.closest("[data-like]")) {
      const b = e.target.closest("[data-like]");
      const on = !(p.likes || {})[yoU.correo];
      // Se pinta al instante y se revierte si el servidor lo rechaza
      const pintar = () => {
        const n = likesDe(p);
        b.classList.toggle("is-on", !!p.likes[yoU.correo]); b.setAttribute("aria-pressed", String(!!p.likes[yoU.correo]));
        $("i", b).className = `${p.likes[yoU.correo] ? "ph-fill" : "ph"} ph-heart`; $(".reac__n", b).textContent = n || "";
      };
      p.likes = { ...p.likes }; if (on) p.likes[yoU.correo] = true; else delete p.likes[yoU.correo];
      pintar(); if (on && !reduce) { b.classList.remove("late"); void b.offsetWidth; b.classList.add("late"); }
      try { await api.like(id, on); } catch (err) { if (on) delete p.likes[yoU.correo]; else p.likes[yoU.correo] = true; pintar(); toast("No se pudo guardar tu me gusta.", "error"); }
      return;
    }
    const voto = e.target.closest("[data-voto]");
    if (voto) {
      const i = Number(voto.dataset.voto), antes = (p.votos || {})[yoU.correo];
      if (antes === i) return;
      p.votos = { ...p.votos, [yoU.correo]: i };
      $(".encuesta", li).outerHTML = encuestaHtml(p);
      try { await api.votar(id, i); } catch (err) { if (antes === undefined) delete p.votos[yoU.correo]; else p.votos[yoU.correo] = antes; $(".encuesta", li).outerHTML = encuestaHtml(p); toast("No se pudo guardar tu voto.", "error"); }
      return;
    }
    if (e.target.closest("[data-coment]")) { const inp = $(".comentar input", li); if (inp) inp.focus(); return; }
    if (e.target.closest(".comentarios__todos")) { pintarComentarios(li, p._com || [], true); return; }
    const borrarC = e.target.closest("[data-borrar-com]");
    if (borrarC) {
      const cid = borrarC.closest(".coment").dataset.cid;
      try { await api.borrarComentario(id, cid); pintarComentarios(li, (p._com || []).filter((c) => c.id !== cid), true); }
      catch (err) { toast("No se pudo eliminar el comentario.", "error"); }
      return;
    }
    const f = e.target.closest("[data-foto]");
    if (f) abrirVisor(p, Number(f.dataset.foto));
  });
  $("#lista").addEventListener("submit", async (e) => {
    const form = e.target.closest(".comentar"); if (!form) return;
    e.preventDefault();
    const inp = $("input", form), texto = inp.value.trim();
    if (!texto) return;
    const li = form.closest(".pub"), p = posts.get(li.dataset.id);
    inp.disabled = true;
    try {
      const c = await api.comentar(li.dataset.id, texto, yoU);
      inp.value = "";
      pintarComentarios(li, [...(p._com || []), c], true);
    } catch (err) { toast("No se pudo comentar.", "error"); }
    inp.disabled = false; inp.focus();
  });

  /* ---------- Reportar ---------- */
  $("#repCancelar").addEventListener("click", () => $("#dlgReporte").close());
  $("#formReporte").addEventListener("submit", async (e) => {
    e.preventDefault();
    const motivo = new FormData(e.target).get("motivo");
    try { await api.reportar(reportando, motivo); $("#dlgReporte").close(); toast("Gracias. Un docente revisará la publicación.", "ok"); pintarReportes(); }
    catch (err) { toast("No se pudo enviar el reporte.", "error"); }
  });
  const pintarReportes = async () => {
    if (!esDoc()) return;
    $("#panelReportes").hidden = false;
    try {
      const l = await api.reportes();
      $("#reportes").innerHTML = l.length ? l.map((r) => `<li data-rid="${esc(r.id)}"><span class="reporte__motivo"><i class="ph ph-flag" aria-hidden="true"></i>${esc(r.motivo)}</span><span class="reporte__hora">${hace(r.creado)}</span>
        <div><button type="button" class="link" data-ver-pub="${esc(r.pub)}">Ver</button><button type="button" class="link" data-cerrar-rep>Marcar revisado</button></div></li>`).join("")
        : `<li class="reportes__vacio"><i class="ph ph-seal-check" aria-hidden="true"></i> Nada por revisar.</li>`;
    } catch (e) { $("#reportes").innerHTML = `<li class="reportes__vacio">No se pudieron cargar.</li>`; }
  };
  $("#reportes").addEventListener("click", async (e) => {
    const li = e.target.closest("[data-rid]"); if (!li) return;
    if (e.target.closest("[data-cerrar-rep]")) { await api.cerrarReporte(li.dataset.rid); pintarReportes(); return; }
    const ver = e.target.closest("[data-ver-pub]");
    if (ver) {
      let el = $(`.pub[data-id="${CSS.escape(ver.dataset.verPub)}"]`);
      if (!el) { filtro = "ocultas"; $$("#filtros [data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.f === "ocultas"))); await cargar(true); el = $(`.pub[data-id="${CSS.escape(ver.dataset.verPub)}"]`); }
      if (!el) { filtro = "todo"; $$("#filtros [data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.f === "todo"))); await cargar(true); el = $(`.pub[data-id="${CSS.escape(ver.dataset.verPub)}"]`); }
      if (el) { el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); el.classList.remove("is-destacada"); void el.offsetWidth; el.classList.add("is-destacada"); }
      else toast("La publicación ya no existe.");
    }
  });

  /* ---------- Ranking de aulas ---------- */
  const pintarRanking = async () => {
    try {
      const m = await api.ranking();
      const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const max = top.length ? top[0][1] : 1;
      $("#ranking").innerHTML = top.length ? top.map(([a, n]) => `<li data-sec="${a.slice(-1)}"><span class="ranking__aula">${esc(corto(a))}</span><span class="ranking__nivel">${a[0] === "p" ? "Primaria" : "Secundaria"}</span><span class="ranking__barra"><span style="--p:${(n / max) * 100}"></span></span><b>${n}</b></li>`).join("")
        : `<li class="reportes__vacio">Aún no hay actividad.</li>`;
    } catch (e) { $("#ranking").innerHTML = ""; }
  };

  /* ================= Visor de fotos ================= */
  let visorP = null, visorI = 0;
  const abrirVisor = (p, i) => { visorP = p; visorI = i; pintarVisor(); $("#visor").showModal(); };
  const pintarVisor = () => {
    const m = visorP.media.filter((x) => x.tipo === "imagen");
    $("#visorImg").src = m[visorI].url; $("#visorImg").alt = `Foto ${visorI + 1} de ${m.length}, publicada por ${visorP.nombre}`;
    $("#visorAnt").hidden = visorI === 0; $("#visorSig").hidden = visorI === m.length - 1;
  };
  $("#visorCerrar").addEventListener("click", () => $("#visor").close());
  $("#visorAnt").addEventListener("click", () => { visorI--; pintarVisor(); });
  $("#visorSig").addEventListener("click", () => { visorI++; pintarVisor(); });
  $("#visor").addEventListener("click", (e) => { if (e.target.id === "visor") $("#visor").close(); });
  $("#visor").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && !$("#visorAnt").hidden) { visorI--; pintarVisor(); }
    if (e.key === "ArrowRight" && !$("#visorSig").hidden) { visorI++; pintarVisor(); }
  });

  /* ================= Publicar ================= */
  const adj = []; // { tipo, blob, ext, w, h, prev }
  const txt = $("#compTexto");
  const auto = () => { txt.style.height = "auto"; txt.style.height = Math.min(txt.scrollHeight, 320) + "px"; };
  const cuenta = () => {
    const n = txt.value.length;
    $("#compCuenta").textContent = n > LIM.texto - 200 ? `${LIM.texto - n} caracteres` : "";
    $("#compositor").classList.toggle("is-activo", !!(n || adj.length || !$("#compEncuesta").hidden));
  };
  txt.addEventListener("input", () => { auto(); cuenta(); $("#compError").textContent = ""; });
  txt.addEventListener("focus", () => $("#compositor").classList.add("is-activo"));

  // Fotos: se reducen a 1600 px y JPG en el navegador, así suben rápido y ocupan menos
  const leerImagen = (file) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (file.type === "image/gif") return ok({ tipo: "imagen", blob: file, ext: "gif", w, h, prev: url });
      const k = Math.min(1, LIM.lado / Math.max(w, h));
      w = Math.round(w * k); h = Math.round(h * k);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? ok({ tipo: "imagen", blob: b, ext: "jpg", w, h, prev: url }) : mal(new Error("imagen"))), "image/jpeg", 0.85);
    };
    img.onerror = () => mal(new Error("imagen"));
    img.src = url;
  });
  const leerVideo = (file) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(file), v = document.createElement("video");
    v.preload = "metadata"; v.muted = true;
    v.onloadedmetadata = () => ok({ tipo: "video", blob: file, ext: { "video/webm": "webm", "video/quicktime": "mov" }[file.type] || "mp4", w: v.videoWidth, h: v.videoHeight, prev: url, dur: v.duration });
    v.onerror = () => mal(new Error("video"));
    v.src = url;
  });
  const pintarAdj = () => {
    $("#compAdjuntos").innerHTML = adj.map((a, i) => `<li>${a.tipo === "video" ? `<video src="${a.prev}" muted playsinline></video><span class="adj__tipo"><i class="ph-fill ph-play" aria-hidden="true"></i>${a.dur ? Math.floor(a.dur / 60) + ":" + String(Math.round(a.dur % 60)).padStart(2, "0") : "Video"}</span>` : `<img src="${a.prev}" alt="Foto adjunta ${i + 1}">`}
      <button type="button" class="adj__quitar" data-quitar="${i}" aria-label="Quitar ${a.tipo === "video" ? "video" : "foto " + (i + 1)}"><i class="ph ph-x" aria-hidden="true"></i></button></li>`).join("");
    const hayVideo = adj.some((a) => a.tipo === "video");
    $('[data-herr="foto"]').disabled = hayVideo || adj.length >= LIM.fotos;
    $('[data-herr="video"]').disabled = adj.length > 0;
    cuenta();
  };
  $("#compAdjuntos").addEventListener("click", (e) => { const b = e.target.closest("[data-quitar]"); if (b) { adj.splice(Number(b.dataset.quitar), 1); pintarAdj(); } });
  $$(".herr").forEach((b) => b.addEventListener("click", () => {
    const h = b.dataset.herr;
    if (h === "foto") $("#inFoto").click();
    else if (h === "video") $("#inVideo").click();
    else {
      const abierta = $("#compEncuesta").hidden;
      $("#compEncuesta").hidden = !abierta; b.setAttribute("aria-pressed", String(abierta));
      if (abierta && !$("#encOpciones").children.length) { opcion(); opcion(); }
      if (abierta) $("#encPregunta").focus();
      cuenta();
    }
  }));
  const opcion = () => {
    const n = $("#encOpciones").children.length;
    if (n >= 4) return;
    $("#encOpciones").insertAdjacentHTML("beforeend", `<div class="enc-op-in"><label class="sr-only" for="op${n}">Opción ${n + 1}</label><input id="op${n}" maxlength="80" placeholder="Opción ${n + 1}"></div>`);
    $("#encMas").hidden = n + 1 >= 4;
  };
  $("#encMas").addEventListener("click", () => { opcion(); $("#encOpciones").lastElementChild.querySelector("input").focus(); });
  const errorComp = (t) => { $("#compError").textContent = t; };
  $("#inFoto").addEventListener("change", async (e) => {
    const files = [...e.target.files]; e.target.value = "";
    for (const f of files) {
      if (adj.length >= LIM.fotos) { errorComp(`Máximo ${LIM.fotos} fotos por publicación.`); break; }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { errorComp("Solo fotos JPG, PNG, WEBP o GIF."); continue; }
      if (f.size > LIM.fotoMB * 1048576 && f.type === "image/gif") { errorComp(`El GIF pesa más de ${LIM.fotoMB} MB.`); continue; }
      try { adj.push(await leerImagen(f)); } catch (err) { errorComp("No se pudo leer una de las fotos."); }
    }
    pintarAdj();
  });
  $("#inVideo").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) return errorComp("Solo videos MP4, WEBM o MOV.");
    if (f.size > LIM.videoMB * 1048576) return errorComp(`El video pesa ${(f.size / 1048576).toFixed(0)} MB. El máximo es ${LIM.videoMB} MB.`);
    try { adj.push(await leerVideo(f)); pintarAdj(); } catch (err) { errorComp("No se pudo leer el video."); }
  });

  $("#compositor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = txt.value.trim();
    let encuesta = null;
    if (!$("#compEncuesta").hidden) {
      const pregunta = $("#encPregunta").value.trim();
      const opciones = $$("#encOpciones input").map((i) => i.value.trim()).filter(Boolean);
      if (!pregunta) return errorComp("Escribe la pregunta de la encuesta.");
      if (opciones.length < 2) return errorComp("La encuesta necesita al menos 2 opciones.");
      if (new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length) return errorComp("Hay opciones repetidas.");
      encuesta = { pregunta, opciones };
    }
    if (!texto && !adj.length && !encuesta) return errorComp("Escribe algo o adjunta una foto, un video o una encuesta.");
    const btn = $("#btnPublicar"), barra = $("#compProgreso");
    btn.disabled = true; btn.classList.add("is-cargando"); barra.hidden = false; barra.style.setProperty("--p", 0);
    try {
      const p = await api.publicar({ texto, archivos: adj.slice(), encuesta }, (x) => barra.style.setProperty("--p", x), yoU);
      txt.value = ""; auto(); adj.length = 0; pintarAdj();
      $("#compEncuesta").hidden = true; $("#encOpciones").innerHTML = ""; $("#encPregunta").value = ""; $('[data-herr="encuesta"]').setAttribute("aria-pressed", "false"); $("#encMas").hidden = false;
      $("#compositor").classList.remove("is-activo");
      if ($(".feed-vacio")) $("#lista").innerHTML = "";
      agregar([p], true);
      const nuevo = $(`.pub[data-id="${CSS.escape(p.id)}"]`); nuevo.classList.add("is-nueva");
      toast("¡Publicado!", "ok"); pintarRanking();
    } catch (err) {
      console.error(err);
      errorComp(err && err.code === "permission-denied" ? "No se pudo publicar: tu cuenta no tiene permiso." : err && /storage/.test(err.code || "") ? "No se pudo subir el archivo. Revisa el tamaño y tu conexión." : "No se pudo publicar. Revisa tu conexión e inténtalo otra vez.");
    }
    btn.disabled = false; btn.classList.remove("is-cargando"); setTimeout(() => { barra.hidden = true; }, 400);
  });

  /* ================= Nuevas publicaciones ================= */
  const iniciarAviso = () => {
    const desde = new Date();
    api.escucharNuevas(desde, (n) => {
      const b = $("#nuevas");
      b.hidden = !n || !!perfilDe;
      $("span", b).textContent = n === 1 ? "1 publicación nueva" : `${n} publicaciones nuevas`;
    });
  };
  $("#nuevas").addEventListener("click", () => { $("#nuevas").hidden = true; cargar(true); window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* ================= Arranque ================= */
  let demoQ = "demo";
  const iniciar = async (a) => {
    api = a;
    yoU = await api.yo();
    if (!yoU) return (mostrar("vacio"), $("#vacioTitulo").textContent = "Tu cuenta aún no está en el Patio", $("#vacioTexto").textContent = "El colegio todavía no cargó tus datos. Avisa a tu tutor o a secretaría.");
    document.documentElement.dataset.seccion = esDoc() ? "A" : yoU.aula.slice(-1);
    pintarYo();
    mostrar("app");
    perfilDe = q.get("u");
    if (perfilDe && !(await pintarPerfil(perfilDe))) perfilDe = "__nadie__";
    if (perfilDe) $("#filtros").hidden = true;
    await cargar(true);
    pintarRanking(); pintarReportes(); iniciarAviso();
  };

  // Menú y tema los maneja sesion.js
  if (!S.conectada) {
    if (q.has("demo")) {
      const doc = q.get("demo") === "docente";
      demoQ = doc ? "demo=docente" : "demo";
      $("#avisoDemo").hidden = false;
      const c = $("#cambiarRolDemo");
      c.textContent = doc ? "Ver como estudiante" : "Ver como docente (moderación)";
      c.href = doc ? "comunidad.html?demo" : "comunidad.html?demo=docente";
      iniciar(demoApi(doc));
    } else location.replace("login.html");
    return;
  }
  S.alCambiar(async (u) => {
    if (!u) return location.replace("login.html");
    try { await iniciar(fbApi(u)); }
    catch (e) { console.error(e); mostrar("vacio"); $("#vacioTitulo").textContent = "No pudimos abrir el Patio"; $("#vacioTexto").textContent = "Revisa tu conexión a internet y vuelve a intentarlo."; }
  });
})();
