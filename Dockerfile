# =============================================================================
# iBar - Multi-stage Docker build
# Stage 1: Build frontend (React/Vite)
# Stage 2: Production runtime (Node.js/Express + built frontend)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build frontend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build/frontend

# Install frontend dependencies (cached layer)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies (cached layer)
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=builder /build/frontend/dist ./frontend/dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create runtime directories and non-root user
RUN mkdir -p /app/backend/uploads /app/logs \
    && addgroup -S ibar \
    && adduser -S ibar -G ibar \
    && chown -R ibar:ibar /app

USER ibar

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
