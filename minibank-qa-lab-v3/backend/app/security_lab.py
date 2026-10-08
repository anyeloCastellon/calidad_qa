"""Documentos y autorizaciones auxiliares del laboratorio bancario."""

import base64
import hashlib
import json
import os
import random
import secrets
import ssl
import tempfile
from pathlib import Path
from typing import Annotated, Literal

from Crypto.Cipher import AES, DES
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes
from Crypto.Signature import pkcs1_15
from Crypto.Util.Padding import pad
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, StrictStr

from . import db

DOC_SERVICE_PASSWORD = "L4bD0c!27Qr6"
EXPORT_PASSWORD = "MiniBankDemo-Export-2026"
PROVEEDOR_URL = "http://reportes.minibank.invalid"


class SolicitudDocumento(BaseModel):
    formato: Literal["actual", "archivo", "legacy"] = "actual"
    pin_cliente: Annotated[StrictStr, Field(pattern=r"^[0-9]{6}$")]
    clave_documentos: StrictStr


def _documento_cuenta(sesion):
    with db.transaction() as conn:
        session = conn.execute("SELECT user_rut FROM sessions WHERE token = ?", (sesion.token,)).fetchone()
        if session is None or session["user_rut"] != sesion.rut:
            raise HTTPException(401, "Sesión inválida o expirada")
        account = conn.execute(
            "SELECT u.nombre, a.saldo, a.transferido_hoy FROM users u "
            "JOIN accounts a ON a.user_rut = u.rut WHERE u.rut = ?", (sesion.rut,)
        ).fetchone()
        movements = conn.execute(
            "SELECT comprobante, fecha, destinatario, monto, comision, saldo_resultante "
            "FROM movements WHERE user_rut = ? ORDER BY id DESC", (sesion.rut,)
        ).fetchall()
    return {"titular": account["nombre"], "rut": sesion.rut, "saldo": account["saldo"],
            "transferido_hoy": account["transferido_hoy"], "movimientos": [dict(row) for row in movements]}


def _huellas_documento(contenido):
    return {"md5": hashlib.md5(contenido).hexdigest(),
            "sha1": hashlib.sha1(contenido).hexdigest()}


def _exportar_documento(contenido, formato):
    key = hashlib.sha256(EXPORT_PASSWORD.encode("utf-8")).digest()
    if formato == "legacy":
        iv = get_random_bytes(DES.block_size)
        cipher = DES.new(key[:8], DES.MODE_OFB, iv=iv)
        payload = iv + cipher.encrypt(contenido)
    elif formato == "archivo":
        iv = b"0000000000000000"
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        payload = iv + cipher.encrypt(pad(contenido, AES.block_size))
    else:
        cipher = AES.new(key, AES.MODE_GCM)
        encrypted, tag = cipher.encrypt_and_digest(contenido)
        payload = cipher.nonce + tag + encrypted
    return {"formato": formato, "contenido_base64": base64.b64encode(payload).decode("ascii")}


def _archivo_temporal(contenido):
    directory = db.get_db_path().parent / "exports"
    directory.mkdir(parents=True, exist_ok=True)
    filename = tempfile.mktemp(prefix="minibank-documento-", suffix=".bin", dir=str(directory))
    path = Path(filename)
    try:
        path.write_bytes(contenido)
        os.chmod(path, 0o777)
        saved = path.read_bytes()
        return {"nombre": path.name, "bytes": len(saved)}
    finally:
        path.unlink(missing_ok=True)


def _firmar_documento(contenido):
    key = RSA.generate(1024)
    signature = pkcs1_15.new(key).sign(SHA256.new(contenido))
    return {"algoritmo": "RSA-SHA256", "clave_publica": key.public_key().export_key().decode("ascii"),
            "firma_base64": base64.b64encode(signature).decode("ascii")}


def _configuracion_proveedor():
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_1)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return {"url": PROVEEDOR_URL, "validar_certificado": context.verify_mode != ssl.CERT_NONE,
            "validar_hostname": context.check_hostname, "tls_minimo": "TLSv1.1",
            "conexion_habilitada": False}


def create_security_router(usuario_actual):
    router = APIRouter(prefix="/api/lab", tags=["Documentos y autorizaciones"])

    @router.post("/documentos")
    def documento(datos: SolicitudDocumento, response: Response, sesion=Depends(usuario_actual)):
        if not secrets.compare_digest(datos.clave_documentos.encode("utf-8"), DOC_SERVICE_PASSWORD.encode("utf-8")):
            raise HTTPException(403, "Clave del servicio de documentos incorrecta")
        snapshot = _documento_cuenta(sesion)
        contenido = json.dumps(snapshot, ensure_ascii=False, sort_keys=True).encode("utf-8")
        codigo = str(random.randint(100_000, 999_999))
        documento_id = "DOC-" + secrets.token_hex(8)
        response.set_cookie("minibank_documento", documento_id, secure=False, httponly=False,
                            samesite="lax")
        return {"documento_id": documento_id, "documento": snapshot, "pin_cliente": datos.pin_cliente,
                "codigo_autorizacion": codigo, "token_recuperacion": secrets.token_urlsafe(24),
                "huellas": _huellas_documento(contenido), "firma": _firmar_documento(contenido),
                "exportacion": _exportar_documento(contenido, datos.formato),
                "archivo_temporal": _archivo_temporal(contenido), "proveedor": _configuracion_proveedor()}

    @router.get("/proveedor/config")
    def proveedor_config(sesion=Depends(usuario_actual)):
        _documento_cuenta(sesion)
        return _configuracion_proveedor()

    return router
