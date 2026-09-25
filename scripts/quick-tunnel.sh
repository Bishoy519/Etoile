#!/usr/bin/env bash
# ==============================================================================
# 🩰 Étoile Cloudflare Quick Tunnel (TryCloudflare)
# Spins up temporary public HTTPS URLs without configuring DNS or a custom domain.
#
# Usage:
#   ./scripts/quick-tunnel.sh
#   ./scripts/quick-tunnel.sh 3000 3001
# ==============================================================================

set -e

CLIENT_PORT=${1:-5173}
ADMIN_PORT=${2:-5174}

if ! command -v cloudflared &> /dev/null; then
  echo "❌ cloudflared is not installed."
  echo "👉 Install it on macOS using: brew install cloudflared"
  exit 1
fi

echo "🚀 Starting Cloudflare Quick Tunnels..."
echo "   - Client Portal: http://localhost:$CLIENT_PORT"
echo "   - Admin Portal:  http://localhost:$ADMIN_PORT"
echo ""

LOG_CLIENT=$(mktemp)
LOG_ADMIN=$(mktemp)

cleanup() {
  echo ""
  echo "🛑 Stopping tunnels..."
  kill $(jobs -p) 2>/dev/null || true
  rm -f "$LOG_CLIENT" "$LOG_ADMIN"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start both tunnels in background
cloudflared tunnel --url "http://localhost:$CLIENT_PORT" > "$LOG_CLIENT" 2>&1 &
cloudflared tunnel --url "http://localhost:$ADMIN_PORT" > "$LOG_ADMIN" 2>&1 &

echo "⏳ Waiting for Cloudflare URLs..."

find_url() {
  local log_file=$1
  local url=""
  for i in {1..30}; do
    url=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$log_file" | head -n 1 || true)
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    sleep 1
  done
  echo "Failed to retrieve URL (check $log_file)"
  return 1
}

CLIENT_URL=$(find_url "$LOG_CLIENT")
ADMIN_URL=$(find_url "$LOG_ADMIN")

echo ""
echo "🎉 Tunnels are LIVE!"
echo "=========================================================="
echo "🌐 Client Portal (Port $CLIENT_PORT): $CLIENT_URL"
echo "🌐 Admin Portal  (Port $ADMIN_PORT):  $ADMIN_URL"
echo "=========================================================="
echo "Press Ctrl+C to stop both tunnels."

# Keep alive until Ctrl+C
wait
