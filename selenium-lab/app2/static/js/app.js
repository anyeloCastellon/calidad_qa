// TaskFlow QA - comportamiento de la interfaz.
// Varias acciones son asincronas a proposito (busqueda con retardo, fetch,
// animaciones y avisos que desaparecen): las pruebas deben usar esperas.
(function () {
  "use strict";

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  // ---------------------------------------------------------------- avisos
  function programarCierre(toast) {
    setTimeout(() => {
      toast.classList.add("toast-saliendo");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function mostrarToast(texto) {
    const cont = $(".toasts");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.dataset.testid = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = texto;
    cont.appendChild(toast);
    programarCierre(toast);
  }

  $$('[data-testid="toast"]').forEach(programarCierre);

  // ------------------------------------------- contador de caracteres titulo
  const titulo = $('[data-testid="titulo"]');
  const contTitulo = $('[data-testid="contador-titulo"]');
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

  // ----------------------------------------------------------------- tablero
  const buscador = $('[data-testid="buscar"]');
  if (!buscador) return;

  const filtroPrioridad = $('[data-testid="filtro-prioridad"]');
  const resultados = $('[data-testid="resultados"]');
  const sinResultados = $('[data-testid="sin-resultados"]');

  function aplicarFiltros() {
    const texto = buscador.value.trim().toLowerCase();
    const prioridad = filtroPrioridad.value;
    let visibles = 0;
    $$('[data-testid="tarea"]').forEach((t) => {
      const ok = t.dataset.titulo.toLowerCase().includes(texto) &&
                 (!prioridad || t.dataset.prioridad === prioridad);
      t.hidden = !ok;
      if (ok) visibles++;
    });
    resultados.textContent = "Mostrando " + visibles + " tareas";
    sinResultados.hidden = visibles !== 0;
  }

  let espera;
  buscador.addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(aplicarFiltros, 500);   // busqueda "en vivo" con retardo
  });
  filtroPrioridad.addEventListener("change", aplicarFiltros);

  function actualizarContadores(datos) {
    $('[data-testid="contador-pendientes"]').textContent = datos.pendientes;
    $('[data-testid="contador-completadas"]').textContent = datos.completadas;
  }

  // ------------------------------------------------------- completar tarea
  document.addEventListener("change", async (ev) => {
    const check = ev.target.closest('[data-testid="completar"]');
    if (!check) return;
    const tarjeta = check.closest('[data-testid="tarea"]');
    check.disabled = true;
    const resp = await fetch("/api/tareas/" + tarjeta.dataset.id + "/completar", { method: "POST" });
    if (!resp.ok) { check.disabled = false; return; }
    const datos = await resp.json();
    tarjeta.classList.add("tarjeta-moviendo");
    setTimeout(() => {
      const destino = datos.completada ? "lista-completadas" : "lista-pendientes";
      tarjeta.classList.toggle("tarjeta-completada", datos.completada);
      tarjeta.classList.remove("tarjeta-moviendo");
      $('[data-testid="' + destino + '"]').prepend(tarjeta);
      check.disabled = false;
      actualizarContadores(datos);
      mostrarToast(datos.completada ? "Tarea completada." : "Tarea reabierta.");
    }, 600);
  });

  // ------------------------------------------------- eliminar (con modal)
  const modal = $('[data-testid="modal-confirmar"]');
  let porEliminar = null;

  function cerrarModal() {
    modal.classList.remove("modal-visible");
    setTimeout(() => { modal.hidden = true; }, 250);
    porEliminar = null;
  }

  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest('[data-testid="eliminar"]');
    if (btn) {
      porEliminar = btn.closest('[data-testid="tarea"]');
      $('[data-testid="modal-tarea"]').textContent = porEliminar.dataset.titulo;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("modal-visible"));
      return;
    }
    if (ev.target.closest('[data-testid="cancelar-eliminar"]')) {
      cerrarModal();
      return;
    }
    if (ev.target.closest('[data-testid="confirmar-eliminar"]') && porEliminar) {
      const tarjeta = porEliminar;
      const resp = await fetch("/api/tareas/" + tarjeta.dataset.id, { method: "DELETE" });
      cerrarModal();
      if (!resp.ok) return;
      const datos = await resp.json();
      tarjeta.classList.add("tarjeta-saliendo");
      setTimeout(() => {
        tarjeta.remove();
        actualizarContadores(datos);
        aplicarFiltros();
        mostrarToast("Tarea eliminada.");
      }, 400);
    }
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) cerrarModal();
  });
})();
