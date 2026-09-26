/* Núcleo: utilidades, tema, menú, revelado al hacer scroll, contadores,
   titular palabra por palabra, pestañas y franja de valores. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  window.FYA = Object.assign(window.FYA || {}, { $, $$, reduce, finePointer });

  /* ---------- Imágenes: respaldo si una foto no carga ---------- */
  $$("img[data-fallback]").forEach((img) => {
    const swap = () => {
      if (img.dataset.swapped) return;
      img.dataset.swapped = "1";
      img.src = `https://picsum.photos/seed/${img.dataset.fallback}/${img.getAttribute("width") || 900}/${img.getAttribute("height") || 600}`;
    };
    img.addEventListener("error", swap);
    if (img.complete && img.naturalWidth === 0) swap();
  });

  /* ---------- Tema claro u oscuro ---------- */
  const themeBtn = $("#themeToggle");
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const paintTheme = () => {
    themeBtn.innerHTML = `<i class="ph ph-${isDark() ? "sun" : "moon"}" aria-hidden="true"></i>`;
    themeBtn.setAttribute("aria-pressed", String(isDark()));
    // La barra del navegador móvil sigue al tema elegido a mano
    $$("meta[name=theme-color]").forEach((m) => { m.content = isDark() ? "#0d1620" : "#faf8f5"; m.removeAttribute("media"); });
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
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  new IntersectionObserver(([en]) => {
    nav.classList.toggle("is-scrolled", !en.isIntersecting);
    toTop.classList.toggle("is-visible", !en.isIntersecting);
  }, { rootMargin: "-80px 0px 0px 0px" }).observe($(".hero"));
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  const links = $$("#menu a");
  const secObs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = $(a.getAttribute("href")); if (s) secObs.observe(s); });

  /* ---------- Portada: pila de fotos del colegio ---------- */
  const portada = $(".portada");
  if (portada) {
    const tarjetas = $$(".tarjeta", portada);
    const fondos = $$(".portada__fondo img", portada);
    const puntos = $$(".portada-control__puntos button", portada);
    const pausa = $("#portadaPausa"), cuenta = $("#pilaN");
    const n = tarjetas.length, DUR = 6000;
    let actual = 0, timer = 0, pausado = reduce, visible = true;
    portada.style.setProperty("--dur", DUR + "ms");
    const mostrar = (siguiente, animar = true) => {
      const anterior = actual;
      actual = (siguiente + n) % n;
      tarjetas.forEach((t, i) => {
        const pos = (i - actual + n) % n;
        // La que estaba al frente sale hacia la izquierda y luego pasa al fondo
        if (animar && i === anterior && anterior !== actual && !reduce) {
          t.classList.add("sale");
          t.addEventListener("animationend", () => t.classList.remove("sale"), { once: true });
        }
        t.dataset.pos = pos;
        t.setAttribute("aria-hidden", String(pos !== 0));
        const img = $("img", t);
        if (pos <= 1 && img.loading === "lazy") img.loading = "eager";
      });
      fondos.forEach((f, i) => f.classList.toggle("is-active", i === actual));
      puntos.forEach((p, i) => {
        p.classList.remove("is-active");
        p.setAttribute("aria-pressed", String(i === actual));
        if (i === actual) { void p.offsetWidth; p.classList.add("is-active"); }
      });
      cuenta.textContent = actual + 1;
    };
    const programar = () => {
      clearTimeout(timer);
      if (!pausado && visible && !document.hidden) timer = setTimeout(() => { mostrar(actual + 1); programar(); }, DUR);
    };
    const pintarPausa = () => {
      portada.classList.toggle("is-paused", pausado);
      pausa.setAttribute("aria-pressed", String(pausado));
      pausa.innerHTML = `<i class="ph ph-${pausado ? "play" : "pause"}" aria-hidden="true"></i>`;
    };
    puntos.forEach((p, i) => p.addEventListener("click", () => { if (i !== actual) mostrar(i); programar(); }));
    // Tocar la pila también pasa a la siguiente foto
    $("#pila").addEventListener("click", () => { mostrar(actual + 1); programar(); });
    pausa.addEventListener("click", () => { pausado = !pausado; pintarPausa(); if (!pausado) mostrar(actual, false); programar(); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; programar(); }).observe(portada);
    document.addEventListener("visibilitychange", programar);
    mostrar(0, false);
    pintarPausa();
    programar();
  }

  /* ---------- Titular palabra por palabra ---------- */
  const h1 = $(".hero h1");
  if (h1 && !reduce) {
    h1.setAttribute("aria-label", h1.textContent.trim());
    let wi = 0;
    const wrap = (node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
        const w = document.createElement("span");
        w.className = "w"; w.setAttribute("aria-hidden", "true");
        w.innerHTML = `<span style="--wi:${wi++}">${part}</span>`;
        frag.appendChild(w);
      });
      node.replaceWith(frag);
    };
    const walk = (el) => [...el.childNodes].forEach((n) => (n.nodeType === 3 ? wrap(n) : n.nodeType === 1 && walk(n)));
    walk(h1);
  }

  /* ---------- Revelado al hacer scroll ---------- */
  const revealObs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    revealObs.unobserve(en.target);
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  const observeReveal = (root = document) => {
    const counts = new Map();
    $$(".reveal:not(.is-in)", root).forEach((el) => {
      const n = counts.get(el.parentElement) || 0;
      el.style.setProperty("--i", n);
      counts.set(el.parentElement, n + 1);
      revealObs.observe(el);
    });
  };
  // Al terminar de entrar, deja de ser "reveal" para que su hover (transform) funcione
  document.addEventListener("transitionend", (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("reveal") || !el.classList.contains("is-in")) return;
    if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
    el.classList.remove("reveal");
    delete el.dataset.reveal;
    el.style.removeProperty("--i");
  });
  // Contenedores que se dibujan al entrar (línea de tiempo, barras, dona)
  const drawObs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); drawObs.unobserve(en.target); }
  }), { threshold: 0.3 });
  window.FYA.observeReveal = observeReveal;
  window.FYA.observeDraw = (el) => drawObs.observe(el);
  window.FYA.observeDraw($("#timeline"));
  window.FYA.observeDraw($("#steps"));

  /* ---------- Contadores ---------- */
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    if (reduce) { el.textContent = to.toLocaleString("es-PE"); return; }
    el.textContent = "0";
    const start = performance.now(), dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))).toLocaleString("es-PE");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { countUp(en.target); countObs.unobserve(en.target); }
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countObs.observe(el));

  /* ---------- Pestañas con indicador deslizante ---------- */
  const tabs = $$(".tab"), ink = $(".tab__ink");
  const moveInk = (tab) => { ink.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${(tab.offsetWidth / 100).toFixed(3)})`; };
  const activate = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    moveInk(tab);
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => activate(t));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); activate(next);
    });
  });
  requestAnimationFrame(() => moveInk($(".tab.is-active")));
  let rz = 0;
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => moveInk($(".tab.is-active"))); });

  /* ---------- Franja de valores: pausa accesible y ahorro fuera de pantalla ---------- */
  const band = $(".values-band"), toggle = $(".marquee__toggle"), track = $("#marqueeTrack");
  toggle.addEventListener("click", () => {
    const paused = !band.classList.contains("is-paused");
    band.classList.toggle("is-paused", paused);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.innerHTML = `<i class="ph ph-${paused ? "play" : "pause"}" aria-hidden="true"></i>`;
  });
  new IntersectionObserver(([en]) => { track.style.animationPlayState = en.isIntersecting ? "" : "paused"; }).observe(band);

  // El revelado arranca cuando el resto de scripts dibujó su contenido
  addEventListener("DOMContentLoaded", () => observeReveal());
})();
