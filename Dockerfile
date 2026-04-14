# Multi-stage build for backend and frontend

# --- Backend Build Stage ---
FROM node:22 AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY backend/ ./
RUN npm run build

# --- Frontend Build Stage ---
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# --- Production Image ---
FROM node:22-alpine AS production
WORKDIR /app

# Copy backend build
COPY --from=backend-build /app/backend /app/backend
# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
COPY --from=frontend-build /app/frontend/node_modules /app/frontend/node_modules
COPY --from=backend-build /app/backend/node_modules /app/backend/node_modules

# Expose backend port (adjust if needed)
EXPOSE 3000

# Start backend (adjust command if needed)
CMD ["node", "backend/dist/server.js"]
