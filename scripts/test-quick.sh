#!/bin/bash
# Quick focused test of the critical fix: SIGINT handling + re-launch
set -o pipefail

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export OPENTUI_FORCE_WCWIDTH=true
export OPENTUI_NO_GRAPHICS=true

BUN="$HOME/.bun/bin/bun"
LOG="$HOME/.local/share/opencode/log/dev.log"

pkill -9 -f 'bun.*index.ts' 2>/dev/null
sleep 1
rm -f "$LOG"
cd "$HOME/opencode/packages/opencode"

echo "=== Quick Fix Verification ==="

# Test: SIGINT kills serve mode
echo "1. Starting serve..."
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /dev/null 2>&1 &
P=$!
sleep 40
echo "   PID=$P alive=$(kill -0 $P 2>/dev/null && echo Y || echo N)"
echo "   Sending SIGINT..."
kill -INT $P 2>/dev/null
sleep 3
if kill -0 $P 2>/dev/null; then
    echo "   [FAIL] Survived SIGINT"
    kill -9 $P 2>/dev/null; wait $P 2>/dev/null
else
    echo "   [OK] Exited on SIGINT"
fi

# Test: Second serve immediately after
echo "2. Second serve (immediate re-launch)..."
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /tmp/s2.log 2>&1 &
P2=$!
sleep 40
A2=$(kill -0 $P2 2>/dev/null && echo Y || echo N)
S2=$(cat /tmp/s2.log 2>/dev/null)
echo "   PID=$P2 alive=$A2"
echo "   stdout: $S2"
if echo "$S2" | grep -q "listening"; then
    echo "   [OK] Second launch succeeded"
else
    echo "   [FAIL] Second launch failed"
fi
kill -TERM $P2 2>/dev/null; sleep 2; kill -9 $P2 2>/dev/null; wait $P2 2>/dev/null

# Test: SIGINT kills TUI mode
echo "3. TUI mode SIGINT test..."
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts > /dev/null 2>&1 &
P3=$!
sleep 35
echo "   PID=$P3 alive=$(kill -0 $P3 2>/dev/null && echo Y || echo N)"
echo "   Sending SIGINT..."
kill -INT $P3 2>/dev/null
sleep 3
if kill -0 $P3 2>/dev/null; then
    echo "   [FAIL] TUI survived SIGINT"
    kill -9 $P3 2>/dev/null; wait $P3 2>/dev/null
else
    echo "   [OK] TUI exited on SIGINT"
fi

# Final check
echo ""
echo "Zombie check:"
Z=$(ps aux 2>/dev/null | grep -E 'bun.*index' | grep -v grep)
[ -n "$Z" ] && echo "[FAIL] $Z" || echo "[OK] Clean"
echo ""
echo "=== DONE ==="
