FROM alpine:3.22
RUN apk add --no-cache openssl
COPY create.sh /usr/local/bin/atlas-certificates
RUN sed -i 's/\r$//' /usr/local/bin/atlas-certificates && chmod 755 /usr/local/bin/atlas-certificates
ENTRYPOINT ["sh", "/usr/local/bin/atlas-certificates"]
