"""Validación y normalización de RUT chileno."""


def normalizar_rut(rut: str) -> str:
    return rut.replace(".", "").replace("-", "").replace(" ", "").upper()


def validar_rut(rut: str) -> bool:
    limpio = normalizar_rut(rut)
    if len(limpio) < 2:
        return False
    cuerpo, dv = limpio[:-1], limpio[-1]
    if not all("0" <= digito <= "9" for digito in cuerpo):
        return False
    if not 0 < int(cuerpo) < 100_000_000:
        return False
    suma = 0
    multiplicador = 2
    for digito in reversed(cuerpo):
        suma += int(digito) * multiplicador
        multiplicador = 2 if multiplicador == 7 else multiplicador + 1
    resto = 11 - suma % 11
    esperado = "0" if resto == 11 else "K" if resto == 10 else str(resto)
    return dv == esperado
