FROM python:3.12-alpine
RUN apk add --no-cache curl nmap nmap-scripts && pip install --no-cache-dir sqlmap==1.10.10
COPY escanear.sh /usr/local/bin/escanear
RUN chmod +x /usr/local/bin/escanear
ENTRYPOINT ["/usr/local/bin/escanear"]
