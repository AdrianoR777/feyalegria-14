// Carga o actualiza estudiantes y docentes en Firestore.
// Uso:
//   1. npm install firebase-admin        (una vez, dentro de esta carpeta)
//   2. Descarga la clave de cuenta de servicio: Firebase > Configuración > Cuentas de servicio.
//      Guárdala como herramientas/clave-servicio.json. NUNCA la subas a la web ni a GitHub.
//   3. node importar.mjs estudiantes.json              (formato de ejemplo-estudiantes.json)
//      node importar.mjs docentes.json --docentes      (formato de ejemplo-docentes.json)
//      node importar.mjs admins.json --admins          (cuentas de administración: admins.json)
// Estudiantes: la asistencia y las notas se fusionan; los días nuevos se agregan sin borrar los anteriores.
// Docentes: el documento se reemplaza completo, para que quitar un aula quite también el permiso.
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DOMINIO = "feyalegria14.edu.pe";
const NOTAS = ["AD", "A", "B", "C", ""];
const ESTADOS = ["P", "T", "F", "J"];
const J_ESTADOS = ["aprobada", "pendiente", "observada"];
const AULA = /^[ps][1-6][ABCD]$/;

const archivo = process.argv[2];
const sonDocentes = process.argv.includes("--docentes");
const sonAdmins = process.argv.includes("--admins");
if (!archivo || archivo.startsWith("--")) { console.error("Falta el archivo: node importar.mjs estudiantes.json  |  node importar.mjs docentes.json --docentes"); process.exit(1); }
// Con FIRESTORE_EMULATOR_HOST definido, carga en el emulador local (modo prueba, sin clave)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId: "demo-fya14" });
  console.log("Modo prueba: cargando en el emulador " + process.env.FIRESTORE_EMULATOR_HOST);
} else {
  const clave = new URL("./clave-servicio.json", import.meta.url);
  if (!fs.existsSync(clave)) { console.error("Falta herramientas/clave-servicio.json (cuenta de servicio de Firebase)."); process.exit(1); }
  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(clave, "utf8"))) });
}
const db = getFirestore();
const lista = JSON.parse(fs.readFileSync(archivo, "utf8"));
// "s3B" -> "3.° año B, secundaria"
const nombreAula = (a) => `${a[1]}.° ${a[0] === "p" ? "grado" : "año"} ${a[2]}, ${a[0] === "p" ? "primaria" : "secundaria"}`;
const aulaValida = (a) => AULA.test(a) && Number(a[1]) <= (a[0] === "p" ? 6 : 5);

// Revisa cada registro antes de escribir nada
const errores = [];
lista.forEach((e, i) => {
  const donde = `#${i + 1} (${e.correo || "sin correo"})`;
  if (!String(e.correo || "").toLowerCase().endsWith("@" + DOMINIO)) errores.push(`${donde}: el correo debe terminar en @${DOMINIO}`);
  if (sonAdmins) { if (/PONER-CORREO/i.test(e.correo)) errores.push(`${donde}: reemplaza el correo de ejemplo por el real`); return; }
  if (!e.nombres || !e.apellidos) errores.push(`${donde}: faltan nombres o apellidos`);

  if (sonDocentes) {
    (e.tutorDe || []).forEach((a) => { if (!aulaValida(a)) errores.push(`${donde}: tutorDe "${a}" no es un aula válida (ej.: "s3B", "p5D")`); });
    Object.entries(e.areas || {}).forEach(([a, v]) => {
      if (!aulaValida(a)) errores.push(`${donde}: areas "${a}" no es un aula válida`);
      if (!Array.isArray(v) || !v.length || v.some((x) => typeof x !== "string" || !x)) errores.push(`${donde}: areas "${a}" debe ser una lista de áreas`);
    });
    if (!(e.tutorDe || []).length && !Object.keys(e.areas || {}).length) errores.push(`${donde}: el docente no tiene aulas (tutorDe o areas)`);
    return;
  }

  if (!["p", "s"].includes(e.nivel)) errores.push(`${donde}: nivel debe ser "p" o "s"`);
  if (!(e.grado >= 1 && e.grado <= (e.nivel === "p" ? 6 : 5))) errores.push(`${donde}: grado fuera de rango`);
  if (!["A", "B", "C", "D"].includes(e.seccion)) errores.push(`${donde}: sección debe ser A, B, C o D`);
  Object.entries(e.notas || {}).forEach(([area, v]) => {
    if (!Array.isArray(v) || v.length !== 4 || v.some((n) => !NOTAS.includes(n))) errores.push(`${donde}: notas de "${area}" deben ser 4 valores AD, A, B, C o ""`);
  });
  Object.entries(e.asistencia || {}).forEach(([f, v]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !ESTADOS.includes(v && v.e)) return errores.push(`${donde}: asistencia ${f} inválida (e debe ser P, T, F o J)`);
    if (v.h && !/^\d{1,2}:\d{2}$/.test(v.h)) errores.push(`${donde}: asistencia ${f}: la hora debe ser HH:MM`);
    if (v.j) {
      if (!v.j.motivo) errores.push(`${donde}: asistencia ${f}: la justificación necesita motivo`);
      if (!J_ESTADOS.includes(v.j.estado)) errores.push(`${donde}: asistencia ${f}: estado de justificación debe ser aprobada, pendiente u observada`);
      if (v.j.presentada && !/^\d{4}-\d{2}-\d{2}$/.test(v.j.presentada)) errores.push(`${donde}: asistencia ${f}: fecha de presentación inválida`);
      if (v.j.estado === "aprobada" && v.e !== "J") errores.push(`${donde}: asistencia ${f}: una justificación aprobada lleva e = "J"`);
    }
  });
});
if (errores.length) { console.error("No se cargó nada. Corrige esto:\n" + errores.join("\n")); process.exit(1); }

let lote = db.batch(), n = 0;
for (const e of lista) {
  const correo = e.correo.toLowerCase();
  if (sonAdmins) {
    lote.set(db.collection("admins").doc(correo), { nombre: e.nombre || "", agregadoPor: "importar.mjs", agregado: new Date() });
  } else if (sonDocentes) {
    lote.set(db.collection("docentes").doc(correo), { nombres: e.nombres, apellidos: e.apellidos, correo, tutorDe: e.tutorDe || [], areas: e.areas || {}, actualizado: new Date() });
    // Ficha pública para la Comunidad
    const areas = [...new Set(Object.values(e.areas || {}).flat())].filter((x) => x !== "Tutoría");
    const etiqueta = (e.tutorDe || []).length ? `Docente, tutoría de ${nombreAula(e.tutorDe[0]).split(",")[0]}`
      : areas.length ? `Docente de ${areas.slice(0, 2).join(" y ")}` : "Docente";
    lote.set(db.collection("usuarios").doc(correo), { nombre: `${e.nombres} ${e.apellidos}`, rol: "docente", aula: "", etiqueta });
  } else {
    // "aula" (ej. "s3B") permite que el docente encuentre a sus estudiantes; notas y asistencia siempre existen
    const aula = `${e.nivel}${e.grado}${e.seccion}`;
    lote.set(db.collection("estudiantes").doc(correo), { notas: {}, asistencia: {}, ...e, correo, aula, actualizado: new Date() }, { merge: true });
    // Ficha pública para la Comunidad: nombre, grado y sección oficiales
    lote.set(db.collection("usuarios").doc(correo), { nombre: `${e.nombres} ${e.apellidos}`, rol: "estudiante", aula, etiqueta: nombreAula(aula) });
  }
  if (++n % 200 === 0) { await lote.commit(); lote = db.batch(); }
}
await lote.commit();
console.log(`Listo: ${n} ${sonAdmins ? "cuenta(s) de administración" : sonDocentes ? "docente(s)" : "estudiante(s)"} cargados o actualizados.`);
