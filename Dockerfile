# syntax=docker/dockerfile:1
FROM node:20-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-slim AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-deps /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-build /app/backend/dist /app/backend/dist
COPY --from=backend-build /app/backend/package*.json /app/backend/
COPY --from=backend-build /app/backend/migrations /app/backend/migrations
COPY --from=frontend-build /app/frontend/dist /app/backend/dist/public
EXPOSE 4004
CMD ["node", "backend/dist/index.js"]
