/* Buscador de ingresantes 2026: nómina rayada por letra y datos del proceso.
   Fuente: lista oficial publicada por el colegio (js/data-ingresantes.js). */
(function () {
  const { $, $$, reduce, observeDraw } = window.FYA;
  const collator = new Intl.Collator("es", { sensitivity: "base" });
  const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const small = new Set(["de", "del", "la", "las", "los", "y"]);
  const title = (s) => s.toLowerCase().split(/\s+/).map((w, i) => (i && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  const gradoLabel = (g) => g.replace(/^1er/i, "1.er");
  const pf0 = new Intl.NumberFormat("es-PE", { style: "percent", maximumFractionDigits: 0 });

  const list = (window.INGRESANTES || [])
    .map((r) => ({ paterno: title(r.p), materno: title(r.m), nombres: title(r.n), grado: r.g }))
    .sort((a, b) => collator.compare(a.paterno, b.paterno) || collator.compare(a.materno, b.materno) || collator.compare(a.nombres, b.nombres))
    .map((a, i) => ({ ...a, n: i + 1, letra: normalize(a.paterno).charAt(0).toUpperCase() }));
  const total = list.length;
  $$("[data-adm-total]").forEach((el) => { el.textContent = total; });
  if (!total) {
    $("#admEmpty").hidden = false;
    $("#admEmpty h3").textContent = "La lista aún no está disponible";
    $("#admEmpty p").textContent = "Vuelve a revisar en unos días o consulta el Facebook del colegio.";
    $("#admQ").disabled = true;
    $(".process").hidden = true;
    return;
  }

  /* ---------- Nómina ---------- */
  const box = $("#admGroups");
  const highlight = (text, q) => {
    if (!q) return text;
    const i = normalize(text).indexOf(q);
    return i < 0 ? text : `${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
  };
  let clavePrevia = "";
  const render = (raw) => {
    const q = normalize(raw.trim());
    const found = q ? list.filter((a) => normalize(`${a.paterno} ${a.materno} ${a.nombres}`).includes(q) || normalize(`${a.nombres} ${a.paterno} ${a.materno}`).includes(q)) : list;
    // Solo hay cascada de entrada si cambió quiénes aparecen; al seguir escribiendo el mismo resultado no parpadea
    const clave = found.map((a) => a.n).join(",");
    box.classList.toggle("is-anim", clave !== clavePrevia && !reduce);
    clavePrevia = clave;
    const groups = new Map();
    found.forEach((a) => { if (!groups.has(a.letra)) groups.set(a.letra, []); groups.get(a.letra).push(a); });
    box.innerHTML = [...groups].map(([l, arr]) => `
      <section class="group" id="letra-${l}">
        <h3>${l}<small>${arr.length} ${arr.length === 1 ? "ingresante" : "ingresantes"}</small></h3>
        <ul class="roster">${arr.map((a, i) => `
          <li style="--i:${i}"><span class="num">${a.n}</span>
            <span class="nm"><strong>${highlight(`${a.paterno} ${a.materno}`, q)}</strong><span>${highlight(a.nombres, q)}</span></span>
            <span class="tag grd">${gradoLabel(a.grado)}</span></li>`).join("")}
        </ul>
      </section>`).join("");
    $("#admEmpty").hidden = found.length > 0;
    $("#alphaNav").hidden = !!q;
    $("#admCount").innerHTML = q ? `<b>${found.length}</b> de ${total} ingresantes coinciden` : `<b>${total}</b> ingresantes, en orden alfabético`;
    // Pocas coincidencias con una búsqueda real: se confirma el ingreso en grande
    const hall = $("#admHallazgo"), ok = q.length >= 3 && found.length >= 1 && found.length <= 3;
    if (ok) {
      $("#hallazgoTit").textContent = found.length === 1 ? `¡Ingresó a ${gradoLabel(found[0].grado)}!` : `${found.length} ingresantes encontrados`;
      $("#hallazgoTxt").textContent = found.map((a) => `${a.nombres} ${a.paterno} ${a.materno}`).join(", ");
    }
    hall.classList.toggle("is-on", ok);
    observarLetras();
  };

  /* Letra actual: la sección visible dentro de la lista marca su letra en el abecedario */
  let obsLetras, pausaLetras = 0;
  const marcarLetra = (l) => $$("#alphaNav a").forEach((a) => a.setAttribute("aria-current", String(a.textContent === l)));
  const observarLetras = () => {
    if (obsLetras) obsLetras.disconnect();
    const links = new Map($$("#alphaNav a").map((a) => [a.textContent, a]));
    obsLetras = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting || Date.now() < pausaLetras) return;
      const l = en.target.id.replace("letra-", "");
      links.forEach((a, k) => a.setAttribute("aria-current", String(k === l)));
    }), { root: box, rootMargin: "0px 0px -99% 0px" });
    $$(".group", box).forEach((g) => obsLetras.observe(g));
  };
  const goLetter = (l) => {
    const g = document.getElementById("letra-" + l);
    if (!g) return;
    // La letra elegida se marca de inmediato; el observador espera a que termine el desplazamiento
    marcarLetra(l); pausaLetras = Date.now() + 1000;
    box.scrollTo({ top: g.offsetTop, behavior: reduce ? "auto" : "smooth" });
    $(".search-panel").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  $("#alphaNav").innerHTML = [...new Set(list.map((a) => a.letra))].map((l) => `<a href="#letra-${l}">${l}</a>`).join("");
  $("#alphaNav").addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); goLetter(a.textContent); });
  // La búsqueda queda en la URL (?q=): se puede compartir o recargar sin perderla
  const syncURL = (q) => {
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  };
  const initial = new URLSearchParams(location.search).get("q") || "";
  $("#admQ").value = initial;
  let timer;
  $("#admQ").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { render(e.target.value); syncURL(e.target.value.trim()); }, 150);
  });
  render(initial);

  /* ---------- Datos del proceso ---------- */
  const tally = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const topOf = (map, k) => [...map].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0])).slice(0, k);
  const porLetra = tally(list.map((a) => a.letra));
  const porApellido = tally(list.flatMap((a) => [a.paterno, a.materno]));
  const porNombre = tally(list.map((a) => a.nombres.split(" ")[0]));
  const porGrado = tally(list.map((a) => gradoLabel(a.grado)));
  const palabras = tally(list.map((a) => Math.min(3, a.nombres.split(" ").length)));
  const [gradoTop, gradoN] = topOf(porGrado, 1)[0];
  const uno = palabras.get(1) || 0, dos = palabras.get(2) || 0, tres = palabras.get(3) || 0;

  $("#admKpis").innerHTML = [
    [total, "ingresantes en la lista oficial"],
    [pf0.format(gradoN / total), `ingresan a ${gradoTop.toLowerCase()} de primaria`],
    [pf0.format((dos + tres) / total), "tienen dos nombres o más"],
    [new Set(list.map((a) => a.paterno)).size, "apellidos paternos distintos"]
  ].map(([v, l]) => `<div class="kpi card spot"><strong>${v}</strong><span>${l}</span></div>`).join("");

  const letras = [...porLetra].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...letras.map((l) => l[1]));
  const bars = $("#letterBars");
  bars.innerHTML = letras.map(([l, n], i) => `
    <button class="bar${n === max ? " is-top" : ""}" type="button" style="--i:${i}" data-letter="${l}" aria-label="${n} ingresantes con la letra ${l}">
      <span class="bar__val">${n}</span><span class="bar__fill" style="--h:${(n / max) * 100}%"></span><span class="bar__key">${l}</span>
    </button>`).join("");
  const orden = [...letras].sort((a, b) => b[1] - a[1]);
  $("#letterInsight").textContent = `La ${orden[0][0]} es la inicial más frecuente con ${orden[0][1]} ingresantes (${pf0.format(orden[0][1] / total)}), seguida de la ${orden[1][0]} (${orden[1][1]}) y la ${orden[2][0]} (${orden[2][1]}). Toca una barra para ir a esa letra.`;
  bars.addEventListener("click", (e) => {
    const b = e.target.closest(".bar"); if (!b) return;
    if ($("#admQ").value) { $("#admQ").value = ""; render(""); syncURL(""); }
    goLetter(b.dataset.letter);
  });

  const rank = (rows) => rows.map(([k, n]) => `<li><span>${k}</span><b>${n}</b></li>`).join("");
  $("#topSurnames").innerHTML = rank(topOf(porApellido, 5));
  $("#topNames").innerHTML = rank(topOf(porNombre, 5));

  const donut = $("#nameDonut");
  donut.style.setProperty("--a", Math.round((uno / total) * 100));
  donut.style.setProperty("--b", Math.round(((uno + dos) / total) * 100));
  $("#donutLabel").innerHTML = `${pf0.format(dos / total)}<small>dos nombres</small>`;
  $("#nameLegend").innerHTML = [["var(--primary)", `Un nombre: ${uno}`], ["var(--red-100)", `Dos nombres: ${dos}`], ["var(--ink)", `Tres o más: ${tres}`]]
    .map(([c, t]) => `<li><i style="background:${c}"></i>${t}</li>`).join("");

  // Barras y dona se dibujan cuando el panel se abre y entra en pantalla
  observeDraw(bars);
  observeDraw(donut);
})();
