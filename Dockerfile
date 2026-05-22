# ============================================================================
# CAMPUSNEX ROOT CONTAINERIZATION (UNIFIED BACKEND & SaaS PORTAL)
# ============================================================================

FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker layer caching
COPY backend/package*.json ./backend/

# Install production dependencies for the backend
RUN cd backend && npm ci --only=production

# Final running stage
FROM node:18-alpine

# Set build and runtime environment
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /usr/src/app

# Copy built node_modules
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules

# Copy backend application source
COPY backend/ ./backend/

# Copy sibling static SaaS portal assets
COPY saas_portal/ ./saas_portal/

# Expose HTTP, WebSockets, and REST API port
EXPOSE 5000

# Execute server process
CMD ["node", "backend/server.js"]
