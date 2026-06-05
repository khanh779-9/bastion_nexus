FROM node:20-bookworm-slim

WORKDIR /apps

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy manifest trước để cache deps tốt hơn
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

# Cài deps cho toàn workspace
RUN npm install --workspaces

# Copy toàn bộ source
COPY . .

# Build both frontend and backend (compiles TS and generates Prisma Client)
RUN npm run build

# Copy build React sang backend/public
RUN mkdir -p apps/backend/public
RUN cp -r apps/frontend/dist/* apps/backend/public/

# Render/Railway sẽ inject PORT
ENV PORT=10000
ENV NODE_ENV=production

EXPOSE 10000

# Chạy backend
CMD ["npm", "run", "start", "--workspace=apps/backend"]
