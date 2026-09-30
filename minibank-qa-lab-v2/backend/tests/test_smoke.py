import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        c.post("/api/reset")
        yield c

def autenticar(client):
    response = client.post("/api/login", json={"rut": "11.111.111-1", "clave": "1234"})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}

def test_health(client):
    assert client.get("/api/health").json()["estado"] == "ok"

def test_login(client):
    headers = autenticar(client)
    assert client.get("/api/cuenta", headers=headers).json()["saldo"] == 2_000_000
    assert client.post("/api/login", json={"rut": "11.111.111-1", "clave": "incorrecta"}).status_code == 401

def test_transferencia_normal(client):
    headers = autenticar(client)
    result = client.post("/api/transferir", headers=headers, json={"destinatario": "12.345.678-5", "monto": 100_000})
    assert result.status_code == 200
    assert result.json()["saldo"] == 1_899_700

def test_rut_invalido(client):
    headers = autenticar(client)
    assert client.post("/api/transferir", headers=headers,
                       json={"destinatario": "12.345.678-0", "monto": 1000}).status_code == 400

def test_registro_normal(client):
    headers = autenticar(client)
    assert client.post("/api/destinatarios", headers=headers,
                       json={"rut": "12.345.678-5", "nombre": "Ana", "alias": "Casa"}).status_code == 201
    assert len(client.get("/api/destinatarios", headers=headers).json()["destinatarios"]) == 1

def test_cierre_y_reset(client):
    headers = autenticar(client)
    assert client.post("/api/logout", headers=headers).status_code == 200
    assert client.get("/api/cuenta", headers=headers).status_code == 401
    headers = autenticar(client)
    client.post("/api/reset")
    assert client.get("/api/cuenta", headers=headers).status_code == 401
    assert client.get("/api/cuenta", headers=autenticar(client)).json()["transferido_hoy"] == 0

