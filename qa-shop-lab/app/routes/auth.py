import uuid

from flask import Blueprint, jsonify, request

from app.db import get_db

bp = Blueprint("auth", __name__, url_prefix="/api")


def current_user(conn):
    """Devuelve el usuario asociado al token enviado, o None."""
    header = request.headers.get("Authorization", "")
    token = ""
    if header.lower().startswith("bearer "):
        token = header[7:].strip()
    if not token:
        token = request.headers.get("X-Token", "").strip()
    if not token:
        return None
    return conn.execute(
        """
        SELECT u.id, u.email, u.role
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()


@bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Se esperaba un cuerpo JSON"}), 400

    email = payload.get("email")
    password = payload.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "email y password son obligatorios"}), 400

    conn = get_db()
    user = conn.execute(
        "SELECT id, email, role FROM users WHERE email = ? AND password = ?",
        (email, password),
    ).fetchone()
    if user is None:
        return jsonify({"error": "Credenciales invalidas"}), 401

    token = uuid.uuid4().hex
    conn.execute(
        "INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"])
    )
    conn.commit()
    return (
        jsonify({"token": token, "email": user["email"], "role": user["role"]}),
        200,
    )


@bp.get("/me")
def me():
    conn = get_db()
    user = current_user(conn)
    if user is None:
        return jsonify({"error": "No autenticado"}), 401
    return jsonify({"id": user["id"], "email": user["email"], "role": user["role"]}), 200
