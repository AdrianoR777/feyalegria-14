/* Contenido del colegio en un solo lugar y componentes que lo dibujan.
   Para editar textos, cambia los arreglos de abajo: el HTML se genera solo. */
(function () {
  const $ = (s) => document.querySelector(s);
  const icon = (name) => `<i class="ph ph-${name}" aria-hidden="true"></i>`;

  const CONTENT = {
    values: [
      ["cross", "Fe"], ["smiley", "Alegría"], ["hand-heart", "Solidaridad"], ["scales", "Justicia"],
      ["handshake", "Respeto"], ["users-three", "Servicio"], ["book-open-text", "Educación popular"], ["house-line", "Comunidad"]
    ],
    infra: [
      ["books", "Biblioteca"], ["flask", "Laboratorio de ciencias"], ["desktop-tower", "Aula de innovación pedagógica"],
      ["hammer", "Talleres educativos"], ["presentation", "Salón de usos múltiples"], ["basketball", "Losa deportiva"],
      ["wheelchair", "Accesibilidad para personas con discapacidad"], ["wifi-high", "Internet"], ["projector-screen", "Proyectores"], ["robot", "Kits de robótica"]
    ],
    photos: [
      ["1524178232363-1fb2b075b655", "fya14-padres", "Reunión con padres de familia en el auditorio", "Escuela de padres"],
      ["1509062522246-3755977927d7", "fya14-clases", "Clase con el docente al frente del aula", "Clases"],
      ["1461896836934-ffe607ba8211", "fya14-deporte", "Atleta en posición de salida sobre la pista", "Deporte"],
      ["1627556704290-2b1f5853ff78", "fya14-promocion", "Egresados lanzando sus birretes al aire", "Promoción"],
      ["1511632765486-a01980e01a18", "fya14-comunidad", "Grupo de jóvenes abrazados mirando el atardecer", "Comunidad"]
    ],
    milestones: [
      ["1966", "Fe y Alegría llega al Perú", "El movimiento de educación popular empieza en el país. Hoy está en 21 regiones."],
      ["1973", "Registro en el padrón del MINEDU", "La I.E. Fe y Alegría 14 queda inscrita en el padrón de instituciones educativas (UGEL Santa)."],
      ["2025", "Censo Escolar", "Primaria reporta 790 estudiantes (410 niños y 380 niñas) en 25 secciones con 31 docentes."],
      ["2026", "Resultados de Admisión", "Se publica la lista de ingresantes a primer grado de primaria."],
      ["2026", "Nuevo sitio web", "El colegio renueva su página con niveles, admisión y contacto."]
    ],
    steps: [
      ["megaphone", "Sigue la convocatoria", "Fechas y requisitos en la página de Facebook."],
      ["note-pencil", "Inscríbete", "Elige el grado (sección D) y deja tus datos aquí o en secretaría."],
      ["list-checks", "Revisa los resultados", "La lista de ingresantes aparece en el buscador de esta web."],
      ["check-circle", "Matrícula", "Entrega de documentos en las fechas indicadas."]
    ],
    faq: [
      ["¿En qué turno estudia cada nivel?", "Primaria estudia en turno mañana y secundaria en turno tarde, en el mismo local."],
      ["¿Qué tipo de colegio es?", "Es una institución pública de gestión privada, en convenio con el Sector Educación. Pertenece a la UGEL Santa."],
      ["¿Dónde veo los resultados de admisión?", "En el buscador de ingresantes de esta web. Puedes buscar por apellido o nombre."],
      ["¿Cuál es el código modular?", "Primaria: 0359042. Secundaria: 0495234. Código de local: 038116."]
    ]
  };

  /* Componentes */
  const render = {
    marquee: (items) => {
      const one = items.map(([i, t]) => `<span class="marquee__item">${icon(i)}${t}</span>`).join("");
      return one + one.replace(/class="marquee__item"/g, 'class="marquee__item" aria-hidden="true"');
    },
    values: (items) => items.slice(0, 6).map(([i, t]) => `<li class="card">${icon(i)}${t}</li>`).join(""),
    features: (items) => items.map(([i, t]) => `<li class="feature reveal">${icon(i)}<strong>${t}</strong></li>`).join(""),
    photos: (items) => items.map(([id, seed, alt, cap], n) => `
      <figure class="reveal" data-reveal="rise">
        <img width="600" height="800" loading="lazy" data-fallback="${seed}" alt="${alt}"
             src="https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=800&q=70">
        <figcaption>${cap}</figcaption>
      </figure>`).join(""),
    milestones: (items) => items.map(([y, t, p]) => `
      <li class="milestone card reveal"><b>${y}</b><h3>${t}</h3><p>${p}</p></li>`).join(""),
    steps: (items) => items.map(([i, t, p], n) => `
      <li class="paso reveal"><span class="paso__num" aria-hidden="true">${n + 1}</span>${icon(i)}<strong>${t}</strong><span class="paso__txt">${p}</span></li>`).join(""),
    faq: (items) => items.map(([q, a]) => `
      <details class="card reveal"><summary>${q}${icon("plus")}</summary><p>${a}</p></details>`).join("")
  };

  $("#marqueeTrack").innerHTML = render.marquee(CONTENT.values);
  $("#valuesList").innerHTML = render.values(CONTENT.values);
  $("#infraList").innerHTML = render.features(CONTENT.infra);
  $("#photoStrip").innerHTML = render.photos(CONTENT.photos);
  $("#timeline").innerHTML = render.milestones(CONTENT.milestones);
  $("#steps").innerHTML = render.steps(CONTENT.steps);
  $("#faq").innerHTML = render.faq(CONTENT.faq);

  window.FYA = Object.assign(window.FYA || {}, { CONTENT, icon });
})();
