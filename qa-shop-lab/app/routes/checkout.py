from flask import Blueprint, jsonify, request

from app.db import get_db
from app.models import cart_summary, find_cart
from app.routes.auth import current_user

bp = Blueprint("checkout", __name__, url_prefix="/api")


@bp.post("/checkout")
def checkout():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Se esperaba un cuerpo JSON"}), 400

    cart_id = payload.get("cart_id")
    if not isinstance(cart_id, int) or isinstance(cart_id, bool):
        return jsonify({"error": "cart_id debe ser un numero entero"}), 400

    conn = get_db()
    cart = find_cart(conn, cart_id)
    if cart is None:
        return jsonify({"error": "Carrito no encontrado"}), 404
    if cart["status"] != "open":
        return jsonify({"error": "El carrito ya fue procesado"}), 409

    summary = cart_summary(conn, cart)
    user = current_user(conn)
    user_id = user["id"] if user is not None else None

    cursor = conn.execute(
        """
        INSERT INTO orders (cart_id, user_id, subtotal, discount, total)
        VALUES (?, ?, ?, ?, ?)
        """,
        (cart_id, user_id, summary["subtotal"], summary["discount"], summary["total"]),
    )
    order_id = cursor.lastrowid

    for item in summary["items"]:
        conn.execute(
            """
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?)
            """,
            (order_id, item["product_id"], item["quantity"], item["unit_price"]),
        )

    conn.execute("UPDATE carts SET status = 'checked_out' WHERE id = ?", (cart_id,))
    conn.commit()

    return (
        jsonify(
            {
                "message": "Compra realizada",
                "order_id": order_id,
                "cart_id": cart_id,
                "items": len(summary["items"]),
                "subtotal": summary["subtotal"],
                "discount": summary["discount"],
                "total": summary["total"],
            }
        ),
        201,
    )
