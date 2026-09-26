/* Portal del aula: lee ?g=p3&s=B y dibuja horario, tareas, comunicados, proyecto y docentes.
   Incluye su propio tema, menú y revelado porque core.js depende de la portada de inicio. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { SECCIONES, NIVELES, armar, nombreAula, ordinal } = window.AULAS;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------- Qué aula mostrar ---------- */
  const q = new URLSearchParams(location.search);
  let n = (q.get("g") || "p1").charAt(0);
  if (!NIVELES[n]) n = "p";
  let g = Math.min(Math.max(parseInt((q.get("g") || "").slice(1), 10) || 1, 1), NIVELES[n].grados);
  let s = (q.get("s") || "A").toUpperCase();
  if (!SECCIONES.includes(s)) s = "A";
  const url = (nn, gg, ss) => `aula.html?g=${nn}${gg}&s=${ss}`;
  const a = armar(n, g, s);

  document.documentElement.dataset.seccion = s;
  document.title = `${a.nombre}, ${a.nivelNombre.toLowerCase()} | Fe y Alegría 14`;

  /* ---------- Portada ---------- */
  $("#migaNivel").textContent = a.nivelNombre;
  $("#marcaGrado").textContent = ordinal(g);
  $("#marcaSec").textContent = s;
  $("#aulaTitulo").textContent = `${a.nombre}, ${a.nivelNombre.toLowerCase()}`;
  $("#aulaLema").textContent = `«${a.lema}»`;
  $("#aulaFondo").src = `img/colegio-${((g + SECCIONES.indexOf(s)) % 3) + 1}.jpg`;
  $("#aulaDatos").innerHTML = [
    [a.turnoIcono, a.turno], ["door-open", a.aula], ["student", `${a.estudiantes} estudiantes`],
  ].map(([i, t]) => `<li><i class="ph ph-${i}" aria-hidden="true"></i>${esc(t)}</li>`).join("");
  const iniciales = a.tutor.nombre.split(" ").slice(0, 2).map((p) => p[0]).join("");
  $("#tutorIniciales").textContent = iniciales;
  $("#tutorNombre").textContent = a.tutor.nombre;

  /* ---------- Cambiar de aula ---------- */
  $("#cambioSecs").innerHTML = SECCIONES.map((x) => x === s
    ? `<span class="sec-chip is-actual" data-sec="${x}" aria-current="page"><b>${x}</b><span class="sr-only">, sección actual</span></span>`
    : `<a class="sec-chip" data-sec="${x}" href="${url(n, g, x)}"><b>${x}</b><span class="sr-only">Ir a ${nombreAula(n, g, x)}</span></a>`).join("");
  const todas = Object.keys(NIVELES).flatMap((nn) => Array.from({ length: NIVELES[nn].grados }, (_, i) => [nn, i + 1]));
  const pos = todas.findIndex(([nn, gg]) => nn === n && gg === g);
  const flecha = (el, idx, texto) => {
    const t = todas[idx];
    if (!t) { el.setAttribute("aria-disabled", "true"); el.removeAttribute("href"); el.setAttribute("aria-label", texto + ": no hay"); return; }
    el.href = url(t[0], t[1], s);
    el.setAttribute("aria-label", `${texto}: ${nombreAula(t[0], t[1], s)}, ${NIVELES[t[0]].nombre.toLowerCase()}`);
  };
  flecha($("#gradoAnterior"), pos - 1, "Grado anterior");
  flecha($("#gradoSiguiente"), pos + 1, "Grado siguiente");
  const salto = $("#saltoAula");
  salto.innerHTML = Object.entries(NIVELES).map(([nn, nv]) => `<optgroup label="${nv.nombre}">${
    Array.from({ length: nv.grados }, (_, i) => SECCIONES.map((x) => {
      const v = `${nn}${i + 1}${x}`;
      return `<option value="${v}"${v === a.id ? " selected" : ""}>${nombreAula(nn, i + 1, x)}</option>`;
    }).join("")).join("")}</optgroup>`).join("");
  salto.addEventListener("change", () => { const v = salto.value; location.href = url(v[0], v.slice(1, -1), v.slice(-1)); });

  /* ---------- Tareas ---------- */
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const fmtCorto = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });
  const faltan = (f) => {
    const d = Math.round((f - hoy) / 864e5);
    return d === 0 ? "Hoy" : d === 1 ? "Mañana" : d > 1 ? `En ${d} días` : d === -1 ? "Ayer" : `Hace ${-d} días`;
  };
  $("#tareas").innerHTML = a.tareas.map((t) => `
    <li class="tarea card reveal${t.tipo === "Evaluación" ? " tarea--eval" : ""}">
      <span class="tarea__icono"><i class="ph ph-${t.icono}" aria-hidden="true"></i></span>
      <div class="tarea__txt">
        <p class="tarea__area">${esc(t.area)}</p>
        <h3>${esc(t.titulo)}</h3>
        <p class="tarea__fecha"><time datetime="${t.fecha.toISOString().slice(0, 10)}">${fmt.format(t.fecha)}</time></p>
      </div>
      <div class="tarea__lado"><span class="tag">${t.tipo}</span><b>${faltan(t.fecha)}</b></div>
    </li>`).join("");

  /* ---------- Comunicados ---------- */
  $("#avisos").innerHTML = a.comunicados.map((c) => `
    <li class="aviso">
      <i class="ph ph-${c.icono}" aria-hidden="true"></i>
      <div><h4>${esc(c.titulo)}</h4><p>${esc(c.texto)}</p>
      <time datetime="${c.fecha.toISOString().slice(0, 10)}">${fmtCorto.format(c.fecha)}, ${faltan(c.fecha).toLowerCase()}</time></div>
    </li>`).join("");

  /* ---------- Horario ---------- */
  const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const iconoDe = Object.fromEntries(a.areas.map((x) => [x.area, x.icono]));
  const abrev = { "Desarrollo Personal, Ciudadanía y Cívica": "DPCC", "Educación para el Trabajo": "EPT", "Ciencia y Tecnología": "Ciencia y Tec.", "Educación Religiosa": "Ed. Religiosa", "Educación Física": "Ed. Física" };
  const idxHoy = hoy.getDay() - 1; // 0 = lunes; fuera de 0..4 es fin de semana
  const horas = a.horas;
  const aMin = (h) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
  const ahora = new Date().getHours() * 60 + new Date().getMinutes();
  let fila = 0;
  const cuerpo = horas.slice(0, -1).map((h, i) => {
    if (h === "recreo") return `<tr class="horario__recreo"><th scope="row">${a.recreo.split(" a ")[0]}</th><td colspan="5"><i class="ph ph-orange-slice" aria-hidden="true"></i> Recreo</td></tr>`;
    const fin = horas[i + 1] === "recreo" ? a.recreo.split(" a ")[0] : horas[i + 1];
    const b = fila++;
    const enCurso = idxHoy >= 0 && idxHoy <= 4 && ahora >= aMin(h) && ahora < aMin(fin);
    return `<tr${enCurso ? ' class="is-ahora"' : ""}><th scope="row">${h}<span>${fin}</span></th>${a.horario.map((dia, d) => {
      const area = dia[b];
      return `<td class="${d === idxHoy ? "is-hoy" : ""}" data-dia="${d}" data-area="${esc(area)}"><span class="clase"><i class="ph ph-${iconoDe[area]}" aria-hidden="true"></i>${esc(abrev[area] || area)}</span></td>`;
    }).join("")}</tr>`;
  }).join("");
  $("#horario").innerHTML = `<caption class="sr-only">Horario semanal de ${esc(a.nombre)}</caption>
    <thead><tr><th scope="col"><span class="sr-only">Hora</span></th>${DIAS.map((d, i) => `<th scope="col" class="${i === idxHoy ? "is-hoy" : ""}" data-dia="${i}">${d}${i === idxHoy ? '<small>Hoy</small>' : ""}</th>`).join("")}</tr></thead>
    <tbody>${cuerpo}</tbody>`;
  $("#horarioSub").textContent = `${a.turno}, de ${horas[0]} a ${horas[horas.length - 1]}. Recreo de ${a.recreo}.`;

  // En celular se ve un día a la vez: pestañas que filtran columnas
  const tabs = $("#diasTabs");
  let diaSel = idxHoy >= 0 && idxHoy <= 4 ? idxHoy : 0;
  tabs.innerHTML = DIAS.map((d, i) => `<button type="button" role="tab" id="tabDia${i}" aria-selected="${i === diaSel}" tabindex="${i === diaSel ? 0 : -1}">${d.slice(0, 3)}</button>`).join("");
  const elegirDia = (i) => {
    diaSel = i;
    $$("button", tabs).forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    $("#horario").dataset.dia = i;
  };
  $$("button", tabs).forEach((b, i) => {
    b.addEventListener("click", () => elegirDia(i));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const k = (i + (e.key === "ArrowRight" ? 1 : 4)) % 5;
      $$("button", tabs)[k].focus(); elegirDia(k);
    });
  });
  elegirDia(diaSel);

  // Pasar el cursor por un curso resalta todas sus horas de la semana
  const tabla = $("#horario");
  tabla.addEventListener("pointerover", (e) => {
    const td = e.target.closest("td[data-area]");
    $$("td.is-par", tabla).forEach((x) => x.classList.remove("is-par"));
    if (td) $$(`td[data-area="${CSS.escape(td.dataset.area)}"]`, tabla).forEach((x) => x.classList.add("is-par"));
  });
  tabla.addEventListener("pointerleave", () => $$("td.is-par", tabla).forEach((x) => x.classList.remove("is-par")));

  /* ---------- Proyecto ---------- */
  const foto = $("#proyectoFoto");
  foto.src = `${a.proyecto.foto}?auto=format&fit=crop&w=900&q=75`;
  foto.alt = a.proyecto.alt;
  foto.addEventListener("error", () => { if (!foto.dataset.swapped) { foto.dataset.swapped = "1"; foto.src = `https://picsum.photos/seed/fya14-${a.id}/900/600`; } });
  $("#proyectoTitulo").textContent = a.proyecto.titulo;
  $("#proyectoTexto").textContent = a.proyecto.texto;
  $("#avanceN").textContent = a.proyecto.avance + "%";
  $("#avance").style.setProperty("--avance", a.proyecto.avance / 100);

  /* ---------- Áreas y docentes ---------- */
  $("#areas").innerHTML = a.areas.map((x) => `
    <li class="area">
      <i class="ph ph-${x.icono}" aria-hidden="true"></i>
      <div><strong>${esc(x.area)}</strong><span>${x.docente !== a.tutor ? esc(x.docente.nombre) : a.nivel === "p" ? "A cargo de la tutoría" : esc(x.docente.nombre) + ", tutoría"}</span></div>
      <b class="area__horas" aria-label="${x.horas} horas por semana">${x.horas} h</b>
    </li>`).join("");

  /* ---------- Tema ---------- */
  const themeBtn = $("#themeToggle");
  const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
  const paintTheme = () => {
    themeBtn.innerHTML = `<i class="ph ph-${isDark() ? "sun" : "moon"}" aria-hidden="true"></i>`;
    themeBtn.setAttribute("aria-pressed", String(isDark()));
    $$("meta[name=theme-color]").forEach((m) => { m.content = isDark() ? "#121011" : "#ffffff"; m.removeAttribute("media"); });
  };
  paintTheme();
  themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("fya14-theme", next); } catch (e) {}
    paintTheme();
    themeBtn.classList.remove("spin"); void themeBtn.offsetWidth; themeBtn.classList.add("spin");
  });

  /* ---------- Menú ---------- */
  const nav = $(".nav"), burger = $("#burger"), menu = $("#menu"), toTop = $("#toTop");
  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };
  burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  new IntersectionObserver(([en]) => {
    nav.classList.toggle("is-scrolled", !en.isIntersecting);
    toTop.classList.toggle("is-visible", !en.isIntersecting);
  }, { rootMargin: "-80px 0px 0px 0px" }).observe($(".aula-hero"));
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

  /* ---------- Revelado y barra de avance ---------- */
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
  obs.observe($("#avance"));
  // Al terminar de entrar deja de ser "reveal" para que su hover (transform) funcione
  document.addEventListener("transitionend", (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("reveal") || !el.classList.contains("is-in")) return;
    if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
    el.classList.remove("reveal");
    delete el.dataset.reveal;
    el.style.removeProperty("--i");
  });
})();
