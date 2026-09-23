"""API de MiniBank QA Lab."""

import logging
import secrets
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .ai_assistant import generar_casos
from .rut import normalizar_rut, validar_rut
from .transfer import COMISION, LIMITE_DIARIO, MENSAJES, validar_transferencia

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("minibank")

app = FastAPI(title="MiniBank QA Lab")

SALDO_INICIAL = 500_000

USUARIOS = {
    "111111111": {"clave": "1234", "nombre": "Camila Rojas"},
}

CUENTAS = {}
SESIONES = {}


def reiniciar_datos():
    SESIONES.clear()
    CUENTAS.clear()
    for rut in USUARIOS:
        CUENTAS[rut] = {"saldo": SALDO_INICIAL, "transferido_hoy": 0, "movimientos": []}


reiniciar_datos()


class Credenciales(BaseModel):
    rut: str
    clave: str


class Transferencia(BaseModel):
    destinatario: str
    monto: int


class Requisito(BaseModel):
    requisito: str = Field(min_length=5, max_length=500)


def error(status, codigo):
    return JSONResponse(
        status_code=status,
        content={"estado": "error", "codigo": codigo, "mensaje": MENSAJES[codigo]},
    )


def usuario_actual(authorization):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")
    rut = SESIONES.get(authorization.removeprefix("Bearer "))
    if rut is None:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")
    return rut


@app.get("/api/health")
def health():
    return {"estado": "ok"}


@app.post("/api/login")
def login(datos: Credenciales):
    rut = normalizar_rut(datos.rut)
    logger.info("Intento de login rut=%s clave=%s", rut, datos.clave)

    usuario = USUARIOS.get(rut)
    if usuario is None or usuario["clave"] != datos.clave:
        raise HTTPException(status_code=401, detail="RUT o clave incorrectos")

    token = secrets.token_hex(16)
    SESIONES[token] = rut
    return {"token": token, "nombre": usuario["nombre"]}


@app.post("/api/logout")
def logout(authorization: str | None = Header(None)):
    usuario_actual(authorization)
    SESIONES.pop(authorization, None)
    return {"estado": "ok", "mensaje": "Sesión cerrada"}


@app.get("/api/cuenta")
def cuenta(authorization: str | None = Header(None)):
    rut = usuario_actual(authorization)
    datos = CUENTAS[rut]
    return {
        "nombre": USUARIOS[rut]["nombre"],
        "saldo": datos["saldo"],
        "transferido_hoy": datos["transferido_hoy"],
        "limite_diario": LIMITE_DIARIO,
        "comision": COMISION,
        "movimientos": datos["movimientos"],
    }


@app.post("/api/transferir")
def transferir(datos: Transferencia, authorization: str | None = Header(None)):
    rut = usuario_actual(authorization)
    cuenta = CUENTAS[rut]

    if not validar_rut(datos.destinatario):
        return error(400, "DESTINATARIO_INVALIDO")

    resultado = validar_transferencia(datos.monto, cuenta["saldo"], LIMITE_DIARIO, cuenta["transferido_hoy"])
    if resultado != "TRANSFERENCIA_OK":
        return error(400, resultado)

    cuenta["saldo"] -= datos.monto + COMISION
    cuenta["transferido_hoy"] += datos.monto
    comprobante = f"TRF-{len(cuenta['movimientos']) + 1:05d}"
    cuenta["movimientos"].insert(0, {
        "comprobante": comprobante,
        "fecha": datetime.now().isoformat(timespec="seconds"),
        "destinatario": datos.destinatario,
        "monto": datos.monto,
        "comision": COMISION,
        "saldo_resultante": cuenta["saldo"],
    })
    logger.info("Transferencia %s rut=%s monto=%s", comprobante, rut, datos.monto)

    return {
        "estado": "ok",
        "mensaje": MENSAJES["TRANSFERENCIA_OK"],
        "comprobante": comprobante,
        "saldo": cuenta["saldo"],
    }


@app.post("/api/ai/casos")
def casos_ia(datos: Requisito):
    return generar_casos(datos.requisito)


@app.post("/api/reset")
def reset():
    reiniciar_datos()
    return {"estado": "ok", "mensaje": "Datos reiniciados"}
