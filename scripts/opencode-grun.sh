#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode Launcher via glibc-runner
# ===================================
# Run OpenCode without proot using glibc-runner
#
# Usage:
#   opencode-grun [args]     # Run from opencode directory
#

# Unset LD_PRELOAD to avoid Bionic libc conflicts
unset LD_PRELOAD

# Set environment for glibc
export PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
export PATH="$PREFIX/glibc/bin:$PATH"

# OpenCode directory
OPENCODE_DIR="${OPENCODE_DIR:-$HOME/opencode}"

# Check if we're in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    echo "Error: This script must be run in Termux"
    exit 1
fi

# Check if grun is installed
if ! command -v grun &> /dev/null; then
    echo "Error: grun (glibc-runner) not found"
    echo "Install with: bash /path/to/install-glibc-runner-termux.sh"
    exit 1
fi

# Check if Bun is installed via grun
if ! grun "$HOME/.bun/bin/bun" --version &> /dev/null; then
    echo "Error: Bun not working via glibc-runner"
    echo "Try fixing DNS: bash /path/to/fix-glibc-dns.sh"
    exit 1
fi

# Check if opencode directory exists
if [ ! -d "$OPENCODE_DIR" ]; then
    echo "Error: OpenCode directory not found at $OPENCODE_DIR"
    exit 1
fi

# Run OpenCode via glibc-runner
cd "$OPENCODE_DIR"
exec grun "$HOME/.bun/bin/bun" run --cwd packages/opencode --conditions=browser ./src/index.ts "$@"
