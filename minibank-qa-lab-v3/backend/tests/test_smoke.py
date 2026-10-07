"""Comprobaciones públicas de preparación y disponibilidad del laboratorio."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("MINIBANK_DB_PATH", str(tmp_path / "smoke.db"))
    with TestClient(app) as current:
        yield current


def autenticar(client):
    response = client.post("/api/login", json={"rut": "11.111.111-1", "clave": "1234"})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def test_health_y_build(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"estado": "ok", "version": "3.0.0", "build": "3.0.0-rc1"}


def test_status_real(client, monkeypatch, tmp_path):
    assert client.get("/api/lab/status").json()["status"] == "ready"
    monkeypatch.setenv("MINIBANK_DB_PATH", str(tmp_path / "no-existe.db"))
    response = client.get("/api/lab/status")
    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert not (tmp_path / "no-existe.db").exists()


def test_esquema_sqlite(client):
    with sqlite3.connect(db.get_db_path()) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"users", "accounts", "sessions", "recipients", "movements"} <= tables
    assert client.get("/api/lab/status").json()["schema"] == "ready"


def test_dataset_cargado(client):
    response = client.get("/api/lab/status")
    assert response.json()["seed"] == "loaded"
    with sqlite3.connect(db.get_db_path()) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0] == 1


def test_login_disponible(client):
    headers = autenticar(client)
    assert headers["Authorization"].startswith("Bearer ")
    assert client.get("/api/cuenta", headers=headers).status_code == 200


def test_cuenta_inicial(client):
    response = client.get("/api/cuenta", headers=autenticar(client))
    assert response.status_code == 200
    assert response.json()["saldo"] == 2_000_000
    assert response.json()["transferido_hoy"] == 0


def test_reset_estandar(client):
    headers = autenticar(client)
    response = client.post("/api/reset?perfil=estandar")
    assert response.status_code == 200
    assert client.get("/api/cuenta", headers=headers).status_code == 401
    assert client.get("/api/cuenta", headers=autenticar(client)).json()["saldo"] == 2_000_000


def test_reset_saldo_bajo(client):
    response = client.post("/api/lab/reset?perfil=saldo_bajo")
    assert response.status_code == 200
    assert client.get("/api/cuenta", headers=autenticar(client)).json()["saldo"] == 500_000
    assert client.get("/api/lab/status").json()["perfil"] == "saldo_bajo"
