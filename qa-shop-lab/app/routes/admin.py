from flask import Blueprint, jsonify

from app.db import get_db
from app.routes.auth import current_user

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/orders")
def list_orders():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT o.id, o.cart_id, o.user_id, o.subtotal, o.discount, o.total,
               o.created_at, u.email AS user_email
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.id DESC
        """
    ).fetchall()

    orders = []
    for row in rows:
        items = conn.execute(
            """
            SELECT oi.product_id, oi.quantity, oi.unit_price, p.name
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.id
            """,
            (row["id"],),
        ).fetchall()
        orders.append(
            {
                "id": row["id"],
                "cart_id": row["cart_id"],
                "user_id": row["user_id"],
                "user_email": row["user_email"],
                "subtotal": row["subtotal"],
                "discount": row["discount"],
                "total": row["total"],
                "created_at": row["created_at"],
                "items": [
                    {
                        "product_id": i["product_id"],
                        "name": i["name"],
                        "quantity": i["quantity"],
                        "unit_price": i["unit_price"],
                    }
                    for i in items
                ],
            }
        )

    return jsonify({"count": len(orders), "orders": orders}), 200


@bp.get("/stats")
def stats():
    conn = get_db()
    user = current_user(conn)
    if user is None:
        return jsonify({"error": "No autenticado"}), 401
    if user["role"] != "admin":
        return jsonify({"error": "Se requiere perfil de administrador"}), 403

    row = conn.execute(
        "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders"
    ).fetchone()
    products = conn.execute("SELECT COUNT(*) AS n FROM products").fetchone()["n"]
    return (
        jsonify(
            {
                "orders": row["orders"],
                "revenue": row["revenue"],
                "products": products,
                "requested_by": user["email"],
            }
        ),
        200,
    )
