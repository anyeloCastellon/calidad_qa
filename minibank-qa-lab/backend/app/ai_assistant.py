"""Asistente de QA: propone casos de prueba a partir de un requisito.

La consulta a OpenAI se hace siempre desde el backend. La clave vive en la
variable de entorno OPENAI_API_KEY y nunca se envía al navegador.
"""

import json
import logging
import os

logger = logging.getLogger("minibank.ia")

INSTRUCCIONES = """Eres un analista de QA que apoya a un equipo que prueba MiniBank,
una banca móvil de laboratorio. MiniBank permite iniciar sesión con RUT y clave,
consultar saldo y transferir pesos chilenos (enteros) a un RUT destinatario.

A partir del requisito que te entreguen, propone entre 6 y 10 casos de prueba.
Incluye casos válidos, valores límite, casos negativos y, si aplica, casos de
seguridad. No inventes funcionalidades que el requisito no menciona.

Responde SOLO con JSON válido, sin texto adicional, con esta forma:
{"casos": [{"id": "TC-001", "tecnica": "Valor límite", "entrada": "...",
"resultado_esperado": "..."}]}"""

PLANTILLAS = [
    ("Partición válida", "Un valor típico que cumple el requisito", "El sistema acepta la operación"),
    ("Valor límite", "El valor exactamente en el borde permitido", "El sistema acepta la operación"),
    ("Valor límite", "El primer valor fuera del borde permitido", "El sistema rechaza con un mensaje claro"),
    ("Partición inválida", "Un valor cero o negativo", "El sistema rechaza con un mensaje claro"),
    ("Partición inválida", "Campo vacío o con texto no numérico", "El sistema rechaza sin mostrar éxito"),
    ("Seguridad", "La operación con una sesión cerrada o un token alterado", "El sistema responde 401"),
]


def _casos_de_ejemplo(requisito, aviso):
    casos = [
        {"id": f"TC-{i:03d}", "tecnica": tecnica, "entrada": entrada, "resultado_esperado": esperado}
        for i, (tecnica, entrada, esperado) in enumerate(PLANTILLAS, start=1)
    ]
    return {"origen": "sin_conexion", "aviso": aviso, "requisito": requisito, "casos": casos}


def _extraer_json(texto):
    inicio, fin = texto.find("{"), texto.rfind("}")
    return json.loads(texto[inicio : fin + 1])


def generar_casos(requisito):
    clave = os.getenv("OPENAI_API_KEY")
    modelo = os.getenv("OPENAI_MODEL") or "gpt-4.1-mini"

    if not clave:
        return _casos_de_ejemplo(requisito, "No hay OPENAI_API_KEY configurada: se muestran casos genéricos de ejemplo.")

    try:
        from openai import OpenAI

        cliente = OpenAI(api_key=clave, timeout=30)
        respuesta = cliente.responses.create(
            model=modelo,
            instructions=INSTRUCCIONES,
            input=f"Requisito: {requisito}",
        )
        casos = _extraer_json(respuesta.output_text)["casos"]
        return {"origen": "openai", "modelo": modelo, "requisito": requisito, "casos": casos}
    except Exception as exc:
        logger.warning("No se pudo consultar OpenAI: %s", exc.__class__.__name__)
        return _casos_de_ejemplo(requisito, "La consulta a OpenAI falló: se muestran casos genéricos de ejemplo.")
