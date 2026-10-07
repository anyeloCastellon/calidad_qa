"""Restaurar el perfil elegido e invalidar las sesiones."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import initialize_database, reset_database


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--perfil", choices=("estandar", "saldo_bajo"), default="estandar")
    args = parser.parse_args()
    initialize_database(args.perfil)
    reset_database(args.perfil)
    print(f"Dataset restaurado: {args.perfil}; sesiones invalidadas")


if __name__ == "__main__":
    main()
