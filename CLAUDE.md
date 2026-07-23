# 🤖 CLAUDE.md — Hướng dẫn cho AI Assistant

> **File này dành cho Claude (và mọi AI coding assistant).**
> **BẮT BUỘC ĐỌC TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO.**
>
> Mục tiêu: giữ AI **không lạc hướng**, không tự ý phình scope, không over-engineer.

---

## 📌 0. Quy tắc vàng (không phá vỡ)

1. **Stack đã chốt** — không tự đổi (xem mục [1](#-1-stack--tổng-quan-project-đã-chốt)).
2. **KHÔNG tự thêm tính năng** ngoài MVP. Xem [danh sách CẤM](#-3-tính-năng-không-được-làm-trong-mvp).
3. **KHÔNG refactor code không liên quan** task hiện tại.
4. **KHÔNG xoá file/folder** nếu không được yêu cầu.
5. **KHÔNG commit `.env`/secret/key/password**.
6. **KHÔNG dùng `float`/`number` cho tiền** — luôn `Decimal` (Prisma) + `decimal.js`.
7. **KHÔNG bypass auth/validation** kể cả khi "test".
8. **LUÔN giữ code chạy được** sau mỗi commit.
9. **Tiếng Việt** cho UI text, commit message, comment. Identifier code dùng tiếng Anh.
10. **Không chắc → HỎI**, không đoán.

---

## 🎯 1. Stack & tổng quan project (đã chốt)

| | |
|---|---|
| **Tên** | Expense Tracker — quản lý thu chi gia đình |
| **Loại** | Self-hosted web PWA |
| **Framework** | Next.js 15 App Router + TypeScript |
| **DB** | PostgreSQL 16 + Prisma 5 |
| **Auth** | NextAuth (Auth.js v5) — Credentials |
| **UI** | Tailwind CSS, mobile-first, không dùng UI lib nặng |
| **Charts** | Recharts |
| **Money** | `Decimal(18,2)` + `decimal.js` |
| **Validation** | Zod |
| **PWA** | `@ducanh2912/next-pwa` |
| **Deploy** | Docker Compose |

**Đối tượng**: gia đình Việt Nam — tiền tệ chính **VND**, ngày `dd/MM/yyyy`, ngôn ngữ **tiếng Việt**.

---

## ✨ 2. Phạm vi MVP (chỉ làm những thứ này)

- Auth: register, login, logout (email + password).
- Family workspace + Members + Roles (OWNER/ADMIN/MEMBER) + Invite code.
- Transactions: income/expense, personal/shared, split none/equal/custom, paid_by.
- Categories: CRUD, có default seed.
- Saving Goals: CRUD + Contributions của từng member + **Tất toán** toàn bộ hoặc 1 phần (nhập số rút từng người → ghi có về thu nhập chia đúng phần; rút sạch → khoá goal, rút 1 phần → ghi dòng đóng góp âm, goal tiếp tục).
- Dashboard: tháng hiện tại.
- History: filter + search + edit/delete.
- Reports: 5 biểu đồ liệt kê trong README.
- Export CSV: transactions + saving contributions.
- PWA: manifest + SW cache shell.
- **Notifications (đã thêm sau MVP gốc)**: in-app bell + page `/notifications` + Web Push real-time tới home screen (VAPID). Trigger khi share/sửa share giao dịch.
- **Accounts (đã thêm sau MVP gốc — Mức A label-only)**: bảng `accounts` (Cash/Bank/Card/E-wallet), CRUD ở `/settings/accounts`, Transaction.accountId nullable, hiển thị + filter ở history. **KHÔNG** track balance hay transfer.
- **Categories hierarchical (đã thêm sau MVP gốc)**: 2 cấp parent → children. `Category.parentId` + `isEnabled` + `sortOrder`. Disable thay vì xoá khi đang có giao dịch ref. Transaction form: 2-step expand (click nhóm cha → hiện con).

---

## 🚫 3. Tính năng KHÔNG được làm trong MVP

Nếu user yêu cầu các thứ dưới đây — **cảnh báo + hỏi xác nhận**:

- ❌ Sync ngân hàng / import sao kê.
- ❌ Đa tiền tệ + tỷ giá.
- ❌ Đầu tư, chứng khoán, crypto.
- ❌ Vay/cho vay/khoản nợ phức tạp.
- ❌ Settle-up nợ giữa thành viên (để v0.4).
- ❌ Recurring transactions (để v0.2).
- ❌ Kế toán doanh nghiệp / hoá đơn VAT.
- ❌ OCR hoá đơn / AI gợi ý.
- ❌ Dark mode (để v0.2 nếu rảnh).
- ❌ **Balance tracking** cho account (số dư hiện tại). Chỉ làm Mức A: account = label.
- ❌ **Transfer giữa accounts** (chuyển tiền VCB → TPB). Để v0.3 nếu cần.

> 📝 *Notification push **đã được thêm** sau MVP gốc — không còn trong danh sách cấm. Xem mục 17.*
> 📝 *Account labeling (Cash/Bank/Card/E-wallet) **đã được thêm** sau MVP gốc — Mức A, label-only, không track balance. Xem mục 18.*

> **Mantra**: *"App này KHÔNG phải MoneyLover/YNAB. Nó là sổ thu chi gia đình đơn giản."*

---

## 🧭 4. Checklist trước khi bắt đầu một task

- [ ] Task thuộc feature nào trong MVP?
- [ ] Nếu không thuộc MVP → cảnh báo user, hỏi trước.
- [ ] Đụng schema DB? → cần migration.
- [ ] Đã có code/component tương tự chưa? → tái sử dụng.
- [ ] Cần test? (Bắt buộc với business logic về tiền & split.)

---

## 🧱 5. Kiến trúc & quy ước

### 5.1 Phân lớp
```
UI (component)  →  Server Action / API route  →  Service  →  Prisma  →  DB
```
- **UI không gọi Prisma trực tiếp** — luôn qua server action / API route.
- **Server LUÔN validate bằng Zod** + check authorization.
- **Authorization rule**: mọi query filter theo `familyId` của session user. **KHÔNG** trust `familyId` từ client.

### 5.2 Folder feature-based
```
src/features/transactions/
  ├── components/
  ├── server/         # actions, services
  ├── schema.ts       # Zod
  └── types.ts
```

### 5.3 Đặt tên
| | |
|---|---|
| File/folder | `kebab-case` |
| Component | `PascalCase` |
| Variable/function | `camelCase` |
| Constant | `UPPER_SNAKE_CASE` |
| Type/Interface | `PascalCase`, không prefix `I` |
| DB table/column | `snake_case` (Prisma `@map`) |

### 5.4 Giới hạn mềm
- File ≤ 250 dòng.
- Component ≤ 150 dòng JSX.
- Function ≤ 50 dòng.
- 1 file = 1 trách nhiệm.

### 5.5 Không tạo abstraction sớm
**Rule of three** — chỉ tách helper khi đã có ≥ 3 chỗ dùng giống nhau.

---

## 💰 6. Quy tắc về tiền (CỰC KỲ QUAN TRỌNG)

1. DB: `Decimal(18, 2)` (Prisma type `Decimal`).
2. Tính toán: `decimal.js` → `new Decimal(a).plus(b)`. **CẤM** `+ - * /` của JS number cho tiền.
3. Hiển thị: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`.
4. Input: nhập số nguyên VND, format khi blur, parse khi focus.
5. **Split equal (CỰC quan trọng — đừng làm sai lại)**: người TRẢ cũng tham gia chia. Bảng `transaction_shares` chỉ lưu phần của **non-payer**, payer giữ phần dư (residual model).
   - Helper: `splitEqualForPayer(amount, payerId, sharedIds)` ở [src/lib/money.ts](src/lib/money.ts). Không tự `splitEqual(amount, sharedIds.length)` — sai logic, payer bị bỏ qua.
   - VD: A trả 2.000.000 share đều với B → shares = `[{B: 1.000.000}]`, A residual = 1.000.000.
   - Phần dư rơi vào payer (chứa ở index 0 của `splitEqual`). VD: 1.000.001 A trả share B,C → `[{B: 333.333}, {C: 333.333}]`, A residual = 333.335.
   - Khi tính phần của member trong giao dịch SHARED (vd dashboard/report): nếu member là payer và không có share row riêng, lấy `amount - sum(shares)`. Xem `monthSummary.memberPart` trong [service.ts](src/features/transactions/server/service.ts).
6. Split custom: tổng các phần phải = `amount`. Validate ở server.

---

## 🔐 7. Bảo mật

- Password: `bcrypt` cost 12.
- Session: NextAuth JWT (httpOnly cookie).
- Mọi API check `auth()` đầu hàm. Trả `401` nếu null.
- Mọi query filter `familyId = session.user.familyId`.
- Action chỉ ADMIN/OWNER (mời member, sửa category, xoá goal): check role.
- SQL injection: chỉ dùng Prisma. Không `$queryRawUnsafe`.
- XSS: React auto-escape; nếu render HTML thô → cấm.
- Rate limit: login & register (basic, in-memory cũng OK cho MVP).
- Invite code: random 8 ký tự, hết hạn 7 ngày, dùng 1 lần.
- Secret: chỉ qua env, không hardcode, không log.

---

## 🗄 8. Database

- Schema ở `prisma/schema.prisma`.
- Migration bắt buộc — không sửa DB tay.
- Mọi bảng có `id (cuid)`, `createdAt`, `updatedAt`.
- Soft delete cho `transactions`, `savingGoals` (`deletedAt`).
- Index bắt buộc cho: `familyId`, `(familyId, date)`, `(familyId, categoryId)`, `(savingGoalId)`.
- FK luôn có `onDelete` rõ ràng.

---

## 🎨 9. UI/UX

- **Mobile-first**: viewport 360px là baseline.
- **Bottom nav** trên mobile: Dashboard / Add (FAB) / History / Savings / Reports. Settings vào trong avatar.
- Loading: skeleton hoặc spinner — không để màn trắng.
- Error: toast tiếng Việt thân thiện. Không show stack trace.
- Empty state: illustration + CTA.
- Currency input: chỉ cho nhập số, format khi blur.
- Date picker: format `dd/MM/yyyy`.
- Khoảng cách: dùng Tailwind spacing scale (`p-3`, `p-4`, `gap-3`...).
- Màu: hệ palette giới hạn — primary, success (income), danger (expense), gray. **Không** thêm màu lung tung.

---

## 🧪 10. Testing

**Bắt buộc** test (Vitest):
- `splitEqual()`, `splitCustom()` — chia tiền.
- Tính tổng dashboard (income/expense/balance).
- Tính progress saving goal.
- Authorization helper (`assertFamilyAccess`).

**Không bắt buộc**: UI thuần, component trang trí.

---

## 📝 11. Commit (Conventional Commits, tiếng Việt OK)

```
feat(transaction): thêm form chia sẻ giao dịch
fix(saving): sửa tính sai % khi target = 0
refactor(money): tách formatter ra lib chung
docs(readme): cập nhật hướng dẫn deploy
chore(deps): nâng prisma 5.20
test(split): thêm test cho splitEqual với phần dư
```

- 1 commit = 1 thay đổi logic.
- Subject ≤ 72 ký tự, không chấm cuối.

---

## 🚫 12. Anti-patterns — TUYỆT ĐỐI TRÁNH

| ❌ Sai | ✅ Đúng |
|---|---|
| `let total = 0; items.forEach(i => total += i.amount)` | `items.reduce((s,i) => s.plus(i.amount), new Decimal(0))` |
| Tin `userId`/`familyId` từ client | Lấy từ `auth()` server-side |
| `prisma.transaction.findMany({ where: { id } })` | `... where: { id, familyId: session.familyId }` |
| Component fetch trực tiếp `prisma.*` | Server action / API route |
| Tạo `utils.ts` lung tung | Chia theo domain: `lib/money.ts`, `lib/date.ts`, `lib/csv.ts` |
| `any` | Type cụ thể, hoặc `unknown` + narrow |
| `try {} catch(e) {}` nuốt lỗi | Log + rethrow / xử lý cụ thể |
| Hardcode chuỗi VI khắp nơi | Tạm thời gom vào 1 file `messages.ts`, sau dễ i18n |
| Dùng `Date` thẳng cho ngày sinh nhật/giao dịch | Lưu UTC, format theo `vi-VN` khi hiển thị |

---

## 🔄 13. Khi gặp tình huống không chắc

1. Đọc lại CLAUDE.md + README.md + schema.
2. Tìm pattern tương tự trong repo → theo pattern đó.
3. Vẫn không chắc → **DỪNG, hỏi user** câu hỏi cụ thể (cho lựa chọn A/B/C).
4. Quyết định kiến trúc lớn → ghi vào `docs/decisions/NNN-xxx.md`.

---

## 📋 14. Checklist trước khi báo "xong"

- [ ] `pnpm dev` chạy không lỗi.
- [ ] `pnpm lint` pass.
- [ ] `pnpm typecheck` pass (`tsc --noEmit`).
- [ ] Test liên quan pass.
- [ ] Không `console.log` debug sót.
- [ ] `.env.example` đã update nếu thêm env mới.
- [ ] README cập nhật nếu đổi cách chạy/cấu hình.
- [ ] Đã thử happy path **VÀ** ≥ 1 edge case.
- [ ] Migration đã sinh nếu sửa schema.

---

## 🧠 15. Context cần đọc mỗi session

1. `README.md` — tầm nhìn & cách chạy.
2. `CLAUDE.md` — rule (file này).
3. `prisma/schema.prisma` — data model.
4. File/folder liên quan trực tiếp task.

**KHÔNG** đọc toàn codebase — chỉ đọc cái cần.

---

## 🆘 16. Khi user yêu cầu trái CLAUDE.md

- **Không** im lặng làm theo.
- **Cảnh báo** lý do + hậu quả.
- **Hỏi xác nhận**: "Bạn vẫn muốn làm vậy chứ?"
- Nếu xác nhận → làm + đề xuất update CLAUDE.md.

---

## 🔔 17. Notifications — convention

### 17.1 Stack
- **In-app**: bảng `notifications` (xem `prisma/schema.prisma`), API `/api/notifications`, component `<NotificationsBell />` ở top-bar + trang `/notifications`.
- **Web Push** (real-time tới home screen): VAPID + `web-push` npm. Service worker custom ở [worker/index.ts](worker/index.ts). Setup keys: `pnpm vapid:gen` → copy vào `.env` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- **Graceful degrade**: nếu thiếu VAPID env → in-app vẫn chạy, chỉ tắt web push.

### 17.2 Quy tắc khi tạo notification
- Trigger ở **service layer**, không ở API route — giữ logic close với business operation.
- Dùng helper [`notifyShareRecipients()`](src/lib/notify.ts) — đã xử lý in-app row + web push fan-out + skip actor (người tạo).
- **Không bao giờ throw** từ notification flow — luôn try/catch nuốt lỗi và log. Notification fail không được phá flow chính (vd: tạo giao dịch vẫn phải thành công nếu push fail).
- Khi sửa giao dịch share: chỉ notify member **mới** hoặc share **đổi số tiền** (so old vs new), không notify lại member không thay đổi.

### 17.3 Khi nào thêm loại notification mới
1. Thêm `NotificationType` literal trong `notify.ts`.
2. Hook vào service tương ứng (vd: savings, members).
3. Cập nhật `entity` field (vd: `"saving_goal"`) + deep-link tương ứng trong [`notifications-bell.tsx`](src/components/notifications-bell.tsx) và `notifications-client.tsx`.
4. **Đừng** tạo bảng notification riêng cho từng loại — dùng chung 1 bảng với `type` + `metadata` JSON.

### 17.4 Push permission UX
- **Không spam** request permission lúc mở app. Chỉ hỏi khi user click button "Bật thông báo đẩy" trong bell dropdown.
- Nếu `Notification.permission === "granted"` rồi → silent refresh subscription mỗi lần mount (idempotent).
- Nếu `denied` → hiển thị hint nhỏ trong dropdown, **không** prompt lại.

---

## 🏷 18. Categories hierarchical (2 cấp)

### 19.1 Quy tắc
- `Category.parentId`: null = nhóm cha (root); có giá trị = danh mục con (leaf).
- **CHỈ 2 cấp**: con không thể có con (API reject 400).
- `isEnabled`: false = ẩn khỏi transaction form, **nhưng** giao dịch cũ ref vẫn hoạt động bình thường.
- `sortOrder`: thứ tự hiển thị trong nhóm.
- Default cấu trúc lưu ở [`src/lib/category-defaults.ts`](src/lib/category-defaults.ts) — DÙNG `seedDefaultCategoriesForFamily(prisma, familyId)` (idempotent).

### 19.2 Xoá vs Disable
- **Xoá**: chỉ được khi không có giao dịch + không có con. API 400 nếu vi phạm.
- **Disable**: luôn an toàn. Hidden khỏi form mới nhưng giao dịch cũ vẫn ref.
- UX: gợi ý user disable thay vì xoá nếu có giao dịch.

### 19.3 Transaction form UX
- **2-step expand**: click group → hiện chip danh mục con. Click con → submit categoryId của con.
- Nếu group không có con (`isLeafGroup`), click chọn luôn (vd: "Khác" không cần phân loại sâu).
- Selected hiển thị banner trên cùng: `[icon] [name] · [parent name]`.

### 19.4 Khi đổi kind (Chi/Thu)
Tự clear `categoryId` nếu category cũ thuộc kind khác.

---

## 🏦 19. Accounts (Mức A — label-only)

### 18.1 Scope
- Bảng `accounts`: id, familyId, name, type (CASH/BANK/CARD/EWALLET/OTHER), icon, color, isDefault, soft delete.
- `Transaction.accountId` **nullable** (để migrate giao dịch cũ; new transaction được auto-default từ form).
- CRUD ở `/settings/accounts` (member view-only, ADMIN/OWNER edit).
- Soft delete (deletedAt) — giao dịch cũ vẫn ref `accountId` nhưng account ẩn khỏi list.

### 18.2 Cấm trong Mức A
- **KHÔNG** track balance (`initialBalance`, current balance) — đó là Mức B.
- **KHÔNG** transfer giữa accounts (1 chiều) — đó là Mức C.
- **KHÔNG** dùng account để tính tổng tài sản ở dashboard.

Nếu user muốn Mức B/C → cảnh báo + hỏi xác nhận (xem mục 16).

### 18.3 Default seed
- `GET /api/accounts` auto-tạo "Tiền mặt" default cho family chưa có account nào (idempotent).
- Seed cho family demo + family thật trong `prisma/seed.ts`.

### 18.4 Form transaction
- Auto-chọn account mặc định (isDefault=true) khi tạo giao dịch mới.
- User có thể chọn "— Không chọn —" → `accountId = null`.

---

> **Tóm gọn 1 câu:**
> *Đây là **app sổ thu chi gia đình đơn giản** — KHÔNG phải app finance phức tạp. Làm đúng MVP, theo pattern đã có, sai 1 đồng cũng là lỗi.*
