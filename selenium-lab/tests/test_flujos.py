"""Flujos clave del Mini-Blog QA con Selenium WebDriver (pytest).

AUT-01  Login_Exitoso
AUT-02  Crear_Entrada
AUT-03  Moderar_Comentario

Requisitos: la app corriendo (python app/app.py) y Google Chrome instalado.
Ejecutar desde la carpeta selenium-lab:  pytest -v
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def _login(driver, base_url, user, password):
    driver.get(f"{base_url}/login")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "usuario")))
    driver.find_element(By.ID, "usuario").send_keys(user)
    driver.find_element(By.ID, "clave").send_keys(password)
    driver.find_element(By.ID, "btn-login").click()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "dashboard")))


def test_aut01_login(driver, base_url, creds):
    _login(driver, base_url, *creds)
    assert driver.find_element(By.ID, "dashboard").is_displayed()


def test_aut02_crear_entrada(driver, base_url, creds):
    _login(driver, base_url, *creds)
    driver.get(f"{base_url}/admin/nueva-entrada")
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.ID, "titulo"))).send_keys("Entrada de prueba AUT-02")
    driver.find_element(By.ID, "cuerpo").send_keys("Contenido generado por la prueba automatizada.")
    driver.find_element(By.ID, "btn-publicar").click()
    flash = wait.until(EC.presence_of_element_located((By.ID, "flash")))
    assert "Entrada publicada" in flash.text
    assert "Entrada de prueba AUT-02" in driver.find_element(By.ID, "lista-entradas").text


def test_aut03_moderar_comentario(driver, base_url, creds):
    wait = WebDriverWait(driver, 10)
    # 1) Comentar como visitante anónimo.
    driver.get(f"{base_url}/entrada/1")
    wait.until(EC.presence_of_element_located((By.ID, "comentario"))).send_keys("Comentario de prueba AUT-03")
    driver.find_element(By.ID, "nombre").send_keys("Visitante QA")
    driver.find_element(By.ID, "btn-comentar").click()
    aviso = wait.until(EC.presence_of_element_located((By.ID, "aviso-moderacion")))
    assert "moderación" in aviso.text.lower()
    # 2) Moderar como admin: el comentario debe estar en pendientes.
    _login(driver, base_url, *creds)
    driver.get(f"{base_url}/admin/comentarios")
    lista = wait.until(EC.presence_of_element_located((By.ID, "lista-comentarios")))
    assert "Comentario de prueba AUT-03" in lista.text
