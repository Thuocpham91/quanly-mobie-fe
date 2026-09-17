# ── Stage 1: Build (Vite + React) ───────────────────────────
# Sử dụng node:22.14.0 đã có cache sẵn trên máy (thay vì node:22-alpine cần pull từ internet)
FROM node:22.14.0 AS builder

WORKDIR /app

# Cài dependencies
COPY package*.json yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install; \
  else npm install; \
  fi

# Copy source
COPY . .

# Biến môi trường build-time
ARG VITE_API_URL=https://apimobie.chuyendoisovn.com.vn/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  else npm run build; \
  fi

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