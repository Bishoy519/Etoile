# ==============================================================================
# 🩰 ÉTOILE BALLET ACADEMY — NESTJS API DOCKERFILE
# Multi-stage production build using Node 20 Debian Bookworm Slim
# ==============================================================================

# --- Stage 1: Build & Compilation ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine binary compilation
RUN apt-get update -y && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

# Copy package descriptors & prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install full dependencies for building
RUN npm ci

# Generate Prisma Client for Linux target
RUN npx prisma generate

# Copy source code and TypeScript configs
COPY tsconfig*.json ./
COPY src ./src/

# Compile TypeScript engine and seed runner
RUN npm run build

# --- Stage 2: Production Minimal Runtime ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install runtime OpenSSL and dumb-init for PID 1 signal forwarding
RUN apt-get update -y && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only + prisma CLI for entrypoint db push
RUN npm ci --only=production && npm install -g prisma

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy container entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
