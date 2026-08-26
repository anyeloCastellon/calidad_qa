from flask import Blueprint, jsonify, request

from app.db import get_db
from app.models import cart_summary, find_cart, find_product

bp = Blueprint("carts", __name__, url_prefix="/api")


def _json_body():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None
    return payload


@bp.post("/carts")
def create_cart():
    conn = get_db()
    cursor = conn.execute("INSERT INTO carts (status) VALUES ('open')")
    conn.commit()
    return jsonify({"cart_id": cursor.lastrowid, "status": "open"}), 201


@bp.get("/carts/<int:cart_id>")
def get_cart(cart_id):
    conn = get_db()
    cart = find_cart(conn, cart_id)
    if cart is None:
        return jsonify({"error": "Carrito no encontrado"}), 404
    return jsonify(cart_summary(conn, cart)), 200


@bp.post("/carts/<int:cart_id>/items")
def add_item(cart_id):
    payload = _json_body()
    if payload is None:
        return jsonify({"error": "Se esperaba un cuerpo JSON"}), 400

    product_id = payload.get("product_id")
    quantity = payload.get("quantity", 1)

    if not isinstance(product_id, int) or isinstance(product_id, bool):
        return jsonify({"error": "product_id debe ser un numero entero"}), 400
    if not isinstance(quantity, int) or isinstance(quantity, bool):
        return jsonify({"error": "quantity debe ser un numero entero"}), 400

    conn = get_db()
    cart = find_cart(conn, cart_id)
    if cart is None:
        return jsonify({"error": "Carrito no encontrado"}), 404
    if cart["status"] != "open":
        return jsonify({"error": "El carrito ya fue procesado"}), 409

    product = find_product(conn, product_id)

    cursor = conn.execute(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
        (cart_id, product["id"], quantity),
    )
    conn.commit()

    summary = cart_summary(conn, cart)
    return (
        jsonify(
            {
                "message": "Producto agregado",
                "item_id": cursor.lastrowid,
                "product": product["name"],
                "quantity": quantity,
                "cart": summary,
            }
        ),
        201,
    )


@bp.delete("/carts/<int:cart_id>/items/<int:item_id>")
def delete_item(cart_id, item_id):
    conn = get_db()
    cart = find_cart(conn, cart_id)
    if cart is None:
        return jsonify({"error": "Carrito no encontrado"}), 404

    cursor = conn.execute(
        "DELETE FROM cart_items WHERE id = ? AND cart_id = ?", (item_id, cart_id)
    )
    conn.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Item no encontrado en el carrito"}), 404

    return jsonify({"message": "Item eliminado", "cart": cart_summary(conn, cart)}), 200


@bp.post("/carts/<int:cart_id>/coupon")
def apply_coupon(cart_id):
    payload = _json_body()
    if payload is None:
        return jsonify({"error": "Se esperaba un cuerpo JSON"}), 400

    code = payload.get("code")
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "code es obligatorio"}), 400
    code = code.strip().upper()

    conn = get_db()
    cart = find_cart(conn, cart_id)
    if cart is None:
        return jsonify({"error": "Carrito no encontrado"}), 404

    coupon = conn.execute(
        "SELECT code FROM coupons WHERE code = ? AND active = 1", (code,)
    ).fetchone()
    if coupon is None:
        return jsonify({"error": "Cupon invalido o inactivo"}), 400

    conn.execute("UPDATE carts SET coupon_code = ? WHERE id = ?", (code, cart_id))
    conn.commit()

    cart = find_cart(conn, cart_id)
    return jsonify({"message": "Cupon aplicado", "cart": cart_summary(conn, cart)}), 200
