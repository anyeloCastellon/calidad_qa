r"""Prueba de humo de TaskFlow QA (version 2): la app esta arriba y responde.

Los casos de la actividad se automatizan con Selenium IDE (ver README).
Ejecutar:  .\lab.ps1 test 2
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


def test_humo_login_disponible(driver, base_url, wait):
    driver.get(f"{base_url}/login")
    wait.until(EC.visibility_of_element_located((By.ID, "btn-ingresar")))
    assert "TaskFlow" in driver.title
    assert driver.find_element(By.ID, "usuario").is_displayed()
    assert driver.find_element(By.ID, "clave").is_displayed()
