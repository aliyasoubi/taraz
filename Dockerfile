# One image: the Angular app is built beside the NestJS API, and the API serves
# it (WEB_DIST), so both share an origin — same-site cookie, no CORS.
#
# The base image and the npm registry are build args because some networks
# cannot reach Docker Hub or registry.npmjs.org; point them at mirrors in .env.

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /src
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund --registry "${NPM_REGISTRY}"
COPY apps/ apps/
RUN npm run build

FROM ${NODE_IMAGE} AS app
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NODE_ENV=production \
    WEB_DIST=/app/web
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace=api --no-audit --no-fund --registry "${NPM_REGISTRY}" \
    && npm cache clean --force
COPY --from=build /src/apps/api/dist apps/api/dist
COPY --from=build /src/apps/web/dist/web/browser web
USER node
EXPOSE 3400
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3400/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# Migrations run on every start: a single instance has no concurrent-migration
# problem, and the schema can never lag behind the code.
CMD ["sh", "-c", "node apps/api/dist/database/run-migrations.js run && exec node apps/api/dist/main.js"]
