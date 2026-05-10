#!/usr/bin/env bash
# init.sh — Setup lần đầu trên NAS (chạy 1 lần)
# Đặt tại: /volume1/docker/expense-tracker/init.sh
# Chạy:   sudo bash init.sh

set -euo pipefail

APP_DIR="/volume1/docker/expense-tracker"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

# 1. Tạo .env nếu chưa có
if [[ ! -f .env ]]; then
  echo "📝 Tạo .env từ .env.example..."
  cp .env.example .env
  AUTH_SECRET=$(openssl rand -base64 32)
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
  IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

  sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" .env
  sed -i "s|AUTH_URL=.*|AUTH_URL=http://${IP}:3000|" .env
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASS}|" .env
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://expense:${DB_PASS}@db:5432/expense?schema=public|" .env

  echo "✅ Đã tạo .env. Mở xem: nano $APP_DIR/.env"
  echo "   AUTH_URL=http://${IP}:3000"
fi

# 2. Tạo thư mục data
mkdir -p data/postgres backups

# 3. Pull + up
echo "⬇️  Pull image..."
$DC -f "$COMPOSE_FILE" pull

echo "🚀 Khởi động containers..."
$DC -f "$COMPOSE_FILE" up -d

echo "⏳ Đợi DB sẵn sàng..."
sleep 5

# 4. Migration + seed
echo "🗄  Chạy migration..."
$DC -f "$COMPOSE_FILE" exec -T app pnpm db:migrate:deploy

read -rp "Seed dữ liệu mẫu (owner@demo.local / demo1234)? [y/N] " yn
if [[ "$yn" =~ ^[Yy]$ ]]; then
  $DC -f "$COMPOSE_FILE" exec -T app pnpm db:seed
fi

echo ""
echo "✅ Hoàn tất!"
echo "   Truy cập: $(grep ^AUTH_URL .env | cut -d= -f2-)"
echo "   Update sau này: sudo bash $APP_DIR/update.sh"
