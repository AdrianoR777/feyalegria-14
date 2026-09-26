/* Portal de aulas: primaria 1.° a 6.° y secundaria 1.° a 5.°, secciones A, B, C y D.
   Docentes, horarios, tareas y comunicados son CONTENIDO DE EJEMPLO generado con semilla fija,
   para que cada aula se vea igual en cada visita. El colegio debe reemplazarlos por los reales. */
(function () {
  const SECCIONES = ["A", "B", "C", "D"];
  const NIVELES = {
    p: { nombre: "Primaria", grados: 6, unidad: "grado", turno: "Turno mañana", icono: "sun" },
    s: { nombre: "Secundaria", grados: 5, unidad: "año", turno: "Turno tarde", icono: "sun-horizon" },
  };

  /* ---------- Azar con semilla: misma aula, mismos datos ---------- */
  const hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => { let a = hash(seed); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const NOMBRES_F = ["Rosa", "Maritza", "Elena", "Carmen", "Gladys", "Yolanda", "Patricia", "Milagros", "Sonia", "Liliana", "Karina", "Janet", "Flor", "Norma", "Ruth", "Doris"];
  const NOMBRES_M = ["Jorge", "Víctor", "Luis", "César", "Wilmer", "Raúl", "Edwin", "Manuel", "Óscar", "Julio", "Hugo", "Segundo", "Walter", "Fredy"];
  const APELLIDOS = ["Quispe", "Huamán", "Paredes", "Villanueva", "Castillo", "Rodríguez", "Sánchez", "Moreno", "Chávez", "Vásquez", "Zavaleta", "Rojas", "Alva", "Ramírez", "Guevara", "Flores", "Cerna", "Polo", "Mendoza", "Reyes"];
  const docente = (r) => {
    const mujer = r() < 0.6;
    return { nombre: `${pick(r, mujer ? NOMBRES_F : NOMBRES_M)} ${pick(r, APELLIDOS)} ${pick(r, APELLIDOS)}` };
  };

  /* ---------- Áreas del Currículo Nacional (horas semanales de ejemplo) ---------- */
  const AREAS = {
    p: [
      ["Matemática", 6, "math-operations"], ["Comunicación", 6, "book-open-text"], ["Ciencia y Tecnología", 4, "flask"],
      ["Personal Social", 3, "users-three"], ["Educación Física", 3, "soccer-ball"], ["Arte y Cultura", 2, "palette"],
      ["Inglés", 2, "translate"], ["Plan lector", 2, "books"], ["Educación Religiosa", 1, "hands-praying"], ["Tutoría", 1, "heart"],
    ],
    s: [
      ["Matemática", 5, "math-operations"], ["Comunicación", 5, "book-open-text"], ["Ciencia y Tecnología", 5, "flask"],
      ["Ciencias Sociales", 3, "globe-hemisphere-west"], ["Desarrollo Personal, Ciudadanía y Cívica", 3, "scales"],
      ["Educación para el Trabajo", 3, "wrench"], ["Inglés", 3, "translate"], ["Arte y Cultura", 2, "palette"],
      ["Educación Física", 2, "soccer-ball"], ["Educación Religiosa", 2, "hands-praying"], ["Tutoría", 2, "heart"],
    ],
  };
  const HORAS = {
    p: ["7:45", "8:30", "9:15", "recreo", "10:30", "11:15", "12:00", "12:45"],
    s: ["13:00", "13:45", "14:30", "15:15", "recreo", "16:20", "17:05", "17:50", "18:35"],
  };
  const RECREO = { p: "10:00 a 10:30", s: "16:00 a 16:20" };

  /* ---------- Proyecto del bimestre por grado ---------- */
  const PROYECTOS = {
    p: [
      ["Nos conocemos y cuidamos nuestra aula", "Acuerdos de convivencia, cartel de responsabilidades y rincón de lectura armado por los niños."],
      ["Los alimentos de mi región", "Recetario ilustrado con platos de Nuevo Chimbote y conteo de loncheras saludables."],
      ["Cuidamos el agua en casa y en el colegio", "Registro semanal de consumo de agua y afiches para los baños del colegio."],
      ["Mi barrio, mi historia", "Entrevistas a vecinos mayores y un mapa del barrio dibujado a escala sencilla."],
      ["Feria de reciclaje creativo", "Juegos y objetos útiles hechos con botellas y cartón, presentados a primaria."],
      ["Rumbo a secundaria", "Portafolio personal, visita a aulas de 1.° de secundaria y carta a su yo del futuro."],
    ],
    s: [
      ["Periódico mural de la bahía", "Noticias escritas por el aula sobre el cuidado de la bahía de Chimbote."],
      ["Energía solar en la costa", "Horno solar construido en equipo y medición de temperaturas al mediodía."],
      ["Emprendimiento escolar", "Plan de negocio de un producto local, costos reales y feria de venta en el patio."],
      ["Debate ciudadano", "Debate sobre seguridad vial frente al colegio y propuesta escrita a la municipalidad."],
      ["Proyecto de vida y promoción", "Orientación vocacional, visitas a institutos y organización de la promoción."],
    ],
  };
  // Fotos acordes al nivel: niños en primaria, adolescentes en secundaria
  const FOTOS = {
    p: [
      ["https://images.unsplash.com/photo-1588072432836-e10032774350", "Niños de primaria escribiendo en sus cuadernos"],
      ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6", "Pila de libros coloridos"],
      ["https://images.unsplash.com/photo-1546410531-bb4caa6b424d", "Mural en forma de lápiz con el mensaje Love to learn"],
      ["https://images.unsplash.com/photo-1577896851231-70ef18881754", "Docente dirigiendo una clase frente a la pizarra"],
    ],
    s: [
      ["https://images.unsplash.com/photo-1571260899304-425eee4c7efc", "Estudiantes de secundaria trabajando en el salón"],
      ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f", "Estudiantes conversando con sus laptops"],
      ["https://images.unsplash.com/photo-1577896851231-70ef18881754", "Docente dirigiendo una clase frente a la pizarra"],
    ],
  };

  /* ---------- Tareas y comunicados de ejemplo ---------- */
  const TAREAS = {
    "Matemática": ["Resolver la ficha de fracciones", "Práctica de ecuaciones", "Problemas de la página 42"],
    "Comunicación": ["Leer el cuento y hacer su resumen", "Redactar una carta formal", "Exposición oral de 3 minutos"],
    "Ciencia y Tecnología": ["Germinar una semilla y anotar cambios", "Informe del experimento del agua", "Maqueta del sistema solar"],
    "Personal Social": ["Árbol genealógico con fotos", "Línea de tiempo del Perú"],
    "Ciencias Sociales": ["Mapa de las regiones del Perú", "Ficha sobre la cultura Chavín"],
    "Inglés": ["Vocabulary: family members", "Describe your house in 5 sentences"],
    "Arte y Cultura": ["Máscara con material reciclado", "Dibujo del paisaje costero"],
    "Educación para el Trabajo": ["Presupuesto del producto del equipo"],
    "Desarrollo Personal, Ciudadanía y Cívica": ["Caso de convivencia para debatir"],
  };
  const COMUNICADOS = [
    ["Reunión de padres de familia", "Se informa el avance del bimestre. Asistencia del apoderado titular.", "users-three"],
    ["Simulacro de sismo", "Participación obligatoria. Revisar la mochila de emergencia en casa.", "warning"],
    ["Uniforme de educación física", "Traer buzo completo y botella de agua los días de clase.", "t-shirt"],
    ["Entrega de libretas", "Recojo en el aula con el tutor, dentro del horario del turno.", "notebook"],
    ["Campaña de salud visual", "Evaluación gratuita en el colegio. Traer autorización firmada.", "eye"],
    ["Paseo de integración", "El aula elige destino en la próxima tutoría. Costo por confirmar.", "bus"],
  ];

  const ordinal = (g) => g + ".°";
  const nombreAula = (n, g, s) => `${ordinal(g)} ${NIVELES[n].unidad} ${s}`;

  /* Docentes por grado: los especialistas se comparten entre las cuatro secciones */
  const docentesGrado = (n, g) => {
    const r = rng(`doc-${n}${g}`);
    return Object.fromEntries(AREAS[n].map(([area]) => [area, docente(r)]));
  };

  const armar = (n, g, s) => {
    const nv = NIVELES[n];
    const r = rng(`aula-${n}${g}${s}`);
    const si = SECCIONES.indexOf(s);
    const porGrado = docentesGrado(n, g);
    const tutor = n === "p" ? docente(r) : porGrado[AREAS.s[(g + si * 3) % 10][0]];
    // En primaria el tutor dicta casi todo; los especialistas llevan Ed. Física, Inglés y Religión
    const especialistas = ["Educación Física", "Inglés", "Educación Religiosa"];
    const areas = AREAS[n].map(([area, horas, icono]) => ({
      area, horas, icono,
      docente: area === "Tutoría" || (n === "p" && !especialistas.includes(area)) ? tutor : porGrado[area],
    }));

    // Horario: bolsa de horas barajada; Tutoría al final del viernes
    const bloques = HORAS[n].filter((h) => h !== "recreo").length - 1;
    const bolsa = shuffle(r, areas.flatMap((a) => (a.area === "Tutoría" ? Array(a.horas - 1).fill(a.area) : Array(a.horas).fill(a.area))));
    const dias = Array.from({ length: 5 }, () => []);
    let k = 0;
    for (let d = 0; d < 5; d++) for (let b = 0; b < bloques; b++) dias[d].push(d === 4 && b === bloques - 1 ? "Tutoría" : bolsa[k++]);

    // Fechas relativas a hoy: el portal nunca se ve desactualizado
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    // Solo días de clase: si cae sábado o domingo se corre al día hábil más cercano en esa dirección
    const dia = (n) => {
      const f = new Date(hoy); f.setDate(f.getDate() + n);
      while (f.getDay() === 0 || f.getDay() === 6) f.setDate(f.getDate() + (n >= 0 ? 1 : -1));
      return f;
    };
    const conTarea = shuffle(r, areas.filter((a) => TAREAS[a.area]));
    const tareas = conTarea.slice(0, 4).map((a, i) => ({
      area: a.area, icono: a.icono, titulo: pick(r, TAREAS[a.area]),
      tipo: i === 1 ? "Evaluación" : "Tarea", fecha: dia(1 + i * 2 + Math.floor(r() * 2)),
    })).sort((a, b) => a.fecha - b.fecha);
    const comunicados = shuffle(r, COMUNICADOS).slice(0, 3).map(([titulo, texto, icono], i) => ({ titulo, texto, icono, fecha: dia(-(1 + i * 4 + Math.floor(r() * 3))) }));

    const [ptitulo, ptexto] = PROYECTOS[n][g - 1];
    const foto = FOTOS[n][(g + si) % FOTOS[n].length];
    return {
      id: `${n}${g}${s}`, nivel: n, nivelNombre: nv.nombre, grado: g, seccion: s, nombre: nombreAula(n, g, s),
      corto: `${ordinal(g)} ${s}`, turno: nv.turno, turnoIcono: nv.icono,
      aula: `Pabellón ${n === "p" ? (g <= 3 ? "A" : "B") : "C"}, aula ${n === "p" ? g : g + 6}${s}`,
      estudiantes: (n === "p" ? 30 : 34) + Math.floor(r() * 6),
      tutor, areas, horas: HORAS[n], recreo: RECREO[n], horario: dias, tareas, comunicados,
      proyecto: { titulo: ptitulo, texto: ptexto, foto: foto[0], alt: foto[1], avance: 35 + Math.floor(r() * 50) },
      lema: pick(r, ["Aprendemos juntos", "Aula que lee, aula que crece", "Cada día un paso más", "Respeto y alegría", "Pequeños científicos", "Somos equipo"]),
    };
  };

  window.AULAS = { SECCIONES, NIVELES, armar, nombreAula, ordinal };
})();
