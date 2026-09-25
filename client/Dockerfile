# ==============================================================================
# 🩰 ÉTOILE BALLET ACADEMY — CLIENT & STUDENT PORTAL DOCKERFILE
# Multi-stage production build using Node 20 Alpine and Nginx Alpine
# ==============================================================================

# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html tailwind.config.js postcss.config.js ./
COPY src ./src/
COPY public ./public/

RUN npm run build

# --- Stage 2: Serve with Nginx Alpine ---
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
