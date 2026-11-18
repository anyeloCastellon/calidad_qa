"""Flujos clave del portal Campus Abierto con Selenium WebDriver (pytest).

AUT-01  Login_Exitoso
AUT-02  Crear_Entrada
AUT-03  Moderar_Comentario

Requisitos: el laboratorio levantado (lab up) y Google Chrome instalado.
Ejecutar desde esta carpeta:  pytest -v
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def _login(driver, base_url, user, password):
    driver.get(f"{base_url}/wp-login.php")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "user_login")))
    driver.find_element(By.ID, "user_login").clear()
    driver.find_element(By.ID, "user_login").send_keys(user)
    driver.find_element(By.ID, "user_pass").send_keys(password)
    driver.find_element(By.ID, "wp-submit").click()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "wpadminbar")))


def test_aut01_login(driver, base_url, creds):
    _login(driver, base_url, *creds)
    assert driver.find_element(By.ID, "menu-dashboard").is_displayed()


def test_aut02_crear_entrada(driver, base_url, creds):
    _login(driver, base_url, *creds)
    driver.get(f"{base_url}/wp-admin/post-new.php")
    wait = WebDriverWait(driver, 20)
    # Cerrar el aviso de bienvenida del editor si aparece.
    try:
        driver.find_element(By.CSS_SELECTOR, 'button[aria-label="Close"]').click()
    except Exception:
        pass
    title = wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, ".editor-post-title__input, h1.wp-block-post-title")))
    title.click()
    title.send_keys("Entrada de prueba AUT-02")
    body = wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "p.block-editor-rich-text__editable, .block-editor-default-block-appender__content")))
    body.click()
    body.send_keys("Contenido generado por la prueba automatizada.")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".editor-post-publish-button__button"))).click()
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".editor-post-publish-button"))).click()
    snackbar = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".components-snackbar__content")))
    assert "publish" in snackbar.text.lower()


def test_aut03_moderar_comentario(driver, base_url, creds):
    wait = WebDriverWait(driver, 10)
    # 1) Comentar como visitante anonimo.
    driver.get(f"{base_url}/bitacora-comunidad/")
    wait.until(EC.presence_of_element_located((By.ID, "comment"))).send_keys("Comentario de prueba AUT-03")
    driver.find_element(By.ID, "author").send_keys("Visitante QA")
    driver.find_element(By.ID, "email").send_keys("visitante.qa@example.com")
    driver.find_element(By.ID, "submit").click()
    cuerpo = wait.until(EC.presence_of_element_located((By.TAG_NAME, "body"))).text.lower()
    assert "moderation" in cuerpo or "moderación" in cuerpo
    # 2) Moderar como editor: el comentario debe estar en pendientes.
    _login(driver, base_url, *creds)
    driver.get(f"{base_url}/wp-admin/edit-comments.php?comment_status=moderated")
    pendientes = wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    assert "Comentario de prueba AUT-03" in pendientes.text
