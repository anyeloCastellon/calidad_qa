FROM alpine:3.22
RUN apk add --no-cache openssl
COPY create.sh /usr/local/bin/cuidarte-certificates
RUN sed -i 's/\r$//' /usr/local/bin/cuidarte-certificates && chmod 755 /usr/local/bin/cuidarte-certificates
ENTRYPOINT ["sh", "/usr/local/bin/cuidarte-certificates"]
