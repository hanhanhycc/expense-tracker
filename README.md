# 💰 Expense Tracker — Quản lý thu chi gia đình

> Ứng dụng web tự host (self-hosted) giúp **gia đình ghi chép thu chi cá nhân + chia sẻ + mục tiêu tiết kiệm chung**. Mobile-first, cài được như app (PWA), triển khai bằng Docker Compose trong vài phút.

![status](https://img.shields.io/badge/status-MVP-green) ![pwa](https://img.shields.io/badge/PWA-ready-blue) ![docker](https://img.shields.io/badge/docker-compose-2496ED)

---

## 📑 Mục lục

1. [Tính năng](#-tính-năng)
2. [Tech Stack](#-tech-stack)
3. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
4. [Triển khai bằng Docker (khuyến nghị)](#-triển-khai-bằng-docker-khuyến-nghị)
5. [Phát triển local (không Docker)](#-phát-triển-local-không-docker)
6. [Biến môi trường](#-biến-môi-trường)
7. [Migration & Seed dữ liệu](#-migration--seed-dữ-liệu)
8. [Cài như App (PWA)](#-cài-như-app-pwa)
9. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
10. [Mô hình dữ liệu](#-mô-hình-dữ-liệu)
11. [Hướng dẫn sử dụng cơ bản](#-hướng-dẫn-sử-dụng-cơ-bản)
12. [Tài khoản mẫu](#-tài-khoản-mẫu)
13. [Sao lưu & Khôi phục](#-sao-lưu--khôi-phục)
14. [Roadmap](#-roadmap)
15. [License](#-license)

---

## ✨ Tính năng

### 🔐 Tài khoản & Thành viên
- Đăng ký / Đăng nhập (email + mật khẩu, hash bằng bcrypt).
- Mỗi user thuộc 1 **gia đình (family)** — workspace dùng chung.
- Nhiều thành viên trong 1 gia đình. Vai trò: `OWNER` / `ADMIN` / `MEMBER`.
- Admin mời/xoá/đổi vai trò thành viên qua **invite code**.

### 💸 Giao dịch
- Loại: **Thu (income)** / **Chi (expense)**.
- Trường: số tiền, danh mục, ghi chú, ngày, người tạo, **paid_by**.
- **Visibility**:
  - `PERSONAL` — chỉ người tạo thấy.
  - `SHARED` — hiển thị cho các thành viên được chia.
- **Split type**: `NONE` / `EQUAL` / `CUSTOM`.
- Ví dụ: A trả 1.000.000 ₫ ăn tối, share 50/50 với B → app hiển thị tổng, ai trả, mỗi người chịu bao nhiêu *(MVP chưa có settle-up nợ)*.

### 🏷 Danh mục
- Seed sẵn 10 danh mục **chi** (Ăn uống, Nhà cửa, Đi lại, Con cái, Sức khoẻ, Mua sắm, Giải trí, Gia đình/Họ hàng, Học tập, Khác) và 5 danh mục **thu** (Lương, Thưởng, Kinh doanh, Hoàn tiền, Khác).
- Admin tự thêm/sửa/xoá.

### 🎯 Mục tiêu tiết kiệm chung
- Tạo goal: tên, số tiền mục tiêu, mô tả, danh sách thành viên, trạng thái (active / completed / archived).
- Mỗi thành viên đóng góp nhiều lần (số tiền, ghi chú, ngày).
- Hiển thị: target — đã góp — còn lại — % tiến độ — đóng góp theo từng thành viên — lịch sử.

### 📊 Dashboard
- Tổng thu / tổng chi tháng này.
- Chi cá nhân vs chi chung.
- Số dư = thu − chi.
- Top danh mục chi nhiều nhất.
- Giao dịch gần đây.
- Mục tiêu tiết kiệm đang chạy + tiến độ.

### 🔍 Lịch sử & bộ lọc
- Lọc theo: khoảng thời gian, danh mục, thành viên, personal/shared.
- Tìm kiếm theo ghi chú.
- Sửa/xoá giao dịch.

### 📈 Báo cáo
- Thu vs chi theo tháng (12 tháng gần nhất).
- Chi theo danh mục (pie).
- Tổng chi chung của gia đình.
- Chi tiêu theo từng thành viên.
- Tiến độ các mục tiêu tiết kiệm.

### 📤 Export
- Giao dịch → **CSV**.
- Đóng góp tiết kiệm → **CSV**.

### 📱 PWA
- Manifest + Service Worker → cài như app trên iOS/Android.
- Cache app shell để mở nhanh khi mạng yếu.

---

## 🛠 Tech Stack

| Layer | Lựa chọn |
|---|---|
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| UI | **Tailwind CSS** + component thuần |
| Charts | **Recharts** |
| Auth | **NextAuth (Auth.js v5)** — Credentials |
| Database | **PostgreSQL 16** |
| ORM | **Prisma 5** |
| Money | **decimal.js** + cột `Decimal(18,2)` |
| Validation | **Zod** |
| PWA | `@ducanh2912/next-pwa` (manifest + Workbox SW) |
| Container | **Docker** + **docker-compose** |
| Package manager | **pnpm** *(npm cũng được)* |

---

## 💻 Yêu cầu hệ thống

- Docker ≥ 24 + Docker Compose v2 *(cách dễ nhất)*
- HOẶC: Node.js ≥ 20 + pnpm ≥ 9 + PostgreSQL ≥ 14 *(dev local)*

---

## 🚀 Triển khai bằng Docker (khuyến nghị)

```bash
# 1. Clone repo
git clone https://github.com/hanhanhycc/expense-tracker.git
cd expense-tracker

# 2. Tạo file env
cp .env.example .env
# → mở .env, đổi POSTGRES_PASSWORD và AUTH_SECRET (sinh: openssl rand -base64 32)

# 3. Build + chạy
docker compose up -d --build

# 4. Chạy migration + seed (lần đầu)
docker compose exec app pnpm db:migrate:deploy
docker compose exec app pnpm db:seed

# 5. Mở
open http://localhost:3000
```

**Cập nhật version mới:**
```bash
git pull && docker compose up -d --build
docker compose exec app pnpm db:migrate:deploy
```

**Stop / xoá:**
```bash
docker compose down            # giữ data
docker compose down -v         # XOÁ luôn volume DB (cẩn thận!)
```

---

## 🧑‍💻 Phát triển local (không Docker)

```bash
pnpm install

# Chỉ chạy DB bằng Docker
docker compose up -d db

cp .env.example .env.local
# DATABASE_URL=postgresql://expense:expense@localhost:5432/expense

pnpm db:migrate
pnpm db:seed
pnpm dev
# http://localhost:3000
```

---

## 🔐 Biến môi trường

Xem [`.env.example`](.env.example).

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `AUTH_SECRET` | ✅ | Random ≥ 32 ký tự, sinh bằng `openssl rand -base64 32` |
| `AUTH_URL` | ✅ (prod) | URL public, vd `https://thuchi.example.com` |
| `POSTGRES_USER` | ✅ (docker) | User DB |
| `POSTGRES_PASSWORD` | ✅ (docker) | Mật khẩu DB |
| `POSTGRES_DB` | ✅ (docker) | Tên DB |
| `APP_PORT` | ⛔ | Port ngoài (default 3000) |

---

## 🗄 Migration & Seed dữ liệu

```bash
pnpm db:migrate           # tạo migration mới (dev)
pnpm db:migrate:deploy    # áp migration ở production
pnpm db:reset             # reset DB (XOÁ DATA)
pnpm db:seed              # seed danh mục + dữ liệu mẫu
pnpm db:studio            # mở Prisma Studio
```

---

## 📲 Cài như App (PWA)

**iOS (Safari):** Share → **Add to Home Screen**.
**Android (Chrome):** Menu → **Install app**.

---

## 📁 Cấu trúc thư mục

```
expense-tracker/
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # login, register
│   │   ├── (app)/              # dashboard, add, history, savings, reports, settings
│   │   ├── api/                # REST endpoints
│   │   └── layout.tsx
│   ├── components/
│   ├── features/
│   │   ├── transactions/
│   │   ├── savings/
│   │   ├── categories/
│   │   └── members/
│   ├── lib/                    # db, auth, money, csv, format
│   └── styles/
├── CLAUDE.md
├── README.md
└── package.json
```

---

## 🗃 Mô hình dữ liệu

```
User ─< FamilyMember >─ Family
Family ─< Category
Family ─< Transaction >─ FamilyMember (created_by, paid_by)
Transaction ─< TransactionShare >─ FamilyMember
Family ─< SavingGoal ─< SavingGoalMember >─ FamilyMember
SavingGoal ─< SavingContribution >─ FamilyMember
```

Chi tiết: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## 📖 Hướng dẫn sử dụng cơ bản

1. **Đăng ký tài khoản đầu tiên** → tự động tạo 1 gia đình mới, bạn là `OWNER`.
2. **Settings → Members**: mời thêm người (sinh invite code, gửi cho họ → họ nhập khi đăng ký).
3. **Settings → Categories**: sửa/thêm danh mục.
4. Bấm **+** ở bottom nav để thêm giao dịch:
   - Chọn Thu/Chi, nhập tiền (auto format `1.000.000 ₫`).
   - Chọn danh mục, ngày, ghi chú.
   - Khoản chung → bật **Chia sẻ**, chọn thành viên + cách chia (đều / tuỳ chỉnh).
5. **Savings**: tạo mục tiêu chung, mỗi người đóng góp nhiều lần.
6. **Dashboard** xem tổng quan, **History** lọc/sửa, **Reports** xem biểu đồ.
7. **Export**: History → **Export CSV**.

---

## 👥 Tài khoản mẫu

Sau khi `pnpm db:seed`:

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `owner@demo.local` | `demo1234` | OWNER |
| `member@demo.local` | `demo1234` | MEMBER |

Có sẵn ~30 giao dịch mẫu + 1 mục tiêu tiết kiệm.

---

## 💾 Sao lưu & Khôi phục

```bash
docker compose exec -T db pg_dump -U expense expense > backup-$(date +%F).sql
docker compose exec -T db psql -U expense expense < backup-2026-05-10.sql
```

---

## 🗺 Roadmap

- [x] **v0.1 (MVP)** — Auth, Family, Transactions, Categories, Savings, Dashboard, History, Reports, Export, PWA.
- [ ] **v0.2** — Giao dịch định kỳ, notification, dark mode.
- [ ] **v0.3** — i18n (VI/EN), import CSV.
- [ ] **v0.4** — Settle-up nợ, OAuth Google.

> ❌ **Không** làm: bank sync, đa ví, đầu tư, vay/cho vay, kế toán doanh nghiệp.

---

## 📄 License

MIT © 2026
