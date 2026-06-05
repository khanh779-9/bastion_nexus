# Bastion Nexus — Kế Hoạch Nâng Cấp Toàn Diện

Chuyển đổi toàn bộ project sang TypeScript + Prisma ORM + Redis + Socket.IO + Swagger + BullMQ

---

## Bối cảnh

### Hiện trạng

**Backend** (6 route files, ~1.200 dòng raw SQL):
- JavaScript thuần, không có type safety
- Raw SQL qua `pg.Pool.query()` — dễ lỗi, khó bảo trì
- Rate limiting bằng `Map()` trong memory — restart server là mất
- Không có API docs, không có job queue, không có WebSocket

**Frontend** (9 pages, 5 components, ~170KB source):
- React 18 + Vite, JavaScript thuần (`.jsx`)
- Không có types cho props, API responses, context

### Mục tiêu sau nâng cấp

| Thành phần | Trước | Sau |
|---|---|---|
| Ngôn ngữ | JavaScript | **TypeScript** (cả BE + FE) |
| Database | Raw SQL (`pg`) | **Prisma ORM** (type-safe) |
| Cache | Không có | **Redis** (rate limit, session, cache) |
| Realtime | Không có | **Socket.IO** (notifications, chat) |
| API docs | Không có | **Swagger UI** (`/api/docs`) |
| Job queue | Không có | **BullMQ** (breach check, email) |

---

## Cần Xác Nhận Từ Bạn

> [!IMPORTANT]
> **1. Database production**: DB trên Supabase có dữ liệu thật cần giữ không? Hay DB đang trống và có thể reset schema qua Prisma migrate?

> [!IMPORTANT]
> **2. Redis**: Bạn đã tạo account Upstash chưa? Hay setup Docker Redis local trước, cloud thêm sau?

> [!WARNING]
> **3. Encryption salt**: Bước rename trước đã đổi salt từ `kanion-salt` → `bastion-nexus-salt`. Nếu có dữ liệu đã mã hóa bằng salt cũ trên production, cần script migrate. Nếu dùng `ENCRYPTION_KEY` explicit hoặc DB trống thì không sao.

> [!NOTE]
> **4. `mail.js` dùng `require()` (CommonJS)** trong khi project dùng ESM — sẽ fix luôn khi convert TypeScript.

---

## Các Thay Đổi Chi Tiết

---

### Giai đoạn 1 — Hạ tầng Backend (TypeScript + Config)

Thiết lập TypeScript, cập nhật dependencies, cấu trúc thư mục mới.

#### Cấu trúc backend sau nâng cấp:

```
apps/backend/
├── prisma/
│   └── schema.prisma                 # Schema Prisma (từ 001_init.sql)
├── src/
│   ├── config/
│   │   ├── index.ts                  # Biến môi trường (từ config.js)
│   │   └── swagger.ts               # Cấu hình Swagger
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client + encryption extension
│   │   ├── redis.ts                  # Redis client (ioredis)
│   │   ├── socket.ts                 # Socket.IO server
│   │   └── bullmq.ts                # BullMQ queue setup
│   ├── middleware/
│   │   ├── auth.ts                   # Xác thực JWT
│   │   └── rateLimit.ts              # Rate limit bằng Redis
│   ├── routes/
│   │   ├── auth.ts                   # Đăng nhập, đăng ký, thông báo
│   │   ├── vault.ts                  # CRUD kho mật khẩu
│   │   ├── notes.ts                  # CRUD ghi chú + chia sẻ
│   │   ├── user.ts                   # Hồ sơ, cài đặt
│   │   ├── breach.ts                 # Giám sát rò rỉ
│   │   └── wallet.ts                # CRUD ví số
│   ├── jobs/
│   │   ├── queues.ts                 # Định nghĩa hàng đợi
│   │   └── workers/
│   │       ├── breachCheck.ts        # Worker kiểm tra rò rỉ
│   │       └── notification.ts       # Worker gửi email/thông báo
│   ├── utils/
│   │   ├── encryption.ts             # AES-256-GCM (giữ nguyên logic)
│   │   ├── auditLog.ts              # Ghi nhật ký bảo mật
│   │   ├── userAgent.ts             # Phân tích User-Agent
│   │   └── mail.ts                  # Gửi email (fix ESM)
│   ├── types/
│   │   └── index.ts                 # Kiểu dữ liệu dùng chung
│   └── index.ts                     # Entry point (Express + Socket.IO)
├── tsconfig.json
├── package.json
└── docker-compose.yml               # PostgreSQL + Redis
```

#### Chi tiết file:

##### [MỚI] `tsconfig.json`
- Target: ES2022, Module: NodeNext, Strict mode bật
- Paths alias: `@/` → `src/`

##### [SỬA] [package.json](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/package.json)

Thêm dependencies mới:
```
prisma, @prisma/client, ioredis, socket.io, bullmq,
swagger-jsdoc, swagger-ui-express, nodemailer
```

Thêm devDependencies:
```
typescript, tsx, @types/node, @types/express, @types/bcryptjs,
@types/jsonwebtoken, @types/cors, @types/morgan,
@types/swagger-jsdoc, @types/swagger-ui-express, @types/nodemailer
```

Cập nhật scripts:
```json
"dev": "tsx watch src/index.ts",
"build": "tsc && prisma generate",
"start": "node dist/index.js",
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:studio": "prisma studio"
```

##### [SỬA] [docker-compose.yml](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/docker-compose.yml)
- Thêm service **Redis 7 Alpine** trên port 6379
- Thêm volume `redis_data` để persist data

##### [SỬA] `.env.example`
- Thêm: `REDIS_URL`, `UPSTASH_REDIS_URL`, `SOCKET_CORS_ORIGIN`, `BULL_BOARD_ENABLED`

---

### Giai đoạn 2 — Prisma Schema & Client

Chuyển 13 tables SQL sang Prisma schema, tạo client với auto-encryption.

---

##### [MỚI] `prisma/schema.prisma`

Bật `multiSchema` preview feature để hỗ trợ nhiều schema PostgreSQL.

Mapping từ SQL → Prisma:

| SQL Table | Prisma Model | Schema |
|---|---|---|
| `account.users` | `User` | account |
| `account.statuses` | `AccountStatus` | account |
| `account.devices` | `Device` | account |
| `account.profiles` | `Profile` | account |
| `account.security` | `Security` | account |
| `account.sessions` | `Session` | account |
| `account.settings` | `Setting` | account |
| `note.item` | `Note` | note |
| `note.share` | `NoteShare` | note |
| `vault.items` | `VaultItem` | vault |
| `vault.tags` | `VaultTag` | vault |
| `vault.item_tags` | Quan hệ M2M ngầm | vault |
| `audit.logs` | `AuditLog` | audit |
| `notification.items` | `Notification` | notification |
| `breach.monitor` | `BreachMonitor` | breach |
| `breach.result` | `BreachResult` | breach |
| `wallet.items` | `WalletItem` | wallet |
| `wallet.metadata` | `WalletMetadata` | wallet |

Dùng `@map()` / `@@map()` / `@@schema()` để map đúng tên hiện có trong DB.

##### [MỚI] `src/lib/prisma.ts`

- Singleton pattern cho Prisma Client
- **Prisma Client Extension** tự động mã hóa/giải mã:
  - Trước khi ghi (`create`, `update`): tự encrypt các field nhạy cảm
  - Sau khi đọc (`findMany`, `findFirst`): tự decrypt
  - Cấu hình field nào cần encrypt theo từng model
  - **Tương thích ngược** với dữ liệu đã mã hóa

##### [XÓA] `src/db/pool.js` — thay bằng Prisma client
##### [XÓA] `src/db/migrate.js` — thay bằng `prisma migrate`

---

### Giai đoạn 3 — Tích hợp Redis

Cài đặt Redis client, chuyển rate limiting sang Redis, thêm caching.

---

##### [MỚI] `src/lib/redis.ts`

- Dùng `ioredis`
- Tự nhận diện: `UPSTASH_REDIS_URL` (production) hoặc `REDIS_URL` (local Docker)
- Xử lý lỗi kết nối, tự reconnect
- Helper: `cacheGet()`, `cacheSet()`, `cacheDel()` với TTL

##### [SỬA] `src/middleware/rateLimit.ts` (từ [rateLimit.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/middleware/rateLimit.js))

- **Thay `Map()` bằng Redis** — dùng `INCR` + `EXPIRE`
- Hoạt động đúng khi chạy nhiều instance (distributed)
- Fallback về in-memory nếu Redis chưa kết nối

##### Redis sẽ cache gì:

| Tính năng | Key pattern | TTL | Mục đích |
|---|---|---|---|
| Rate limiting | `rl:{endpoint}:{ip}` | 60s–15min | Chống brute force |
| Session cache | `session:{userId}` | 1 giờ | Giảm query DB |
| JWT blacklist | `bl:{tokenHash}` | 7 ngày | Logout thật sự |
| Kết quả breach | `breach:{hash}` | 24 giờ | Cache API HIBP |

---

### Giai đoạn 4 — Chuyển Routes & Utils sang TypeScript

Convert toàn bộ 6 routes, 2 middleware, 4 utils sang `.ts` + thay raw SQL bằng Prisma.

---

##### [MỚI] `src/types/index.ts`

```typescript
import type { Request } from 'express';

export interface AuthRequest extends Request {
  user: { id: number; email: string; name?: string };
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success?: boolean;
}
```

##### [SỬA] `src/middleware/auth.ts` (từ [auth.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/middleware/auth.js))
- Thêm type `AuthRequest`, typed JWT payload

##### [SỬA] `src/routes/auth.ts` (từ [auth.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/auth.js) — 228 dòng)
- `db.query('SELECT...')` → `prisma.user.findUnique()`, `prisma.user.create()`
- `db.query('INSERT INTO notification...')` → `prisma.notification.create()`
- Cache session vào Redis sau login

##### [SỬA] `src/routes/vault.ts` (từ [vault.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/vault.js) — 197 dòng)
- Raw SQL CRUD → Prisma operations
- Mã hóa tự động qua Prisma extension

##### [SỬA] `src/routes/notes.ts` (từ [notes.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/notes.js) — 280 dòng)
- Bao gồm share, verify password, revoke
- Raw SQL → Prisma

##### [SỬA] `src/routes/user.ts` (từ [user.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/user.js) — 168 dòng)
- Profile, settings, theme, appearance
- `ON CONFLICT DO UPDATE` → `prisma.setting.upsert()`

##### [SỬA] `src/routes/breach.ts` (từ [breach.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/breach.js) — 178 dòng)
- Kiểm tra breach → đẩy vào BullMQ worker (không blocking)
- Cache kết quả HIBP trong Redis 24h

##### [SỬA] `src/routes/wallet.ts` (từ [wallet.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/routes/wallet.js) — 241 dòng)
- `query('BEGIN')` transactions → `prisma.$transaction()`
- Metadata CRUD → Prisma nested writes

##### [SỬA] `src/utils/encryption.ts` (từ [encryption.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/utils/encryption.js))
- Thêm TypeScript types, giữ nguyên logic AES-256-GCM

##### [SỬA] `src/utils/auditLog.ts` (từ [auditLog.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/utils/auditLog.js))
- `query()` → `prisma.auditLog.create()`

##### [SỬA] `src/utils/userAgent.ts` (từ [userAgent.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/utils/userAgent.js))
- Thêm return type interface `UserAgentInfo`

##### [SỬA] `src/utils/mail.ts` (từ [mail.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/utils/mail.js))
- **Sửa CommonJS (`require`) → ESM (`import`)**
- Thêm typed `MailOptions` interface

##### [SỬA] `src/index.ts` (từ [index.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/src/index.js) — 224 dòng)
- Tích hợp Socket.IO vào HTTP server
- Mount Swagger UI
- Khởi động BullMQ workers
- Health check bao gồm: DB + Redis + status

---

### Giai đoạn 5 — Socket.IO (Realtime)

Chuẩn bị WebSocket cho thông báo realtime và chat tương lai.

---

##### [MỚI] `src/lib/socket.ts`

- Socket.IO server gắn vào Express HTTP server
- **Redis adapter** (`@socket.io/redis-adapter`) — scale ngang được
- Xác thực JWT cho kết nối WebSocket
- Namespaces:
  - `/notifications` — đẩy thông báo realtime tới client
  - `/chat` — placeholder cho tính năng chat sau này
- Events:
  - `notification:new` — thông báo mới
  - `breach:alert` — cảnh báo rò rỉ realtime

---

### Giai đoạn 6 — BullMQ (Hàng đợi công việc)

Xử lý công việc nền: kiểm tra rò rỉ, gửi email.

---

##### [MỚI] `src/lib/bullmq.ts`
- Định nghĩa queue, dùng chung Redis connection

##### [MỚI] `src/jobs/queues.ts`
- Export queue instances: `breachCheckQueue`, `notificationQueue`

##### [MỚI] `src/jobs/workers/breachCheck.ts`
- Nhận job từ queue `breach-check`
- Gọi HIBP API, lưu kết quả qua Prisma
- Emit Socket.IO event nếu phát hiện rò rỉ
- Cache kết quả Redis 24h

##### [MỚI] `src/jobs/workers/notification.ts`
- Gửi email qua nodemailer
- Retry 3 lần, exponential backoff

---

### Giai đoạn 7 — Swagger API Docs

Tài liệu API tự động.

---

##### [MỚI] `src/config/swagger.ts`

- Cấu hình `swagger-jsdoc` cho OpenAPI 3.0
- Info: Bastion Nexus API v1.0.0
- Security scheme: Bearer JWT
- Serve UI tại `/api/docs`

- Thêm annotation `@swagger` vào ~25 endpoints trong các route files
- Nhà tuyển dụng mở `/api/docs` = thấy ngay API docs chuyên nghiệp

---

### Giai đoạn 8 — Frontend TypeScript

Chuyển toàn bộ frontend `.jsx` / `.js` sang `.tsx` / `.ts`.

---

#### Cấu trúc frontend sau nâng cấp:

```
apps/frontend/
├── src/
│   ├── api/
│   │   ├── client.ts                 # Axios instance (từ client.js)
│   │   └── notifications.ts          # API thông báo (từ notifications.js)
│   ├── components/
│   │   ├── NavBar.tsx                # Thanh điều hướng
│   │   ├── ThemeContext.tsx           # Theme provider
│   │   ├── Toast.tsx                 # Hiển thị thông báo
│   │   ├── ToastContext.ts           # Toast context
│   │   └── toastService.ts           # Toast service
│   ├── locales/
│   │   ├── index.ts                  # Language provider (từ index.js)
│   │   ├── en.json                   # Giữ nguyên
│   │   └── vi.json                   # Giữ nguyên
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Vault.tsx
│   │   ├── Notes.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   ├── BreachMonitor.tsx
│   │   └── Wallet.tsx
│   ├── utils/
│   │   └── totp.ts                   # TOTP generator (từ totp.js)
│   ├── types/
│   │   ├── api.ts                    # Types cho API responses
│   │   └── index.ts                  # Types chung (User, Note, VaultItem...)
│   ├── App.tsx                       # App root
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Giữ nguyên
├── tsconfig.json                     # TypeScript config
├── tsconfig.node.json                # Config cho Vite
├── vite.config.ts                    # Vite config (từ .js)
├── index.html                        # Giữ nguyên
└── package.json
```

#### Chi tiết file:

##### [MỚI] `tsconfig.json` + `tsconfig.node.json`
- Strict mode, JSX: react-jsx
- Path alias: `@/` → `src/`
- Include: `src/**/*.ts`, `src/**/*.tsx`

##### [SỬA] [package.json](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/frontend/package.json)
- Thêm devDeps: `typescript`, `@types/react`, `@types/react-dom`
- Giữ nguyên dependencies (React, Vite, etc.)

##### [SỬA] `vite.config.ts` (từ [vite.config.js](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/frontend/vite.config.js))
- Rename `.js` → `.ts`, thêm types

##### [MỚI] `src/types/index.ts`
```typescript
// Types dùng chung cho frontend
export interface User {
  id: number;
  email: string;
}

export interface VaultItem {
  id: number;
  type: string;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  otp_secret?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title?: string;
  content: string;
  color?: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}
// ... WalletItem, BreachMonitor, Notification, etc.
```

##### [MỚI] `src/types/api.ts`
- Types cho API responses, request payloads
- Dùng chung giữa các pages

##### [SỬA] Tất cả `.jsx` → `.tsx` (9 pages + 5 components)

Mỗi file sẽ:
- Đổi extension `.jsx` → `.tsx`
- Thêm types cho props, state, event handlers
- Thêm types cho API responses (`as VaultItem[]`, etc.)
- Context types (`ThemeContext`, `ToastContext`, `LanguageContext`)

##### [SỬA] Tất cả `.js` → `.ts` (3 files)
- `api/client.js` → `client.ts` — typed axios instance
- `api/notifications.js` → `notifications.ts` — typed API calls
- `utils/totp.js` → `totp.ts` — typed TOTP function
- `locales/index.js` → `index.ts` — typed context + translations
- `components/ToastContext.js` → `ToastContext.ts`
- `components/toastService.js` → `toastService.ts`

---

### Giai đoạn 9 — Docker & Triển khai

Cập nhật Docker cho stack mới.

---

##### [SỬA] [docker-compose.yml](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/apps/backend/docker-compose.yml)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    # ... giữ nguyên config hiện tại

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

##### [SỬA] [Dockerfile](file:///d:/Data/Tailieu/Projects/NodeJS/Kanion_Platform/Dockerfile)
- Multi-stage build: stage build (tsc + vite build) → stage production
- Thêm `prisma generate` trong build step

##### [SỬA] `.env.example`
```env
# Redis
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_URL=               # Redis production (Upstash)

# Socket.IO
SOCKET_CORS_ORIGIN=http://localhost:5173

# BullMQ
BULL_BOARD_ENABLED=false
```

---

## Tổng kết thay đổi

### Backend

| Loại | Số file sửa | Số file mới | Số file xóa |
|---|:---:|:---:|:---:|
| Config & hạ tầng | 4 | 2 | 0 |
| Prisma | 0 | 2 | 2 |
| Redis | 0 | 1 | 0 |
| Routes (→TS) | 6 | 0 | 0 |
| Middleware (→TS) | 2 | 0 | 0 |
| Utils (→TS) | 4 | 0 | 0 |
| Socket.IO | 0 | 1 | 0 |
| BullMQ | 0 | 4 | 0 |
| Swagger | 0 | 1 | 0 |
| Types | 0 | 1 | 0 |
| **Tổng backend** | **16** | **12** | **2** |

### Frontend

| Loại | Số file sửa | Số file mới | Số file xóa |
|---|:---:|:---:|:---:|
| Config (vite, tsconfig) | 1 | 2 | 0 |
| Pages (→TSX) | 9 | 0 | 0 |
| Components (→TSX) | 3 | 0 | 0 |
| Components (→TS) | 2 | 0 | 0 |
| API (→TS) | 2 | 0 | 0 |
| Utils (→TS) | 1 | 0 | 0 |
| Locales (→TS) | 1 | 0 | 0 |
| Types | 0 | 2 | 0 |
| Package.json | 1 | 0 | 0 |
| **Tổng frontend** | **20** | **4** | **0** |

### Tổng cộng: **36 files sửa, 16 files mới, 2 files xóa**

---

## Kế Hoạch Kiểm Thử

### Kiểm tra tự động

```bash
# 1. Backend TypeScript biên dịch thành công
cd apps/backend && npx tsc --noEmit

# 2. Frontend TypeScript biên dịch thành công
cd apps/frontend && npx tsc --noEmit

# 3. Prisma schema hợp lệ
cd apps/backend && npx prisma validate

# 4. Prisma generate client
cd apps/backend && npx prisma generate

# 5. Backend chạy được
cd apps/backend && npm run dev
# Mở: http://localhost:3000/api/health
# Kỳ vọng: { "ok": true, "db": "connected", "redis": "connected" }

# 6. Frontend chạy được
cd apps/frontend && npm run dev
# Mở: http://localhost:5173
```

### Kiểm tra thủ công

- [ ] Swagger UI truy cập tại `http://localhost:3000/api/docs`
- [ ] Đăng nhập / Đăng ký hoạt động
- [ ] Vault: tạo, xem, sửa, xóa item — mã hóa/giải mã đúng
- [ ] Notes: tạo, chia sẻ link, thu hồi chia sẻ
- [ ] Wallet: tạo item với metadata, xem chi tiết
- [ ] Breach Monitor: thêm monitor, kiểm tra rò rỉ
- [ ] Rate limiting: gọi nhiều request liên tục → nhận 429
- [ ] Frontend không bị lỗi gì (API contract giữ nguyên)
- [ ] Redis: kiểm tra keys sau khi login (`redis-cli KEYS *`)
- [ ] Docker Compose: `docker compose up` chạy cả PostgreSQL + Redis
- [ ] Socket.IO: kết nối WebSocket từ frontend (kiểm tra DevTools)
