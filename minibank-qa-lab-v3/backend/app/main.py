"""API local de MiniBank QA Lab 3.0."""

import logging
import secrets
import sqlite3
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, StrictInt, StrictStr

from . import db
from .rut import normalizar_rut, validar_rut
from .transfer import COMISION, LIMITE_DIARIO, MAXIMO_TRANSFERENCIA, MENSAJES, validar_transferencia
from .security_lab import create_security_router

logger = logging.getLogger("minibank.lab")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


@asynccontextmanager
async def lifespan(app):
    db.initialize_database()
    db.invalidate_sessions()
    status = db.inspect_database()
    if status["status"] != "ready":
        raise RuntimeError("El entorno SQLite no está preparado")
    logger.info("Database SQLite | Schema OK | Seed data OK | Build %s", db.BUILD)
    yield


app = FastAPI(title="MiniBank QA Lab 3.0", version=db.VERSION, lifespan=lifespan)
bearer = HTTPBearer(auto_error=False)


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
    rut: StrictStr
    clave: StrictStr


class Transferencia(BaseModel):
    destinatario: StrictStr
    monto: StrictInt


class Destinatario(BaseModel):
    rut: StrictStr
    nombre: StrictStr
    alias: StrictStr


@dataclass(frozen=True)
class Sesion:
    rut: str
    token: str


def require_session(conn, sesion: Sesion):
    row = conn.execute("SELECT user_rut FROM sessions WHERE token = ?", (sesion.token,)).fetchone()
    if row is None or row["user_rut"] != sesion.rut:
        raise HTTPException(401, "Sesión inválida o expirada")


def usuario_actual(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if auth is None or auth.scheme.lower() != "bearer":
        raise HTTPException(401, "Sesión inválida o expirada")
    with db.transaction() as conn:
        row = conn.execute("SELECT user_rut FROM sessions WHERE token = ?", (auth.credentials,)).fetchone()
        if row is None:
            raise HTTPException(401, "Sesión inválida o expirada")
        return Sesion(row["user_rut"], auth.credentials)


@app.get("/api/health")
def health():
    return {"estado": "ok", "version": db.VERSION, "build": db.BUILD}


@app.get("/api/lab/status")
def lab_status():
    status = db.inspect_database()
    return JSONResponse(status_code=200 if status["status"] == "ready" else 503, content=status)


@app.post("/api/login")
def login(datos: Credenciales):
    rut = normalizar_rut(datos.rut)
    with db.transaction(write=True) as conn:
        usuario = conn.execute("SELECT nombre, clave FROM users WHERE rut = ?", (rut,)).fetchone()
        if not validar_rut(datos.rut) or usuario is None or usuario["clave"] != datos.clave:
            logger.warning("Login rechazado rut=%s clave=%s", rut, datos.clave)
            raise HTTPException(401, "RUT o clave incorrectos")
        token = secrets.token_hex(32)
        conn.execute("INSERT INTO sessions(token, user_rut, created_at) VALUES (?, ?, ?)",
                     (token, rut, datetime.now(timezone.utc).isoformat(timespec="seconds")))
        nombre = usuario["nombre"]
    return {"token": token, "nombre": nombre}


@app.post("/api/logout")
def logout(sesion: Sesion = Depends(usuario_actual)):
    with db.transaction(write=True) as conn:
        require_session(conn, sesion)
        conn.execute("DELETE FROM sessions WHERE token = ?", (sesion.token,))
    return {"estado": "ok", "mensaje": "Sesión cerrada"}


@app.get("/api/cuenta")
def cuenta(sesion: Sesion = Depends(usuario_actual)):
    with db.transaction() as conn:
        require_session(conn, sesion)
        row = conn.execute("SELECT u.nombre, a.saldo, a.transferido_hoy FROM accounts a "
                           "JOIN users u ON u.rut = a.user_rut WHERE a.user_rut = ?", (sesion.rut,)).fetchone()
        return {"nombre": row["nombre"], "saldo": row["saldo"],
                "transferido_hoy": row["transferido_hoy"], "limite_diario": LIMITE_DIARIO,
                "comision": COMISION, "maximo_transferencia": MAXIMO_TRANSFERENCIA}


@app.get("/api/movimientos")
def movimientos(sesion: Sesion = Depends(usuario_actual)):
    with db.transaction() as conn:
        require_session(conn, sesion)
        rows = conn.execute("SELECT comprobante, fecha, destinatario, monto, comision, saldo_resultante "
                            "FROM movements WHERE user_rut = ? ORDER BY id DESC", (sesion.rut,)).fetchall()
        return {"movimientos": [dict(row) for row in rows]}


@app.get("/api/destinatarios")
def destinatarios(sesion: Sesion = Depends(usuario_actual)):
    with db.transaction() as conn:
        require_session(conn, sesion)
        rows = conn.execute("SELECT id, rut, nombre, alias FROM recipients WHERE user_rut = ? ORDER BY id",
                            (sesion.rut,)).fetchall()
        return {"destinatarios": [dict(row) for row in rows]}


@app.post("/api/destinatarios", status_code=201)
def registrar(datos: Destinatario, sesion: Sesion = Depends(usuario_actual)):
    alias = datos.alias.strip()
    nombre = datos.nombre.strip()
    if not validar_rut(datos.rut):
        raise HTTPException(400, "RUT del destinatario inválido")
    if not 1 <= len(nombre) <= 80:
        raise HTTPException(400, "Nombre requerido: entre 1 y 80 caracteres")
    if not 3 <= len(alias) <= 30:
        raise HTTPException(400, "El alias debe tener entre 3 y 30 caracteres")
    rut = normalizar_rut(datos.rut)
    alias_key = alias.casefold()
    with db.transaction(write=True) as conn:
        require_session(conn, sesion)
        if conn.execute("SELECT 1 FROM recipients WHERE user_rut = ? AND rut = ?",
                        (sesion.rut, rut)).fetchone():
            raise HTTPException(409, "Ya existe un destinatario con ese RUT")
        if conn.execute("SELECT 1 FROM recipients WHERE user_rut = ? AND alias_key = ?",
                        (sesion.rut, alias_key)).fetchone():
            raise HTTPException(409, "Ya existe un destinatario con ese alias")
        cursor = conn.execute("INSERT INTO recipients(user_rut, rut, nombre, alias, alias_key) VALUES (?, ?, ?, ?, ?)",
                              (sesion.rut, rut, nombre, datos.alias, alias_key))
        item = {"id": cursor.lastrowid, "rut": rut, "nombre": nombre, "alias": datos.alias}
    return {"estado": "ok", "mensaje": "Destinatario guardado", "destinatario": item}


@app.post("/api/transferir")
def transferir(datos: Transferencia, sesion: Sesion = Depends(usuario_actual)):
    with db.transaction(write=True) as conn:
        require_session(conn, sesion)
        account = conn.execute("SELECT saldo, transferido_hoy FROM accounts WHERE user_rut = ?",
                               (sesion.rut,)).fetchone()
        codigo = ("DESTINATARIO_INVALIDO" if not validar_rut(datos.destinatario) else
                  validar_transferencia(datos.monto, account["saldo"], LIMITE_DIARIO, account["transferido_hoy"]))
        if codigo != "TRANSFERENCIA_OK":
            if codigo == "SALDO_INSUFICIENTE":
                conn.execute("UPDATE accounts SET transferido_hoy = transferido_hoy + ? WHERE user_rut = ?",
                             (datos.monto, sesion.rut))
            return JSONResponse(status_code=400, content={
                "estado": "error", "codigo": codigo, "mensaje": MENSAJES[codigo]})
        saldo = account["saldo"] - datos.monto - COMISION
        conn.execute("UPDATE accounts SET saldo = ?, transferido_hoy = transferido_hoy + ? WHERE user_rut = ?",
                     (saldo, datos.monto, sesion.rut))
        movement_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM movements").fetchone()[0]
        comprobante = f"TRF-{movement_id:05d}"
        conn.execute("INSERT INTO movements(id, user_rut, comprobante, fecha, destinatario, monto, comision, saldo_resultante) "
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                     (movement_id, sesion.rut, comprobante,
                      datetime.now(timezone.utc).isoformat(timespec="seconds"), normalizar_rut(datos.destinatario),
                      datos.monto, COMISION, saldo))
    return {"estado": "ok", "mensaje": MENSAJES[codigo], "comprobante": comprobante, "saldo": saldo}


@app.post("/api/lab/reset")
@app.post("/api/reset")
def reset(perfil: str = "estandar"):
    try:
        db.reset_database(perfil)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"estado": "ok", "mensaje": "Datos reiniciados; vuelva a iniciar sesión", "perfil": perfil}


app.include_router(create_security_router(usuario_actual))
