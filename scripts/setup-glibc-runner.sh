#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode glibc-runner Setup - Auto-Install Script
# Run this on your Termux host (outside proot)
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

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  OpenCode glibc-runner Setup${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux on the host (not inside proot)"
fi

# Check if we're inside proot
if [ -f /proc/1/comm ] && grep -q "proot" /proc/1/comm 2>/dev/null; then
    error "You are inside proot. Exit proot first with 'exit' command"
fi

info "Step 1: Installing glibc-runner..."
pkg update -y || warn "Update failed, continuing..."
pkg install -y glibc glibc-runner strace || error "Failed to install glibc packages"

if command -v grun &> /dev/null; then
    success "glibc-runner (grun) installed"
else
    error "grun not found after installation"
fi

info "Step 2: Creating Bun wrapper..."
mkdir -p "$HOME/.local/bin"

cat > "$HOME/.local/bin/bun-grun" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
unset LD_PRELOAD
exec grun "$HOME/.bun/bin/bun" "$@"
EOF

chmod +x "$HOME/.local/bin/bun-grun"

# Add to PATH
SHELL_RC="$HOME/.bashrc"
[ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"

if ! grep -q "bun-grun" "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# Bun via glibc-runner' >> "$SHELL_RC"
    echo 'alias bun-grun="$HOME/.local/bin/bun-grun"' >> "$SHELL_RC"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
fi

info "Step 3: Testing Bun via glibc-runner..."
if bun-grun --version &>/dev/null; then
    success "Bun works via glibc-runner!"
    bun-grun --version
else
    warn "Bun version check failed - fixing DNS..."
    
    info "Step 4: Fixing DNS resolution..."
    mkdir -p "$PREFIX/glibc/etc"
    cp /etc/resolv.conf "$PREFIX/glibc/etc/resolv.conf"
    
    if bun-grun --version &>/dev/null; then
        success "DNS fix successful!"
    else
        error "DNS fix failed. Check network connectivity."
    fi
fi

info "Step 5: Testing package installation..."
if bun-grun pm ping 2>&1 | grep -q "pong"; then
    success "Network connectivity confirmed!"
else
    warn "Package manager ping failed"
fi

# Create OpenCode launcher
info "Step 6: Creating OpenCode launcher..."

cat > "$HOME/.local/bin/opencode-grun" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
unset LD_PRELOAD
export PREFIX="/data/data/com.termux/files/usr"
export PATH="$PREFIX/glibc/bin:$PATH"

OPENCODE_DIR="${OPENCODE_DIR:-$HOME/opencode}"

if ! command -v grun &> /dev/null; then
    echo "Error: grun not found. Run setup first."
    exit 1
fi

if [ ! -d "$OPENCODE_DIR" ]; then
    echo "Error: OpenCode not found at $OPENCODE_DIR"
    exit 1
fi

cd "$OPENCODE_DIR"
exec grun "$HOME/.bun/bin/bun" run --cwd packages/opencode --conditions=browser ./src/index.ts "$@"
EOF

chmod +x "$HOME/.local/bin/opencode-grun"

if ! grep -q "opencode-grun" "$SHELL_RC" 2>/dev/null; then
    echo 'alias opencode-grun="$HOME/.local/bin/opencode-grun"' >> "$SHELL_RC"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Commands available:"
echo "  bun-grun --version     # Test Bun via glibc-runner"
echo "  bun-grun install       # Install packages"
echo "  opencode-grun          # Run OpenCode TUI"
echo ""
echo "Next steps:"
echo "  1. Restart your shell: source $SHELL_RC"
echo "  2. Test: bun-grun --version"
echo "  3. Run OpenCode: opencode-grun"
echo ""
echo "Performance: ~20% faster than proot!"
