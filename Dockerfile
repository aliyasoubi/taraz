# One image: the React PWA is built in a Node stage and served by the FastAPI
# app as static files, so the API and the app share an origin (SameSite=Strict
# cookie, no CORS).
#
# Base images and the PyPI index are build args because some networks cannot
# reach Docker Hub or files.pythonhosted.org; point them at mirrors in .env.

ARG NODE_IMAGE=node:22-alpine
ARG PYTHON_IMAGE=python:3.12-slim

FROM ${NODE_IMAGE} AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM ${PYTHON_IMAGE} AS app
ARG PIP_INDEX_URL=https://pypi.org/simple
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ENV=production \
    DATABASE_URL=sqlite:////data/taraz.db
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --index-url "${PIP_INDEX_URL}" -r requirements.txt
COPY backend/ ./
COPY --from=web /web/dist ./static
RUN useradd --system --uid 10001 --no-create-home taraz \
    && mkdir -p /data \
    && chown taraz /data
USER taraz
VOLUME ["/data"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status != 200)"]
# Migrations run on every start: a single-instance app has no concurrent-migration
# problem, and the schema can never lag behind the code.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*' --no-server-header"]
