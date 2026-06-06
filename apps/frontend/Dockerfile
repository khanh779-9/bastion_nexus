# Builder stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_FRONTEND_URL
ARG VITE_BACKEND_URL
RUN npm run build

# Runner stage
FROM node:20-bookworm-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]



