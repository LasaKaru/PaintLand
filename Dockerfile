# PaintLand game server: the built game, multiplayer rooms, leaderboard, admin panel and analytics.
#   docker run -p 8787:8787 -v paintland-data:/data -e ADMIN_PASSWORD='a long passphrase' ghcr.io/lasakaru/paintland:main
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

FROM ${NODE_IMAGE}
ENV NODE_ENV=production DATA_DIR=/data PORT=8787
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY server ./server
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8787/api/config > /dev/null || exit 1
CMD ["node", "server/relay.mjs"]
