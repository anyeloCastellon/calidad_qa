"""Cargar el usuario y cuenta de demostración sin reemplazar datos."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import initialize_database, inspect_database, seed_database


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--perfil", choices=("estandar", "saldo_bajo"), default="estandar")
    args = parser.parse_args()
    initialize_database(args.perfil)
    seed_database(args.perfil)
    if inspect_database()["status"] != "ready":
        raise SystemExit("No fue posible verificar el dataset")
    print("Seed data OK")


if __name__ == "__main__":
    main()
