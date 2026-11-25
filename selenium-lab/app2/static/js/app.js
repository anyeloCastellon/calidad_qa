// TaskFlow QA - detalles de interfaz. Toda accion importante (buscar, filtrar,
// completar, eliminar) es un formulario o un enlace normal: funciona con clics,
// que es lo que Selenium IDE graba y reproduce mejor.
(function () {
  "use strict";

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  // ------------------------------------------- avisos: se van solos (6 s)
  $$('[data-testid="toast"]').forEach((toast) => {
    setTimeout(() => {
      toast.classList.add("toast-saliendo");
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  });

  // --------------------------------------- contador de caracteres del titulo
  const titulo = $("#titulo");
  const contTitulo = $("#contador-titulo");
  if (titulo && contTitulo) {
    const max = parseInt(contTitulo.textContent.split("/")[1], 10);
    const actualizar = () => {
      const n = titulo.value.length;
      contTitulo.textContent = n + " / " + max;
      contTitulo.classList.toggle("excedido", n > max);
    };
    titulo.addEventListener("input", actualizar);
    actualizar();
  }

  // ------------------------------------------ modal de confirmacion (eliminar)
  const modal = $("#modal-confirmar");
  if (!modal) return;
  const form = $("#form-eliminar");

  function abrir(boton) {
    form.action = boton.dataset.accion;
    $("#modal-tarea").textContent = boton.dataset.titulo;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("modal-visible"));
  }

  function cerrar() {
    modal.classList.remove("modal-visible");
    modal.hidden = true;
  }

  document.addEventListener("click", (ev) => {
    const boton = ev.target.closest('[data-testid="eliminar"]');
    if (boton) { abrir(boton); return; }
    if (ev.target.closest("#cancelar-eliminar") || ev.target === modal) cerrar();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) cerrar();
  });
})();
