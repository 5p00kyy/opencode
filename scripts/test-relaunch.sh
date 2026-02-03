#!/bin/bash
# Test script to diagnose TUI re-launch issues
# Run inside proot on device
set -o pipefail

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export TERM="${TERM:-xterm-256color}"
export COLORTERM="${COLORTERM:-truecolor}"
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
export OPENTUI_FORCE_WCWIDTH=true
export OPENTUI_NO_GRAPHICS=true

BUN="$HOME/.bun/bin/bun"
OC_DIR="$HOME/opencode"
OC_PKG="$OC_DIR/packages/opencode"
LOG="$HOME/.local/share/opencode/log/dev.log"

echo "=== OpenCode Re-launch Diagnostic ==="
echo "Date: $(date)"
echo "Bun: $($BUN --version 2>&1)"
echo ""

# Kill everything first
echo "=== Cleanup ==="
pkill -9 -f 'bun.*index.ts' 2>/dev/null
pkill -9 -f 'bun run' 2>/dev/null
sleep 2
rm -f "$LOG"
echo "Clean"
echo ""

cd "$OC_PKG"

# ---- TEST 1: Serve mode, run twice ----
echo "=== TEST 1a: Serve mode (first launch, 45s wait) ==="
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /tmp/oc-serve1.log 2>&1 &
PID1=$!
echo "Started PID=$PID1, waiting 45s for bootstrap..."

# Poll for port to become available
for i in $(seq 1 45); do
    if ss -tlnp 2>/dev/null | grep -q ':4096'; then
        echo "Port 4096 bound after ${i}s"
        break
    fi
    sleep 1
done

PORT_BOUND=$(ss -tlnp 2>/dev/null | grep ':4096')
if [ -n "$PORT_BOUND" ]; then
    echo "RESULT: Server started successfully"
    echo "Health: $(curl -s http://127.0.0.1:4096/global/health 2>/dev/null || echo FAILED)"
else
    echo "RESULT: Server FAILED to bind port 4096 after 45s"
    echo "Process alive: $(kill -0 $PID1 2>/dev/null && echo YES || echo NO)"
fi
echo "stdout: $(cat /tmp/oc-serve1.log 2>/dev/null)"
echo ""

# Kill and wait
echo "Killing serve (PID $PID1)..."
kill $PID1 2>/dev/null
sleep 1
kill -9 $PID1 2>/dev/null
wait $PID1 2>/dev/null

# Check port release
echo "Waiting for port release..."
for i in $(seq 1 10); do
    if ! ss -tlnp 2>/dev/null | grep -q ':4096'; then
        echo "Port 4096 freed after ${i}s"
        break
    fi
    sleep 1
done

# Check for zombie processes
echo "Zombie check:"
ZOMBIES=$(ps aux 2>/dev/null | grep -E 'bun.*index.ts|bun run' | grep -v grep)
if [ -n "$ZOMBIES" ]; then
    echo "WARNING: Found zombie bun processes!"
    echo "$ZOMBIES"
    pkill -9 -f 'bun.*index.ts' 2>/dev/null
    pkill -9 -f 'bun run' 2>/dev/null
    sleep 2
else
    echo "Clean - no zombies"
fi
echo ""

echo "=== TEST 1b: Serve mode (SECOND launch) ==="
rm -f "$LOG"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /tmp/oc-serve2.log 2>&1 &
PID2=$!
echo "Started PID=$PID2, waiting 45s..."

for i in $(seq 1 45); do
    if ss -tlnp 2>/dev/null | grep -q ':4096'; then
        echo "Port 4096 bound after ${i}s"
        break
    fi
    sleep 1
done

PORT_BOUND2=$(ss -tlnp 2>/dev/null | grep ':4096')
if [ -n "$PORT_BOUND2" ]; then
    echo "RESULT: SECOND serve started successfully"
    echo "Health: $(curl -s http://127.0.0.1:4096/global/health 2>/dev/null || echo FAILED)"
else
    echo "RESULT: SECOND serve FAILED"
    echo "Process alive: $(kill -0 $PID2 2>/dev/null && echo YES || echo NO)"
fi
echo "stdout: $(cat /tmp/oc-serve2.log 2>/dev/null)"
echo ""

# Kill and cleanup
kill $PID2 2>/dev/null
sleep 1
kill -9 $PID2 2>/dev/null
wait $PID2 2>/dev/null
pkill -9 -f 'bun.*index.ts' 2>/dev/null
sleep 2
echo ""

# ---- TEST 2: TUI mode background process test ----
echo "=== TEST 2: TUI process lifecycle ==="
rm -f "$LOG"
echo "Starting TUI mode in background (will be killed after 30s)..."
$BUN run --conditions=browser ./src/index.ts > /tmp/oc-tui1.log 2>&1 &
PID3=$!
echo "TUI PID=$PID3"
sleep 30

echo "After 30s:"
echo "  Process alive: $(kill -0 $PID3 2>/dev/null && echo YES || echo NO)"
echo "  Log lines: $(wc -l < "$LOG" 2>/dev/null || echo 0)"
echo "  Log tail:"
tail -5 "$LOG" 2>/dev/null | sed 's/^/    /'
echo ""

echo "Sending SIGTERM to TUI..."
kill $PID3 2>/dev/null
sleep 3
echo "After SIGTERM:"
echo "  Process alive: $(kill -0 $PID3 2>/dev/null && echo YES || echo NO)"

echo "Sending SIGKILL..."
kill -9 $PID3 2>/dev/null
wait $PID3 2>/dev/null
sleep 2

echo "After SIGKILL:"
ALL_BUNS=$(ps aux 2>/dev/null | grep -E 'bun' | grep -v grep)
if [ -n "$ALL_BUNS" ]; then
    echo "  WARNING: Bun processes still alive!"
    echo "$ALL_BUNS" | sed 's/^/    /'
else
    echo "  Clean - all bun processes dead"
fi
echo ""

echo "Checking port state:"
ss -tlnp 2>/dev/null | grep ':4096' || echo "  Port 4096 free"
echo ""

# ---- TEST 3: Check what the TUI log shows ----
echo "=== TEST 3: TUI log analysis ==="
echo "Total log lines: $(wc -l < "$LOG" 2>/dev/null || echo 0)"
echo "Errors:"
grep -c "ERROR" "$LOG" 2>/dev/null || echo "0"
echo "Error details:"
grep "ERROR" "$LOG" 2>/dev/null | head -5 | sed 's/^/  /'
echo ""

# Final cleanup
pkill -9 -f 'bun.*index.ts' 2>/dev/null
pkill -9 -f 'bun run' 2>/dev/null

echo "=== DIAGNOSTIC COMPLETE ==="
