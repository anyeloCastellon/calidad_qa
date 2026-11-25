"""Fixtures para las pruebas de UI del Mini-Blog QA.

Variables de entorno:
  BLOG_URL         URL base de la app (por defecto http://127.0.0.1:5000)
  BLOG_USER        usuario admin (por defecto admin)
  BLOG_PASS        clave (por defecto Admin123)
  SELENIUM_HEADED  "1" para ver el navegador; por defecto corre headless
  SELENIUM_REMOTE_URL  URL de un Selenium Grid (la define Docker); si existe,
                   el navegador corre remoto y se puede ver en http://localhost:7900
"""
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.environ.get("BLOG_URL", "http://127.0.0.1:5000")
USER = os.environ.get("BLOG_USER", "admin")
PASSWORD = os.environ.get("BLOG_PASS", "Admin123")


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def creds():
    return USER, PASSWORD


@pytest.fixture
def driver():
    options = Options()
    remote_url = os.environ.get("SELENIUM_REMOTE_URL")
    # En el Grid el navegador va "con pantalla" para poder mirarlo por noVNC.
    if not remote_url and os.environ.get("SELENIUM_HEADED") != "1":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--no-sandbox")
    if remote_url:
        driver = webdriver.Remote(command_executor=remote_url, options=options)
    else:
        driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(2)
    yield driver
    driver.quit()
