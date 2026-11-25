# Imagen unica para la app (Flask) y para correr la suite de pruebas (pytest).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /lab
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY tests/ tests/

EXPOSE 5000
CMD ["python", "app/app.py"]
