/* Calendario escolar compartido por perfil.html y docente.html.
   Fechas de bimestres y feriados de ejemplo: ajustarlas al calendario oficial del colegio. */
(function () {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const AÑO = hoy.getFullYear();
  const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const aFecha = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const BIMESTRES = [
    ["I", new Date(AÑO, 2, 16), new Date(AÑO, 4, 15)],
    ["II", new Date(AÑO, 4, 18), new Date(AÑO, 6, 24)],
    ["III", new Date(AÑO, 7, 10), new Date(AÑO, 9, 9)],
    ["IV", new Date(AÑO, 9, 19), new Date(AÑO, 11, 18)],
  ];
  const FERIADOS = ["04-02", "04-03", "05-01", "06-07", "06-29", "07-23", "08-06", "08-30", "10-08", "11-01", "12-08"].map((d) => `${AÑO}-${d}`);
  const bimActual = () => { const i = BIMESTRES.findIndex(([, , fin]) => hoy <= fin); return i < 0 ? 4 : i; };
  const esDiaDeClase = (d) => d.getDay() > 0 && d.getDay() < 6 && !FERIADOS.includes(clave(d)) && BIMESTRES.some(([, ini, fin]) => d >= ini && d <= fin);
  const aMin = (h) => { const [a, b] = String(h).split(":").map(Number); return a * 60 + b; };
  const horaAhora = () => { const n = new Date(); return `${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`; };
  window.CALENDARIO = { hoy, clave, aFecha, BIMESTRES, FERIADOS, bimActual, esDiaDeClase, aMin, horaAhora };
})();
