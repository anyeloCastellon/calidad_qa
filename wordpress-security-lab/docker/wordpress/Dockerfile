FROM wordpress:cli-php8.3@sha256:661db880e953da051abcac6c0a769767b995a82cd52101c003ca7438dd427d7d AS cli
FROM wordpress:7.1.3-php8.3-apache@sha256:8901759bfbb7ebc567dbc44a244c0d96d720d0a67c17bc4f42ec355ddba2e863
COPY --from=cli /usr/local/bin/wp /usr/local/bin/wp
COPY site/wordpress/ /usr/src/wordpress/
COPY docker/wordpress/config-extra.php docker/wordpress/seed.sh docker/wordpress/seed.php docker/wordpress/reset.php /opt/lab/
RUN sed -i 's/\r$//' /opt/lab/seed.sh && chmod 755 /opt/lab/seed.sh
