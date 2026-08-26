"""Creacion e inicializacion de la base de datos del laboratorio."""

import os

from app.config import Config
from app.db import connect
from app.models import ensure_schema

PRODUCTS = [
    (1, "Notebook Gamer", 850000, 15),
    (2, "Mouse Gamer", 25000, 30),
    (3, "Teclado Mecanico", 65000, 10),
    (4, "Monitor 27", 220000, 5),
    (5, "Audifonos USB", 45000, 20),
]

USERS = [
    (1, "cliente@example.com", "cliente123", "customer"),
    (2, "admin@example.com", "admin123", "admin"),
]

COUPONS = [
    ("DUOC10", 10, 1),
]


def seed(conn):
    ensure_schema(conn)

    already = conn.execute("SELECT COUNT(*) AS n FROM products").fetchone()["n"]
    if already:
        return False

    conn.executemany(
        "INSERT INTO products (id, name, price, stock) VALUES (?, ?, ?, ?)",
        PRODUCTS,
    )
    conn.executemany(
        "INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)",
        USERS,
    )
    conn.executemany(
        "INSERT INTO coupons (code, discount_percent, active) VALUES (?, ?, ?)",
        COUPONS,
    )
    conn.commit()
    return True


def main():
    path = os.environ.get("DATABASE_PATH", Config.DATABASE_PATH)
    conn = connect(path)
    try:
        created = seed(conn)
    finally:
        conn.close()
    if created:
        print("[seed] Base creada y poblada en {}".format(path))
    else:
        print("[seed] Base existente conservada en {}".format(path))


if __name__ == "__main__":
    main()
