#!/bin/bash
# Test the re-launch fixes
set -o pipefail

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export TERM="${TERM:-xterm-256color}"
export COLORTERM="${COLORTERM:-truecolor}"
export OPENTUI_FORCE_WCWIDTH=true
export OPENTUI_NO_GRAPHICS=true

BUN="$HOME/.bun/bin/bun"
OC_PKG="$HOME/opencode/packages/opencode"
LOG="$HOME/.local/share/opencode/log/dev.log"

echo "=== Testing Re-launch Fixes ==="
echo "Date: $(date)"
echo ""

# Clean state
pkill -9 -f 'bun.*index.ts' 2>/dev/null
pkill -9 -f 'bun run' 2>/dev/null
sleep 2
rm -f "$LOG"
cd "$OC_PKG"

# Verify the signal handlers are in the source
echo "--- Verify source patches ---"
if grep -q 'for (const signal of' src/index.ts; then
    echo "[OK] Signal handlers found in index.ts"
else
    echo "[FAIL] Signal handlers NOT found in index.ts"
fi
if grep -q 'resolve()' src/cli/cmd/serve.ts; then
    echo "[OK] serve.ts uses signal-based exit"
else
    echo "[FAIL] serve.ts still uses infinite promise"
fi
echo ""

# TEST 1: serve mode + SIGINT should now work
echo "--- Test 1: SIGINT on serve mode ---"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /dev/null 2>&1 &
PID1=$!
echo "Started serve PID=$PID1"

# Wait for bootstrap
for i in $(seq 1 45); do
    if grep -q "opencode" "$LOG" 2>/dev/null; then
        echo "Bootstrap started after ${i}s"
        break
    fi
    sleep 1
done
sleep 5

echo "Sending SIGINT..."
kill -INT $PID1 2>/dev/null
sleep 3
if kill -0 $PID1 2>/dev/null; then
    echo "[FAIL] Process survived SIGINT"
    kill -9 $PID1 2>/dev/null
    wait $PID1 2>/dev/null
else
    wait $PID1 2>/dev/null
    echo "[OK] Process exited on SIGINT (exit: $?)"
fi
echo ""

# TEST 2: serve mode + SIGTERM
echo "--- Test 2: SIGTERM on serve mode ---"
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /dev/null 2>&1 &
PID2=$!
echo "Started serve PID=$PID2"
for i in $(seq 1 45); do
    if grep -q "opencode" "$LOG" 2>/dev/null; then
        echo "Bootstrap started after ${i}s"
        break
    fi
    sleep 1
done
sleep 5

echo "Sending SIGTERM..."
kill -TERM $PID2 2>/dev/null
sleep 3
if kill -0 $PID2 2>/dev/null; then
    echo "[FAIL] Process survived SIGTERM"
    kill -9 $PID2 2>/dev/null
    wait $PID2 2>/dev/null
else
    wait $PID2 2>/dev/null
    echo "[OK] Process exited on SIGTERM (exit: $?)"
fi
echo ""

# TEST 3: serve twice in succession
echo "--- Test 3: Serve twice in succession ---"
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /tmp/oc-fix-s1.log 2>&1 &
PID3=$!
for i in $(seq 1 45); do
    if grep -q "opencode" "$LOG" 2>/dev/null; then break; fi
    sleep 1
done
sleep 5
echo "Run 1 started (PID=$PID3), killing with SIGTERM..."
kill -TERM $PID3 2>/dev/null
sleep 3
wait $PID3 2>/dev/null
echo "Run 1 stdout: $(cat /tmp/oc-fix-s1.log 2>/dev/null)"

echo "Starting run 2 immediately..."
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /tmp/oc-fix-s2.log 2>&1 &
PID4=$!
for i in $(seq 1 45); do
    if grep -q "opencode" "$LOG" 2>/dev/null; then break; fi
    sleep 1
done
sleep 5

if kill -0 $PID4 2>/dev/null; then
    echo "[OK] Run 2 started successfully (PID=$PID4)"
    echo "Run 2 stdout: $(cat /tmp/oc-fix-s2.log 2>/dev/null)"
    kill -TERM $PID4 2>/dev/null
    sleep 2
    kill -9 $PID4 2>/dev/null
    wait $PID4 2>/dev/null
else
    echo "[FAIL] Run 2 failed or exited early"
    echo "Run 2 stdout: $(cat /tmp/oc-fix-s2.log 2>/dev/null)"
fi
echo ""

# TEST 4: TUI mode + SIGINT
echo "--- Test 4: SIGINT on TUI mode ---"
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts > /dev/null 2>&1 &
PID5=$!
echo "Started TUI PID=$PID5"
sleep 35

echo "Sending SIGINT..."
kill -INT $PID5 2>/dev/null
sleep 3
if kill -0 $PID5 2>/dev/null; then
    echo "[FAIL] TUI process survived SIGINT"
    kill -9 $PID5 2>/dev/null
    wait $PID5 2>/dev/null
else
    wait $PID5 2>/dev/null
    echo "[OK] TUI process exited on SIGINT (exit: $?)"
fi

# Final zombie check
echo ""
echo "--- Final zombie check ---"
ZOMBIES=$(ps aux 2>/dev/null | grep -E 'bun.*index.ts|bun run' | grep -v grep)
if [ -n "$ZOMBIES" ]; then
    echo "[FAIL] Zombie processes found:"
    echo "$ZOMBIES"
    pkill -9 -f 'bun.*index.ts' 2>/dev/null
else
    echo "[OK] No zombie processes"
fi

# Check error log
echo ""
echo "--- Error log check ---"
grep "ERROR" "$LOG" 2>/dev/null | grep -v "opencode-anthropic-auth" | head -5 || echo "[OK] No non-plugin errors"

echo ""
echo "=== TESTS COMPLETE ==="
