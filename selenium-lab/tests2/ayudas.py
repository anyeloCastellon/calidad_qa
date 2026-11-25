"""Utilidades para las pruebas de TaskFlow QA."""


def sel(testid):
    """Selector CSS de un data-testid: sel("buscar") -> '[data-testid="buscar"]'."""
    return f'[data-testid="{testid}"]'
