from app.transfer import validar_transferencia


def test_monto_negativo():
    assert validar_transferencia(-1000, 500000, 1000000) == "MONTO_INVALIDO"


def test_supera_limite():
    assert validar_transferencia(1500000, 2000000, 1000000) == "SUPERA_LIMITE"


def test_saldo_insuficiente():
    assert validar_transferencia(600000, 500000, 1000000) == "SALDO_INSUFICIENTE"


def test_transferencia_correcta():
    assert validar_transferencia(100000, 500000, 1000000) == "TRANSFERENCIA_OK"
