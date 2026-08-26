import time

from flask import Blueprint, current_app, jsonify

from app.db import get_db

bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _build_inventory_snapshot(rows):
    """Valoriza el inventario producto por producto."""
    snapshot = []
    per_item = current_app.config["REPORT_SYNC_DELAY"] / max(len(rows), 1)
    for row in rows:
        time.sleep(per_item)
        snapshot.append(
            {
                "product_id": row["id"],
                "name": row["name"],
                "stock": row["stock"],
                "unit_price": row["price"],
                "stock_value": row["price"] * row["stock"],
            }
        )
    return snapshot


@bp.get("/summary")
def summary():
    started = time.time()
    conn = get_db()

    rows = conn.execute(
        "SELECT id, name, price, stock FROM products ORDER BY id"
    ).fetchall()

    inventory = _build_inventory_snapshot(rows)

    sales = conn.execute(
        "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders"
    ).fetchone()

    return (
        jsonify(
            {
                "generated_in_ms": int((time.time() - started) * 1000),
                "orders": sales["orders"],
                "revenue": sales["revenue"],
                "total_stock_value": sum(i["stock_value"] for i in inventory),
                "inventory": inventory,
            }
        ),
        200,
    )
