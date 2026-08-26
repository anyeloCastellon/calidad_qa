from flask import Blueprint, jsonify

from app.db import get_db
from app.models import find_product, product_to_dict

bp = Blueprint("products", __name__, url_prefix="/api")


@bp.get("/products")
def list_products():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, price, stock FROM products ORDER BY id"
    ).fetchall()
    return jsonify([product_to_dict(row) for row in rows]), 200


@bp.get("/products/<int:product_id>")
def get_product(product_id):
    conn = get_db()
    row = find_product(conn, product_id)
    if row is None:
        return jsonify({"error": "Producto no encontrado"}), 404
    return jsonify(product_to_dict(row)), 200
