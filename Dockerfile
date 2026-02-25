# Stage 1: Build
# check-ignore=critical_high_vulnerabilities
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies separately for cache
COPY package*.json ./
RUN npm ci

# Copy source, generate Prisma client, then build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
# check-ignore=critical_high_vulnerabilities
FROM node:22-alpine
WORKDIR /app

# Install runtime utilities (prisma for migrations, tsx for server, curl for healthcheck)
RUN npm install -g prisma tsx
RUN apk add --no-cache curl

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and necessary source files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
# Default database location inside the container volume
ENV DATABASE_URL="file:/app/data/dev.db"

RUN mkdir -p /app/data /app/uploads/entries

EXPOSE 3001

# Initialize DB (migrate), seed categories if empty, and start server
# Safety check: detect if /app/data volume is missing (DB would be wiped every deploy)
CMD ["sh", "-c", "\
  if [ ! -f /app/data/dev.db ]; then \
    echo '========================================'; \
    echo 'WARNING: No existing database found at /app/data/dev.db'; \
    echo 'If this is production, a persistent volume MUST be mounted at /app/data'; \
    echo 'Without it, ALL DATA IS LOST on every deploy!'; \
    echo '========================================'; \
  else \
    echo \"Existing database found at /app/data/dev.db\"; \
  fi && \
  npx prisma migrate deploy && \
  npx tsx prisma/seed.ts && \
  tsx server/index.ts"]
