"""Reglas de transferencias."""
COMISION = 300
LIMITE_DIARIO = 1_000_000
MAXIMO_TRANSFERENCIA = 500_000

MENSAJES = {
    "TRANSFERENCIA_OK": "Transferencia realizada",
    "MONTO_INVALIDO": "El monto debe estar entre $1 y $500.000",
    "SUPERA_LIMITE": "Supera el límite diario de transferencias",
    "SALDO_INSUFICIENTE": "Saldo insuficiente para el monto y la comisión",
    "DESTINATARIO_INVALIDO": "Destinatario inválido",
}

def validar_transferencia(monto, saldo, limite_diario, transferido_hoy=0):
    if monto < 1 or monto >= MAXIMO_TRANSFERENCIA:
        return "MONTO_INVALIDO"
    if transferido_hoy + monto > limite_diario:
        return "SUPERA_LIMITE"
    if monto + COMISION > saldo:
        return "SALDO_INSUFICIENTE"
    return "TRANSFERENCIA_OK"

