FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
ARG BUILD_CA_CERT
RUN if [ -n "$BUILD_CA_CERT" ]; then \
      printf '%s\n' "$BUILD_CA_CERT" > /tmp/build-ca.crt; \
      export NODE_EXTRA_CA_CERTS=/tmp/build-ca.crt; \
    fi; \
    npm ci --no-audit --no-fund && rm -f /tmp/build-ca.crt
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN BASE_PATH=/ npm run build

FROM python:3.12-slim-bookworm
WORKDIR /app
COPY --from=frontend /app/dist ./dist
COPY app.py main.py requirements.txt ./
RUN chmod -R a+rX /app
ENV PYTHONUNBUFFERED=1 PORT=3000 BASE_PATH=/
EXPOSE 3000
USER 65532:65532
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:' + __import__('os').environ.get('PORT', '3000') + '/healthz', timeout=4).read()"]
CMD ["python", "app.py"]
