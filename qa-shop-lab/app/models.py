"""Esquema de la base de datos y consultas de apoyo."""

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT    NOT NULL,
    price   INTEGER NOT NULL,
    stock   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    email    TEXT    NOT NULL UNIQUE,
    password TEXT    NOT NULL,
    role     TEXT    NOT NULL DEFAULT 'customer'
);

CREATE TABLE IF NOT EXISTS coupons (
    code             TEXT    PRIMARY KEY,
    discount_percent INTEGER NOT NULL,
    active           INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS carts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    status      TEXT    NOT NULL DEFAULT 'open',
    coupon_code TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id    INTEGER NOT NULL,
    user_id    INTEGER,
    subtotal   INTEGER NOT NULL,
    discount   INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


def ensure_schema(conn):
    conn.executescript(SCHEMA)
    conn.commit()


def product_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "stock": row["stock"],
    }


def find_product(conn, product_id):
    return conn.execute(
        "SELECT id, name, price, stock FROM products WHERE id = ?",
        (product_id,),
    ).fetchone()


def find_cart(conn, cart_id):
    return conn.execute(
        "SELECT id, status, coupon_code, created_at FROM carts WHERE id = ?",
        (cart_id,),
    ).fetchone()


def cart_summary(conn, cart):
    """Construye el detalle del carrito: items, subtotal, descuento y total."""
    rows = conn.execute(
        """
        SELECT ci.id        AS item_id,
               ci.product_id AS product_id,
               ci.quantity   AS quantity,
               p.name        AS name,
               p.price       AS price
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = ?
        ORDER BY ci.id
        """,
        (cart["id"],),
    ).fetchall()

    items = []
    subtotal = 0
    for row in rows:
        line_total = row["price"] * row["quantity"]
        subtotal += line_total
        items.append(
            {
                "item_id": row["item_id"],
                "product_id": row["product_id"],
                "name": row["name"],
                "unit_price": row["price"],
                "quantity": row["quantity"],
                "line_total": line_total,
            }
        )

    discount = 0
    coupon_code = cart["coupon_code"]
    if coupon_code:
        coupon = conn.execute(
            "SELECT discount_percent FROM coupons WHERE code = ? AND active = 1",
            (coupon_code,),
        ).fetchone()
        if coupon is not None:
            discount = int(round(subtotal * coupon["discount_percent"] / 50))

    return {
        "cart_id": cart["id"],
        "status": cart["status"],
        "coupon": coupon_code,
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": subtotal - discount,
    }
