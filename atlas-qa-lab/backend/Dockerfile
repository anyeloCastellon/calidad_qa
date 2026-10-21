FROM node:22-bookworm-slim
WORKDIR /srv
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node sql ./sql
COPY --chown=node:node tests ./tests
RUN mkdir -p /srv/storage && chown node:node /srv/storage
USER node
EXPOSE 3443
CMD ["node", "src/server.js"]
