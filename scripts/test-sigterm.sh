#!/bin/bash
# Test: What happens when TUI is running and user tries to launch again
# This simulates the real user scenario

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export TERM="${TERM:-xterm-256color}"
export COLORTERM="${COLORTERM:-truecolor}"
export OPENTUI_FORCE_WCWIDTH=true
export OPENTUI_NO_GRAPHICS=true

BUN="$HOME/.bun/bin/bun"
OC_PKG="$HOME/opencode/packages/opencode"
LOG="$HOME/.local/share/opencode/log/dev.log"

# Clean start
pkill -9 -f 'bun.*index.ts' 2>/dev/null
pkill -9 -f 'bun run' 2>/dev/null
sleep 2
rm -f "$LOG"
cd "$OC_PKG"

echo "=== SIGTERM Test ==="
echo ""

# Test 1: Does bun handle SIGINT (Ctrl+C)?
echo "--- Test: SIGINT handling ---"
$BUN run --conditions=browser ./src/index.ts serve --port 4096 > /dev/null 2>&1 &
PID=$!
echo "Started serve PID=$PID"
sleep 35  # Wait for full bootstrap
echo "Sending SIGINT..."
kill -INT $PID 2>/dev/null
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "RESULT: SIGINT IGNORED - process still alive"
else
    echo "RESULT: SIGINT worked - process exited"
fi

echo "Sending SIGTERM..."
kill -TERM $PID 2>/dev/null
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "RESULT: SIGTERM IGNORED - process still alive"
else
    echo "RESULT: SIGTERM worked - process exited"
fi

echo "Sending SIGHUP..."
kill -HUP $PID 2>/dev/null
sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "RESULT: SIGHUP IGNORED - process still alive"
    echo "Only SIGKILL works."
    kill -9 $PID 2>/dev/null
    wait $PID 2>/dev/null
else
    echo "RESULT: SIGHUP worked - process exited"
fi
sleep 2
echo ""

# Test 2: Run TUI, simulate user exit, then run again
echo "--- Test: Zombie conflict simulation ---"
echo "Starting TUI (run 1)..."
$BUN run --conditions=browser ./src/index.ts > /dev/null 2>&1 &
PID1=$!
echo "TUI PID=$PID1"
sleep 35

echo "Simulating user Ctrl+C (SIGINT to process group)..."
kill -INT $PID1 2>/dev/null
sleep 3
ALIVE1=$(kill -0 $PID1 2>/dev/null && echo YES || echo NO)
echo "Run 1 process still alive: $ALIVE1"

echo ""
echo "Starting TUI (run 2) while run 1 may still be alive..."
$BUN run --conditions=browser ./src/index.ts > /tmp/oc-conflict.log 2>&1 &
PID2=$!
echo "TUI run 2 PID=$PID2"
sleep 35

ALIVE2=$(kill -0 $PID2 2>/dev/null && echo YES || echo NO)
echo "Run 2 process alive: $ALIVE2"
echo "Run 2 stdout: $(cat /tmp/oc-conflict.log 2>/dev/null | head -5)"
echo ""

echo "Check for port conflicts:"
cat "$LOG" 2>/dev/null | grep -i "EADDRINUSE\|address.*in.*use\|already.*listening\|bind.*fail" | head -5 || echo "No port conflict errors in log"

echo ""
echo "Check all bun processes:"
ps aux 2>/dev/null | grep bun | grep -v grep | head -10 || echo "none"

# Cleanup
echo ""
echo "Cleaning up..."
pkill -9 -f 'bun.*index.ts' 2>/dev/null
pkill -9 -f 'bun run' 2>/dev/null
sleep 2
echo "Final process check:"
ps aux 2>/dev/null | grep bun | grep -v grep || echo "All clean"

echo ""
echo "=== Full log from test ==="
cat "$LOG" 2>/dev/null | grep -E "ERROR|WARN|server.*listen|EADDRINUSE|address|exception" | head -20 || echo "(no relevant log entries)"

echo ""
echo "=== TEST COMPLETE ==="
