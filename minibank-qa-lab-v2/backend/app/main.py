"""API local de MiniBank QA Lab 2.0."""
import secrets
from datetime import datetime, timezone
from threading import RLock

from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, StrictInt

from .rut import normalizar_rut, validar_rut
from .transfer import COMISION, LIMITE_DIARIO, MENSAJES, validar_transferencia

app = FastAPI(title="MiniBank QA Lab 2.0", version="2.0.0")
bearer = HTTPBearer(auto_error=False)
lock = RLock()
SALDO_INICIAL = 2_000_000
USUARIOS = {"111111111": {"clave": "1234", "nombre": "Camila Rojas"}}
SESIONES = {}
CUENTAS = {}

def reiniciar_datos():
    with lock:
        SESIONES.clear()
        CUENTAS.clear()
        for rut in USUARIOS:
            CUENTAS[rut] = {
                "saldo": SALDO_INICIAL, "transferido_hoy": 0,
                "movimientos": [], "destinatarios": [],
            }

reiniciar_datos()

@app.exception_handler(HTTPException)
async def error_http(request, exc):
    return JSONResponse(status_code=exc.status_code,
                        content={"estado": "error", "mensaje": exc.detail})

@app.exception_handler(RequestValidationError)
async def error_datos(request, exc):
    return JSONResponse(status_code=422, content={
        "estado": "error", "mensaje": "Revise los campos: RUT y nombre deben ser texto; monto debe ser un entero de pesos."
    })

class Credenciales(BaseModel):
    rut: str
    clave: str

class Transferencia(BaseModel):
    destinatario: str
    monto: StrictInt

class Destinatario(BaseModel):
    rut: str
    nombre: str
    alias: str

def usuario_actual(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if auth is None or auth.scheme.lower() != "bearer":
        raise HTTPException(401, "Sesión inválida o expirada")
    with lock:
        rut = SESIONES.get(auth.credentials)
        if rut is None:
            raise HTTPException(401, "Sesión inválida o expirada")
        return rut

@app.get("/api/health")
def health():
    return {"estado": "ok", "version": "2.0.0"}

@app.post("/api/login")
def login(datos: Credenciales):
    rut = normalizar_rut(datos.rut)
    usuario = USUARIOS.get(rut)
    if not validar_rut(datos.rut) or usuario is None or usuario["clave"] != datos.clave:
        raise HTTPException(401, "RUT o clave incorrectos")
    with lock:
        token = secrets.token_hex(32)
        SESIONES[token] = rut
    return {"token": token, "nombre": usuario["nombre"]}

@app.post("/api/logout")
def logout(auth: HTTPAuthorizationCredentials | None = Depends(bearer),
           rut: str = Depends(usuario_actual)):
    with lock:
        SESIONES.pop(auth.credentials, None)
    return {"estado": "ok", "mensaje": "Sesión cerrada"}

@app.get("/api/cuenta")
def cuenta(rut: str = Depends(usuario_actual)):
    with lock:
        datos = CUENTAS[rut]
        return {"nombre": USUARIOS[rut]["nombre"], "saldo": datos["saldo"],
                "transferido_hoy": datos["transferido_hoy"], "limite_diario": LIMITE_DIARIO,
                "comision": COMISION, "maximo_transferencia": 500_000}

@app.get("/api/movimientos")
def movimientos():
    with lock:
        return {"movimientos": list(CUENTAS["111111111"]["movimientos"])}

@app.get("/api/destinatarios")
def destinatarios(rut: str = Depends(usuario_actual)):
    with lock:
        return {"destinatarios": list(CUENTAS[rut]["destinatarios"])}

@app.post("/api/destinatarios", status_code=201)
def registrar(datos: Destinatario, rut: str = Depends(usuario_actual)):
    alias = datos.alias.strip()
    nombre = datos.nombre.strip()
    if not validar_rut(datos.rut):
        raise HTTPException(400, "RUT del destinatario inválido")
    if not 1 <= len(nombre) <= 80:
        raise HTTPException(400, "Nombre requerido: entre 1 y 80 caracteres")
    if not 3 <= len(alias) <= 31:
        raise HTTPException(400, "El alias debe tener entre 3 y 30 caracteres")
    with lock:
        lista = CUENTAS[rut]["destinatarios"]
        if any(d["alias"].casefold() == alias.casefold() for d in lista):
            raise HTTPException(409, "Ya existe un destinatario con ese alias")
        item = {"id": len(lista) + 1, "rut": normalizar_rut(datos.rut), "nombre": nombre, "alias": alias}
        lista.append(item)
    return {"estado": "ok", "mensaje": "Destinatario guardado", "destinatario": item}

@app.post("/api/transferir")
def transferir(datos: Transferencia, rut: str = Depends(usuario_actual)):
    with lock:
        cuenta = CUENTAS[rut]
        if not validar_rut(datos.destinatario):
            codigo = "DESTINATARIO_INVALIDO"
        else:
            codigo = validar_transferencia(datos.monto, cuenta["saldo"], LIMITE_DIARIO, cuenta["transferido_hoy"])
        if codigo != "TRANSFERENCIA_OK":
            return JSONResponse(status_code=400, content={
                "estado": "error", "codigo": codigo, "mensaje": MENSAJES[codigo]})
        cuenta["saldo"] -= datos.monto + COMISION
        cuenta["transferido_hoy"] += datos.monto
        comprobante = f"TRF-{len(cuenta['movimientos']) + 1:05d}"
        cuenta["movimientos"].insert(0, {
            "comprobante": comprobante,
            "fecha": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "destinatario": normalizar_rut(datos.destinatario), "monto": datos.monto,
            "comision": COMISION, "saldo_resultante": cuenta["saldo"],
        })
        return {"estado": "ok", "mensaje": MENSAJES[codigo],
                "comprobante": comprobante, "saldo": cuenta["saldo"]}

@app.post("/api/reset")
def reset(perfil: str = "estandar"):
    if perfil not in ("estandar", "saldo_bajo"):
        raise HTTPException(400, "Perfil inválido: estandar o saldo_bajo")
    reiniciar_datos()
    if perfil == "saldo_bajo":
        with lock:
            CUENTAS["111111111"]["saldo"] = 500_000
    return {"estado": "ok", "mensaje": "Datos reiniciados; vuelva a iniciar sesión"}

