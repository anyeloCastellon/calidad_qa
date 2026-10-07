"""Preparar SQLite sin borrar los datos existentes."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import BUILD, initialize_database, inspect_database


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--perfil", choices=("estandar", "saldo_bajo"), default="estandar")
    args = parser.parse_args()
    initialize_database(args.perfil)
    result = inspect_database()
    if result["status"] != "ready":
        raise SystemExit("SQLite no está preparado")
    print(f"Database SQLite | Schema OK | Seed data OK | Build {BUILD}")


if __name__ == "__main__":
    main()
