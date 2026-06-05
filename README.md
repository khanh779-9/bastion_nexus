# Bastion Nexus - Personal Security Ecosystem

Bastion Nexus is a self-hosted personal security platform designed to secure passwords, credentials, notes, digital credit cards, and wallets. The ecosystem is built entirely with TypeScript, utilizing a secure architecture backed by Prisma ORM, PostgreSQL, Redis, Socket.IO, BullMQ, and Swagger.

---

## System Architecture Flow

The following diagram illustrates the workflow of the Bastion Nexus ecosystem, including Client requests, Rate Limiting, Authentication, Real-time communication, Database operations with automatic encryption, and Asynchronous job queues:

```mermaid
graph TD
    Client[React Client] -->|HTTP / WebSockets| Server[Express Backend]
    
    subgraph Security & Middleware
        Server --> Auth[JWT Authentication]
        Server --> RateLimit[Redis-Backed Rate Limiting]
    end

    subgraph Memory & Messaging Cache
        RateLimit -->|Store Hits| Redis[(Redis Server)]
        SocketAdapter[Socket.IO Redis Adapter] <--> Redis
    end

    subgraph Realtime Communication
        Server <--> Socket[Socket.IO Namespace /notifications]
        Socket -->|Real-time alerts| Client
    end

    subgraph Background Job Queue
        Server -->|Enqueue Jobs| Queue[BullMQ Queue Manager]
        Queue <-->|Store Jobs| Redis
        WorkerBreach[Breach Worker] <--> Queue
        WorkerNotif[Notification Worker] <--> Queue
        WorkerBreach -->|Call API| HIBP[HaveIBeenPwned API]
        WorkerNotif -->|Send Mail| SMTP[Nodemailer SMTP Server]
    end

    subgraph Persistent Storage
        Server -->|Prisma Client| PrismaExtension[Prisma Auto-Encryption Extension]
        PrismaExtension -->|Read/Write AES-256-GCM| PostgreSQL[(PostgreSQL Database)]
    end
```

---

## Core Features

### 1. Zero-Knowledge and Field-Level Encryption
All sensitive fields (passwords, digital wallet secrets, credit card CVVs, and secure notes) are transparently encrypted and decrypted using AES-256-GCM on the database layer. Decryption keys are managed via secure environment variables.

### 2. Distributed Rate Limiting
A custom Express middleware backed by Redis prevents brute-force attempts on authentication and sensitive endpoints. If Redis is unavailable, the system safely falls back to local memory rate limiting.

### 3. Asynchronous Job Processing
Job scheduling and queues are handled through BullMQ, keeping CPU-heavy operations away from the main Express threat:
- Breach Checks: Regularly queries the HaveIBeenPwned API to monitor registered user email exposures.
- Notifications: Sends automated email alerts through a multi-retry SMTP worker queue.

### 4. Real-time Events
Real-time messaging is established using Socket.IO. When a breach or login event is caught by the background worker, WebSocket messages are instantly pushed to the user's dashboard via the /notifications namespace.

### 5. Automated Swagger Documentation
API definitions are documented inside the Express routes using Swagger annotations. Gaining access to local API documentation is as simple as visiting /api-docs.

---

## Technology Stack

### Backend
- Language: TypeScript
- Web Framework: Express (Node.js)
- Database ORM: Prisma (PostgreSQL)
- Key-Value Cache / Queue Broker: Redis (ioredis)
- Background Queue: BullMQ
- Real-time Connection: Socket.IO
- Documentation: Swagger UI (swagger-jsdoc, swagger-ui-express)

### Frontend
- Language: TypeScript
- Core Library: React 18
- Bundler & Dev Server: Vite
- CSS Utility: Tailwind CSS
- Routing: React Router Dom v6

---

## Directory Structure

```
.
├── apps/
│   ├── backend/
│   │   ├── prisma/             # Schema files and database migrations
│   │   ├── src/
│   │   │   ├── config/         # System configurations
│   │   │   ├── lib/            # Shared clients (Prisma, Redis, Socket, BullMQ)
│   │   │   ├── middleware/     # Auth and rate limits
│   │   │   ├── routes/         # Backend Express endpoints
│   │   │   ├── jobs/           # Workers (breach check, mailer)
│   │   │   └── utils/          # Encryption, mail wrappers, user agent parse
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   ├── api/            # API client configurations
│       │   ├── components/     # Reusable components
│       │   ├── locales/        # Translation providers (EN/VI)
│       │   ├── pages/          # Pages (Vault, Wallet, Notes, Breach)
│       │   └── App.tsx         # Root layout
│       └── tsconfig.json
├── package.json                # Monorepo workspaces
├── Dockerfile                  # Production build pipeline
└── apps/backend/docker-compose.yml
```

---

## Setup and Installation

### Prerequisites
- Node.js (version 18.0.0 or higher)
- npm (version 9.0.0 or higher)
- PostgreSQL
- Redis Server (local or Upstash cloud)

### Development Setup

1. Clone the repository and navigate to the project directory:
   ```bash
   cd Kanion_Platform
   ```

2. Install dependencies for all workspaces:
   ```bash
   npm install
   ```

3. Create the backend environmental configuration:
   Create a `.env` file in `apps/backend/` using `apps/backend/.env.example` as a reference:
   ```env
   DATABASE_URL="postgresql://dev:dev@localhost:5432/bastion_nexus?schema=public&sslmode=prefer"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your_secure_jwt_secret"
   ENCRYPTION_KEY="your_secure_aes_encryption_key_32_bytes"
   ```

4. Create the frontend environmental configuration:
   Create a `.env` file in `apps/frontend/` using `apps/frontend/.env.example` as a reference:
   ```env
   VITE_BACKEND_URL="http://localhost:3000"
   ```

5. Run local dependencies using Docker Compose:
   ```bash
   cd apps/backend
   docker compose up -d
   ```

6. Generate Prisma client and run database migrations:
   ```bash
   cd ../..
   npm run build:backend
   npm run migrate
   ```

7. Start the development server (both frontend and backend concurrently):
   ```bash
   npm run dev
   ```

---

## Production Deployment

This project supports production deployment through Docker. The root `Dockerfile` runs a multi-stage compilation that compiles both the React application and the Express/TypeScript server, copying static assets to be served directly from the backend's public directory.

Build the production Docker image:
```bash
docker build -t bastion-nexus .
```
