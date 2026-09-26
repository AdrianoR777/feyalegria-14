/* Interacciones al pasar el cursor y al hacer clic, y formulario de admisión.
   Los efectos de cursor solo corren con puntero fino y sin movimiento reducido. */
(function () {
  const { $, $$, reduce, finePointer } = window.FYA;
  const rich = finePointer && !reduce;

  /* ---------- Foco de luz: un círculo que se mueve con transform ---------- */
  if (rich) {
    $$(".spot").forEach((el) => { const l = document.createElement("span"); l.className = "spot__light"; l.setAttribute("aria-hidden", "true"); el.prepend(l); });
    let frame = 0, last = null;
    document.addEventListener("pointermove", (e) => {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = last.target.closest && last.target.closest(".spot");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${last.clientX - r.left}px`);
        el.style.setProperty("--my", `${last.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  /* ---------- Inclinación 3D ---------- */
  if (rich) {
    $$(".tile, .post, .hero__img--main").forEach((el) => {
      el.dataset.tilt = "";
      let f = 0;
      el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
      el.addEventListener("pointermove", (e) => {
        cancelAnimationFrame(f);
        f = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
          el.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(f);
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Botones con imán ---------- */
  if (rich) {
    $$(".btn--primary, .btn--ghost, .btn--light, .btn--facebook, .icon-btn, .social a").forEach((el) => {
      let f = 0;
      el.addEventListener("pointermove", (e) => {
        cancelAnimationFrame(f);
        f = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`;
        });
      });
      el.addEventListener("pointerleave", () => { cancelAnimationFrame(f); el.style.translate = ""; });
    });
  }

  /* ---------- Onda al hacer clic ---------- */
  if (!reduce) {
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".btn, .tab, .bar, .alpha a, .marquee__toggle");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.left = `${e.clientX - r.left}px`;
      dot.style.top = `${e.clientY - r.top}px`;
      el.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    });
  }

  /* ---------- Píldora del menú ---------- */
  const menu = $("#menu");
  if (finePointer) {
    const pill = document.createElement("span");
    pill.className = "nav__pill";
    pill.setAttribute("aria-hidden", "true");
    menu.prepend(pill);
    $$("a", menu).forEach((a) => a.addEventListener("pointerenter", () => {
      pill.style.transform = `translateX(${a.offsetLeft}px) scaleX(${(a.offsetWidth / 100).toFixed(3)})`;
    }));
  }

  /* ---------- Formulario de información (abre el correo) ---------- */
  const form = $("#admForm");
  const ordinal = (g) => g + ".°";
  const messages = {
    valueMissing: "Completa este campo para enviar la solicitud.",
    patternMismatch: "Escribe 9 dígitos que empiecen con 9, por ejemplo 987654321."
  };
  const check = (input) => {
    const field = input.closest(".field");
    const key = Object.keys(messages).find((k) => input.validity[k]);
    field.classList.toggle("is-invalid", !!key);
    field.querySelector(".error").textContent = key ? messages[key] : "";
    input.setAttribute("aria-invalid", String(!!key));
    return !key;
  };
  /* Grados con vacantes: secciones A, B, C y D en todos los grados */
  const niveles = [["Primaria", 6, "grado", "#gradosPrimaria"], ["Secundaria", 5, "año", "#gradosSecundaria"]];
  const selGrado = $("#aGrado");
  niveles.forEach(([nivel, cant, unidad, lista]) => {
    for (let g = 1; g <= cant; g++) {
      const valor = `${ordinal(g)} ${unidad}, ${nivel.toLowerCase()}`;
      selGrado.insertAdjacentHTML("beforeend", `<option>${valor}</option>`);
      $(lista).insertAdjacentHTML("beforeend", `<li class="reveal"><button type="button" class="grado" data-valor="${valor}" aria-pressed="false" aria-label="Postular a ${valor}"><b>${ordinal(g)}</b><span aria-hidden="true">A B C D</span></button></li>`);
    }
  });
  // Tocar un grado lo elige en el formulario y lleva al formulario
  const fichas = $$(".grado");
  const marcar = (valor) => fichas.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.valor === valor)));
  fichas.forEach((b) => b.addEventListener("click", () => {
    selGrado.value = b.dataset.valor;
    marcar(b.dataset.valor);
    check(selGrado);
    form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setTimeout(() => $("#aPadre").focus({ preventScroll: true }), reduce ? 0 : 450);
  }));
  selGrado.addEventListener("change", () => marcar(selGrado.value));
  $$("input[required], select[required]", form).forEach((i) => {
    i.addEventListener("blur", () => check(i));
    i.addEventListener("input", () => { if (i.closest(".field").classList.contains("is-invalid")) check(i); });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = $$("input[required], select[required]", form);
    if (!fields.map(check).every(Boolean)) { fields.find((f) => !f.validity.valid).focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const body = [`Apoderado: ${d.padre}`, `Celular: ${d.tel}`, `Estudiante: ${d.alumno}`, `Grado: ${d.grado}`, "", d.msg || ""].join("\n");
    location.href = `mailto:sdsecundaria@feyalegria14.edu.pe?subject=${encodeURIComponent("Solicitud de información de admisión")}&body=${encodeURIComponent(body)}`;
    $("#admOk").hidden = false;
  });
})();
