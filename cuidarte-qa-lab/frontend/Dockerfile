FROM node:22-bookworm-slim AS build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM caddy:2-alpine
COPY --from=build /build/dist /srv
COPY ops/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
