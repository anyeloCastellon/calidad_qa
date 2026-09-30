"""Validación de RUT chileno (dígito verificador módulo 11)."""


def normalizar_rut(rut):
    return rut.replace(".", "").replace("-", "").replace(" ", "").upper()


def validar_rut(rut):
    limpio = normalizar_rut(rut)
    if len(limpio) < 2:
        return False

    cuerpo, dv = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit() or not 0 < int(cuerpo) < 100_000_000:
        return False

    suma = 0
    multiplicador = 2
    for digito in reversed(cuerpo):
        suma += int(digito) * multiplicador
        multiplicador = 2 if multiplicador == 7 else multiplicador + 1

    resto = 11 - suma % 11
    if resto == 11:
        esperado = "0"
    elif resto == 10:
        esperado = "K"
    else:
        esperado = str(resto)

    return dv == esperado
