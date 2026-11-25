"""TaskFlow QA (version 2) - los 5 casos que hay que automatizar en clase.

Cada funcion trae el enunciado. Reemplaza `pytest.skip(...)` por tu codigo.
Ejecutar:  .\\lab.ps1 test 2      (o ./lab.sh test 2)

Recordatorios:
  - Localiza por data-testid:  driver.find_element(By.CSS_SELECTOR, sel("buscar"))
  - Usa esperas explicitas (fixture `wait`), nunca time.sleep().
  - Cada prueba debe poder correr sola y en cualquier orden.
  - Sin aserciones no hay prueba.
"""
import pytest
from selenium.webdriver.common.by import By                       # noqa: F401
from selenium.webdriver.support import expected_conditions as EC  # noqa: F401
from selenium.webdriver.support.ui import Select                  # noqa: F401

from ayudas import sel                                            # noqa: F401


def test_v2_01_login(driver, base_url, creds, wait):
    """V2-01 Login: caso negativo y positivo.

    a) Con clave incorrecta: aparece el mensaje de error y se sigue en /login.
    b) Con admin / Admin123: se llega al tablero (/tareas) y el saludo dice
       "Hola, Admin".
    Tecnica: casos negativos; @pytest.mark.parametrize es opcional.
    """
    pytest.skip("V2-01 por implementar")


def test_v2_02_crear_tarea(driver, base_url, creds, wait):
    """V2-02 Crear tarea con validacion.

    a) Guardar el formulario vacio: aparece el error "El titulo es obligatorio."
    b) Crear una tarea con titulo, prioridad "Alta" (lista desplegable) y
       categoria "Estudio" (radio). Verificar: vuelve al tablero, aparece el
       aviso "Tarea creada correctamente.", la tarea esta en Pendientes con la
       etiqueta "Alta" y el contador de pendientes subio en 1.
    Tecnica: Select, radio buttons, mensajes de validacion.
    """
    pytest.skip("V2-02 por implementar")


def test_v2_03_buscar_y_filtrar(driver, base_url, creds, wait):
    """V2-03 Buscar y filtrar.

    a) Escribir "bug" en el buscador: solo queda visible "Corregir bug de login".
       Ojo: la busqueda se aplica medio segundo despues de escribir.
    b) Limpiar el buscador y filtrar por prioridad "Alta": todas las tareas
       visibles son de prioridad Alta.
    c) Buscar un texto que no existe: aparece "No hay tareas que coincidan...".
    Tecnica: esperas explicitas, contar solo los elementos visibles.
    """
    pytest.skip("V2-03 por implementar")


def test_v2_04_completar_tarea(driver, base_url, creds, wait):
    """V2-04 Completar una tarea.

    Marcar la casilla de "Estudiar selectores CSS". Verificar: la tarea pasa a
    la columna Completadas, los contadores cambian (pendientes -1,
    completadas +1) y aparece el aviso "Tarea completada.".
    Al final, desmarcarla para dejar los datos como estaban.
    Tecnica: contenido que cambia sin recargar la pagina (fetch + animacion).
    """
    pytest.skip("V2-04 por implementar")


def test_v2_05_eliminar_con_modal(driver, base_url, creds, wait):
    """V2-05 Eliminar con ventana de confirmacion.

    Crear una tarea propia para la prueba y luego:
    a) Clic en eliminar -> aparece el modal con el nombre de la tarea.
       Cancelar -> el modal se cierra y la tarea sigue ahi.
    b) Clic en eliminar -> Confirmar -> la tarea desaparece, aparece el aviso
       "Tarea eliminada." y el aviso se va solo a los pocos segundos.
    Tecnica: modales, esperar a que algo desaparezca.
    """
    pytest.skip("V2-05 por implementar")
