"""Fixtures para las pruebas automatizadas del portal Campus Abierto.

Variables de entorno:
  CAMPUS_URL       URL base del laboratorio (por defecto http://localhost:8088)
  CAMPUS_USER      usuario para las pruebas (por defecto redactor)
  CAMPUS_PASS      contrasena ficticia (por defecto Aula2026)
  SELENIUM_HEADED  "1" para ver el navegador; por defecto corre headless
"""
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.environ.get("CAMPUS_URL", "http://localhost:8088")
USER = os.environ.get("CAMPUS_USER", "redactor")
PASSWORD = os.environ.get("CAMPUS_PASS", "Aula2026")


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def creds():
    return USER, PASSWORD


@pytest.fixture
def driver():
    options = Options()
    if os.environ.get("SELENIUM_HEADED") != "1":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(2)
    yield driver
    driver.quit()
