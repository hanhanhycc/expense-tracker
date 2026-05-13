#!/usr/bin/env bash
# setup-push.sh — Setup Web Push cho NAS: sinh VAPID keys, ghi vào .env, hướng dẫn copy public key lên GitHub Secret.
# Chạy 1 lần duy nhất. Sau đó deploy bình thường qua `update.sh`.
# Đặt tại: /volume1/docker/expense-tracker/scripts/setup-push.sh
# Chạy:   bash scripts/setup-push.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
ENV_FILE="$APP_DIR/.env"

log() { printf "\033[1;34m[setup]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*" >&2; }

[[ -f "$ENV_FILE" ]] || { err "Thiếu file $ENV_FILE"; exit 1; }

# Nếu đã có VAPID rồi, hỏi xác nhận trước khi ghi đè.
if grep -q "^VAPID_PRIVATE_KEY=." "$ENV_FILE"; then
  log "⚠️  .env đã có VAPID keys. Tạo bộ mới sẽ làm vô hiệu hoá tất cả subscription cũ."
  read -r -p "Tiếp tục? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { log "Huỷ."; exit 0; }
fi

# ─────────────────────────────────────────────
# Sinh VAPID keys trong container app (đã có web-push npm)
# ─────────────────────────────────────────────
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
[[ -f "$COMPOSE_FILE" ]] || COMPOSE_FILE="$APP_DIR/docker-compose.yml"
[[ -f "$COMPOSE_FILE" ]] || { err "Không tìm thấy docker-compose file"; exit 1; }

if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

log "🔑 Sinh VAPID keys qua container app..."
if ! $DC -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -q '^app$'; then
  err "Container 'app' chưa chạy. Hãy chạy 'bash scripts/update.sh' trước, hoặc dùng node local."
  exit 1
fi

# Chạy gen-vapid trong container, trả về 2 dòng dạng KEY=value
OUT=$($DC -f "$COMPOSE_FILE" exec -T app node -e '
  const w = require("web-push");
  const k = w.generateVAPIDKeys();
  console.log("PUB=" + k.publicKey);
  console.log("PRIV=" + k.privateKey);
')
PUB=$(echo "$OUT" | grep "^PUB=" | cut -d= -f2-)
PRIV=$(echo "$OUT" | grep "^PRIV=" | cut -d= -f2-)

if [[ -z "$PUB" || -z "$PRIV" ]]; then
  err "Sinh VAPID keys thất bại"
  exit 1
fi

# Subject
read -r -p "Email admin cho VAPID subject [admin@example.com]: " SUBJECT_EMAIL
SUBJECT_EMAIL="${SUBJECT_EMAIL:-admin@example.com}"
SUBJECT="mailto:$SUBJECT_EMAIL"

# ─────────────────────────────────────────────
# Ghi vào .env (idempotent: remove dòng cũ trước, thêm dòng mới)
# ─────────────────────────────────────────────
log "📝 Ghi 3 dòng vào $ENV_FILE"
sed -i.bak '/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=/d;/^VAPID_PRIVATE_KEY=/d;/^VAPID_SUBJECT=/d' "$ENV_FILE"
{
  echo ""
  echo "# Web Push (sinh bởi setup-push.sh, $(date +%F))"
  echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUB"
  echo "VAPID_PRIVATE_KEY=$PRIV"
  echo "VAPID_SUBJECT=$SUBJECT"
} >> "$ENV_FILE"

# ─────────────────────────────────────────────
# Output hướng dẫn cho GitHub Secret
# ─────────────────────────────────────────────
cat <<EOF

✅ Đã ghi VAPID keys vào .env

═══════════════════════════════════════════════════════════════
⚠️  CÒN 1 BƯỚC NỮA — copy PUBLIC KEY lên GitHub Secret
═══════════════════════════════════════════════════════════════

Vào: https://github.com/hanhanhycc/expense-tracker/settings/secrets/actions

  - Click "New repository secret"
  - Name:   NEXT_PUBLIC_VAPID_PUBLIC_KEY
  - Value:  $PUB

Sau đó push code lên main → CI rebuild image với public key embed sẵn.
Khi NAS pull image mới (qua update.sh), web push sẽ hoạt động.

Note:
  - Public key (chỉ public key) là an toàn để commit hoặc embed vào client.
  - Private key đã ghi vào .env ở NAS, KHÔNG share ra ngoài.

EOF
