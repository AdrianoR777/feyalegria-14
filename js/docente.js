/* Portal docente: asistencia, notas, justificaciones y resumen de cada aula a cargo.
   Con Firebase conectado lee docentes/{correo} y los estudiantes de sus aulas; las reglas
   de firestore.rules limitan qué puede cambiar. Sin conexión solo existe la demostración (?demo). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const S = window.SESION;
  const { armar, NIVELES, nombreAula, SECCIONES } = window.AULAS;
  const { hoy, clave, aFecha, BIMESTRES, bimActual, esDiaDeClase, aMin, horaAhora } = window.CALENDARIO;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const may = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const fmtLargo = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const fmtCorto = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" });
  const NOTAS = ["AD", "A", "B", "C"];
  const ETQ = { P: "Asistió", T: "Tardanza", F: "Falta", J: "Justificada" };

  /* Aula "s3B" -> datos para mostrarla */
  const infoAula = (id) => {
    const n = id[0], g = Number(id.slice(1, -1)), s = id.slice(-1);
    return { id, n, g, s, nombre: nombreAula(n, g, s), corto: `${g}.° ${s}`, nivel: NIVELES[n].nombre, datos: armar(n, g, s) };
  };
  const reg = (v) => (v == null ? null : typeof v === "string" ? { e: v } : v);

  /* ================= Datos de demostración (ficticios) ================= */
  const demoApi = () => {
    let a = 14092026;
    const r = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const NOM = [["Valeria", "Camila", "Luciana", "Mía", "Ximena", "Kiara", "Alessia", "Zoe", "Nicole", "Danna", "Brianna", "Arleth", "Yamile", "Ashley", "Nayeli"], ["Thiago", "Mateo", "Santiago", "Gael", "Adrián", "Dylan", "Sebastián", "Joaquín", "Fabricio", "Iker", "Leonardo", "Jhair", "Rodrigo", "Piero", "Liam"]];
    const APE = ["Quispe", "Huamán", "Paredes", "Villanueva", "Castillo", "Rodríguez", "Sánchez", "Moreno", "Chávez", "Vásquez", "Zavaleta", "Rojas", "Alva", "Ramírez", "Guevara", "Flores", "Cerna", "Polo", "Mendoza", "Reyes", "Gonzales", "Ibáñez", "Ruiz", "León"];
    const MOT = [["Cita médica en el centro de salud", "Madre de familia"], ["Enfermedad con descanso médico", "Padre de familia"], ["Viaje familiar urgente", "Apoderado"], ["Trámite de DNI en RENIEC", "Madre de familia"]];
    const doc = { nombres: "Rosa Elena", apellidos: "Paredes Villanueva", correo: "rosa.paredes@" + S.DOMINIO, tutorDe: ["s3B"], areas: { s3B: ["Matemática", "Tutoría"], s3A: ["Matemática"], s4A: ["Matemática"] } };
    const est = {};
    ["s3B", "s3A", "s4A"].forEach((aula) => {
      const inf = infoAula(aula), inicio = aMin(inf.datos.horas[0]);
      const hh = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      const b = bimActual();
      const usados = new Set();
      for (let i = 0; i < 26 + Math.floor(r() * 5); i++) {
        let nombres, apellidos;
        do { const g = pick(NOM); nombres = `${pick(g)} ${pick(g)}`; apellidos = `${pick(APE)} ${pick(APE)}`; } while (usados.has(apellidos + nombres) || nombres.split(" ")[0] === nombres.split(" ")[1]);
        usados.add(apellidos + nombres);
        const correo = `${nombres.split(" ")[0]}.${apellidos.split(" ")[0]}${i}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() + "@" + S.DOMINIO;
        const asistencia = {};
        const riesgo = r() < 0.12 ? 0.09 : 0.02; // algunos estudiantes faltan más
        for (let d = new Date(BIMESTRES[0][1]); d < hoy; d.setDate(d.getDate() + 1)) {
          if (!esDiaDeClase(d)) continue;
          const x = r();
          asistencia[clave(d)] = x < riesgo ? { e: "F" } : x < riesgo + 0.06 ? { e: "T", h: hh(inicio + 2 + Math.floor(r() * 20)) } : { e: "P", h: hh(inicio - 18 + Math.floor(r() * 16)) };
        }
        // Justificaciones: aprobadas, una en revisión o una observada
        Object.keys(asistencia).filter((k) => asistencia[k].e === "F").forEach((k, j, todas) => {
          const [motivo, por] = pick(MOT);
          const d = aFecha(k); d.setDate(d.getDate() + 1);
          const presentada = clave(d);
          const x = r();
          if (j === todas.length - 1 && x < 0.35) asistencia[k] = { e: "F", j: { motivo, por, presentada, estado: "pendiente" } };
          else if (x < 0.08) asistencia[k] = { e: "F", j: { motivo, por, presentada, estado: "observada", obs: "Falta adjuntar la constancia." } };
          else if (x < 0.55) asistencia[k] = { e: "J", j: { motivo, por, presentada, estado: "aprobada", obs: "Revisada por tutoría." } };
        });
        const notas = Object.fromEntries(inf.datos.areas.map((x) => [x.area, BIMESTRES.map((_, k) => (k < b ? pick(["AD", "A", "A", "A", "B", "B", "C"]) : ""))]));
        est[correo] = { correo, nombres, apellidos, codigo: `2026-${aula.toUpperCase()}-${String(i + 1).padStart(3, "0")}`, nivel: inf.n, grado: inf.g, seccion: inf.s, aula, notas, asistencia };
      }
    });
    const copia = (o) => JSON.parse(JSON.stringify(o));
    return {
      demo: true,
      correo: doc.correo,
      docente: async () => copia(doc),
      estudiantes: async (aula) => Object.values(est).filter((e) => e.aula === aula).map((e) => ({ id: e.correo, ...copia(e) })),
      guardar: async (id, { asis = {}, notas = {} }) => {
        await new Promise((ok) => setTimeout(ok, 350));
        Object.entries(asis).forEach(([f, v]) => { if (v == null) delete est[id].asistencia[f]; else est[id].asistencia[f] = copia(v); });
        Object.entries(notas).forEach(([ar, v]) => { est[id].notas[ar] = copia(v); });
      },
    };
  };

  /* ================= Datos reales (Firebase) ================= */
  const fbApi = (user) => {
    const db = S.db(), FS = firebase.firestore;
    const correo = user.email.toLowerCase();
    return {
      demo: false, correo,
      docente: () => S.docente(user),
      estudiantes: async (aula) => (await db.collection("estudiantes").where("aula", "==", aula).get()).docs.map((d) => ({ id: d.id, ...d.data() })),
      // Cada campo se escribe por separado (asistencia.<fecha>, notas.<área>) para no pisar otros cambios
      guardar: (id, { asis = {}, notas = {} }) => {
        const args = [];
        Object.entries(asis).forEach(([f, v]) => args.push(new FS.FieldPath("asistencia", f), v == null ? FS.FieldValue.delete() : v));
        Object.entries(notas).forEach(([ar, v]) => args.push(new FS.FieldPath("notas", ar), v));
        args.push("actualizadoPor", correo, "actualizado", FS.FieldValue.serverTimestamp());
        return db.collection("estudiantes").doc(id).update(...args);
      },
    };
  };

  /* ================= Estado ================= */
  let api, doc, aulas = [], aula = null, lista = [], tab = null;
  const pend = new Map(); // "id|asis|fecha" -> registro | null ; "id|nota|área" -> [4]

  const mostrar = (id) => ["cargando", "vacio", "perfil"].forEach((x) => { $("#" + x).hidden = x !== id; });
  const vacio = (t, p) => { $("#vacioTitulo").textContent = t; $("#vacioTexto").textContent = p; mostrar("vacio"); };
  let toastT = 0;
  const toast = (txt, tipo) => {
    const t = $("#toast"); t.textContent = txt; t.dataset.tipo = tipo || ""; t.hidden = false;
    t.classList.remove("is-in"); void t.offsetWidth; t.classList.add("is-in");
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("is-in"); setTimeout(() => { t.hidden = true; }, 300); }, 3200);
  };
  const salir = async () => {
    if (pend.size && !confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) return;
    pend.clear(); await S.salir(); location.replace("login.html");
  };
  $$("[data-salir], #btnSalir").forEach((b) => b.addEventListener("click", salir));
  addEventListener("beforeunload", (e) => { if (pend.size) { e.preventDefault(); e.returnValue = ""; } });

  const esTutor = () => doc.tutorDe.includes(aula.id);
  const areasAula = () => (doc.areas && doc.areas[aula.id]) || [];
  const nombre = (e) => `${e.apellidos}, ${e.nombres}`;
  const iniciales = (e) => `${(e.nombres || "?")[0]}${(e.apellidos || "")[0] || ""}`;
  const asisDe = (e, f) => { const k = `${e.id}|asis|${f}`; return pend.has(k) ? pend.get(k) : reg((e.asistencia || {})[f]); };
  const notasDe = (e, ar) => { const k = `${e.id}|nota|${ar}`; return pend.has(k) ? pend.get(k) : ((e.notas || {})[ar] || ["", "", "", ""]).slice(); };

  /* ================= Cabecera y aulas ================= */
  const pintarCabecera = () => {
    const h = new Date().getHours();
    $("#avatar").textContent = iniciales(doc);
    $("#saludo").textContent = `${h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"}, ${doc.nombres.split(" ")[0]}`;
    $("#docNombre").textContent = `${doc.nombres} ${doc.apellidos}`;
    const areas = [...new Set(Object.values(doc.areas || {}).flat())].filter((x) => x !== "Tutoría");
    $("#docMeta").innerHTML = [
      doc.tutorDe.length ? ["heart", `Tutoría de ${doc.tutorDe.map((x) => infoAula(x).nombre).join(", ")}`] : null,
      areas.length ? ["chalkboard-teacher", areas.join(", ")] : null,
      ["envelope-simple", esc(api.correo).replace("@", "<wbr>@")],
    ].filter(Boolean).map(([i, t]) => `<li><i class="ph ph-${i}" aria-hidden="true"></i>${t}</li>`).join("");
    $("#docAulas").innerHTML = aulas.map((x) => {
      const rol = [doc.tutorDe.includes(x.id) ? "Tutoría" : null, ...((doc.areas[x.id] || []).filter((y) => y !== "Tutoría"))].filter(Boolean).join(" y ");
      return `<button type="button" class="doc-aula" data-aula="${x.id}" data-seccion="${x.s}" aria-pressed="false">
        <b>${x.corto}</b><span>${x.nivel}</span><small>${esc(rol)}</small></button>`;
    }).join("");
    $("#docAulas").addEventListener("click", (e) => { const b = e.target.closest("[data-aula]"); if (b && b.dataset.aula !== aula.id) elegirAula(b.dataset.aula); });
  };

  const elegirAula = async (id) => {
    if (pend.size && !confirm("Tienes cambios sin guardar en esta aula. ¿Cambiar de aula y descartarlos?")) return;
    pend.clear(); barra();
    aula = aulas.find((x) => x.id === id);
    document.documentElement.dataset.seccion = aula.s;
    $$(".doc-aula").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.aula === id)));
    try { sessionStorage.setItem("fya14-doc-aula", id); } catch (e) {}
    $("#listaAsis").innerHTML = `<li class="doc-cargando"><span class="giro" aria-hidden="true"></span> Cargando estudiantes…</li>`;
    try {
      lista = (await api.estudiantes(id)).sort((a, b) => nombre(a).localeCompare(nombre(b), "es"));
    } catch (e) {
      lista = [];
      toast(e.code === "permission-denied" ? "No tienes permiso para ver esta aula." : "No se pudo cargar el aula. Revisa tu conexión.", "error");
    }
    // Permisos visibles: lo mismo que exigen las reglas del servidor
    $$("[data-solo-tutor]").forEach((x) => { x.hidden = esTutor(); });
    $("[data-sin-area]").hidden = areasAula().length > 0;
    $("#notaArea").innerHTML = areasAula().map((x) => `<option>${esc(x)}</option>`).join("");
    $("#notaArea").disabled = !areasAula().length;
    pintarTodo();
    if (!tab) elegirTab(esTutor() ? "asistencia" : "notas");
  };

  const pintarTodo = () => {
    if (!aula) return; pintarKpis(); pintarAsistencia(); pintarNotas(); pintarJusts(); pintarResumen(); };

  /* ================= Indicadores del aula ================= */
  const pintarKpis = () => {
    const fHoy = clave(hoy), mes = fHoy.slice(0, 7);
    const marcados = lista.filter((e) => asisDe(e, fHoy)).length;
    const faltasMes = lista.reduce((n, e) => n + Object.entries(e.asistencia || {}).filter(([f, v]) => f.startsWith(mes) && reg(v).e === "F").length, 0);
    const pendientes = lista.reduce((n, e) => n + Object.values(e.asistencia || {}).filter((v) => reg(v).j && reg(v).j.estado === "pendiente").length, 0);
    const clase = esDiaDeClase(hoy);
    $("#docKpis").innerHTML = `
      <div class="dkpi dkpi--aula"><span>${aula.nivel}, ${aula.datos.turno.toLowerCase()}</span><strong>${aula.nombre}</strong><a class="link" href="aula.html?g=${aula.n}${aula.g}&s=${aula.s}">Portal del aula <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a></div>
      <div class="dkpi"><i class="ph ph-users-three" aria-hidden="true"></i><strong>${lista.length}</strong><span>estudiantes</span></div>
      <div class="dkpi" data-ok="${!clase || marcados === lista.length}"><i class="ph ph-calendar-check" aria-hidden="true"></i><strong>${clase ? `${marcados}/${lista.length}` : "Sin clases"}</strong><span>${clase ? "asistencia de hoy" : "hoy"}</span></div>
      <div class="dkpi" data-e="F"><i class="ph ph-x-circle" aria-hidden="true"></i><strong>${faltasMes}</strong><span>faltas este mes</span></div>
      <div class="dkpi" data-e="T"><i class="ph ph-hourglass-medium" aria-hidden="true"></i><strong>${pendientes}</strong><span>justificaciones por revisar</span></div>`;
    $("#nPend").textContent = pendientes; $("#nPend").hidden = !pendientes || !esTutor();
  };

  /* ================= Pestañas ================= */
  const elegirTab = (t) => {
    tab = t;
    $$("#docTabs [role=tab]").forEach((b) => {
      const on = b.dataset.tab === t;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      $("#" + b.getAttribute("aria-controls")).hidden = !on;
    });
    $$("[data-tab-link]").forEach((a) => a.classList.toggle("is-current", a.dataset.tabLink === t));
  };
  $$("#docTabs [role=tab]").forEach((b, i, todos) => {
    b.addEventListener("click", () => elegirTab(b.dataset.tab));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const k = (i + (e.key === "ArrowRight" ? 1 : todos.length - 1)) % todos.length;
      todos[k].focus(); elegirTab(todos[k].dataset.tab);
    });
  });
  $$("[data-tab-link]").forEach((a) => a.addEventListener("click", () => {
    elegirTab(a.dataset.tabLink);
    $("#menu").classList.remove("is-open"); $("#burger").setAttribute("aria-expanded", "false");
  }));

  /* ================= Asistencia ================= */
  const fechaAsis = $("#asisFecha");
  const ultimoDiaClase = () => { const d = new Date(hoy); for (let i = 0; i < 30 && !esDiaDeClase(d); i++) d.setDate(d.getDate() - 1); return d; };
  fechaAsis.max = clave(hoy);
  fechaAsis.min = clave(BIMESTRES[0][1]);
  fechaAsis.value = clave(ultimoDiaClase());
  fechaAsis.addEventListener("change", () => { if (!fechaAsis.value) fechaAsis.value = clave(ultimoDiaClase()); pintarAsistencia(); });

  const pintarAsistencia = () => {
    const f = fechaAsis.value, d = aFecha(f);
    const clase = esDiaDeClase(d) && d <= hoy;
    const editable = esTutor() && clase;
    $("#asisEstado").innerHTML = !clase ? `<i class="ph ph-moon-stars" aria-hidden="true"></i> ${may(fmtLargo.format(d))}: día sin clases.`
      : `${may(fmtLargo.format(d))}. Ingreso a las ${aula.datos.horas[0]}.`;
    $$("[data-editable]").forEach((x) => { x.hidden = !editable; });
    const inicio = aMin(aula.datos.horas[0]);
    const cuenta = { P: 0, T: 0, F: 0, J: 0, X: 0 };
    $("#listaAsis").innerHTML = lista.length ? lista.map((e, i) => {
      const x = asisDe(e, f), estado = x ? x.e : "X";
      cuenta[estado]++;
      const cambiado = pend.has(`${e.id}|asis|${f}`);
      const tarde = x && x.e === "T" && x.h ? ` (${aMin(x.h) - inicio} min)` : "";
      const radios = ["P", "T", "F"].map((k) => `<label class="seg seg--${k}"><input type="radio" name="a-${i}" value="${k}"${estado === k ? " checked" : ""}${editable && estado !== "J" ? "" : " disabled"}><span>${ETQ[k]}</span></label>`).join("");
      return `<li class="fila-asis${cambiado ? " is-cambiado" : ""}" data-id="${esc(e.id)}" data-e="${estado}">
        <span class="fila-asis__n">${i + 1}</span>
        <span class="fila-asis__av" aria-hidden="true">${e.foto ? `<img src="${esc(e.foto)}" alt="" loading="lazy">` : esc(iniciales(e))}</span>
        <span class="fila-asis__nom"><strong>${esc(nombre(e))}</strong>${x && x.j ? `<small><i class="ph ph-file-text" aria-hidden="true"></i> ${esc(x.j.motivo)}, ${x.j.estado === "pendiente" ? "en revisión" : x.j.estado}</small>` : estado === "X" && clase ? "<small>Sin marcar</small>" : ""}</span>
        <div class="fila-asis__ctrl" role="radiogroup" aria-label="Asistencia de ${esc(nombre(e))}">${estado === "J" ? `<span class="j-estado" data-j="aprobada"><i class="ph ph-check" aria-hidden="true"></i>Falta justificada</span>` : radios}</div>
        <label class="fila-asis__hora"><span class="sr-only">Hora de entrada de ${esc(nombre(e))}</span><input type="time" value="${x && x.h ? x.h.padStart(5, "0") : ""}"${editable && x && (x.e === "P" || x.e === "T") ? "" : " disabled"}></label>
        <span class="fila-asis__tarde">${tarde}</span>
      </li>`;
    }).join("") : `<li class="inc-vacio"><i class="ph ph-users" aria-hidden="true"></i> No hay estudiantes cargados en esta aula.</li>`;
    $("#asisConteo").innerHTML = [["P", "presentes"], ["T", "tardanzas"], ["F", "faltas"], ["J", "justificadas"], ["X", "sin marcar"]]
      .map(([k, t]) => `<li data-e="${k}"><strong>${cuenta[k]}</strong> ${t}</li>`).join("");
  };

  const marcar = (id, cambio) => {
    const e = lista.find((x) => x.id === id), f = fechaAsis.value;
    const antes = asisDe(e, f) || {};
    const nuevo = { ...antes, ...cambio };
    if (nuevo.e === "F") delete nuevo.h;
    if (nuevo.e !== "F" && !nuevo.j) delete nuevo.j;
    const original = JSON.stringify(reg((e.asistencia || {})[f]));
    const k = `${id}|asis|${f}`;
    if (JSON.stringify(nuevo) === original) pend.delete(k); else pend.set(k, nuevo);
    pintarAsistencia(); pintarKpis(); barra();
  };
  $("#listaAsis").addEventListener("change", (e) => {
    const li = e.target.closest(".fila-asis"); if (!li) return;
    const f = fechaAsis.value, esHoy = f === clave(hoy);
    if (e.target.type === "radio") {
      const est = e.target.value;
      const x = asisDe(lista.find((y) => y.id === li.dataset.id), f);
      let h = x && x.h;
      if (est !== "F" && !h) h = esHoy ? horaAhora() : aula.datos.horas[0];
      // Tardanza: si la hora quedó antes del ingreso, se sugiere 5 minutos después
      if (est === "T" && aMin(h) <= aMin(aula.datos.horas[0])) { const m = aMin(aula.datos.horas[0]) + 5; h = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }
      marcar(li.dataset.id, est === "F" ? { e: "F" } : { e: est, h });
    } else if (e.target.type === "time" && e.target.value) {
      const [hh, mm] = e.target.value.split(":");
      const h = `${Number(hh)}:${mm}`;
      // La hora decide el estado: después del ingreso es tardanza
      marcar(li.dataset.id, { h, e: aMin(h) > aMin(aula.datos.horas[0]) ? "T" : "P" });
    }
  });
  $("#todosPresentes").addEventListener("click", () => {
    const f = fechaAsis.value, esHoy = f === clave(hoy);
    let n = 0;
    lista.forEach((e) => { if (!asisDe(e, f)) { pend.set(`${e.id}|asis|${f}`, { e: "P", h: esHoy ? horaAhora() : aula.datos.horas[0] }); n++; } });
    pintarAsistencia(); pintarKpis(); barra();
    toast(n ? `${n} estudiante(s) marcados como presentes. Revisa y guarda.` : "Todos ya tenían asistencia marcada.");
  });

  /* ================= Notas ================= */
  const pintarNotas = () => {
    const ar = $("#notaArea").value, b = bimActual();
    if (!ar) { $("#tablaNotasDoc").innerHTML = ""; $("#notaEstado").textContent = ""; return; }
    const conNota = lista.filter((e) => notasDe(e, ar)[Math.min(b, 3)]).length;
    $("#notaEstado").textContent = b < 4 ? `Bimestre ${BIMESTRES[b][0]} en curso: ${conNota} de ${lista.length} con nota.` : "Año cerrado.";
    $("#tablaNotasDoc").innerHTML = `<caption class="sr-only">Notas de ${esc(ar)} en ${esc(aula.nombre)}</caption>
      <thead><tr><th scope="col">Estudiante</th>${BIMESTRES.map(([r], i) => `<th scope="col"${i === b ? ' class="is-actual"' : ""}>${r} bim.</th>`).join("")}</tr></thead>
      <tbody>${lista.map((e) => {
        const v = notasDe(e, ar), orig = (e.notas || {})[ar] || ["", "", "", ""];
        return `<tr data-id="${esc(e.id)}"><th scope="row">${esc(nombre(e))}</th>${v.map((n, i) => `<td data-label="Bimestre ${BIMESTRES[i][0]}"${(orig[i] || "") !== (n || "") ? ' class="is-cambiado"' : ""}>
          <label class="sr-only" for="n-${esc(e.id)}-${i}">${esc(nombre(e))}, bimestre ${BIMESTRES[i][0]}</label>
          <select id="n-${esc(e.id)}-${i}" class="sel-nota" data-b="${i}" data-v="${n || ""}"><option value="">·</option>${NOTAS.map((x) => `<option${x === n ? " selected" : ""}>${x}</option>`).join("")}</select></td>`).join("")}</tr>`;
      }).join("")}</tbody>`;
  };
  $("#notaArea").addEventListener("change", pintarNotas);
  $("#tablaNotasDoc").addEventListener("change", (e) => {
    const s = e.target.closest(".sel-nota"); if (!s) return;
    const tr = s.closest("tr"), ar = $("#notaArea").value;
    const est = lista.find((x) => x.id === tr.dataset.id);
    const v = notasDe(est, ar); v[Number(s.dataset.b)] = s.value;
    const orig = ((est.notas || {})[ar] || ["", "", "", ""]).map((x) => x || "");
    const k = `${est.id}|nota|${ar}`;
    if (JSON.stringify(v) === JSON.stringify(orig)) pend.delete(k); else pend.set(k, v);
    s.dataset.v = s.value;
    s.closest("td").classList.toggle("is-cambiado", (orig[Number(s.dataset.b)] || "") !== s.value);
    barra();
  });

  /* ================= Guardar ================= */
  const barra = () => {
    $("#guardarBarra").hidden = !pend.size;
    const nA = [...pend.keys()].filter((k) => k.includes("|asis|")).length, nN = pend.size - nA;
    $("#guardarTexto").textContent = [nA ? `${nA} asistencia(s)` : "", nN ? `${nN} registro(s) de notas` : ""].filter(Boolean).join(" y ") + " sin guardar";
  };
  const aplicarLocal = (id, { asis = {}, notas = {} }) => {
    const e = lista.find((x) => x.id === id);
    e.asistencia = e.asistencia || {}; e.notas = e.notas || {};
    Object.entries(asis).forEach(([f, v]) => { if (v == null) delete e.asistencia[f]; else e.asistencia[f] = v; });
    Object.entries(notas).forEach(([ar, v]) => { e.notas[ar] = v; });
  };
  $("#guardar").addEventListener("click", async () => {
    const btn = $("#guardar"); btn.disabled = true; btn.classList.add("is-cargando");
    const porEst = new Map();
    pend.forEach((v, k) => {
      const [id, tipo, sub] = k.split("|");
      const c = porEst.get(id) || { asis: {}, notas: {} };
      c[tipo === "asis" ? "asis" : "notas"][sub] = v;
      porEst.set(id, c);
    });
    const res = await Promise.allSettled([...porEst].map(([id, c]) => api.guardar(id, c).then(() => aplicarLocal(id, c))));
    const fallos = res.filter((x) => x.status === "rejected");
    // Solo se limpian los cambios que sí se guardaron
    [...porEst.keys()].forEach((id, i) => { if (res[i].status === "fulfilled") [...pend.keys()].filter((k) => k.startsWith(id + "|")).forEach((k) => pend.delete(k)); });
    btn.disabled = false; btn.classList.remove("is-cargando");
    pintarTodo(); barra();
    if (fallos.length) toast(fallos[0].reason && fallos[0].reason.code === "permission-denied" ? `No tienes permiso para ${fallos.length} cambio(s). No se guardaron.` : `No se pudieron guardar ${fallos.length} cambio(s). Revisa tu conexión e inténtalo otra vez.`, "error");
    else toast(`Guardado. ${porEst.size} estudiante(s) actualizados.`, "ok");
  });
  $("#descartar").addEventListener("click", () => { pend.clear(); pintarTodo(); barra(); toast("Cambios descartados."); });

  /* ================= Justificaciones ================= */
  let filtroJ = "pendiente";
  const pintarJusts = () => {
    const items = [];
    lista.forEach((e) => Object.entries(e.asistencia || {}).forEach(([f, v]) => {
      const x = reg(v);
      if (x.j) items.push({ e, f, x, t: x.j.estado });
      else if (x.e === "F") items.push({ e, f, x, t: "sin" });
    }));
    items.sort((a, b) => (a.f < b.f ? 1 : -1));
    $$("#justFiltro [data-n]").forEach((s) => { s.textContent = items.filter((i) => i.t === s.dataset.n).length; });
    const vis = items.filter((i) => i.t === filtroJ);
    const tutor = esTutor();
    const VACIO = { pendiente: "No hay justificaciones por revisar.", observada: "No hay justificaciones observadas.", aprobada: "Aún no hay justificaciones aprobadas.", sin: "No hay faltas sin justificar." };
    $("#docJusts").innerHTML = vis.length ? vis.map(({ e, f, x, t }) => {
      const j = x.j || {};
      const acciones = !tutor ? "" : t === "pendiente" || t === "observada"
        ? `<div class="just__acciones"><button type="button" class="btn btn--primary btn--sm" data-acc="aprobar"><i class="ph ph-check" aria-hidden="true"></i>Aprobar</button><button type="button" class="btn btn--ghost btn--sm" data-acc="observar"><i class="ph ph-warning" aria-hidden="true"></i>${t === "observada" ? "Editar observación" : "Observar"}</button></div>`
        : t === "sin" ? `<div class="just__acciones"><button type="button" class="btn btn--ghost btn--sm" data-acc="registrar"><i class="ph ph-plus" aria-hidden="true"></i>Registrar justificación</button></div>` : "";
      const est = { pendiente: ["En revisión", "hourglass-medium"], observada: ["Observada", "warning"], aprobada: ["Aprobada", "check"], sin: ["Sin justificar", "x"] }[t];
      return `<li class="just card" data-j="${t}" data-id="${esc(e.id)}" data-f="${f}">
        <div class="just__cab">
          <div><p class="just__lbl">${esc(nombre(e))}</p><h3>Falta del ${fmtLargo.format(aFecha(f))}</h3></div>
          <span class="j-estado" data-j="${t === "sin" ? "observada" : t}"><i class="ph ph-${est[1]}" aria-hidden="true"></i>${est[0]}</span>
        </div>
        ${x.j ? `<p class="just__motivo">${esc(j.motivo)}</p>
        <dl class="just__datos">
          <div><dt>Presentada</dt><dd>${j.presentada ? may(fmtCorto.format(aFecha(j.presentada))) : "Sin fecha"}</dd></div>
          <div><dt>Por</dt><dd>${esc(j.por || "Apoderado")}</dd></div>
          ${j.obs ? `<div class="just__obs"><dt>Respuesta</dt><dd>${esc(j.obs)}</dd></div>` : ""}
        </dl>` : `<p class="just__motivo just__motivo--vacio">La familia aún no presentó justificación.</p>`}
        ${acciones}
      </li>`;
    }).join("") : `<li class="inc-vacio"><i class="ph ph-seal-check" aria-hidden="true"></i> ${VACIO[filtroJ]}</li>`;
  };
  $$("#justFiltro button").forEach((b) => b.addEventListener("click", () => {
    $$("#justFiltro button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    filtroJ = b.dataset.f; pintarJusts();
  }));

  const guardarUno = async (id, f, nuevo, msg) => {
    try {
      await api.guardar(id, { asis: { [f]: nuevo } });
      aplicarLocal(id, { asis: { [f]: nuevo } });
      pend.delete(`${id}|asis|${f}`);
      pintarTodo(); barra(); toast(msg, "ok");
      return true;
    } catch (e) {
      toast(e.code === "permission-denied" ? "No tienes permiso para este cambio." : "No se pudo guardar. Revisa tu conexión.", "error");
      return false;
    }
  };
  let objetivo = null;
  $("#docJusts").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acc]"); if (!b) return;
    const li = b.closest(".just"), id = li.dataset.id, f = li.dataset.f;
    const e = lista.find((x) => x.id === id), x = reg(e.asistencia[f]);
    objetivo = { id, f, x, e };
    if (b.dataset.acc === "aprobar") {
      b.disabled = true;
      await guardarUno(id, f, { ...x, e: "J", j: { ...x.j, estado: "aprobada", obs: x.j.estado === "observada" ? "Documento completado. Aprobada por tutoría." : "Aprobada por tutoría.", revisadoPor: api.correo, revisado: clave(hoy) } }, `Justificación de ${e.nombres.split(" ")[0]} aprobada.`);
    } else if (b.dataset.acc === "observar") {
      $("#dlgObsSub").textContent = `${nombre(e)}, falta del ${fmtLargo.format(aFecha(f))}. Motivo: ${x.j.motivo}.`;
      $("#obsTexto").value = x.j.estado === "observada" ? x.j.obs || "" : "";
      $("#obsErr").textContent = "";
      $("#dlgObs").showModal();
    } else {
      $("#dlgJustSub").textContent = `${nombre(e)}, falta del ${fmtLargo.format(aFecha(f))}.`;
      $("#formJust").reset(); $("#jErr").textContent = "";
      $("#jFecha").value = clave(hoy); $("#jFecha").max = clave(hoy); $("#jFecha").min = f;
      $("#dlgJust").showModal();
    }
  });
  $("#obsCancelar").addEventListener("click", () => $("#dlgObs").close());
  $("#formObs").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const t = $("#obsTexto").value.trim();
    if (t.length < 5) { $("#obsErr").textContent = "Escribe qué debe corregir la familia (mínimo 5 caracteres)."; return; }
    const { id, f, x, e } = objetivo;
    if (await guardarUno(id, f, { ...x, e: "F", j: { ...x.j, estado: "observada", obs: t, revisadoPor: api.correo, revisado: clave(hoy) } }, `Observación enviada para ${e.nombres.split(" ")[0]}.`)) $("#dlgObs").close();
  });
  $("#jCancelar").addEventListener("click", () => $("#dlgJust").close());
  $("#formJust").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const motivo = $("#jMotivo").value.trim(), presentada = $("#jFecha").value;
    if (motivo.length < 3) { $("#jErr").textContent = "Escribe el motivo."; return; }
    if (!presentada || presentada < objetivo.f || presentada > clave(hoy)) { $("#jErr").textContent = "La fecha debe estar entre el día de la falta y hoy."; return; }
    const aprobar = $("#jAprobar").checked;
    const { id, f, e } = objetivo;
    const j = { motivo, por: $("#jPor").value, presentada, estado: aprobar ? "aprobada" : "pendiente", registradoPor: api.correo };
    if (aprobar) Object.assign(j, { obs: "Aprobada por tutoría.", revisadoPor: api.correo, revisado: clave(hoy) });
    if (await guardarUno(id, f, { e: aprobar ? "J" : "F", j }, `Justificación registrada para ${e.nombres.split(" ")[0]}.`)) $("#dlgJust").close();
  });

  /* ================= Resumen ================= */
  const filasResumen = () => lista.map((e) => {
    const c = { P: 0, T: 0, F: 0, J: 0 };
    Object.values(e.asistencia || {}).forEach((v) => { const x = reg(v); if (x.e in c) c[x.e]++; });
    const total = c.P + c.T + c.F + c.J;
    const pct = total ? Math.round(((c.P + c.T) / total) * 100) : 100;
    return { e, c, pct, alerta: c.F >= 3 || pct < 90 };
  });
  const pintarResumen = () => {
    const filas = filasResumen();
    $("#tablaResumen").innerHTML = `<caption class="sr-only">Resumen de asistencia de ${esc(aula.nombre)}</caption>
      <thead><tr><th scope="col">Estudiante</th><th scope="col">Asistencia</th><th scope="col">Asistió</th><th scope="col">Tardanzas</th><th scope="col">Faltas</th><th scope="col">Justificadas</th></tr></thead>
      <tbody>${filas.map(({ e, c, pct, alerta }) => `<tr${alerta ? ' class="is-alerta"' : ""}>
        <th scope="row">${esc(nombre(e))}${alerta ? ' <span class="tag tag--alerta">Atención</span>' : ""}</th>
        <td data-label="Asistencia"><span class="pct"><span style="--p:${pct}"></span></span>${pct}%</td>
        <td data-label="Asistió">${c.P}</td><td data-label="Tardanzas">${c.T}</td><td data-label="Faltas">${c.F}</td><td data-label="Justificadas">${c.J}</td></tr>`).join("")}</tbody>`;
  };
  $("#exportarCsv").addEventListener("click", () => {
    const q = (t) => `"${String(t).replace(/"/g, '""')}"`;
    const filas = [["Apellidos", "Nombres", "Correo", "Asistencia %", "Asistió", "Tardanzas", "Faltas", "Justificadas"].map(q).join(",")]
      .concat(filasResumen().map(({ e, c, pct }) => [e.apellidos, e.nombres, e.id, pct, c.P, c.T, c.F, c.J].map(q).join(",")));
    const url = URL.createObjectURL(new Blob(["﻿" + filas.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `asistencia-${aula.id}-${clave(hoy)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* ================= Arranque ================= */
  const iniciar = async (apiElegida) => {
    api = apiElegida;
    doc = await api.docente();
    if (!doc && !api.demo) return location.replace("perfil.html");
    if (!doc) return vacio("Esta cuenta no es de un docente", `La cuenta ${api.correo} no está registrada en el portal docente. Si eres estudiante, entra a tu perfil.`);
    doc.tutorDe = doc.tutorDe || []; doc.areas = doc.areas || {};
    const ids = [...new Set([...doc.tutorDe, ...Object.keys(doc.areas)])].filter((x) => /^[ps]\d[ABCD]$/.test(x));
    if (!ids.length) return vacio("Aún no tienes aulas asignadas", "Pide a la dirección que registre tus aulas y áreas.");
    aulas = ids.map(infoAula).sort((a, b) => (a.n + a.g + a.s).localeCompare(b.n + b.g + b.s));
    pintarCabecera();
    mostrar("perfil");
    let guardada = null; try { guardada = sessionStorage.getItem("fya14-doc-aula"); } catch (e) {}
    await elegirAula(ids.includes(guardada) ? guardada : (doc.tutorDe[0] && ids.includes(doc.tutorDe[0]) ? doc.tutorDe[0] : aulas[0].id));
  };

  if (!S.conectada) {
    if (new URLSearchParams(location.search).has("demo")) { $("#avisoDemo").hidden = false; document.querySelectorAll('a[href="comunidad.html"]').forEach((x) => { x.href = "comunidad.html?demo=docente"; }); iniciar(demoApi()); }
    else location.replace("login.html");
    return;
  }
  S.alCambiar(async (u) => {
    if (!u) return location.replace("login.html");
    try { await iniciar(fbApi(u)); }
    catch (e) { vacio("No pudimos cargar el portal", "Revisa tu conexión a internet y vuelve a intentarlo."); }
  });
})();
