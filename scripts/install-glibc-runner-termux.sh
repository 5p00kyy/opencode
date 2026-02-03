#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode glibc-runner Setup Script for Termux Host
# ===================================================
# This script installs glibc-runner (grun) on the Termux host
# to run Bun without proot overhead.
#
# Usage:
#   Run from Termux host (NOT inside proot):
#   bash /path/to/install-glibc-runner.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux on the host (not inside proot)"
fi

# Check if we're inside proot (should NOT be)
if [ -f /proc/1/comm ] && grep -q "proot" /proc/1/comm 2>/dev/null; then
    warn "You appear to be inside proot. This script should run on the Termux host."
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

info "Installing glibc-runner on Termux host..."

# Update packages
info "Updating package lists..."
pkg update -y || warn "Failed to update packages"

# Install required dependencies
info "Installing dependencies..."
pkg install -y glibc-repo || warn "glibc-repo already installed or not available"
pkg install -y glibc glibc-runner strace || error "Failed to install glibc packages"

# Verify installation
if command -v grun &> /dev/null; then
    success "glibc-runner (grun) installed successfully"
    grun --help 2>&1 | head -5
else
    error "grun command not found after installation"
fi

# Create wrapper script for Bun
info "Creating Bun wrapper script..."
BUN_WRAPPER="$HOME/.local/bin/bun-grun"
mkdir -p "$HOME/.local/bin"

cat > "$BUN_WRAPPER" << 'BUN_WRAPPER'
#!/data/data/com.termux/files/usr/bin/bash
# Bun wrapper using glibc-runner
# Usage: bun-grun [bun-args]

# Unset LD_PRELOAD to avoid Bionic conflicts
unset LD_PRELOAD

# Run bun via glibc-runner
exec grun "$HOME/.bun/bin/bun" "$@"
BUN_WRAPPER

chmod +x "$BUN_WRAPPER"
success "Bun wrapper created at $BUN_WRAPPER"

# Add to PATH if needed
SHELL_RC="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

if ! grep -q "bun-grun" "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# Bun via glibc-runner' >> "$SHELL_RC"
    echo 'alias bun-grun="$HOME/.local/bin/bun-grun"' >> "$SHELL_RC"
    info "Added bun-grun alias to $SHELL_RC"
fi

# Create diagnostic script
DIAG_SCRIPT="$HOME/.local/bin/diagnose-bun-network.sh"
cat > "$DIAG_SCRIPT" << 'DIAG_SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
# Diagnose Bun network issues with glibc-runner

set -e

echo "=== Bun Network Diagnostics ==="
echo ""
echo "1. System Info:"
echo "   Termux version: ${TERMUX_VERSION:-unknown}"
echo "   Architecture: $(uname -m)"
echo ""

echo "2. DNS Configuration:"
echo "   /etc/resolv.conf:"
cat /etc/resolv.conf 2>/dev/null | sed 's/^/   /' || echo "   (file not found)"
echo ""

echo "3. Network connectivity test:"
ping -c 1 8.8.8.8 2>&1 | head -2 | sed 's/^/   /' || echo "   (ping failed)"
echo ""

echo "4. Testing Bun via glibc-runner..."
echo "   Command: grun ~/.bun/bin/bun --version"
grun "$HOME/.bun/bin/bun" --version 2>&1 | sed 's/^/   /' || echo "   (failed)"
echo ""

echo "5. Testing package fetch..."
echo "   Command: grun ~/.bun/bin/bun pm ping"
grun "$HOME/.bun/bin/bun" pm ping 2>&1 | head -5 | sed 's/^/   /' || echo "   (failed)"
echo ""

echo "6. Checking glibc DNS:"
ls -la $PREFIX/glibc/etc/resolv.conf 2>/dev/null | sed 's/^/   /' || echo "   (not found)"
echo ""

echo "=== Diagnostics Complete ==="
echo ""
echo "If network tests fail, try:"
echo "  1. Check /etc/resolv.conf exists and has nameservers"
echo "  2. Copy resolv.conf to glibc location:"
echo "     cp /etc/resolv.conf $PREFIX/glibc/etc/resolv.conf"
echo "  3. Test again with: bun-grun --version"
DIAG_SCRIPT

chmod +x "$DIAG_SCRIPT"
success "Diagnostic script created at $DIAG_SCRIPT"

# Create strace debugging script
STRACE_SCRIPT="$HOME/.local/bin/strace-bun.sh"
cat > "$STRACE_SCRIPT" << 'STRACE_SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
# Run Bun with strace to debug network issues
# Usage: strace-bun.sh [bun-args]

LOGFILE="$HOME/bun-strace.log"
echo "Running strace on Bun..."
echo "Log will be saved to: $LOGFILE"
echo ""

# Run with strace, focusing on network-related syscalls
strace -f -e trace=network,file,process -o "$LOGFILE" \
    grun "$HOME/.bun/bin/bun" "$@" 2>&1 | head -50

echo ""
echo "Strace complete. Log saved to: $LOGFILE"
echo "View with: tail -100 $LOGFILE"
STRACE_SCRIPT

chmod +x "$STRACE_SCRIPT"
success "Strace script created at $STRACE_SCRIPT"

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  glibc-runner Setup Complete${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your shell or run: source $SHELL_RC"
echo "  2. Test Bun with: bun-grun --version"
echo "  3. Run diagnostics: diagnose-bun-network.sh"
echo "  4. If network fails, check/fix DNS:"
echo "     cp /etc/resolv.conf \$PREFIX/glibc/etc/resolv.conf"
echo ""
echo "Troubleshooting:"
echo "  - strace-bun.sh --version    # Debug network issues"
echo "  - diagnose-bun-network.sh     # Run diagnostics"
echo ""
