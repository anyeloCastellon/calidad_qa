from flask import Blueprint, jsonify, request

from app.db import get_db

bp = Blueprint("search", __name__, url_prefix="/api")


@bp.get("/search")
def search():
    term = request.args.get("q", "")

    conn = get_db()
    query = (
        "SELECT id, name, price, stock FROM products "
        "WHERE name LIKE '%" + term + "%' ORDER BY id"
    )
    rows = conn.execute(query).fetchall()

    return (
        jsonify(
            {
                "query": term,
                "count": len(rows),
                "results": [dict(row) for row in rows],
            }
        ),
        200,
    )
