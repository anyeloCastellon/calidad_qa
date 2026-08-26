"""Escenario de carga para QA Shop.

Uso con Docker Compose:
    docker compose --profile performance up --build
    Interfaz web de Locust: http://localhost:8089
    Host objetivo por defecto: http://app:5000
"""

from locust import HttpUser, between, task


class ShopVisitor(HttpUser):
    """Visitante que navega el catalogo de la tienda."""

    wait_time = between(1, 3)

    @task(5)
    def browse_catalog(self):
        self.client.get("/api/products", name="GET /api/products")

    @task(2)
    def open_product(self):
        self.client.get("/api/products/1", name="GET /api/products/:id")

    @task(1)
    def check_health(self):
        self.client.get("/api/health", name="GET /api/health")
