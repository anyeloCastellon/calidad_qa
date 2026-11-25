"""Fixtures para las pruebas de UI de TaskFlow QA (version 2).

Variables de entorno:
  TASKFLOW_URL         URL base de la app (por defecto http://127.0.0.1:5000)
  TASKFLOW_USER        usuario (por defecto admin)
  TASKFLOW_PASS        clave (por defecto Admin123)
  SELENIUM_HEADED      "1" para ver el navegador en local; por defecto headless
  SELENIUM_REMOTE_URL  URL de un Selenium Grid (la define Docker); si existe,
                       el navegador corre remoto y se ve en http://localhost:7900
"""
import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get("TASKFLOW_URL", "http://127.0.0.1:5000")
USER = os.environ.get("TASKFLOW_USER", "admin")
PASSWORD = os.environ.get("TASKFLOW_PASS", "Admin123")


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
    if not remote_url and os.environ.get("SELENIUM_HEADED") != "1":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--no-sandbox")
    if remote_url:
        drv = webdriver.Remote(command_executor=remote_url, options=options)
    else:
        drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()


@pytest.fixture
def wait(driver):
    """Espera explicita de hasta 10 s: wait.until(EC.condicion(...))."""
    return WebDriverWait(driver, 10)

