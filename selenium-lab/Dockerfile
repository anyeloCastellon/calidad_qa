# Imagen unica para las apps (Flask v1 y v2) y para correr las suites (pytest).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /lab
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY app2/ app2/
COPY tests/ tests/
COPY tests2/ tests2/

EXPOSE 5000
CMD ["python", "app/app.py"]
