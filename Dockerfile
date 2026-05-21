# ── Stage 1: Build (Vite + React) ───────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Cài dependencies
COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile

# Copy source
COPY . .

# Biến môi trường build-time
ARG VITE_API_URL=http://localhost:9004/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN yarn build

# ── Stage 2: Serve với Nginx ─────────────────────────────────
FROM nginx:1.25-alpine

# Xóa config mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]