"""Mini-Blog QA — plataforma mínima para practicar pruebas automatizadas.

Flujos:
  - Autenticación (login/logout)
  - Publicación de una entrada
  - Comentario de un visitante + moderación por el administrador
"""
import os
import sqlite3

from flask import (Flask, flash, redirect, render_template, request, session, url_for)

app = Flask(__name__)
app.secret_key = "clave-super-secreta-123"

DB_PATH = os.path.join(os.path.dirname(__file__), "blog.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            clave TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS entradas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            cuerpo TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comentarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entrada_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            texto TEXT NOT NULL,
            estado TEXT NOT NULL
        );
        """
    )
    if not conn.execute("SELECT 1 FROM usuarios").fetchone():
        conn.execute("INSERT INTO usuarios (usuario, clave) VALUES (?, ?)", ("admin", "Admin123"))
    if not conn.execute("SELECT 1 FROM entradas").fetchone():
        conn.execute(
            "INSERT INTO entradas (titulo, cuerpo) VALUES (?, ?)",
            ("Bienvenidos al Mini-Blog", "Primera entrada de ejemplo para practicar pruebas automatizadas."),
        )
    conn.commit()
    conn.close()


@app.route("/")
def index():
    conn = get_db()
    entradas = conn.execute("SELECT * FROM entradas ORDER BY id DESC").fetchall()
    conn.close()
    return render_template("index.html", entradas=entradas)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = request.form.get("usuario", "")
        clave = request.form.get("clave", "")
        conn = get_db()
        fila = conn.execute("SELECT * FROM usuarios WHERE usuario = ?", (usuario,)).fetchone()
        conn.close()
        if fila and fila["clave"] == clave:
            session["usuario"] = usuario
            return redirect(url_for("admin"))
        flash("Credenciales inválidas", "error")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/admin")
def admin():
    if "usuario" not in session:
        return redirect(url_for("login"))
    return render_template("admin.html", usuario=session["usuario"])


@app.route("/admin/nueva-entrada", methods=["GET", "POST"])
def nueva_entrada():
    if "usuario" not in session:
        return redirect(url_for("login"))
    if request.method == "POST":
        titulo = request.form.get("titulo", "")
        cuerpo = request.form.get("cuerpo", "")
        conn = get_db()
        conn.execute("INSERT INTO entradas (titulo, cuerpo) VALUES (?, ?)", (titulo, cuerpo))
        conn.commit()
        conn.close()
        flash("Entrada publicada", "ok")
        return redirect(url_for("index"))
    return render_template("nueva_entrada.html")


@app.route("/entrada/<int:eid>", methods=["GET", "POST"])
def entrada(eid):
    conn = get_db()
    enviado = False
    if request.method == "POST":
        nombre = request.form.get("nombre", "")
        texto = request.form.get("comentario", "")
        conn.execute(
            "INSERT INTO comentarios (entrada_id, nombre, texto, estado) VALUES (?, ?, ?, ?)",
            (eid, nombre, texto, "pendiente"),
        )
        conn.commit()
        enviado = True
    fila = conn.execute("SELECT * FROM entradas WHERE id = ?", (eid,)).fetchone()
    conn.close()
    return render_template("entrada.html", entrada=fila, enviado=enviado)


@app.route("/admin/comentarios")
def admin_comentarios():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conn = get_db()
    pendientes = conn.execute(
        """SELECT c.*, e.titulo AS titulo FROM comentarios c
           JOIN entradas e ON e.id = c.entrada_id
           WHERE c.estado = 'pendiente' ORDER BY c.id DESC"""
    ).fetchall()
    conn.close()
    return render_template("admin_comentarios.html", comentarios=pendientes)


@app.route("/admin/comentarios/<int:cid>/aprobar", methods=["POST"])
def aprobar(cid):
    if "usuario" not in session:
        return redirect(url_for("login"))
    conn = get_db()
    conn.execute("UPDATE comentarios SET estado = 'aprobado' WHERE id = ?", (cid,))
    conn.commit()
    conn.close()
    return redirect(url_for("admin_comentarios"))


if __name__ == "__main__":
    init_db()
    # En Docker se escucha en 0.0.0.0 (BLOG_HOST); en local, solo 127.0.0.1.
    app.run(host=os.environ.get("BLOG_HOST", "127.0.0.1"), port=5000, debug=True)
