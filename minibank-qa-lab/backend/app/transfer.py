"""Reglas de negocio de las transferencias de MiniBank."""

COMISION = 300
LIMITE_DIARIO = 1_000_000

MENSAJES = {
    "TRANSFERENCIA_OK": "Transferencia realizada",
    "MONTO_INVALIDO": "El monto debe ser mayor a $0",
    "SUPERA_LIMITE": "Supera el límite diario de transferencias",
    "SALDO_INSUFICIENTE": "Saldo insuficiente",
    "DESTINATARIO_INVALIDO": "Destinatario inválido",
}


def validar_transferencia(monto, saldo, limite_diario, transferido_hoy=0):
    """Decide si una transferencia puede realizarse.

    monto            monto a transferir, en pesos
    saldo            saldo disponible de la cuenta de origen
    limite_diario    máximo que se puede transferir en el día
    transferido_hoy  total ya transferido durante el día
    """
    if monto < 0:
        return "MONTO_INVALIDO"

    if monto > limite_diario:
        return "SUPERA_LIMITE"

    if monto > saldo:
        return "SALDO_INSUFICIENTE"

    return "TRANSFERENCIA_OK"
