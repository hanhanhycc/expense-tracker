# 🤖 CLAUDE.md — Hướng dẫn cho AI Assistant

> **File này dành cho Claude (và mọi AI coding assistant khác) khi làm việc trên repo này.**
> **BẮT BUỘC ĐỌC TRƯỚC KHI VIẾT BẤT KỲ DÒNG CODE NÀO.**
>
> Mục tiêu: giữ AI **không lạc hướng**, không tự ý thay đổi kiến trúc, không over-engineer, và luôn nhất quán với tầm nhìn của project.

---

## 📌 0. Quy tắc vàng (đọc kỹ — không được phá vỡ)

1. **KHÔNG tự ý đổi tech stack** đã chốt trong README. Nếu chưa chốt → **HỎI user trước**, không tự chọn.
2. **KHÔNG tự thêm tính năng** ngoài phạm vi user yêu cầu. Làm đúng việc được giao.
3. **KHÔNG refactor code không liên quan** tới task hiện tại.
4. **KHÔNG xoá file/folder** nếu không được yêu cầu rõ ràng.
5. **KHÔNG commit `.env`, secret, key, password** dưới mọi hình thức.
6. **KHÔNG dùng `float`/`double` cho tiền tệ** — luôn dùng `Decimal` / `BigInt` / integer-cents.
7. **KHÔNG bypass validation/auth** kể cả khi "chỉ để test".
8. **LUÔN giữ code chạy được** sau mỗi commit. Không để repo ở trạng thái broken.
9. **LUÔN dùng tiếng Việt** khi viết comment, commit message, UI text (trừ identifier code).
10. **Khi không chắc → HỎI**, không đoán.

---

## 🎯 1. Mục tiêu project (ghi nhớ luôn)

Xây dựng **ứng dụng quản lý thu chi cá nhân**:

- **User-first**: nhập liệu phải nhanh (< 5 giây / giao dịch).
- **Trung thực dữ liệu**: con số phải chính xác tuyệt đối.
- **Riêng tư**: dữ liệu thuộc về user, không leak, có thể export.
- **Đẹp & đơn giản**: tránh tính năng rườm rà, ưu tiên UX rõ ràng.

> Mọi quyết định kỹ thuật phải phục vụ 4 mục tiêu trên. Khi đứng giữa hai lựa chọn, chọn cái phục vụ user tốt hơn.

---

## 🧭 2. Khi bắt đầu một task — checklist

Trước khi viết code, Claude **phải** trả lời được:

- [ ] Task này thuộc feature nào? (transaction / wallet / budget / dashboard / ...)
- [ ] Có ảnh hưởng tới schema DB không? Nếu có → cần migration.
- [ ] Có ảnh hưởng tới API public không? Nếu có → cần update doc + version.
- [ ] Có cần test không? (mặc định: **CÓ** với business logic, **KHÔNG bắt buộc** với UI thuần).
- [ ] Có file/component đã tồn tại làm việc tương tự không? → **tái sử dụng**, không tạo mới trùng lặp.
- [ ] Stack đã chốt chưa? Nếu chưa → **dừng, hỏi user**.

---

## 🧱 3. Nguyên tắc kiến trúc (không được vi phạm)

### 3.1. Phân lớp rõ ràng

```
UI (component)  →  Hook/Service  →  API client  →  Server handler  →  Repository  →  DB
```

- **UI không gọi DB trực tiếp**.
- **UI không chứa business logic** phức tạp — đẩy vào hook/service.
- **Server luôn validate input** dù client đã validate.

### 3.2. Feature-based folder

Code tổ chức theo **domain/feature**, không theo loại file:

✅ Đúng:
```
features/transactions/
  ├── components/
  ├── hooks/
  ├── services/
  └── types.ts
```

❌ Sai:
```
components/TransactionForm.tsx
components/WalletForm.tsx
hooks/useTransaction.ts
hooks/useWallet.ts
```

### 3.3. Single Responsibility

- 1 function = 1 việc.
- 1 file < 200 dòng (soft limit). > 300 dòng → bắt buộc tách.
- 1 component < 150 dòng JSX.

### 3.4. Không tạo abstraction sớm

- **Rule of three**: chỉ tách helper/abstraction khi đã có **3 chỗ dùng giống nhau**.
- Không tạo wrapper "phòng khi cần sau này".

---

## 💰 4. Quy tắc về tiền tệ (CỰC KỲ QUAN TRỌNG)

1. **Lưu DB**: dùng `Decimal(18, 4)` hoặc lưu integer ở đơn vị nhỏ nhất (vd: VND lưu đồng, USD lưu cent).
2. **Tính toán**: dùng thư viện `decimal.js` / `BigDecimal` / `Decimal` của ORM. **TUYỆT ĐỐI KHÔNG** dùng `+ - * /` của JS number cho tiền.
3. **Hiển thị**: dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
4. **Tỷ giá**: lưu kèm timestamp + nguồn, không hardcode.
5. **Audit**: mọi thay đổi số dư ví phải có transaction record tương ứng. **Không update balance trực tiếp.**

---

## 🔐 5. Quy tắc bảo mật

- **Auth**: mọi API (trừ login/register) phải check session/token.
- **Authorization**: mọi query phải filter theo `userId` của user hiện tại. **Không bao giờ trust client gửi `userId`.**
- **Password**: hash bằng `bcrypt` (cost ≥ 12) hoặc `argon2`. Không lưu plain.
- **SQL injection**: chỉ dùng ORM/parameterized query. **Không string-concat SQL.**
- **XSS**: framework auto-escape; nếu render HTML thô → dùng sanitizer (`DOMPurify`).
- **CORS**: whitelist domain, không `*` ở production.
- **Rate limit**: bắt buộc cho login, register, forgot-password.
- **Secret**: chỉ qua env, không hardcode, không log.

---

## 🧪 6. Testing

### Bắt buộc test:

- Logic tính tổng thu/chi/số dư.
- Logic ngân sách (budget).
- Logic chuyển tiền giữa ví.
- Quy đổi tiền tệ.
- Validation input quan trọng.

### Không bắt buộc test:

- UI thuần hiển thị.
- Component nhỏ không có logic.

### Quy ước:

- Test file nằm cạnh source: `transaction.service.ts` → `transaction.service.test.ts`.
- Đặt tên test bằng tiếng Việt mô tả hành vi: `it('tính đúng số dư khi có giao dịch chuyển tiền', ...)`.

---

## 🎨 7. Quy tắc UI/UX

- **Mobile-first**: design cho màn hình hẹp trước.
- **Loading state**: mọi action async phải có feedback (spinner / skeleton).
- **Error state**: mọi lỗi phải hiển thị thông báo thân thiện tiếng Việt, không show stack trace.
- **Empty state**: list rỗng phải có illustration + CTA, không để trống.
- **Accessibility**: label cho mọi input, contrast ≥ AA, keyboard navigable.
- **Currency input**: format khi blur, parse khi focus. Không cho nhập ký tự không phải số.
- **Date**: dùng `dd/MM/yyyy` (định dạng Việt Nam).

---

## 🗂 8. Quy tắc database

1. **Migration là bắt buộc** — không sửa schema thủ công trên DB.
2. **Không xoá cột/bảng** trong migration production — đánh dấu deprecated trước, xoá ở version sau.
3. **Index** cho mọi cột được dùng trong `WHERE`, `ORDER BY` thường xuyên (đặc biệt: `userId`, `occurredAt`, `walletId`).
4. **Foreign key** bắt buộc, kèm `ON DELETE` rõ ràng (CASCADE / SET NULL / RESTRICT).
5. **Soft delete** với bảng quan trọng (transaction, wallet) — dùng `deletedAt`.
6. **Timestamp**: mọi bảng có `createdAt`, `updatedAt`. Lưu UTC.

---

## 📝 9. Quy tắc commit & PR

### Commit message (Conventional Commits, tiếng Việt OK):

```
feat(transaction): thêm form tạo giao dịch nhanh
fix(budget): sửa lỗi tính sai khi đổi tháng
refactor(wallet): tách service ra khỏi component
docs(readme): cập nhật hướng dẫn cài đặt
test(transaction): thêm test cho service tính tổng
chore(deps): nâng prisma lên 5.x
```

### Quy tắc:

- 1 commit = 1 thay đổi logic. **Không gộp** "fix typo + thêm feature + refactor" vào 1 commit.
- Subject ≤ 72 ký tự.
- Khi commit lớn → thêm body mô tả "vì sao", không chỉ "làm gì".

---

## 🚫 10. Anti-patterns — TUYỆT ĐỐI TRÁNH

| ❌ Sai | ✅ Đúng |
|---|---|
| `let total = 0; items.forEach(i => total += i.amount)` cho tiền | `Decimal.sum(items.map(i => i.amount))` |
| Update `wallet.balance` trực tiếp | Tạo transaction → trigger/recompute balance |
| `SELECT * FROM transactions WHERE user_id = ${userId}` | Parameterized query qua ORM |
| `if (user.role === 'admin')` ở client để ẩn nút → tin tưởng | Check authorization ở server |
| Tạo file `utils.ts` chứa 50 function lung tung | Tách theo domain: `money-utils.ts`, `date-utils.ts` |
| Comment giải thích code khó hiểu | Refactor cho code tự đọc được |
| `try { ... } catch (e) {}` nuốt lỗi | Log + rethrow, hoặc xử lý cụ thể |
| `any` trong TypeScript | Type rõ ràng, hoặc `unknown` + narrow |
| Hardcode chuỗi tiếng Việt khắp nơi | Tập trung ở 1 file i18n (kể cả khi chỉ 1 ngôn ngữ) |

---

## 🔄 11. Khi gặp tình huống không chắc

**Quy trình quyết định:**

1. Đọc lại CLAUDE.md + README.md.
2. Tìm code/pattern tương tự đã có trong repo → theo pattern đó.
3. Nếu vẫn không chắc → **DỪNG, hỏi user** với câu hỏi cụ thể:
   - "Tôi thấy có 2 cách: A (...) và B (...). Bạn muốn cách nào?"
   - **Không** hỏi mơ hồ kiểu "Bạn muốn làm gì?".
4. Ghi quyết định vào `docs/decisions/` (ADR) nếu là quyết định kiến trúc lớn.

---

## 📋 12. Checklist trước khi báo "xong"

Trước khi nói task hoàn thành, kiểm tra:

- [ ] Code chạy được (`npm run dev` không lỗi).
- [ ] Lint pass (`npm run lint`).
- [ ] Type-check pass (nếu dùng TS).
- [ ] Test liên quan pass.
- [ ] Không có `console.log` debug sót lại.
- [ ] Không có TODO chưa giải quyết trong code mới (hoặc đã note rõ).
- [ ] `.env.example` đã update nếu thêm env mới.
- [ ] README đã update nếu có thay đổi cách chạy/cấu hình.
- [ ] Đã thử nghiệm happy path **VÀ** ít nhất 1 edge case.

---

## 🧠 13. Context cần load mỗi session

Khi bắt đầu phiên làm việc mới, Claude **phải** đọc:

1. `README.md` — nắm tầm nhìn & stack.
2. `CLAUDE.md` (file này) — nắm rule.
3. `docs/decisions/` — nắm các quyết định đã chốt.
4. `prisma/schema.prisma` (hoặc tương đương) — nắm data model hiện tại.
5. File/folder liên quan trực tiếp tới task.

**KHÔNG** đọc toàn bộ codebase — chỉ đọc cái cần.

---

## 🆘 14. Khi user yêu cầu thứ trái với CLAUDE.md

- **Không** im lặng làm theo.
- **Cảnh báo** lý do tại sao điều đó vi phạm rule + hậu quả tiềm ẩn.
- **Hỏi xác nhận** "Bạn vẫn muốn làm vậy chứ?".
- Nếu user xác nhận → làm, nhưng đề xuất cập nhật CLAUDE.md để reflect quyết định mới.

---

## 📞 15. Liên hệ & Phản hồi

- Owner: _<user>_
- Nếu file này lỗi thời, **đề xuất update** ngay khi phát hiện.
- File này là **living document** — cập nhật khi project phát triển.

---

> **Tóm lại trong 1 câu:**
> *Làm đúng việc được giao, theo pattern đã có, không lạc đề, không tự sáng tạo, hỏi khi không chắc, và luôn nhớ đây là app về **tiền** — sai 1 đồng cũng là lỗi.*
