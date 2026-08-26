from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from app.config import Config
from app.db import close_db, connect
from app.routes.admin import bp as admin_bp
from app.routes.auth import bp as auth_bp
from app.routes.carts import bp as carts_bp
from app.routes.checkout import bp as checkout_bp
from app.routes.health import bp as health_bp
from app.routes.products import bp as products_bp
from app.routes.reports import bp as reports_bp
from app.routes.search import bp as search_bp


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    conn = connect(app.config["DATABASE_PATH"])
    try:
        from app.seed import seed

        seed(conn)
    finally:
        conn.close()

    app.teardown_appcontext(close_db)

    for blueprint in (
        health_bp,
        products_bp,
        carts_bp,
        checkout_bp,
        auth_bp,
        admin_bp,
        search_bp,
        reports_bp,
    ):
        app.register_blueprint(blueprint)

    register_pages(app)
    register_error_handlers(app)
    return app


def register_pages(app):
    @app.route("/")
    def home():
        return render_template("index.html", active="home")

    @app.route("/productos")
    def products_page():
        return render_template("products.html", active="products")

    @app.route("/carrito")
    def cart_page():
        return render_template("cart.html", active="cart")

    @app.route("/login")
    def login_page():
        return render_template("login.html", active="login")


def register_error_handlers(app):
    def wants_json():
        return request.path.startswith("/api")

    @app.errorhandler(400)
    def bad_request(error):
        if wants_json():
            return jsonify({"error": "Solicitud invalida"}), 400
        return "Solicitud invalida", 400

    @app.errorhandler(404)
    def not_found(error):
        if wants_json():
            return jsonify({"error": "Recurso no encontrado"}), 404
        return render_template("base.html", active=""), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        if wants_json():
            return jsonify({"error": "Metodo no permitido"}), 405
        return "Metodo no permitido", 405

    @app.errorhandler(Exception)
    def unhandled(error):
        if isinstance(error, HTTPException):
            return error
        app.logger.exception("Error no controlado en %s", request.path)
        if wants_json():
            return jsonify({"error": "Internal Server Error"}), 500
        return "Internal Server Error", 500
