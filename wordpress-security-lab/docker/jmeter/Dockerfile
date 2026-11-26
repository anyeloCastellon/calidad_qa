# Apache JMeter sin interfaz grafica, para las pruebas de carga/estres (actividad 3.4).
FROM eclipse-temurin:21-jre

ARG JMETER_VERSION=5.6.3
ARG JMETER_URL=https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL -o /tmp/jmeter.tgz "${JMETER_URL}" \
 && curl -fsSL -o /tmp/jmeter.tgz.sha512 "${JMETER_URL}.sha512" \
 && echo "$(cut -d' ' -f1 /tmp/jmeter.tgz.sha512)  /tmp/jmeter.tgz" | sha512sum -c - \
 && tar -xzf /tmp/jmeter.tgz -C /opt \
 && ln -s /opt/apache-jmeter-${JMETER_VERSION} /opt/jmeter \
 && rm -rf /tmp/jmeter.tgz* /var/lib/apt/lists/*

ENV PATH=/opt/jmeter/bin:$PATH \
    JVM_ARGS="-Xms512m -Xmx1g"
WORKDIR /pruebas
ENTRYPOINT ["jmeter"]
