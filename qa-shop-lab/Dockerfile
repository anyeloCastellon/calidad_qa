FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY performance /app/performance
COPY wsgi.py /app/wsgi.py
COPY entrypoint.sh /app/entrypoint.sh

RUN python -c "p='/app/entrypoint.sh'; d=open(p,'rb').read().replace(b'\r\n', b'\n'); open(p,'wb').write(d)" \
    && chmod +x /app/entrypoint.sh \
    && mkdir -p /app/data

ENV DATABASE_PATH=/app/data/qa_shop.db

EXPOSE 5000

CMD ["/app/entrypoint.sh"]
