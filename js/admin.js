/* Administración: estudiantes uno por uno (datos, notas, asistencia, foto), docentes,
   cuentas de administración e importación desde CSV.
   Con Firebase conectado solo entra quien está en admins/{correo} (las reglas lo exigen).
   Sin conexión solo existe la demostración (?demo). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const S = window.SESION;
  const { armar, NIVELES, nombreAula, SECCIONES } = window.AULAS;
  const { hoy, clave, aFecha, BIMESTRES, FERIADOS, esDiaDeClase, aMin, bimActual } = window.CALENDARIO;
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const may = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const copia = (o) => JSON.parse(JSON.stringify(o ?? null));
  const DOM = S.DOMINIO;
  const NOTAS = ["AD", "A", "B", "C"];
  const ETQ = { P: "Asistió", T: "Tardanza", F: "Falta", J: "Justificada" };
  const aulaDe = (e) => `${e.nivel}${e.grado}${e.seccion}`;
  const etiquetaAula = (a) => `${nombreAula(a[0], Number(a[1]), a[2])}, ${NIVELES[a[0]].nombre.toLowerCase()}`;
  const corto = (a) => `${a[1]}.° ${a[2]}`;
  const iniciales = (n, a) => `${(n || "?")[0]}${(a || "")[0] || ""}`.toUpperCase();
  const fotoHtml = (e, cls = "") => e.foto
    ? `<img class="adm-foto ${cls}" src="${esc(e.foto)}" alt="" loading="lazy">`
    : `<span class="adm-foto adm-foto--ini ${cls}" data-sec="${esc((e.seccion || "A"))}" aria-hidden="true">${esc(iniciales(e.nombres, e.apellidos))}</span>`;
  const etiquetaDocente = (d) => {
    const areas = [...new Set(Object.values(d.areas || {}).flat())].filter((x) => x !== "Tutoría");
    return (d.tutorDe || []).length ? `Docente, tutoría de ${nombreAula(d.tutorDe[0][0], Number(d.tutorDe[0][1]), d.tutorDe[0][2])}`
      : areas.length ? `Docente de ${areas.slice(0, 2).join(" y ")}` : "Docente";
  };
  const TODAS_AULAS = Object.keys(NIVELES).flatMap((n) => Array.from({ length: NIVELES[n].grados }, (_, i) => SECCIONES.map((s) => `${n}${i + 1}${s}`)).flat());
  const resumen = (e) => {
    const c = { P: 0, T: 0, F: 0, J: 0 };
    Object.values(e.asistencia || {}).forEach((v) => { const x = typeof v === "string" ? v : v && v.e; if (x in c) c[x]++; });
    const total = c.P + c.T + c.F + c.J;
    const notasC = Object.values(e.notas || {}).flat().filter((n) => n === "C").length;
    return { ...c, total, pct: total ? Math.round(((c.P + c.T) / total) * 100) : 100, notasC, alerta: c.F >= 3 || (total && (c.P + c.T) / total < 0.9) };
  };

  let toastT = 0;
  const toast = (txt, tipo) => {
    const t = $("#toast"); t.textContent = txt; t.dataset.tipo = tipo || ""; t.hidden = false;
    t.classList.remove("is-in"); void t.offsetWidth; t.classList.add("is-in");
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("is-in"); setTimeout(() => { t.hidden = true; }, 300); }, 3400);
  };
  const mostrar = (id) => ["cargando", "vacio", "app"].forEach((x) => { $("#" + x).hidden = x !== id; });

  /* Foto: recorte cuadrado al centro, 512 px, JPG */
  const recortarFoto = (file) => new Promise((ok, mal) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const lado = Math.min(img.naturalWidth, img.naturalHeight), T = Math.min(512, lado);
      const c = document.createElement("canvas"); c.width = T; c.height = T;
      c.getContext("2d").drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, T, T);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? ok(b) : mal(new Error("foto"))), "image/jpeg", 0.86);
    };
    img.onerror = () => mal(new Error("foto"));
    img.src = url;
  });

  /* ================= Demostración ================= */
  const demoApi = () => {
    let a = 77;
    const r = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const NF = ["Valeria", "Camila", "Luciana", "Mía", "Ximena", "Kiara", "Alessia", "Zoe", "Nicole", "Danna", "Arleth", "Nayeli"];
    const NM = ["Thiago", "Mateo", "Santiago", "Gael", "Adrián", "Dylan", "Sebastián", "Joaquín", "Fabricio", "Iker", "Leonardo", "Piero"];
    const AP = ["Quispe", "Huamán", "Paredes", "Villanueva", "Castillo", "Rodríguez", "Sánchez", "Moreno", "Chávez", "Vásquez", "Zavaleta", "Rojas", "Alva", "Flores", "Cerna", "Reyes"];
    const est = {}, fichas = {};
    ["s3B", "s3A", "p5D"].forEach((aula) => {
      const inf = armar(aula[0], Number(aula[1]), aula[2]), ini = aMin(inf.horas[0]);
      const hh = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      for (let i = 0; i < 12; i++) {
        const mujer = r() < 0.5, g = mujer ? NF : NM;
        const nombres = `${pick(g)} ${pick(g)}`, apellidos = `${pick(AP)} ${pick(AP)}`;
        const correo = norm(`${nombres.split(" ")[0]}.${apellidos.split(" ")[0]}${aula}${i}`).replace(/[^a-z0-9.]/g, "") + "@" + DOM;
        const asistencia = {};
        for (let d = new Date(BIMESTRES[0][1]); d < hoy; d.setDate(d.getDate() + 1)) {
          if (!esDiaDeClase(d)) continue;
          const x = r();
          asistencia[clave(d)] = x < 0.035 ? { e: "F" } : x < 0.045 ? { e: "J", j: { motivo: "Cita médica", presentada: clave(d), por: "Madre de familia", estado: "aprobada" } } : x < 0.1 ? { e: "T", h: hh(ini + 4 + Math.floor(r() * 15)) } : { e: "P", h: hh(ini - 15 + Math.floor(r() * 12)) };
        }
        const b = bimActual();
        const notas = Object.fromEntries(inf.areas.map((x) => [x.area, BIMESTRES.map((_, k) => (k < b ? pick(["AD", "A", "A", "B", "B", "C"]) : ""))]));
        est[correo] = { correo, nombres, apellidos, codigo: `2026-${aula.toUpperCase()}-${String(i + 1).padStart(3, "0")}`, nivel: aula[0], grado: Number(aula[1]), seccion: aula[2], aula, notas, asistencia, foto: "" };
        fichas[correo] = { dni: String(70000000 + Math.floor(r() * 9999999)), nacimiento: `${2026 - (aula[0] === "s" ? 11 + Number(aula[1]) : 5 + Number(aula[1]))}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`, apoderado: `${pick(NF)} ${apellidos.split(" ")[0]}`, parentesco: "Madre", telefono: "9" + String(10000000 + Math.floor(r() * 89999999)), direccion: `Mz. ${String.fromCharCode(65 + Math.floor(r() * 10))} Lt. ${1 + Math.floor(r() * 30)}, Nuevo Chimbote`, observaciones: "" };
      }
    });
    const doc = {
      ["rosa.paredes@" + DOM]: { nombres: "Rosa Elena", apellidos: "Paredes Villanueva", correo: "rosa.paredes@" + DOM, tutorDe: ["s3B"], areas: { s3B: ["Matemática", "Tutoría"], s3A: ["Matemática"] } },
      ["jorge.cerna@" + DOM]: { nombres: "Jorge", apellidos: "Cerna Alva", correo: "jorge.cerna@" + DOM, tutorDe: ["p5D"], areas: { p5D: ["Tutoría", "Matemática", "Comunicación"] } },
      ["ana.soto@" + DOM]: { nombres: "Ana", apellidos: "Soto Vera", correo: "ana.soto@" + DOM, tutorDe: [], areas: { s3B: ["Inglés"], s3A: ["Inglés"] } },
    };
    const adm = { ["direccion@" + DOM]: { nombre: "Dirección (demostración)", agregadoPor: "importar.mjs" } };
    const espera = () => new Promise((ok) => setTimeout(ok, 200));
    return {
      demo: true, correo: "direccion@" + DOM,
      estudiantes: async () => Object.values(est).map((e) => ({ id: e.correo, ...copia(e) })),
      ficha: async (id) => copia(fichas[id] || {}),
      guardarEstudiante: async (id, e, f) => { await espera(); est[id] = copia(e); fichas[id] = copia(f); },
      borrarEstudiante: async (id) => { await espera(); delete est[id]; delete fichas[id]; },
      subirFoto: async (id, blob) => { await espera(); const u = URL.createObjectURL(blob); if (est[id]) est[id].foto = u; return u; },
      quitarFoto: async (id) => { if (est[id]) est[id].foto = ""; },
      docentes: async () => Object.values(doc).map((d) => ({ id: d.correo, ...copia(d) })),
      guardarDocente: async (id, d) => { await espera(); doc[id] = copia(d); },
      borrarDocente: async (id) => { delete doc[id]; },
      admins: async () => Object.entries(adm).map(([id, x]) => ({ id, ...x })),
      agregarAdmin: async (id, nombre) => { adm[id] = { nombre, agregadoPor: "direccion@" + DOM }; },
      quitarAdmin: async (id) => { delete adm[id]; },
      importar: async (tipo, filas, prog) => {
        for (const [i, f] of filas.entries()) {
          if (tipo === "est") {
            const e = Object.fromEntries(Object.entries(f.est).filter(([, v]) => v !== "" && v != null));
            est[f.correo] = { ...(est[f.correo] || { notas: {}, asistencia: {}, foto: "", codigo: "" }), ...e };
            fichas[f.correo] = { ...(fichas[f.correo] || {}), ...f.ficha };
          }
          else doc[f.correo] = f.doc;
          if (i % 10 === 0) { prog(i / filas.length); await new Promise((ok) => setTimeout(ok, 20)); }
        }
        prog(1);
      },
    };
  };

  /* ================= Firebase ================= */
  const fbApi = (user) => {
    const db = S.db(), st = S.storage(), FS = firebase.firestore;
    const yo = user.email.toLowerCase();
    const todos = async (col) => (await db.collection(col).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    const usuarioEst = (e) => ({ nombre: `${e.nombres} ${e.apellidos}`, rol: "estudiante", aula: aulaDe(e), etiqueta: etiquetaAula(aulaDe(e)), foto: e.foto || "" });
    // Lotes de 450 escrituras como máximo (Firestore acepta 500)
    const enLotes = async (ops, prog) => {
      for (let i = 0; i < ops.length; i += 450) {
        const b = db.batch();
        ops.slice(i, i + 450).forEach((op) => op(b));
        await b.commit();
        prog && prog(Math.min(1, (i + 450) / ops.length));
      }
    };
    return {
      demo: false, correo: yo,
      estudiantes: () => todos("estudiantes"),
      ficha: async (id) => { const s = await db.collection("fichas").doc(id).get(); return s.exists ? s.data() : {}; },
      guardarEstudiante: async (id, e, f) => {
        const b = db.batch();
        const { id: _, ...datos } = e;
        b.set(db.collection("estudiantes").doc(id), { ...datos, correo: id, aula: aulaDe(e), actualizado: FS.FieldValue.serverTimestamp(), actualizadoPor: yo });
        b.set(db.collection("fichas").doc(id), f);
        b.set(db.collection("usuarios").doc(id), usuarioEst(e));
        await b.commit();
      },
      borrarEstudiante: async (id) => {
        const b = db.batch();
        ["estudiantes", "fichas", "usuarios"].forEach((c) => b.delete(db.collection(c).doc(id)));
        await b.commit();
        await st.ref(`fotos/${id}.jpg`).delete().catch(() => {});
      },
      subirFoto: async (id, blob) => {
        const ref = st.ref(`fotos/${id}.jpg`);
        await ref.put(blob, { contentType: "image/jpeg" });
        const url = await ref.getDownloadURL();
        const b = db.batch();
        b.update(db.collection("estudiantes").doc(id), { foto: url, actualizadoPor: yo });
        b.set(db.collection("usuarios").doc(id), { foto: url }, { merge: true });
        await b.commit();
        return url;
      },
      quitarFoto: async (id) => {
        await st.ref(`fotos/${id}.jpg`).delete().catch(() => {});
        const b = db.batch();
        b.update(db.collection("estudiantes").doc(id), { foto: "", actualizadoPor: yo });
        b.set(db.collection("usuarios").doc(id), { foto: "" }, { merge: true });
        await b.commit();
      },
      docentes: () => todos("docentes"),
      guardarDocente: async (id, d) => {
        const b = db.batch();
        b.set(db.collection("docentes").doc(id), { nombres: d.nombres, apellidos: d.apellidos, correo: id, tutorDe: d.tutorDe, areas: d.areas, actualizado: FS.FieldValue.serverTimestamp() });
        b.set(db.collection("usuarios").doc(id), { nombre: `${d.nombres} ${d.apellidos}`, rol: "docente", aula: "", etiqueta: etiquetaDocente(d) });
        await b.commit();
      },
      borrarDocente: async (id) => { const b = db.batch(); b.delete(db.collection("docentes").doc(id)); b.delete(db.collection("usuarios").doc(id)); await b.commit(); },
      admins: () => todos("admins"),
      agregarAdmin: (id, nombre) => db.collection("admins").doc(id).set({ nombre, agregadoPor: yo, agregado: FS.FieldValue.serverTimestamp() }),
      quitarAdmin: (id) => db.collection("admins").doc(id).delete(),
      importar: async (tipo, filas, prog) => {
        const ops = [];
        const existentes = new Set(E.map((x) => x.id));
        filas.forEach((f) => {
          if (tipo === "est") {
            // Solo se escriben los campos que trae el archivo: notas, asistencia, foto y código existentes se conservan
            const e = Object.fromEntries(Object.entries(f.est).filter(([, v]) => v !== "" && v != null));
            const nuevo = !existentes.has(f.correo);
            const datos = nuevo ? { notas: {}, asistencia: {}, foto: "", codigo: "", ...e } : e;
            ops.push((b) => b.set(db.collection("estudiantes").doc(f.correo), { ...datos, actualizadoPor: yo }, { merge: true }));
            ops.push((b) => b.set(db.collection("fichas").doc(f.correo), f.ficha, { merge: true }));
            const { foto, ...pub } = usuarioEst(f.est);
            ops.push((b) => b.set(db.collection("usuarios").doc(f.correo), nuevo ? { ...pub, foto: "" } : pub, { merge: true }));
          } else {
            ops.push((b) => b.set(db.collection("docentes").doc(f.correo), f.doc));
            ops.push((b) => b.set(db.collection("usuarios").doc(f.correo), { nombre: `${f.doc.nombres} ${f.doc.apellidos}`, rol: "docente", aula: "", etiqueta: etiquetaDocente(f.doc) }));
          }
        });
        await enLotes(ops, prog);
      },
    };
  };

  /* ================= Estado y navegación ================= */
  let api, E = [], D = [], A = [];
  let ficha = null; // { id, nuevo, e, f, orig }
  let doc = null;   // { id, nuevo, d, orig }
  let sucio = false;
  const marcarSucio = (v = true) => {
    sucio = v;
    $("#guardarBarra").hidden = !v;
    $("#guardarTexto").textContent = ficha && ficha.nuevo ? "Estudiante nuevo sin guardar" : doc && doc.nuevo ? "Docente nuevo sin guardar" : "Cambios sin guardar";
  };
  addEventListener("beforeunload", (e) => { if (sucio) { e.preventDefault(); e.returnValue = ""; } });

  let hashPrevio = "";
  const vista = (id) => {
    $$(".adm-vista").forEach((v) => { v.hidden = v.id !== "v-" + id; });
    const menu = { ficha: "estudiantes", docente: "docentes" }[id] || id;
    $$("#admMenu [data-vista]").forEach((a) => a.setAttribute("aria-current", String(a.dataset.vista === menu)));
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };
  const ruta = async () => {
    const h = decodeURIComponent(location.hash.slice(1)) || "estudiantes";
    if (sucio && h !== hashPrevio) {
      if (!confirm("Tienes cambios sin guardar. ¿Salir y descartarlos?")) { history.replaceState(null, "", "#" + hashPrevio); return; }
      marcarSucio(false);
    }
    hashPrevio = h;
    ficha = null; doc = null;
    if (h.startsWith("est=")) return abrirFicha(h.slice(4));
    if (h === "est-nuevo") return abrirFicha(null);
    if (h.startsWith("doc=")) return abrirDocente(h.slice(4));
    if (h === "doc-nuevo") return abrirDocente(null);
    if (h === "docentes") { pintarDocentes(); return vista("docentes"); }
    if (h === "accesos") { pintarAccesos(); return vista("accesos"); }
    if (h === "importar") { prepararImport(); return vista("importar"); }
    pintarEstudiantes(); vista("estudiantes");
  };
  addEventListener("hashchange", ruta);
  const ir = (h) => { if (location.hash === "#" + h) ruta(); else location.hash = h; };

  /* ================= Lista de estudiantes ================= */
  let pagina = 0;
  const POR_PAG = 50;
  const llenarGrados = (sel, nivel, conTodos) => {
    const max = nivel ? NIVELES[nivel].grados : 6;
    sel.innerHTML = (conTodos ? `<option value="">Todos los grados</option>` : "") + Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}.° ${nivel === "p" ? "grado" : nivel === "s" ? "año" : ""}</option>`).join("");
  };
  llenarGrados($("#fGrado"), "", true);
  const filtrados = () => {
    const q = norm($("#fQ").value), n = $("#fNivel").value, g = $("#fGrado").value, s = $("#fSec").value, al = $("#fAlerta").value;
    return E.filter((e) => (!q || norm(`${e.nombres} ${e.apellidos} ${e.id} ${e.codigo || ""}`).includes(q) || norm(`${e.apellidos} ${e.nombres}`).includes(q))
      && (!n || e.nivel === n) && (!g || String(e.grado) === g) && (!s || e.seccion === s)
      && (!al || (al === "alerta" && resumen(e).alerta) || (al === "sinfoto" && !e.foto) || (al === "c" && resumen(e).notasC > 0)))
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"));
  };
  const pintarEstudiantes = () => {
    const l = filtrados();
    const paginas = Math.max(1, Math.ceil(l.length / POR_PAG));
    pagina = Math.min(pagina, paginas - 1);
    const vis = l.slice(pagina * POR_PAG, (pagina + 1) * POR_PAG);
    $("#estResumen").textContent = `${l.length} de ${E.length} estudiantes. Toca una fila para ver y editar su ficha.`;
    $("#tablaEst").innerHTML = `<caption class="sr-only">Estudiantes</caption>
      <thead><tr><th scope="col">Estudiante</th><th scope="col">Aula</th><th scope="col">Asistencia</th><th scope="col">Faltas</th><th scope="col">Notas C</th><th scope="col"><span class="sr-only">Abrir</span></th></tr></thead>
      <tbody>${vis.length ? vis.map((e) => {
        const r = resumen(e);
        return `<tr class="adm-fila${r.alerta ? " is-alerta" : ""}" data-id="${esc(e.id)}" tabindex="0">
          <th scope="row"><span class="adm-persona">${fotoHtml(e)}<span><strong>${esc(e.apellidos)}, ${esc(e.nombres)}</strong><small>${esc(e.id)}</small></span></span></th>
          <td data-label="Aula"><span class="chip-aula" data-sec="${esc(e.seccion)}">${esc(corto(aulaDe(e)))}</span> <small>${e.nivel === "p" ? "Primaria" : "Secundaria"}</small></td>
          <td data-label="Asistencia"><span class="pct"><span style="--p:${r.pct}"></span></span>${r.pct}%</td>
          <td data-label="Faltas">${r.F}${r.alerta ? ' <span class="tag tag--alerta">Atención</span>' : ""}</td>
          <td data-label="Notas C">${r.notasC || "·"}</td>
          <td class="adm-fila__ir"><i class="ph ph-caret-right" aria-hidden="true"></i></td></tr>`;
      }).join("") : `<tr><td colspan="6" class="adm-vacio">No hay estudiantes con estos filtros.</td></tr>`}</tbody>`;
    $("#pagEst").innerHTML = paginas > 1 ? Array.from({ length: paginas }, (_, i) => `<button type="button" data-p="${i}" aria-current="${i === pagina}">${i + 1}</button>`).join("") : "";
  };
  ["fQ", "fNivel", "fGrado", "fSec", "fAlerta"].forEach((id) => $("#" + id).addEventListener(id === "fQ" ? "input" : "change", () => {
    if (id === "fNivel") llenarGrados($("#fGrado"), $("#fNivel").value, true);
    pagina = 0; pintarEstudiantes();
  }));
  $("#pagEst").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { pagina = Number(b.dataset.p); pintarEstudiantes(); } });
  const abrirFila = (tr) => tr && ir("est=" + tr.dataset.id);
  $("#tablaEst").addEventListener("click", (e) => abrirFila(e.target.closest(".adm-fila")));
  $("#tablaEst").addEventListener("keydown", (e) => { if (e.key === "Enter") abrirFila(e.target.closest(".adm-fila")); });
  $("#nuevoEst").addEventListener("click", () => ir("est-nuevo"));
  $("#exportEst").addEventListener("click", async () => {
    const q = (t) => `"${String(t ?? "").replace(/"/g, '""')}"`;
    const l = filtrados();
    const fs = await Promise.all(l.map((e) => api.ficha(e.id).catch(() => ({}))));
    const filas = [["correo", "nombres", "apellidos", "codigo", "nivel", "grado", "seccion", "dni", "nacimiento", "apoderado", "parentesco", "telefono", "direccion", "asistencia_pct", "faltas", "tardanzas", "justificadas"].join(";")]
      .concat(l.map((e, i) => { const r = resumen(e), f = fs[i] || {}; return [e.id, e.nombres, e.apellidos, e.codigo, e.nivel, e.grado, e.seccion, f.dni, f.nacimiento, f.apoderado, f.parentesco, f.telefono, f.direccion, r.pct, r.F, r.T, r.J].map(q).join(";"); }));
    descargar(`estudiantes-${clave(hoy)}.csv`, filas.join("\r\n"));
  });
  const descargar = (nombre, texto) => {
    const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ================= Ficha del estudiante ================= */
  const CAMPOS_E = ["nombres", "apellidos", "codigo"], CAMPOS_F = ["dni", "nacimiento", "apoderado", "parentesco", "telefono", "direccion", "observaciones"];
  const form = $("#ft-datos");
  const abrirFicha = async (id) => {
    vista("ficha");
    let e, f;
    if (id) {
      e = E.find((x) => x.id === id);
      if (!e) { toast("Ese estudiante no existe.", "error"); return ir("estudiantes"); }
      e = copia(e);
      $("#fNombre").textContent = "Cargando…";
      try { f = await api.ficha(id); } catch (err) { f = {}; toast("No se pudo leer la ficha personal.", "error"); }
    } else {
      e = { nombres: "", apellidos: "", codigo: "", nivel: "s", grado: 1, seccion: "A", notas: {}, asistencia: {}, foto: "" };
      f = {};
    }
    ficha = { id, nuevo: !id, e, f, orig: JSON.stringify([e, f]) };
    // Formulario
    CAMPOS_E.forEach((k) => { form.elements[k].value = e[k] || ""; });
    CAMPOS_F.forEach((k) => { form.elements[k].value = f[k] || ""; });
    form.elements.correo.value = id || "";
    form.elements.correo.readOnly = !!id;
    $("#dCorreoAyuda").textContent = id ? "El correo no se cambia. Para otro correo, crea un estudiante nuevo." : `Debe terminar en @${DOM}. Con este correo entra a la intranet.`;
    form.elements.nivel.value = e.nivel; llenarGrados(form.elements.grado, e.nivel, false);
    form.elements.grado.value = e.grado; form.elements.seccion.value = e.seccion;
    $("#dError").textContent = "";
    $("#borrarEst").hidden = !id;
    $("#verPerfilPub").hidden = !id;
    if (id) $("#verPerfilPub").href = `comunidad.html?u=${encodeURIComponent(id)}${api.demo ? "&demo" : ""}`;
    diaSel = null; mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    pintarCabecera(); pintarNotasFicha(); pintarCalendario(); limpiarDia();
    elegirTab("datos");
    marcarSucio(!id);
  };
  const pintarCabecera = () => {
    const { e, id } = ficha;
    $("#fNombre").textContent = id ? `${e.nombres} ${e.apellidos}` : "Nuevo estudiante";
    $("#fSub").textContent = id ? `${etiquetaAula(aulaDe(e))}${e.codigo ? ". Código " + e.codigo : ""}` : "Completa los datos y guarda para crear su cuenta.";
    $("#fFoto").innerHTML = fotoHtml({ ...e, seccion: e.seccion }, "adm-foto--xl");
    $("#quitarFoto").hidden = !e.foto;
    $("#subirFoto").disabled = !id;
    $("#subirFoto").title = id ? "" : "Guarda primero al estudiante";
    const r = resumen(e);
    $("#fResumen").innerHTML = id ? [["P", `${r.pct}% asistencia`], ["F", `${r.F} faltas`], ["T", `${r.T} tardanzas`], ["J", `${r.J} justificadas`], ["X", `${r.notasC} notas C`]]
      .map(([k, t]) => `<li data-e="${k}">${t}</li>`).join("") : "";
  };
  // Pestañas de la ficha
  const elegirTab = (t) => $$("#fichaTabs [role=tab]").forEach((b) => {
    const on = b.id === "ftb-" + t;
    b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
    $("#" + b.getAttribute("aria-controls")).hidden = !on;
  });
  $$("#fichaTabs [role=tab]").forEach((b, i, todos) => {
    b.addEventListener("click", () => elegirTab(b.id.slice(4)));
    b.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      const k = (i + (ev.key === "ArrowRight" ? 1 : todos.length - 1)) % todos.length;
      todos[k].focus(); elegirTab(todos[k].id.slice(4));
    });
  });
  // Datos
  form.addEventListener("input", (ev) => {
    if (!ficha) return;
    const k = ev.target.name;
    if (CAMPOS_E.includes(k)) ficha.e[k] = ev.target.value;
    if (CAMPOS_F.includes(k)) ficha.f[k] = ev.target.value;
    marcarSucio(true);
  });
  form.addEventListener("change", (ev) => {
    if (!ficha) return;
    const k = ev.target.name;
    if (k === "nivel") { ficha.e.nivel = ev.target.value; llenarGrados(form.elements.grado, ficha.e.nivel, false); ficha.e.grado = Math.min(ficha.e.grado, NIVELES[ficha.e.nivel].grados); form.elements.grado.value = ficha.e.grado; }
    if (k === "grado") ficha.e.grado = Number(ev.target.value);
    if (k === "seccion") ficha.e.seccion = ev.target.value;
    if (["nivel", "grado", "seccion"].includes(k)) { pintarCabecera(); pintarNotasFicha(); }
    if (CAMPOS_F.includes(k)) ficha.f[k] = ev.target.value;
    marcarSucio(true);
  });
  form.addEventListener("submit", (ev) => ev.preventDefault());

  // Notas
  const pintarNotasFicha = () => {
    const { e } = ficha, b = bimActual();
    const areas = armar(e.nivel, e.grado, e.seccion).areas.map((x) => x.area);
    Object.keys(e.notas || {}).forEach((x) => { if (!areas.includes(x)) areas.push(x); });
    $("#fNotas").innerHTML = `<thead><tr><th scope="col">Área</th>${BIMESTRES.map(([r], i) => `<th scope="col"${i === b ? ' class="is-actual"' : ""}>${r} bim.</th>`).join("")}</tr></thead>
      <tbody>${areas.map((ar) => { const v = (e.notas || {})[ar] || ["", "", "", ""]; return `<tr data-area="${esc(ar)}"><th scope="row">${esc(ar)}</th>${v.map((n, i) => `<td data-label="Bimestre ${BIMESTRES[i][0]}"><label class="sr-only" for="fn-${esc(ar)}-${i}">${esc(ar)}, bimestre ${BIMESTRES[i][0]}</label><select id="fn-${esc(ar)}-${i}" class="sel-nota" data-b="${i}" data-v="${n || ""}"><option value="">·</option>${NOTAS.map((x) => `<option${x === n ? " selected" : ""}>${x}</option>`).join("")}</select></td>`).join("")}</tr>`; }).join("")}</tbody>`;
  };
  $("#fNotas").addEventListener("change", (ev) => {
    const s = ev.target.closest(".sel-nota"); if (!s) return;
    const ar = s.closest("tr").dataset.area;
    const v = (ficha.e.notas[ar] || ["", "", "", ""]).slice(); v[Number(s.dataset.b)] = s.value;
    ficha.e.notas = { ...ficha.e.notas, [ar]: v };
    s.dataset.v = s.value; s.closest("td").classList.add("is-cambiado");
    pintarCabecera(); marcarSucio(true);
  });

  // Asistencia: calendario editable
  let mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1), diaSel = null;
  const primerMes = new Date(BIMESTRES[0][1].getFullYear(), BIMESTRES[0][1].getMonth(), 1);
  const regDe = (k) => { const v = (ficha.e.asistencia || {})[k]; return v == null ? null : typeof v === "string" ? { e: v } : v; };
  const pintarCalendario = () => {
    $("#aMes").textContent = may(new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(mes));
    const lun = (mes.getDay() + 6) % 7, off = lun >= 5 ? 0 : lun, celdas = [];
    for (let i = 0; i < off; i++) celdas.push('<li class="cal-dia is-fuera" aria-hidden="true"></li>');
    for (let d = new Date(mes); d.getMonth() === mes.getMonth(); d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const k = clave(d), x = regDe(k), fut = d > hoy, fer = FERIADOS.includes(k);
      celdas.push(`<li class="cal-dia${x ? " e-" + x.e : ""}${+d === +hoy ? " is-hoy" : ""}${fut ? " is-futuro" : ""}${fer ? " is-feriado" : ""}${x && x.j && x.j.estado !== "aprobada" ? " is-pend" : ""}"><button type="button" data-k="${k}" aria-pressed="${k === diaSel}" ${fut ? "disabled" : ""} aria-label="${d.getDate()}${x ? ", " + ETQ[x.e] : fer ? ", feriado" : ""}">${d.getDate()}</button></li>`);
    }
    $("#aGrid").innerHTML = celdas.join("");
    $("#aMesAnt").disabled = mes <= primerMes;
    $("#aMesSig").disabled = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  };
  $("#aMesAnt").addEventListener("click", () => { mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); pintarCalendario(); });
  $("#aMesSig").addEventListener("click", () => { mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); pintarCalendario(); });
  const limpiarDia = () => { $("#deFecha").textContent = "Elige un día del calendario"; $("#diaEdit").reset(); $("#deAplicar").disabled = true; $("#deJust").hidden = true; $("#deHoraF").hidden = false; };
  const ajustarEditor = () => {
    const est = $("#deEstado").value;
    $("#deHoraF").hidden = !(est === "P" || est === "T");
    $("#deJust").hidden = !(est === "F" || est === "J");
    if (est === "J" && !$("#deJEst").value) $("#deJEst").value = "aprobada";
  };
  $("#aGrid").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-k]"); if (!b) return;
    diaSel = b.dataset.k;
    $$("#aGrid button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const x = regDe(diaSel) || {};
    $("#deFecha").textContent = may(new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(aFecha(diaSel)));
    $("#deEstado").value = x.e || "";
    $("#deHora").value = x.h ? x.h.padStart(5, "0") : "";
    const j = x.j || {};
    $("#deMotivo").value = j.motivo || ""; $("#dePres").value = j.presentada || ""; $("#deJEst").value = j.estado || ""; $("#dePor").value = j.por || ""; $("#deObs").value = j.obs || "";
    $("#deAplicar").disabled = false;
    ajustarEditor();
  });
  $("#deEstado").addEventListener("change", ajustarEditor);
  $("#diaEdit").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!diaSel) return;
    const est = $("#deEstado").value, asis = { ...(ficha.e.asistencia || {}) };
    if (!est) delete asis[diaSel];
    else {
      const r = { e: est };
      if ((est === "P" || est === "T") && $("#deHora").value) { const [hh, mm] = $("#deHora").value.split(":"); r.h = `${Number(hh)}:${mm}`; }
      const jEst = $("#deJEst").value, motivo = $("#deMotivo").value.trim();
      if ((est === "F" || est === "J") && (jEst || motivo)) {
        if (!motivo) return toast("Escribe el motivo de la justificación.", "error");
        r.j = { motivo, estado: jEst || "pendiente" };
        if ($("#dePres").value) r.j.presentada = $("#dePres").value;
        if ($("#dePor").value.trim()) r.j.por = $("#dePor").value.trim();
        if ($("#deObs").value.trim()) r.j.obs = $("#deObs").value.trim();
        r.j.revisadoPor = api.correo;
        // Coherencia: aprobada es falta justificada; en revisión u observada sigue siendo falta
        r.e = r.j.estado === "aprobada" ? "J" : "F";
      }
      asis[diaSel] = r;
    }
    ficha.e.asistencia = asis;
    pintarCalendario(); pintarCabecera(); marcarSucio(true);
    toast("Día actualizado. Recuerda guardar.");
  });

  // Foto
  $("#subirFoto").addEventListener("click", () => $("#inFoto").click());
  $("#inFoto").addEventListener("change", async (ev) => {
    const file = ev.target.files[0]; ev.target.value = "";
    if (!file || !ficha || !ficha.id) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Usa una foto JPG, PNG o WEBP.", "error");
    const btn = $("#subirFoto"); btn.disabled = true; btn.classList.add("is-cargando");
    try {
      const url = await api.subirFoto(ficha.id, await recortarFoto(file));
      ficha.e.foto = url;
      const x = E.find((y) => y.id === ficha.id); if (x) x.foto = url;
      pintarCabecera(); toast("Foto actualizada.", "ok");
    } catch (err) { console.error(err); toast("No se pudo subir la foto.", "error"); }
    btn.disabled = false; btn.classList.remove("is-cargando");
  });
  $("#quitarFoto").addEventListener("click", async () => {
    if (!confirm("¿Quitar la foto de perfil?")) return;
    try { await api.quitarFoto(ficha.id); ficha.e.foto = ""; const x = E.find((y) => y.id === ficha.id); if (x) x.foto = ""; pintarCabecera(); toast("Foto quitada."); }
    catch (err) { toast("No se pudo quitar la foto.", "error"); }
  });

  // Guardar / eliminar estudiante
  const validarEst = () => {
    const { e, f } = ficha, correo = norm(form.elements.correo.value);
    if (!e.nombres.trim() || !e.apellidos.trim()) return "Escribe nombres y apellidos.";
    if (ficha.nuevo) {
      if (!correo.endsWith("@" + DOM) || !/^[^@\s]+@/.test(correo)) return `El correo debe terminar en @${DOM}.`;
      if (E.some((x) => x.id === correo) || D.some((x) => x.id === correo)) return "Ya existe una cuenta con ese correo.";
    }
    if (f.dni && !/^\d{8}$/.test(f.dni)) return "El DNI debe tener 8 dígitos.";
    if (f.telefono && !/^9\d{8}$/.test(f.telefono)) return "El celular debe tener 9 dígitos y empezar con 9.";
    return "";
  };
  const guardarEst = async () => {
    const err = validarEst();
    if (err) { elegirTab("datos"); $("#dError").textContent = err; toast(err, "error"); return; }
    $("#dError").textContent = "";
    const id = ficha.id || norm(form.elements.correo.value);
    const e = { ...ficha.e, nombres: ficha.e.nombres.trim(), apellidos: ficha.e.apellidos.trim(), grado: Number(ficha.e.grado), correo: id, aula: aulaDe(ficha.e) };
    const f = Object.fromEntries(Object.entries(ficha.f).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    const btn = $("#guardar"); btn.disabled = true; btn.classList.add("is-cargando");
    try {
      await api.guardarEstudiante(id, e, f);
      const i = E.findIndex((x) => x.id === id);
      if (i >= 0) E[i] = { id, ...e }; else E.push({ id, ...e });
      $("#nEst").textContent = E.length;
      marcarSucio(false);
      toast(ficha.nuevo ? "Estudiante creado. Ya puede entrar con su correo." : "Cambios guardados.", "ok");
      if (ficha.nuevo) { hashPrevio = "est=" + id; history.replaceState(null, "", "#est=" + id); ficha.id = id; ficha.nuevo = false; abrirFicha(id); }
      else { ficha.orig = JSON.stringify([ficha.e, ficha.f]); pintarCabecera(); $$("#fNotas .is-cambiado").forEach((x) => x.classList.remove("is-cambiado")); }
    } catch (er) { console.error(er); toast(er.code === "permission-denied" ? "Tu cuenta no tiene permiso de administración." : "No se pudo guardar. Revisa tu conexión.", "error"); }
    btn.disabled = false; btn.classList.remove("is-cargando");
  };
  $("#borrarEst").addEventListener("click", async () => {
    const { e, id } = ficha;
    if (!confirm(`¿Eliminar a ${e.nombres} ${e.apellidos}? Se borran sus notas, asistencia, ficha personal y foto. No se puede deshacer.`)) return;
    try { await api.borrarEstudiante(id); E = E.filter((x) => x.id !== id); $("#nEst").textContent = E.length; marcarSucio(false); toast("Estudiante eliminado."); ir("estudiantes"); }
    catch (er) { toast("No se pudo eliminar.", "error"); }
  });

  /* ================= Docentes ================= */
  const pintarDocentes = () => {
    const q = norm($("#dQ").value);
    const l = D.filter((d) => !q || norm(`${d.nombres} ${d.apellidos} ${d.id}`).includes(q)).sort((a, b) => `${a.apellidos}`.localeCompare(`${b.apellidos}`, "es"));
    $("#tablaDoc").innerHTML = `<thead><tr><th scope="col">Docente</th><th scope="col">Tutoría</th><th scope="col">Áreas</th><th scope="col"><span class="sr-only">Abrir</span></th></tr></thead>
      <tbody>${l.length ? l.map((d) => `<tr class="adm-fila" data-id="${esc(d.id)}" tabindex="0">
        <th scope="row"><span class="adm-persona"><span class="adm-foto adm-foto--ini" data-sec="doc" aria-hidden="true">${esc(iniciales(d.nombres, d.apellidos))}</span><span><strong>${esc(d.apellidos)}, ${esc(d.nombres)}</strong><small>${esc(d.id)}</small></span></span></th>
        <td data-label="Tutoría">${(d.tutorDe || []).map((a) => `<span class="chip-aula" data-sec="${a[2]}">${corto(a)}</span>`).join(" ") || "·"}</td>
        <td data-label="Áreas">${Object.entries(d.areas || {}).map(([a, ar]) => `<small class="asig"><b>${corto(a)}</b> ${esc(ar.join(", "))}</small>`).join("") || "·"}</td>
        <td class="adm-fila__ir"><i class="ph ph-caret-right" aria-hidden="true"></i></td></tr>`).join("") : `<tr><td colspan="4" class="adm-vacio">No hay docentes.</td></tr>`}</tbody>`;
  };
  $("#dQ").addEventListener("input", pintarDocentes);
  $("#tablaDoc").addEventListener("click", (e) => { const tr = e.target.closest(".adm-fila"); if (tr) ir("doc=" + tr.dataset.id); });
  $("#tablaDoc").addEventListener("keydown", (e) => { const tr = e.target.closest(".adm-fila"); if (tr && e.key === "Enter") ir("doc=" + tr.dataset.id); });
  $("#nuevoDoc").addEventListener("click", () => ir("doc-nuevo"));
  const areasNivel = (n) => [...new Set(armar(n, 1, "A").areas.map((x) => x.area))];
  const optsAulas = (sel) => Object.entries(NIVELES).map(([n, nv]) => `<optgroup label="${nv.nombre}">${TODAS_AULAS.filter((a) => a[0] === n).map((a) => `<option value="${a}"${a === sel ? " selected" : ""}>${corto(a)}</option>`).join("")}</optgroup>`).join("");
  const abrirDocente = (id) => {
    vista("docente");
    let d = id ? D.find((x) => x.id === id) : { nombres: "", apellidos: "", tutorDe: [], areas: {} };
    if (!d) { toast("Ese docente no existe.", "error"); return ir("docentes"); }
    d = copia(d);
    doc = { id, nuevo: !id, d };
    $("#tNombres").value = d.nombres; $("#tApellidos").value = d.apellidos;
    $("#tCorreo").value = id || ""; $("#tCorreo").readOnly = !!id;
    $("#dtNombre").textContent = id ? `${d.nombres} ${d.apellidos}` : "Nuevo docente";
    $("#dtSub").textContent = id ? etiquetaDocente(d) : "Completa los datos y guarda.";
    $("#dtAvatar").innerHTML = `<span class="adm-foto adm-foto--ini adm-foto--xl" data-sec="doc" aria-hidden="true">${esc(iniciales(d.nombres, d.apellidos))}</span>`;
    $("#borrarDoc").hidden = !id;
    $("#tError").textContent = "";
    pintarAsignaciones();
    marcarSucio(!id);
  };
  const pintarAsignaciones = () => {
    const d = doc.d;
    $("#tTutor").innerHTML = TODAS_AULAS.map((a) => `<label class="aula-chk" data-sec="${a[2]}"><input type="checkbox" value="${a}"${d.tutorDe.includes(a) ? " checked" : ""}><span>${corto(a)}<small>${a[0] === "p" ? "Prim." : "Sec."}</small></span></label>`).join("");
    $("#tAreas").innerHTML = Object.entries(d.areas).map(([a, ar], i) => `<div class="asig-fila" data-aula="${a}">
      <div class="field"><label for="asg-${i}">Aula</label><select id="asg-${i}" data-cambiar-aula>${optsAulas(a)}</select></div>
      <div class="asig-areas" role="group" aria-label="Áreas en ${corto(a)}">${areasNivel(a[0]).map((x) => `<label><input type="checkbox" value="${esc(x)}"${ar.includes(x) ? " checked" : ""}> ${esc(x)}</label>`).join("")}</div>
      <button type="button" class="icon-btn icon-btn--sm" data-quitar-aula aria-label="Quitar ${corto(a)}"><i class="ph ph-trash" aria-hidden="true"></i></button>
    </div>`).join("") || `<p class="help">Sin áreas asignadas.</p>`;
  };
  $("#formDoc").addEventListener("input", (e) => {
    if (!doc) return;
    if (e.target.id === "tNombres") doc.d.nombres = e.target.value;
    if (e.target.id === "tApellidos") doc.d.apellidos = e.target.value;
    marcarSucio(true);
  });
  $("#formDoc").addEventListener("change", (e) => {
    if (!doc) return;
    const t = e.target;
    if (t.closest("#tTutor")) doc.d.tutorDe = $$("#tTutor input:checked").map((x) => x.value);
    const fila = t.closest(".asig-fila");
    if (fila && t.matches("[data-cambiar-aula]")) {
      const vieja = fila.dataset.aula, nueva = t.value;
      if (doc.d.areas[nueva] && nueva !== vieja) { toast("Esa aula ya está en la lista.", "error"); t.value = vieja; return; }
      const ar = (doc.d.areas[vieja] || []).filter((x) => areasNivel(nueva[0]).includes(x));
      const nuevo = {}; Object.entries(doc.d.areas).forEach(([k, v]) => { nuevo[k === vieja ? nueva : k] = k === vieja ? ar : v; });
      doc.d.areas = nuevo; pintarAsignaciones();
    } else if (fila) {
      doc.d.areas[fila.dataset.aula] = $$("input:checked", fila).map((x) => x.value);
    }
    marcarSucio(true);
  });
  $("#formDoc").addEventListener("click", (e) => {
    const b = e.target.closest("[data-quitar-aula]"); if (!b) return;
    delete doc.d.areas[b.closest(".asig-fila").dataset.aula]; pintarAsignaciones(); marcarSucio(true);
  });
  $("#tAgregar").addEventListener("click", () => {
    const libre = TODAS_AULAS.find((a) => !doc.d.areas[a]);
    doc.d.areas[libre] = []; pintarAsignaciones(); marcarSucio(true);
    $("#tAreas .asig-fila:last-child select").focus();
  });
  $("#formDoc").addEventListener("submit", (e) => e.preventDefault());
  const guardarDoc = async () => {
    const d = doc.d, id = doc.id || norm($("#tCorreo").value);
    if (!d.nombres.trim() || !d.apellidos.trim()) return ($("#tError").textContent = "Escribe nombres y apellidos.");
    if (doc.nuevo) {
      if (!id.endsWith("@" + DOM)) return ($("#tError").textContent = `El correo debe terminar en @${DOM}.`);
      if (D.some((x) => x.id === id) || E.some((x) => x.id === id)) return ($("#tError").textContent = "Ya existe una cuenta con ese correo.");
    }
    const areas = Object.fromEntries(Object.entries(d.areas).filter(([, v]) => v.length));
    if (!d.tutorDe.length && !Object.keys(areas).length) return ($("#tError").textContent = "Asigna al menos una tutoría o un área.");
    $("#tError").textContent = "";
    const limpio = { nombres: d.nombres.trim(), apellidos: d.apellidos.trim(), correo: id, tutorDe: d.tutorDe, areas };
    try {
      await api.guardarDocente(id, limpio);
      const i = D.findIndex((x) => x.id === id);
      if (i >= 0) D[i] = { id, ...limpio }; else D.push({ id, ...limpio });
      $("#nDoc").textContent = D.length;
      marcarSucio(false); toast(doc.nuevo ? "Docente creado." : "Cambios guardados.", "ok");
      hashPrevio = "doc=" + id; history.replaceState(null, "", "#doc=" + id); abrirDocente(id);
    } catch (er) { toast("No se pudo guardar el docente.", "error"); }
  };
  $("#borrarDoc").addEventListener("click", async () => {
    if (!confirm(`¿Eliminar a ${doc.d.nombres} ${doc.d.apellidos}? Pierde el acceso al portal docente.`)) return;
    try { await api.borrarDocente(doc.id); D = D.filter((x) => x.id !== doc.id); $("#nDoc").textContent = D.length; marcarSucio(false); toast("Docente eliminado."); ir("docentes"); }
    catch (er) { toast("No se pudo eliminar.", "error"); }
  });

  /* ================= Barra de guardado ================= */
  $("#guardar").addEventListener("click", () => (ficha ? guardarEst() : doc ? guardarDoc() : null));
  $("#descartar").addEventListener("click", () => {
    if (!confirm("¿Descartar los cambios?")) return;
    marcarSucio(false);
    if (ficha && ficha.id) abrirFicha(ficha.id); else if (doc && doc.id) abrirDocente(doc.id); else ir(ficha ? "estudiantes" : "docentes");
  });

  /* ================= Accesos ================= */
  const pintarAccesos = () => {
    $("#accEst").textContent = E.length; $("#accDoc").textContent = D.length; $("#accAdm").textContent = A.length;
    $("#listaAdm").innerHTML = A.map((a) => `<li data-id="${esc(a.id)}"><span class="adm-foto adm-foto--ini" data-sec="doc" aria-hidden="true"><i class="ph ph-shield-check"></i></span>
      <span><strong>${esc(a.nombre || a.id)}</strong><small>${esc(a.id)}${a.id === api.correo ? " (tú)" : ""}</small></span>
      <button type="button" class="btn btn--ghost btn--sm adm-peligro" data-quitar-adm ${a.id === api.correo && A.length === 1 ? 'disabled title="Es la única cuenta de administración"' : ""}>Quitar acceso</button></li>`).join("");
  };
  $("#formAdm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = norm($("#aCorreo").value), n = $("#aNombre").value.trim();
    if (!c.endsWith("@" + DOM) || !/^[^@\s]+@/.test(c)) return ($("#aError").textContent = `El correo debe terminar en @${DOM}.`);
    if (A.some((x) => x.id === c)) return ($("#aError").textContent = "Esa cuenta ya es de administración.");
    $("#aError").textContent = "";
    try { await api.agregarAdmin(c, n); A.push({ id: c, nombre: n }); $("#nAdm").textContent = A.length; e.target.reset(); pintarAccesos(); toast("Acceso de administración otorgado.", "ok"); }
    catch (er) { toast("No se pudo dar el acceso.", "error"); }
  });
  $("#listaAdm").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-quitar-adm]"); if (!b) return;
    const id = b.closest("li").dataset.id;
    if (!confirm(id === api.correo ? "¿Quitarte tu propio acceso? Saldrás del panel." : `¿Quitar el acceso de administración a ${id}?`)) return;
    try {
      await api.quitarAdmin(id); A = A.filter((x) => x.id !== id); $("#nAdm").textContent = A.length; pintarAccesos(); toast("Acceso quitado.");
      if (id === api.correo) { await S.salir(); location.replace("admin-login.html"); }
    } catch (er) { toast("No se pudo quitar el acceso.", "error"); }
  });

  /* ================= Importar CSV ================= */
  const PLANTILLA = {
    est: { cols: ["correo", "nombres", "apellidos", "nivel", "grado", "seccion", "codigo", "dni", "nacimiento", "apoderado", "parentesco", "telefono", "direccion"], ej: [`thiago.quispe@${DOM}`, "Thiago Mateo", "Quispe Huamán", "secundaria", "3", "B", "2026-S3B-001", "71234567", "2012-05-14", "Rosa Huamán", "Madre", "987654321", "Mz. F Lt. 1, Nuevo Chimbote"] },
    doc: { cols: ["correo", "nombres", "apellidos", "tutoria", "areas"], ej: [`rosa.paredes@${DOM}`, "Rosa Elena", "Paredes Villanueva", "s3B", "s3B:Matemática/Tutoría | s3A:Matemática"] },
  };
  let impTipo = "est", impFilas = [];
  const prepararImport = () => {
    impTipo = $("input[name=impTipo]:checked").value;
    $("#impCols").textContent = `Columnas: ${PLANTILLA[impTipo].cols.join(", ")}.` + (impTipo === "doc" ? " En tutoria van aulas como s3B o p5D; en areas, aula:área/área separadas por |." : " Nivel: primaria o secundaria.");
    $("#impResultado").hidden = true; $("#impZona").hidden = false; impFilas = [];
  };
  $$("input[name=impTipo]").forEach((r) => r.addEventListener("change", prepararImport));
  $("#impPlantilla").addEventListener("click", () => descargar(`plantilla-${impTipo === "est" ? "estudiantes" : "docentes"}.csv`, [PLANTILLA[impTipo].cols.join(";"), PLANTILLA[impTipo].ej.join(";")].join("\r\n")));
  $("#impElegir").addEventListener("click", () => $("#impArchivo").click());
  $("#impArchivo").addEventListener("change", (e) => { if (e.target.files[0]) leerCsv(e.target.files[0]); e.target.value = ""; });
  const zona = $("#impZona");
  ["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add("is-sobre"); }));
  ["dragleave", "drop"].forEach((t) => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove("is-sobre"); }));
  zona.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) leerCsv(f); });
  // CSV con comillas; separador ; (Excel en español) o ,
  const parseCsv = (txt) => {
    txt = txt.replace(/^﻿/, "");
    const primera = txt.split(/\r?\n/)[0] || "";
    const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ";" : ",";
    const filas = []; let fila = [], campo = "", q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c; }
      else if (c === '"') q = true;
      else if (c === sep) { fila.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && txt[i + 1] === "\n") i++; fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else campo += c;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((x) => x.trim()));
  };
  const leerCsv = async (file) => {
    const filas = parseCsv(await file.text());
    if (filas.length < 2) return toast("El archivo está vacío o no tiene encabezados.", "error");
    const cab = filas[0].map((h) => norm(h).replace(/[^a-z]/g, ""));
    const obj = filas.slice(1).map((f) => Object.fromEntries(cab.map((h, i) => [h, (f[i] || "").trim()])));
    const errores = [], vistos = new Set();
    impFilas = obj.map((o, i) => {
      const n = i + 2, correo = norm(o.correo);
      const err = (t) => errores.push(`Fila ${n}: ${t}`);
      if (!correo.endsWith("@" + DOM)) err(`correo "${o.correo}" no termina en @${DOM}`);
      if (vistos.has(correo)) err(`correo repetido en el archivo`); vistos.add(correo);
      if (!o.nombres || !o.apellidos) err("faltan nombres o apellidos");
      if (impTipo === "est") {
        const nivel = /^s/i.test(o.nivel) ? "s" : /^p/i.test(o.nivel) ? "p" : "";
        const grado = Number(o.grado), seccion = String(o.seccion || "").toUpperCase();
        if (!nivel) err(`nivel "${o.nivel}" debe ser primaria o secundaria`);
        else if (!(grado >= 1 && grado <= NIVELES[nivel].grados)) err(`grado "${o.grado}" fuera de rango`);
        if (!SECCIONES.includes(seccion)) err(`sección "${o.seccion}" debe ser A, B, C o D`);
        if (o.dni && !/^\d{8}$/.test(o.dni)) err("DNI debe tener 8 dígitos");
        if (o.telefono && !/^9\d{8}$/.test(o.telefono)) err("celular debe tener 9 dígitos y empezar con 9");
        const est = { correo, nombres: o.nombres, apellidos: o.apellidos, codigo: o.codigo || "", nivel, grado, seccion, aula: `${nivel}${grado}${seccion}` };
        const ficha = Object.fromEntries(["dni", "nacimiento", "apoderado", "parentesco", "telefono", "direccion"].filter((k) => o[k]).map((k) => [k, o[k]]));
        return { correo, est, ficha, vista: [correo, `${o.apellidos}, ${o.nombres}`, nivel ? corto(`${nivel}${grado}${seccion}`) : "?", NIVELES[nivel] ? NIVELES[nivel].nombre : "?"] };
      }
      const tutorDe = (o.tutoria || "").split(/[\s,|]+/).filter(Boolean);
      tutorDe.forEach((a) => { if (!TODAS_AULAS.includes(a)) err(`tutoría "${a}" no es un aula válida (ej.: s3B)`); });
      const areas = {};
      (o.areas || "").split("|").map((x) => x.trim()).filter(Boolean).forEach((x) => {
        const [a, l] = x.split(":").map((y) => (y || "").trim());
        if (!TODAS_AULAS.includes(a)) return err(`aula "${a}" en áreas no es válida`);
        areas[a] = (l || "").split("/").map((y) => y.trim()).filter(Boolean);
        if (!areas[a].length) err(`aula ${a} sin áreas`);
      });
      if (!tutorDe.length && !Object.keys(areas).length) err("sin tutoría ni áreas");
      return { correo, doc: { nombres: o.nombres, apellidos: o.apellidos, correo, tutorDe, areas }, vista: [correo, `${o.apellidos}, ${o.nombres}`, tutorDe.map(corto).join(" ") || "·", Object.entries(areas).map(([a, l]) => `${corto(a)}: ${l.join(", ")}`).join("; ")] };
    });
    const existentes = impFilas.filter((f) => (impTipo === "est" ? E : D).some((x) => x.id === f.correo)).length;
    $("#impZona").hidden = true; $("#impResultado").hidden = false;
    $("#impResumen").textContent = errores.length ? `${errores.length} error(es). Corrige el archivo y vuelve a subirlo.` : `${impFilas.length} fila(s) listas: ${impFilas.length - existentes} nuevas y ${existentes} que se actualizan.${impTipo === "est" ? " Notas y asistencia existentes no se tocan." : ""}`;
    $("#impErrores").innerHTML = errores.slice(0, 30).map((t) => `<li>${esc(t)}</li>`).join("") + (errores.length > 30 ? `<li>… y ${errores.length - 30} más.</li>` : "");
    const cabV = impTipo === "est" ? ["Correo", "Estudiante", "Aula", "Nivel"] : ["Correo", "Docente", "Tutoría", "Áreas"];
    $("#impVista").innerHTML = `<thead><tr>${cabV.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead><tbody>${impFilas.slice(0, 12).map((f) => `<tr>${f.vista.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}${impFilas.length > 12 ? `<tr><td colspan="4" class="adm-vacio">… y ${impFilas.length - 12} más</td></tr>` : ""}</tbody>`;
    const b = $("#impConfirmar"); b.disabled = !!errores.length; $("span", b).textContent = `Importar ${impFilas.length}`;
  };
  $("#impCancelar").addEventListener("click", prepararImport);
  $("#impConfirmar").addEventListener("click", async () => {
    const b = $("#impConfirmar"); b.disabled = true; b.classList.add("is-cargando");
    try {
      await api.importar(impTipo, impFilas, (p) => { $("span", b).textContent = `Importando… ${Math.round(p * 100)}%`; });
      [E, D] = await Promise.all([api.estudiantes(), api.docentes()]);
      $("#nEst").textContent = E.length; $("#nDoc").textContent = D.length;
      toast(`Importación lista: ${impFilas.length} ${impTipo === "est" ? "estudiante(s)" : "docente(s)"}.`, "ok");
      prepararImport();
    } catch (er) { console.error(er); toast("La importación falló. Revisa tu conexión; puedes repetirla sin duplicar datos.", "error"); }
    b.disabled = false; b.classList.remove("is-cargando");
  });

  /* ================= Arranque ================= */
  $$("[data-dominio]").forEach((x) => { x.textContent = DOM; });
  $$("[data-salir], #btnSalir").forEach((b) => b.addEventListener("click", async () => {
    if (sucio && !confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) return;
    marcarSucio(false); await S.salir(); location.replace("admin-login.html");
  }));
  const iniciar = async (a) => {
    api = a;
    [E, D, A] = await Promise.all([api.estudiantes(), api.docentes(), api.admins()]);
    $("#nEst").textContent = E.length; $("#nDoc").textContent = D.length; $("#nAdm").textContent = A.length;
    $("#admQuien").textContent = api.correo;
    mostrar("app");
    ruta();
  };
  if (!S.conectada) {
    if (new URLSearchParams(location.search).has("demo")) {
      $("#avisoDemo").hidden = false;
      $$('a[href="comunidad.html"]').forEach((x) => { x.href = "comunidad.html?demo=docente"; });
      iniciar(demoApi());
    } else location.replace("admin-login.html");
    return;
  }
  S.alCambiar(async (u) => {
    if (!u) return location.replace("admin-login.html");
    if (!(await S.esAdmin(u))) {
      mostrar("vacio");
      $("#vacioTexto").textContent = `La cuenta ${u.email} no tiene acceso de administración. Si debería tenerlo, pide a otra cuenta de administración que te lo dé en Accesos.`;
      return;
    }
    try { await iniciar(fbApi(u)); }
    catch (e) { console.error(e); mostrar("vacio"); $("#vacioTitulo").textContent = "No se pudo cargar"; $("#vacioTexto").textContent = "Revisa tu conexión y vuelve a intentarlo."; }
  });
})();
