# 💰 Expense Tracker — Ứng dụng Quản lý Thu Chi

> Ứng dụng giúp cá nhân/hộ gia đình ghi chép, phân loại và phân tích dòng tiền thu - chi hằng ngày một cách trực quan, nhanh và bảo mật.

---

## 📑 Mục lục

1. [Giới thiệu](#-giới-thiệu)
2. [Tính năng](#-tính-năng)
3. [Tech Stack](#-tech-stack)
4. [Kiến trúc tổng quan](#-kiến-trúc-tổng-quan)
5. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
6. [Mô hình dữ liệu](#-mô-hình-dữ-liệu)
7. [Cài đặt & Chạy](#-cài-đặt--chạy)
8. [Biến môi trường](#-biến-môi-trường)
9. [Scripts](#-scripts)
10. [Quy ước code](#-quy-ước-code)
11. [Quy trình Git](#-quy-trình-git)
12. [Roadmap](#-roadmap)
13. [Đóng góp](#-đóng-góp)
14. [License](#-license)

---

## 🎯 Giới thiệu

**Expense Tracker** là một dự án cá nhân nhằm xây dựng một ứng dụng quản lý thu chi hoàn chỉnh, tập trung vào:

- **Tốc độ nhập liệu** — thêm 1 giao dịch trong < 5 giây.
- **Trực quan hoá** — biểu đồ thu/chi theo ngày, tuần, tháng, năm.
- **Phân loại linh hoạt** — danh mục (category), nhãn (tag), ví (wallet/account).
- **Bảo mật dữ liệu cá nhân** — dữ liệu thuộc về user, hỗ trợ export.
- **Đa nền tảng** *(định hướng)* — web trước, mobile sau.

### Đối tượng người dùng

- Cá nhân muốn theo dõi chi tiêu hàng ngày.
- Hộ gia đình quản lý ngân sách chung.
- Freelancer cần tách thu nhập theo dự án/khách hàng.

---

## ✨ Tính năng

### MVP (v0.1)

- [ ] Đăng ký / Đăng nhập (email + password).
- [ ] CRUD giao dịch (transaction): thu (income) / chi (expense).
- [ ] Quản lý danh mục (category) có icon + màu.
- [ ] Quản lý ví (wallet/account): tiền mặt, ngân hàng, ví điện tử.
- [ ] Dashboard tổng quan: số dư, tổng thu, tổng chi tháng hiện tại.
- [ ] Lọc giao dịch theo: khoảng thời gian, danh mục, ví, loại.
- [ ] Biểu đồ tròn theo danh mục, biểu đồ cột thu/chi theo tháng.

### v0.2

- [ ] Ngân sách (budget) theo danh mục/tháng + cảnh báo vượt.
- [ ] Giao dịch định kỳ (recurring): lương, hoá đơn, thuê nhà.
- [ ] Chuyển tiền giữa các ví (transfer).
- [ ] Đa tiền tệ (multi-currency) + tỷ giá.
- [ ] Export CSV / Excel.

### v1.0

- [ ] Mobile app (React Native / Flutter — quyết định sau).
- [ ] Đồng bộ cloud + offline-first.
- [ ] Chia sẻ ví/ngân sách với thành viên gia đình.
- [ ] Thông báo (notification) nhắc nhập chi tiêu.
- [ ] Đa ngôn ngữ (i18n): VI, EN.

### Tương lai (nice-to-have)

- [ ] OCR hoá đơn (chụp bill → tự nhập).
- [ ] Import sao kê ngân hàng (PDF/CSV).
- [ ] Gợi ý phân loại bằng AI.
- [ ] Mục tiêu tiết kiệm (savings goal).

---

## 🛠 Tech Stack

> **Trạng thái:** Chưa chốt — sẽ cập nhật sau khi quyết định.

| Layer | Lựa chọn | Ghi chú |
|---|---|---|
| Frontend | _TBD_ | Ứng viên: Next.js / Vue 3 / SvelteKit |
| Backend | _TBD_ | Ứng viên: Next.js API Routes / NestJS / FastAPI |
| Database | _TBD_ | Ứng viên: PostgreSQL / SQLite / Supabase |
| ORM | _TBD_ | Ứng viên: Prisma / Drizzle |
| Auth | _TBD_ | Ứng viên: NextAuth / Supabase Auth / Clerk |
| Styling | _TBD_ | Ứng viên: Tailwind CSS / shadcn/ui |
| Charts | _TBD_ | Ứng viên: Recharts / Chart.js / ECharts |
| Hosting | _TBD_ | Ứng viên: Vercel / Railway / self-host VPS |
| CI/CD | GitHub Actions | Lint + test + build trên PR |

> 👉 **Khi chốt stack, cập nhật bảng này VÀ phần [Cài đặt & Chạy](#-cài-đặt--chạy).**

---

## 🏗 Kiến trúc tổng quan

```
┌──────────────┐      HTTPS      ┌──────────────┐      SQL       ┌──────────────┐
│   Client     │ ──────────────► │   API/BFF    │ ─────────────► │   Database   │
│ (Web/Mobile) │ ◄────────────── │  (Backend)   │ ◄───────────── │ (PostgreSQL) │
└──────────────┘     JSON        └──────────────┘                 └──────────────┘
        │                               │
        │                               ├─► Auth Provider
        │                               ├─► File Storage (receipts)
        └──────────────────────────────►└─► Analytics
```

**Nguyên tắc:**

- **Single source of truth**: DB là nguồn duy nhất, client luôn fetch lại sau mutation.
- **API-first**: backend expose REST hoặc tRPC, client không truy cập DB trực tiếp.
- **Stateless backend**: session lưu ở token (JWT) hoặc httpOnly cookie.
- **Validation 2 lớp**: client (UX) + server (security) — server là cuối cùng.

---

## 📁 Cấu trúc thư mục

> Đề xuất ban đầu — điều chỉnh khi chốt stack.

```
expense-tracker/
├── .github/
│   └── workflows/        # CI/CD GitHub Actions
├── docs/                 # Tài liệu thiết kế, ADR, sơ đồ
│   ├── architecture.md
│   └── decisions/        # ADR (Architecture Decision Records)
├── src/
│   ├── app/              # Routes / pages
│   ├── components/       # UI components dùng chung
│   ├── features/         # Theo domain: transactions, wallets, budgets...
│   │   ├── transactions/
│   │   ├── wallets/
│   │   ├── categories/
│   │   └── budgets/
│   ├── lib/              # Helper, utils, client (db, auth)
│   ├── server/           # Backend logic, API handlers
│   ├── styles/
│   └── types/            # Shared TypeScript types
├── prisma/ (hoặc db/)    # Schema + migrations
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── .env.example
├── .gitignore
├── CLAUDE.md             # ⚠️ Hướng dẫn cho AI assistant — ĐỌC TRƯỚC KHI CODE
├── README.md
└── package.json
```

---

## 🗄 Mô hình dữ liệu

### Bảng chính

```
User (1) ──< Wallet (N)
User (1) ──< Category (N)
User (1) ──< Transaction (N)
User (1) ──< Budget (N)

Wallet (1) ──< Transaction (N)
Category (1) ──< Transaction (N)
Category (1) ──< Budget (N)
```

### Schema (pseudo)

```ts
User {
  id            string  @id
  email         string  @unique
  passwordHash  string
  name          string?
  currency      string  @default("VND")
  createdAt     DateTime
}

Wallet {
  id          string  @id
  userId      string
  name        string          // "Tiền mặt", "Vietcombank"...
  type        WalletType      // CASH | BANK | EWALLET | CREDIT
  balance     Decimal
  currency    string  @default("VND")
  icon        string?
  color       string?
  archived    boolean @default(false)
}

Category {
  id          string  @id
  userId      string
  name        string          // "Ăn uống", "Lương"...
  type        TxType          // INCOME | EXPENSE
  icon        string?
  color       string?
  parentId    string?         // hỗ trợ category cha-con
}

Transaction {
  id          string  @id
  userId      string
  walletId    string
  categoryId  string
  type        TxType          // INCOME | EXPENSE | TRANSFER
  amount      Decimal
  currency    string
  occurredAt  DateTime
  note        string?
  tags        string[]
  attachments string[]        // URL ảnh hoá đơn
  createdAt   DateTime
  updatedAt   DateTime
}

Budget {
  id          string  @id
  userId      string
  categoryId  string?
  amount      Decimal
  period      BudgetPeriod    // WEEKLY | MONTHLY | YEARLY
  startDate   DateTime
  endDate     DateTime?
}
```

### Quy ước về tiền

- Lưu **Decimal** (không dùng `float`) để tránh sai số.
- Đơn vị nhỏ nhất là **đồng** (VND không có phần lẻ).
- Hiển thị format `vi-VN`: `1.234.567 ₫`.

---

## 🚀 Cài đặt & Chạy

> Phần này sẽ chi tiết hơn sau khi chốt stack.

```bash
# 1. Clone
git clone <repo-url>
cd expense-tracker

# 2. Cài dependencies
# (npm/pnpm/yarn — TBD)

# 3. Tạo file env
cp .env.example .env
# → điền giá trị

# 4. Chạy migration
# (prisma migrate dev / drizzle push — TBD)

# 5. Seed dữ liệu mẫu (tùy chọn)
# npm run seed

# 6. Dev
# npm run dev
```

---

## 🔐 Biến môi trường

```env
# Database
DATABASE_URL=

# Auth
AUTH_SECRET=
AUTH_URL=http://localhost:3000

# (Optional) OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# (Optional) Storage
STORAGE_BUCKET=
```

> ⚠️ **KHÔNG commit `.env`**. Chỉ commit `.env.example` với key rỗng.

---

## 📜 Scripts

> Cập nhật khi có `package.json`.

| Lệnh | Mô tả |
|---|---|
| `dev` | Chạy dev server |
| `build` | Build production |
| `start` | Chạy production build |
| `lint` | ESLint + Prettier check |
| `format` | Auto-format toàn bộ code |
| `test` | Chạy unit tests |
| `test:e2e` | Chạy E2E tests |
| `db:migrate` | Chạy migration |
| `db:seed` | Seed dữ liệu mẫu |

---

## 📐 Quy ước code

### Đặt tên

- **Files/folders**: `kebab-case` (`transaction-list.tsx`).
- **Components**: `PascalCase` (`TransactionList`).
- **Variables/functions**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Types/Interfaces**: `PascalCase`, không prefix `I`.

### Cấu trúc component (nếu dùng React/Vue)

- 1 component = 1 file, file < 200 dòng → tách nếu lớn hơn.
- Logic phức tạp → tách custom hook / composable.
- Không gọi API trực tiếp trong component → dùng service/query layer.

### Git commit (Conventional Commits)

```
feat: thêm form tạo giao dịch
fix: sửa sai số tính tổng chi tháng
refactor: tách logic tính ngân sách
docs: cập nhật README
chore: nâng version dependencies
test: thêm test cho budget service
```

### Branch

- `main` — production-ready.
- `dev` — tích hợp tính năng.
- `feat/<tên>` — feature branch.
- `fix/<tên>` — bug fix.

---

## 🔁 Quy trình Git

```bash
# 1. Tạo branch mới từ dev
git checkout dev && git pull
git checkout -b feat/transaction-form

# 2. Code + commit nhỏ, thường xuyên
git add -A && git commit -m "feat: thêm input số tiền"

# 3. Push & mở PR vào dev
git push -u origin feat/transaction-form

# 4. Sau khi merge vào dev và test ổn → merge dev vào main
```

---

## 🗺 Roadmap

- **Tuần 1**: Chốt stack, init project, schema DB, auth.
- **Tuần 2**: CRUD transaction, wallet, category.
- **Tuần 3**: Dashboard + biểu đồ.
- **Tuần 4**: Budget + filter nâng cao.
- **Tuần 5**: Polish UI, viết test, deploy.
- **Tuần 6+**: Mobile, recurring, multi-currency...

---

## 🤝 Đóng góp

Project cá nhân, nhưng PR/issue luôn được chào đón.

1. Fork repo
2. Tạo branch `feat/...`
3. Commit theo Conventional Commits
4. Mở PR mô tả rõ thay đổi + screenshot (nếu UI)

---

## 📄 License

MIT © 2026
