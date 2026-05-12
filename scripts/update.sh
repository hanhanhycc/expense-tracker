#!/usr/bin/env bash
# update.sh — Pull image mới nhất từ GHCR và restart Expense Tracker trên NAS
# Đặt tại: /volume1/docker/expense-tracker/scripts/update.sh
# Chạy:   sudo bash scripts/update.sh           (chỉ update + migrate)
#         sudo bash scripts/update.sh --seed    (update + migrate + chạy seed)

set -euo pipefail

RUN_SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED=true ;;
  esac
done

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
APP_DIR="/volume1/docker/expense-tracker"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE="app"

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
log() { printf "\033[1;34m[%(%H:%M:%S)T]\033[0m %s\n" -1 "$*"; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*" >&2; }

cd "$APP_DIR" || { err "Không tìm thấy $APP_DIR"; exit 1; }

# Detect docker compose CLI (v2)
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null; then
  DC="docker-compose"
else
  err "Không tìm thấy docker compose. Hãy cài Container Manager trên DSM."
  exit 1
fi

[[ -f .env ]] || { err "Thiếu file .env trong $APP_DIR"; exit 1; }
[[ -f "$COMPOSE_FILE" ]] || { err "Thiếu $COMPOSE_FILE"; exit 1; }
# shellcheck disable=SC1091
set -a; . ./.env; set +a

# ─────────────────────────────────────────────
# Backup DB trước khi update (tự động, giữ 14 ngày)
# ─────────────────────────────────────────────
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"

if $DC -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -q '^db$'; then
  STAMP=$(date +%F_%H%M)
  BACKUP_FILE="$BACKUP_DIR/expense-$STAMP.sql.gz"
  log "💾 Backup DB → $BACKUP_FILE"
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  $DC -f "$COMPOSE_FILE" exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
  find "$BACKUP_DIR" -name "expense-*.sql.gz" -mtime +14 -delete || true
else
  log "⚠️  DB chưa chạy, bỏ qua backup."
fi

# ─────────────────────────────────────────────
# Pull image mới
# ─────────────────────────────────────────────
log "⬇️  Pull image mới nhất..."
$DC -f "$COMPOSE_FILE" pull "$SERVICE"

# ─────────────────────────────────────────────
# Up & migrate
# ─────────────────────────────────────────────
log "🚀 Up containers..."
$DC -f "$COMPOSE_FILE" up -d

log "⏳ Đợi DB sẵn sàng..."
for i in {1..30}; do
  if $DC -f "$COMPOSE_FILE" exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

log "🗞  Đồng bộ schema (db push)..."
if ! $DC -f "$COMPOSE_FILE" exec -T "$SERVICE" pnpm db:push; then
  log "⚠️  db push cần xác nhận cảnh báo schema, thử lại với --accept-data-loss..."
  $DC -f "$COMPOSE_FILE" exec -T "$SERVICE" pnpm prisma db push --skip-generate --accept-data-loss || {
    err "db push thất bại — xem log: $DC -f $COMPOSE_FILE logs $SERVICE"
    exit 1
  }
fi

if $RUN_SEED; then
  log "🌱 Chạy seed..."
  $DC -f "$COMPOSE_FILE" exec -T "$SERVICE" pnpm prisma db seed || {
    err "Seed thất bại — xem log ở trên"
    exit 1
  }
fi

# ─────────────────────────────────────────────
# Cleanup image cũ
# ─────────────────────────────────────────────
log "🧹 Xoá image cũ..."
docker image prune -f >/dev/null || true

log "✅ Update xong!"
$DC -f "$COMPOSE_FILE" ps
