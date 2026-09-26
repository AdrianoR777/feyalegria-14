/* Perfil del estudiante: notas, asistencia (faltas, tardanzas, hoy) y horario.
   Con Firebase conectado lee estudiantes/{correo}. Sin conexión solo existe la demostración (?demo). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const S = window.SESION;
  const { armar, NIVELES, nombreAula } = window.AULAS;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const { hoy, clave, BIMESTRES, FERIADOS, bimActual, esDiaDeClase, aMin } = window.CALENDARIO;
  const minutosAhora = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  /* ---------- Estudiante de demostración (ficticio) ---------- */
  const demo = () => {
    let a = 20260925;
    const r = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
    const nivel = "s", grado = 3, seccion = "B";
    const aula = armar(nivel, grado, seccion);
    const inicio = aMin(aula.horas[0]);
    const hh = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
    const asistencia = {};
    for (let d = new Date(BIMESTRES[0][1]); d <= hoy; d.setDate(d.getDate() + 1)) {
      if (!esDiaDeClase(d)) continue;
      // Hoy solo tiene registro si ya empezó el turno
      if (+d === +hoy && minutosAhora() < inicio - 20) continue;
      const x = r();
      asistencia[clave(d)] = x < 0.035 ? { e: "F" } : x < 0.1 ? { e: "T", h: hh(inicio + 3 + Math.floor(r() * 18)) } : { e: "P", h: hh(inicio - 18 + Math.floor(r() * 16)) };
    }
    // Justificaciones: algunas faltas pasan a justificadas, una queda en revisión y otra observada
    const habil = (k, n) => { const d = new Date(k + "T00:00"); let paso = 0; while (paso < n) { d.setDate(d.getDate() + 1); if (esDiaDeClase(d)) paso++; } return clave(d); };
    const MOTIVOS = [["Cita médica en el hospital Eleazar Guzmán Barrón", "Madre de familia"], ["Enfermedad con descanso médico de 2 días", "Padre de familia"], ["Viaje familiar por fallecimiento de un familiar", "Madre de familia"], ["Trámite de DNI en RENIEC", "Apoderado"]];
    const faltas = Object.keys(asistencia).filter((k) => asistencia[k].e === "F").reverse();
    faltas.forEach((k, i) => {
      const [motivo, por] = MOTIVOS[i % MOTIVOS.length];
      const presentada = habil(k, 1 + (i % 2));
      if (i === 2) asistencia[k] = { e: "F", j: { motivo, por, presentada, estado: "observada", obs: "Falta adjuntar la constancia. Tiene 3 días hábiles para completarla en secretaría." } };
      else if (i !== 1) asistencia[k] = { e: "J", j: { motivo, por, presentada, estado: "aprobada", obs: "Revisada por la coordinación de tutoría." } };
    });
    // La falta más reciente (antes de hoy) tiene su justificación en revisión, presentada hoy
    const previas = Object.keys(asistencia).filter((k) => k < clave(hoy));
    const ultima = previas[previas.length - 2];
    if (ultima) asistencia[ultima] = { e: "F", j: { motivo: "Fiebre y malestar estomacal", por: "Madre de familia", presentada: clave(hoy), estado: "pendiente" } };
    const escala = ["AD", "A", "A", "A", "B", "B", "C"];
    const b = bimActual();
    const notas = Object.fromEntries(aula.areas.map((x) => [x.area, BIMESTRES.map((_, i) => (i < b ? escala[Math.floor(r() * (i ? 6 : 7))] : ""))]));
    return { nombres: "Thiago Mateo", apellidos: "Quispe Huamán", codigo: "2026-S3B-014", correo: "demo.estudiante@" + S.DOMINIO, nivel, grado, seccion, notas, asistencia };
  };

  /* ---------- Estados de pantalla ---------- */
  const mostrar = (id) => {
    ["cargando", "vacio", "perfil"].forEach((x) => { $("#" + x).hidden = x !== id; });
    document.body.classList.toggle("is-cargando", id === "cargando");
  };
  const vacio = (titulo, texto) => { $("#vacioTitulo").textContent = titulo; $("#vacioTexto").textContent = texto; mostrar("vacio"); };
  const salir = async () => { await S.salir(); location.replace("login.html"); };
  $$("[data-salir], #btnSalir").forEach((b) => b.addEventListener("click", salir));

  /* ---------- Dibujo del perfil ---------- */
  const pintar = (est, usuario) => {
    const nivel = NIVELES[est.nivel] ? est.nivel : "p";
    const aula = armar(nivel, Number(est.grado) || 1, String(est.seccion || "A").toUpperCase());
    document.documentElement.dataset.seccion = aula.seccion;
    document.title = `${est.nombres} ${est.apellidos} | Intranet Fe y Alegría 14`;

    // Cabecera
    const iniciales = `${(est.nombres || "?")[0]}${(est.apellidos || "")[0] || ""}`;
    // Foto oficial (subida por la administración); si no hay, la de su cuenta de Google
    const foto = est.foto || (usuario && usuario.photoURL);
    $("#avatar").innerHTML = foto ? `<img src="${esc(foto)}" alt="" width="88" height="88" referrerpolicy="no-referrer">` : esc(iniciales);
    const hora = new Date().getHours();
    $("#saludo").textContent = `${hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"}, ${String(est.nombres || "").split(" ")[0]}`;
    $("#perfilNombre").textContent = `${est.nombres} ${est.apellidos}`;
    $("#perfilMeta").innerHTML = [
      ["chalkboard", `<a href="aula.html?g=${nivel}${aula.grado}&s=${aula.seccion}">${esc(aula.nombre)}, ${aula.nivelNombre.toLowerCase()}</a>`],
      ["identification-card", `Código ${esc(est.codigo)}`],
      ["envelope-simple", esc(est.correo || (usuario && usuario.email)).replace("@", "<wbr>@")],
    ].map(([i, t]) => `<li><i class="ph ph-${i}" aria-hidden="true"></i>${t}</li>`).join("");

    // Asistencia: conteos
    const regs = Object.entries(est.asistencia || {}).map(([f, v]) => ({ f, ...(typeof v === "string" ? { e: v } : v) })).sort((x, y) => (x.f < y.f ? 1 : -1));
    const cuenta = { P: 0, T: 0, F: 0, J: 0 };
    regs.forEach((x) => { if (x.e in cuenta) cuenta[x.e]++; });
    const total = regs.length;
    const pct = total ? Math.round(((cuenta.P + cuenta.T) / total) * 100) : 100;
    $("#pctAsis").textContent = pct + "%";
    $("#anilloValor").style.setProperty("--pct", pct);
    $("#cifras").innerHTML = [
      ["calendar-check", total, "días de clase registrados", ""],
      ["x-circle", cuenta.F, cuenta.F === 1 ? "falta" : "faltas", "F"],
      ["clock-afternoon", cuenta.T, cuenta.T === 1 ? "tardanza" : "tardanzas", "T"],
      ["file-text", cuenta.J, cuenta.J === 1 ? "justificada" : "justificadas", "J"],
    ].map(([i, n, t, k]) => `<li class="cifra reveal"${k ? ` data-e="${k}"` : ""}><i class="ph ph-${i}" aria-hidden="true"></i><strong>${n}</strong><span>${t}</span></li>`).join("");

    // Hoy
    const fmtLargo = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" });
    $("#hoyFecha").textContent = fmtLargo.format(hoy);
    const rHoy = (est.asistencia || {})[clave(hoy)];
    const eHoy = rHoy && (typeof rHoy === "string" ? { e: rHoy } : rHoy);
    const inicioTurno = aMin(aula.horas[0]);
    const EST = {
      P: ["check-circle", "Asististe hoy", (x) => (x.h ? `Entrada registrada a las ${esc(x.h)}.` : "Entrada registrada.")],
      T: ["clock-afternoon", "Llegaste tarde", (x) => (x.h ? `Entrada registrada a las ${esc(x.h)}.` : "Tardanza registrada.")],
      F: ["x-circle", "Falta registrada", (x) => (x.j ? `Justificación ${x.j.estado === "pendiente" ? "en revisión" : x.j.estado}: ${esc(x.j.motivo)}.` : "Si fue por un motivo justificado, tu apoderado debe presentar el sustento.")],
      J: ["file-text", "Falta justificada", (x) => esc((x.j && x.j.motivo) || x.n || "Justificación aprobada.")],
    };
    let estadoHoy;
    if (!esDiaDeClase(hoy)) estadoHoy = ["X", "moon-stars", "Hoy no hay clases", "Descansa. Tu próximo día de clase aparece en tu horario."];
    else if (eHoy && EST[eHoy.e]) estadoHoy = [eHoy.e, EST[eHoy.e][0], EST[eHoy.e][1], EST[eHoy.e][2](eHoy)];
    else if (minutosAhora() < inicioTurno) estadoHoy = ["X", "hourglass-medium", "Aún no empieza tu turno", `Tu entrada es a las ${aula.horas[0]}.`];
    else estadoHoy = ["X", "question", "Sin registro todavía", "El registro de entrada se actualiza durante el día."];
    $("#hoyCard").dataset.e = estadoHoy[0];
    $("#hoyIcono").innerHTML = `<i class="ph ph-${estadoHoy[1]}"></i>`;
    $("#hoyTitulo").textContent = estadoHoy[2];
    $("#hoyTexto").innerHTML = estadoHoy[3];

    // Clase ahora o siguiente
    const bloques = [];
    aula.horas.slice(0, -1).forEach((h, i) => {
      if (h === "recreo") return;
      const fin = aula.horas[i + 1] === "recreo" ? aula.recreo.split(" a ")[0] : aula.horas[i + 1];
      bloques.push([h, fin]);
    });
    const dHoy = hoy.getDay() - 1;
    if (esDiaDeClase(hoy) && dHoy >= 0 && dHoy < 5) {
      const m = minutosAhora();
      const k = bloques.findIndex(([, fin]) => m < aMin(fin));
      if (k >= 0) {
        const area = aula.horario[dHoy][k], ahora = m >= aMin(bloques[k][0]);
        $("#hoyClase").innerHTML = `<i class="ph ph-${ahora ? "chalkboard-teacher" : "arrow-right"}" aria-hidden="true"></i> <span>${ahora ? "Ahora" : "Siguiente"}: <strong>${esc(area)}</strong>, ${ahora ? "hasta las " + bloques[k][1] : "a las " + bloques[k][0]}</span>`;
      } else $("#hoyClase").innerHTML = `<i class="ph ph-flag-checkered" aria-hidden="true"></i><span>Terminaron las clases de hoy.</span>`;
    } else $("#hoyClase").hidden = true;

    // Notas
    const b = bimActual();
    const areas = Object.keys(est.notas || {});
    const orden = aula.areas.map((x) => x.area);
    areas.sort((x, y) => ((orden.indexOf(x) + 1 || 99) - (orden.indexOf(y) + 1 || 99)));
    const iconoDe = Object.fromEntries(aula.areas.map((x) => [x.area, x.icono]));
    const NOMBRE = { AD: "logro destacado", A: "logro esperado", B: "en proceso", C: "en inicio" };
    const celda = (v, i) => {
      const n = String(v || "").toUpperCase();
      if (NOMBRE[n]) return `<td data-label="Bimestre ${BIMESTRES[i][0]}"><span class="nota nota--${n}" title="${NOMBRE[n]}">${n}</span><span class="sr-only">, ${NOMBRE[n]}</span></td>`;
      return `<td data-label="Bimestre ${BIMESTRES[i][0]}" class="nota-vacia">${i === b ? '<span class="en-curso">En curso</span>' : '<span aria-hidden="true">·</span><span class="sr-only">Sin nota</span>'}</td>`;
    };
    $("#tablaNotas").innerHTML = `<caption class="sr-only">Notas por área y bimestre</caption>
      <thead><tr><th scope="col">Área</th>${BIMESTRES.map(([r], i) => `<th scope="col"${i === b ? ' class="is-actual"' : ""}>${r} bim.</th>`).join("")}</tr></thead>
      <tbody>${areas.map((ar) => `<tr><th scope="row"><i class="ph ph-${iconoDe[ar] || "book"}" aria-hidden="true"></i>${esc(ar)}</th>${BIMESTRES.map((_, i) => celda((est.notas[ar] || [])[i], i)).join("")}</tr>`).join("")}</tbody>`;
    if (!areas.length) $("#tablaNotas").innerHTML = `<caption>Aún no hay notas registradas.</caption>`;

    // ---------- Asistencia: calendario, detalle del día, historial y justificaciones ----------
    const porFecha = Object.fromEntries(regs.map((x) => [x.f, x]));
    const aFecha = (f) => { const [y, mm, d] = f.split("-").map(Number); return new Date(y, mm - 1, d); };
    const fmtDia = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const fmtCorto = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" });
    const fmtMes = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
    const may = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const ETQ = { P: "Asistió", T: "Tardanza", F: "Falta", J: "Falta justificada" };
    const ICO = { P: "check-circle", T: "clock-afternoon", F: "x-circle", J: "file-text" };
    const JEST = { aprobada: ["Aprobada", "check"], pendiente: ["En revisión", "hourglass-medium"], observada: ["Observada", "warning"] };
    const minTarde = (x) => (x.h ? aMin(x.h) - inicioTurno : 0);
    const detalleTexto = (x) => {
      if (x.e === "P") return x.h ? `Entrada a las ${esc(x.h)}` : "Entrada registrada";
      if (x.e === "T") return x.h ? `Entrada a las ${esc(x.h)}, ${minTarde(x)} min tarde` : "Llegó tarde";
      if (x.j) return `${esc(x.j.motivo)}, ${JEST[x.j.estado] ? JEST[x.j.estado][0].toLowerCase() : ""}`;
      return x.e === "F" ? "Sin justificación" : "Justificada";
    };

    // Detalle de un día
    const pintarDetalle = (k) => {
      const d = aFecha(k), x = porFecha[k];
      const titulo = `<p class="dia-detalle__fecha">${may(fmtDia.format(d))}</p>`;
      let cuerpo;
      if (!x) {
        const motivo = FERIADOS.includes(k) ? "Feriado. No hubo clases." : d > hoy ? "Todavía no llega este día." : esDiaDeClase(d) ? "No hay registro de asistencia para este día." : "No hubo clases este día.";
        cuerpo = `<div class="dia-detalle__estado" data-e="X"><i class="ph ph-calendar-blank" aria-hidden="true"></i><div><h3>Sin registro</h3><p>${motivo}</p></div></div>`;
      } else {
        const filas = [];
        if (x.h) filas.push(["Hora de entrada", esc(x.h)]);
        filas.push(["Hora de ingreso del turno", aula.horas[0]]);
        if (x.e === "T") filas.push(["Minutos de tardanza", `${minTarde(x)} min`]);
        if (x.n) filas.push(["Observación", esc(x.n)]);
        if (x.j) {
          filas.push(["Motivo", esc(x.j.motivo)]);
          if (x.j.presentada) filas.push(["Justificación presentada", may(fmtCorto.format(aFecha(x.j.presentada)))]);
          if (x.j.por) filas.push(["Presentada por", esc(x.j.por)]);
          if (JEST[x.j.estado]) filas.push(["Estado", `<span class="j-estado" data-j="${x.j.estado}"><i class="ph ph-${JEST[x.j.estado][1]}" aria-hidden="true"></i>${JEST[x.j.estado][0]}</span>`]);
          if (x.j.obs) filas.push(["Respuesta del colegio", esc(x.j.obs)]);
        } else if (x.e === "F") filas.push(["Justificación", "No presentada. Tu apoderado puede presentarla en secretaría."]);
        cuerpo = `<div class="dia-detalle__estado" data-e="${x.e}"><i class="ph ph-${ICO[x.e]}" aria-hidden="true"></i><div><h3>${ETQ[x.e]}</h3><p>${detalleTexto(x)}</p></div></div>
          <dl class="dia-detalle__datos">${filas.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl>`;
      }
      $("#diaDetalle").innerHTML = titulo + cuerpo;
      $$(".cal-dia button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
    };

    // Calendario
    const primerMes = new Date(BIMESTRES[0][1].getFullYear(), BIMESTRES[0][1].getMonth(), 1);
    let mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (mes < primerMes) mes = primerMes;
    let diaSel = regs.length ? (porFecha[clave(hoy)] ? clave(hoy) : regs[0].f) : clave(hoy);
    const pintarMes = () => {
      $("#mesTitulo").textContent = may(fmtMes.format(mes));
      const celdas = [];
      const lun = (mes.getDay() + 6) % 7; // lunes = 0
      const offset = lun >= 5 ? 0 : lun; // si el mes empieza en fin de semana, arranca en lunes
      for (let i = 0; i < offset; i++) celdas.push('<li class="cal-dia is-fuera" aria-hidden="true"></li>');
      for (let d = new Date(mes); d.getMonth() === mes.getMonth(); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const k = clave(d), x = porFecha[k];
        const texto = x ? ETQ[x.e].toLowerCase() : FERIADOS.includes(k) ? "feriado" : d > hoy ? "" : esDiaDeClase(d) ? "sin registro" : "sin clases";
        const cls = `cal-dia${x ? " e-" + x.e : ""}${+d === +hoy ? " is-hoy" : ""}${d > hoy ? " is-futuro" : ""}${FERIADOS.includes(k) ? " is-feriado" : ""}${x && x.j && x.j.estado === "pendiente" ? " is-pend" : ""}`;
        celdas.push(`<li class="${cls}"><button type="button" data-k="${k}" aria-pressed="false" aria-label="${d.getDate()}${texto ? ", " + texto : ""}">${d.getDate()}</button></li>`);
      }
      $("#calGrid").innerHTML = celdas.join("");
      $("#mesAnt").disabled = mes <= primerMes;
      $("#mesSig").disabled = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
      $$(".cal-dia button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === diaSel)));
    };
    const irA = (k, mover) => {
      diaSel = k;
      const d = aFecha(k);
      if (d.getMonth() !== mes.getMonth() || d.getFullYear() !== mes.getFullYear()) { mes = new Date(d.getFullYear(), d.getMonth(), 1); pintarMes(); }
      pintarDetalle(k);
      if (mover) $("#diaDetalle").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    };
    $("#calGrid").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) irA(b.dataset.k); });
    $("#mesAnt").addEventListener("click", () => { mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); pintarMes(); });
    $("#mesSig").addEventListener("click", () => { mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); pintarMes(); });
    pintarMes();
    pintarDetalle(diaSel);

    // Historial con filtro por estado y por mes
    const meses = [...new Set(regs.map((x) => x.f.slice(0, 7)))];
    $("#histMes").innerHTML = `<option value="">Todo el año</option>` + meses.map((m) => `<option value="${m}">${may(fmtMes.format(aFecha(m + "-01")))}</option>`).join("");
    let filtro = "todo";
    const pintarHist = () => {
      const m = $("#histMes").value;
      const delMes = regs.filter((x) => !m || x.f.startsWith(m));
      $$("#histFiltro [data-n]").forEach((s) => { s.textContent = s.dataset.n === "todo" ? delMes.length : delMes.filter((x) => x.e === s.dataset.n).length; });
      const lista = delMes.filter((x) => filtro === "todo" || x.e === filtro);
      $("#incLista").innerHTML = lista.length ? lista.map((x) => `
        <li><button type="button" class="inc" data-e="${x.e}" data-k="${x.f}">
          <span class="punto punto--${x.e}" aria-hidden="true"></span>
          <span class="inc__txt"><strong>${ETQ[x.e]}</strong><span>${may(fmtCorto.format(aFecha(x.f)))}</span></span>
          <span class="inc__det">${detalleTexto(x)}</span>
        </button></li>`).join("") : `<li class="inc-vacio"><i class="ph ph-confetti" aria-hidden="true"></i> Ningún registro con este filtro.</li>`;
    };
    $$("#histFiltro button").forEach((btn) => btn.addEventListener("click", () => {
      $$("#histFiltro button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
      filtro = btn.dataset.f; pintarHist();
    }));
    $("#histMes").addEventListener("change", pintarHist);
    $("#incLista").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) irA(b.dataset.k, true); });
    pintarHist();

    // Justificaciones
    const conJ = regs.filter((x) => x.j || x.e === "J");
    $("#justLista").innerHTML = conJ.length ? conJ.map((x) => {
      const j = x.j || { motivo: x.n || "Sin detalle", estado: "aprobada" };
      const [et, ic] = JEST[j.estado] || ["Registrada", "file-text"];
      return `<li class="just card reveal" data-j="${esc(j.estado)}">
        <div class="just__cab">
          <div><p class="just__lbl">Falta del</p><h3>${may(fmtDia.format(aFecha(x.f)))}</h3></div>
          <span class="j-estado" data-j="${esc(j.estado)}"><i class="ph ph-${ic}" aria-hidden="true"></i>${et}</span>
        </div>
        <p class="just__motivo">${esc(j.motivo)}</p>
        <dl class="just__datos">
          <div><dt>Presentada</dt><dd>${j.presentada ? may(fmtCorto.format(aFecha(j.presentada))) : "Sin fecha"}</dd></div>
          <div><dt>Por</dt><dd>${esc(j.por || "Apoderado")}</dd></div>
          ${j.obs ? `<div class="just__obs"><dt>Respuesta del colegio</dt><dd>${esc(j.obs)}</dd></div>` : ""}
        </dl>
        <button type="button" class="link" data-k="${x.f}">Ver el día en el calendario <i class="ph ph-arrow-up-right" aria-hidden="true"></i></button>
      </li>`;
    }).join("") : `<li class="inc-vacio"><i class="ph ph-seal-check" aria-hidden="true"></i> No tienes faltas justificadas ni en trámite.</li>`;
    $("#justLista").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]"); if (!b) return;
      irA(b.dataset.k); $("#asistencia").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });

    // Horario
    const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const abrev = { "Desarrollo Personal, Ciudadanía y Cívica": "DPCC", "Educación para el Trabajo": "EPT", "Ciencia y Tecnología": "Ciencia y Tec.", "Educación Religiosa": "Ed. Religiosa", "Educación Física": "Ed. Física" };
    const m = minutosAhora();
    let fila = 0;
    $("#tablaHorario").innerHTML = `<caption class="sr-only">Horario semanal</caption>
      <thead><tr><th scope="col"><span class="sr-only">Hora</span></th>${DIAS.map((d, i) => `<th scope="col" class="${i === dHoy ? "is-hoy" : ""}">${d}${i === dHoy ? "<small>Hoy</small>" : ""}</th>`).join("")}</tr></thead>
      <tbody>${aula.horas.slice(0, -1).map((h, i) => {
        if (h === "recreo") return `<tr class="horario__recreo"><th scope="row">${aula.recreo.split(" a ")[0]}</th><td colspan="5"><i class="ph ph-orange-slice" aria-hidden="true"></i> Recreo</td></tr>`;
        const fin = aula.horas[i + 1] === "recreo" ? aula.recreo.split(" a ")[0] : aula.horas[i + 1];
        const k = fila++;
        const enCurso = dHoy >= 0 && dHoy < 5 && m >= aMin(h) && m < aMin(fin);
        return `<tr${enCurso ? ' class="is-ahora"' : ""}><th scope="row">${h}<span>${fin}</span></th>${aula.horario.map((dia, d) =>
          `<td class="${d === dHoy ? "is-hoy" : ""}" data-dia="${d}"><span class="clase"><i class="ph ph-${iconoDe[dia[k]]}" aria-hidden="true"></i>${esc(abrev[dia[k]] || dia[k])}</span></td>`).join("")}</tr>`;
      }).join("")}</tbody>`;
    $("#horarioSub").textContent = `${aula.nombre}, ${aula.turno.toLowerCase()}. Recreo de ${aula.recreo}.`;
    $("#linkAula").href = `aula.html?g=${nivel}${aula.grado}&s=${aula.seccion}`;
    const tabs = $("#diasTabs");
    let sel = dHoy >= 0 && dHoy < 5 ? dHoy : 0;
    tabs.innerHTML = DIAS.map((d, i) => `<button type="button" role="tab" aria-selected="${i === sel}" tabindex="${i === sel ? 0 : -1}">${d.slice(0, 3)}</button>`).join("");
    const elegir = (i) => { $$("button", tabs).forEach((x, k) => { x.setAttribute("aria-selected", String(k === i)); x.tabIndex = k === i ? 0 : -1; }); $("#tablaHorario").dataset.dia = i; };
    $$("button", tabs).forEach((x, i) => {
      x.addEventListener("click", () => elegir(i));
      x.addEventListener("keydown", (e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const k = (i + (e.key === "ArrowRight" ? 1 : 4)) % 5; $$("button", tabs)[k].focus(); elegir(k); });
    });
    elegir(sel);

    mostrar("perfil");
    revelar();
  };

  /* ---------- Revelado ---------- */
  const revelar = () => {
    const obs = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      obs.unobserve(en.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    const counts = new Map();
    $$(".reveal").forEach((el) => {
      const k = counts.get(el.parentElement) || 0;
      el.style.setProperty("--i", k);
      counts.set(el.parentElement, k + 1);
      obs.observe(el);
    });
    document.addEventListener("transitionend", (e) => {
      const el = e.target;
      if (!el.classList || !el.classList.contains("reveal") || !el.classList.contains("is-in")) return;
      el.classList.remove("reveal");
      el.style.removeProperty("--i");
    });
  };

  /* ---------- Arranque ---------- */
  if (!S.conectada) {
    // Sin Firebase solo existe la demostración; nunca se muestran datos reales sin sesión
    if (new URLSearchParams(location.search).has("demo")) {
      $("#avisoDemo").hidden = false; document.querySelectorAll('a[href="comunidad.html"]').forEach((x) => { x.href = "comunidad.html?demo"; });
      pintar(demo(), null);
    } else location.replace("login.html");
    return;
  }
  S.alCambiar(async (u) => {
    if (!u) return location.replace("login.html");
    try {
      const est = await S.datos(u);
      if (!est && (await S.docente(u))) return location.replace("docente.html");
      if (!est) return vacio("Aún no hay datos para tu cuenta", `Iniciaste sesión como ${u.email}, pero el colegio todavía no cargó tu información. Avisa a tu tutor o a secretaría.`);
      pintar(est, u);
    } catch (e) {
      vacio("No pudimos cargar tu perfil", e.code === "permission-denied"
        ? `La cuenta ${u.email} no tiene permiso para ver estos datos.`
        : "Revisa tu conexión a internet y vuelve a intentarlo.");
    }
  });
})();
