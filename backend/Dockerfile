# ============================================================================
# CAMPUSNEX BACKEND SERVICE CONTAINERIZATION (PRODUCTION GRADE)
# ============================================================================

FROM node:18-alpine

# Set build and runtime environment
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy remaining server code
COPY . .

# Expose WebSockets and REST API port
EXPOSE 5000

# Execute server process
CMD ["node", "server.js"]
