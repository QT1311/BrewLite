#!/usr/bin/env bash
# Smoke test sau deploy (Task 5.3).
# Dùng: scripts/smoke-test.sh <API_URL> <WEB_URL> [EXPECTED_VERSION]
# Thử lại tối đa ~5 phút vì Railway cần thời gian kéo image và khởi động.
set -u

API_URL="${1:?Thiếu API_URL}"
WEB_URL="${2:?Thiếu WEB_URL}"
EXPECTED="${3:-}"
API_URL="${API_URL%/}"
WEB_URL="${WEB_URL%/}"
ATTEMPTS="${SMOKE_ATTEMPTS:-30}"
DELAY="${SMOKE_DELAY:-10}"

check() {
  local health products web_code
  health="$(curl -fsS --max-time 10 "$API_URL/health" 2>/dev/null)" || { echo "  /health lỗi"; return 1; }
  echo "$health" | grep -q '"status":"ok"' || { echo "  /health không ok: $health"; return 1; }
  if [ -n "$EXPECTED" ] && ! echo "$health" | grep -q "\"version\":\"$EXPECTED\""; then
    echo "  version chưa khớp (cần $EXPECTED): $health"; return 1
  fi
  products="$(curl -fsS --max-time 10 "$API_URL/products" 2>/dev/null)" || { echo "  /products lỗi"; return 1; }
  echo "$products" | grep -q '"id"' || { echo "  /products rỗng"; return 1; }
  web_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$WEB_URL/")"
  [ "$web_code" = "200" ] || { echo "  web trả $web_code"; return 1; }
  return 0
}

for i in $(seq 1 "$ATTEMPTS"); do
  echo "Smoke test lần $i/$ATTEMPTS"
  if check; then echo "SMOKE TEST PASSED"; exit 0; fi
  sleep "$DELAY"
done
echo "SMOKE TEST FAILED"
exit 1
