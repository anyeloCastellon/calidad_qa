"""TaskFlow QA - Version 2 del laboratorio de automatizacion (Actividad 3.3).

Gestor de tareas con interfaz moderna. Pensado para practicar tecnicas de
Selenium mas alla de "escribir y hacer clic": listas desplegables, radios,
validaciones, contenido dinamico (JavaScript + fetch), modales y avisos que
desaparecen.

Todos los elementos interactivos tienen un atributo data-testid estable.
"""
import os
import secrets
import sqlite3
from functools import wraps

from flask import (Flask, flash, g, jsonify, redirect, render_template,
                   request, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("TASKFLOW_SECRET", secrets.token_hex(16))

DB_PATH = os.path.join(os.path.dirname(__file__), "taskflow.db")
PRIORIDADES = ["Alta", "Media", "Baja"]
CATEGORIAS = ["Trabajo", "Estudio", "Personal"]
MAX_TITULO = 60

TAREAS_INICIALES = [
    ("Preparar informe de pruebas", "Consolidar resultados del sprint.", "Alta", "Trabajo", 0),
    ("Revisar casos de regresion", "Priorizar los flujos criticos.", "Media", "Trabajo", 0),
    ("Estudiar selectores CSS", "Practicar con data-testid.", "Media", "Estudio", 0),
    ("Actualizar documentacion", "README del proyecto.", "Baja", "Trabajo", 0),
    ("Corregir bug de login", "El mensaje de error no aparece.", "Alta", "Trabajo", 0),
    ("Configurar pipeline CI", "Agregar la etapa de pruebas.", "Alta", "Trabajo", 1),
    ("Comprar cafe para el equipo", "", "Baja", "Personal", 1),
]


# --------------------------------------------------------------------------- BD
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        DROP TABLE IF EXISTS usuarios;
        DROP TABLE IF EXISTS tareas;
        CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY,
            usuario TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            clave_hash TEXT NOT NULL
        );
        CREATE TABLE tareas (
            id INTEGER PRIMARY KEY,
            titulo TEXT NOT NULL,
            descripcion TEXT NOT NULL DEFAULT '',
            prioridad TEXT NOT NULL,
            categoria TEXT NOT NULL,
            completada INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    conn.execute(
        "INSERT INTO usuarios (usuario, nombre, clave_hash) VALUES (?, ?, ?)",
        ("admin", "Admin", generate_password_hash("Admin123")),
    )
    conn.executemany(
        "INSERT INTO tareas (titulo, descripcion, prioridad, categoria, completada)"
        " VALUES (?, ?, ?, ?, ?)",
        TAREAS_INICIALES,
    )
    conn.commit()
    conn.close()


# ------------------------------------------------------------------ utilidades
def login_requerido(vista):
    @wraps(vista)
    def envoltura(*args, **kwargs):
        if "usuario" not in session:
            return redirect(url_for("login"))
        return vista(*args, **kwargs)
    return envoltura


def contadores(db):
    fila = db.execute(
        "SELECT SUM(completada = 0) AS pendientes, SUM(completada = 1) AS completadas"
        " FROM tareas"
    ).fetchone()
    return {"pendientes": fila["pendientes"] or 0, "completadas": fila["completadas"] or 0}


def validar_tarea(form):
    errores = {}
    titulo = form.get("titulo", "").strip()
    if not titulo:
        errores["titulo"] = "El titulo es obligatorio."
    elif len(titulo) > MAX_TITULO:
        errores["titulo"] = f"El titulo no puede superar {MAX_TITULO} caracteres."
    if form.get("prioridad") not in PRIORIDADES:
        errores["prioridad"] = "Selecciona una prioridad."
    if form.get("categoria") not in CATEGORIAS:
        errores["categoria"] = "Selecciona una categoria."
    return errores


# ---------------------------------------------------------------------- rutas
@app.route("/")
def inicio():
    return redirect(url_for("tablero" if "usuario" in session else "login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()
        clave = request.form.get("clave", "")
        fila = get_db().execute(
            "SELECT * FROM usuarios WHERE usuario = ?", (usuario,)
        ).fetchone()
        if fila and check_password_hash(fila["clave_hash"], clave):
            session.clear()
            session["usuario"] = fila["usuario"]
            session["nombre"] = fila["nombre"]
            return redirect(url_for("tablero"))
        error = "Usuario o clave incorrectos."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/tareas")
@login_requerido
def tablero():
    db = get_db()
    tareas = db.execute("SELECT * FROM tareas ORDER BY id DESC").fetchall()
    return render_template(
        "tablero.html",
        pendientes=[t for t in tareas if not t["completada"]],
        completadas=[t for t in tareas if t["completada"]],
        contadores=contadores(db),
        prioridades=PRIORIDADES,
    )


@app.route("/tareas/nueva", methods=["GET", "POST"])
@login_requerido
def nueva_tarea():
    errores, datos = {}, {}
    if request.method == "POST":
        datos = request.form
        errores = validar_tarea(datos)
        if not errores:
            db = get_db()
            db.execute(
                "INSERT INTO tareas (titulo, descripcion, prioridad, categoria)"
                " VALUES (?, ?, ?, ?)",
                (datos["titulo"].strip(), datos.get("descripcion", "").strip(),
                 datos["prioridad"], datos["categoria"]),
            )
            db.commit()
            flash("Tarea creada correctamente.")
            return redirect(url_for("tablero"))
    return render_template(
        "nueva.html", errores=errores, datos=datos,
        prioridades=PRIORIDADES, categorias=CATEGORIAS, max_titulo=MAX_TITULO,
    )


@app.route("/api/tareas/<int:tid>/completar", methods=["POST"])
@login_requerido
def api_completar(tid):
    db = get_db()
    fila = db.execute("SELECT completada FROM tareas WHERE id = ?", (tid,)).fetchone()
    if fila is None:
        return jsonify(error="No existe la tarea."), 404
    nuevo = 0 if fila["completada"] else 1
    db.execute("UPDATE tareas SET completada = ? WHERE id = ?", (nuevo, tid))
    db.commit()
    return jsonify(id=tid, completada=bool(nuevo), **contadores(db))


@app.route("/api/tareas/<int:tid>", methods=["DELETE"])
@login_requerido
def api_eliminar(tid):
    db = get_db()
    cur = db.execute("DELETE FROM tareas WHERE id = ?", (tid,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify(error="No existe la tarea."), 404
    return jsonify(id=tid, **contadores(db))


if __name__ == "__main__":
    init_db()
    app.run(host=os.environ.get("BLOG_HOST", "127.0.0.1"), port=5000, debug=False)
