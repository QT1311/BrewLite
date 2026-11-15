# Image cho NestJS API. Build từ thư mục gốc monorepo:  docker build -f apps/api/Dockerfile .

# 1) Cài toàn bộ dependency của workspace api (gồm devDependencies để build)
FROM node:22-alpine AS deps
# Tăng độ bền khi tải package qua mạng chậm/không ổn định
ENV npm_config_fetch_retries=5 npm_config_fetch_retry_mintimeout=20000 npm_config_fetch_retry_maxtimeout=120000 npm_config_fetch_timeout=600000
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api

# 2) Biên dịch TypeScript sang dist/
FROM deps AS build
COPY apps/api apps/api
RUN npm run build --workspace apps/api

# 3) Image chạy thật: chỉ dependency production, chạy bằng user không phải root
FROM node:22-alpine AS runner
# Tăng độ bền khi tải package qua mạng chậm/không ổn định
ENV npm_config_fetch_retries=5 npm_config_fetch_retry_mintimeout=20000 npm_config_fetch_retry_maxtimeout=120000 npm_config_fetch_timeout=600000
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --omit=dev && npm cache clean --force
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
ARG GIT_SHA=dev
ENV APP_VERSION=$GIT_SHA
ENV API_PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${API_PORT}/health >/dev/null || exit 1
CMD ["node", "dist/main.js"]
