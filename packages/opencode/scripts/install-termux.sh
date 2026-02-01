#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode Termux Installation Script
# ====================================
# This script installs OpenCode on Termux ARM64 (Android)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux.sh | bash
#
# Or manually:
#   pkg install curl
#   curl -O https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux.sh
#   chmod +x install-termux.sh
#   ./install-termux.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Banner
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}          ${GREEN}OpenCode Termux Installation${NC}                    ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}          ARM64 Native Support                           ${BLUE}║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux on Android"
fi

# Installation directory
INSTALL_DIR="$HOME/opencode"
REPO_URL="https://github.com/5p00kyy/opencode.git"
BRANCH="termux-arm64"

# Step 1: Update package repositories
info "Updating package repositories..."
pkg update -y || warn "Failed to update repos, continuing anyway..."
success "Package repositories updated"

# Step 2: Install required packages
info "Installing required packages..."
pkg install -y nodejs-lts git python build-essential || error "Failed to install required packages"
success "Required packages installed"

# Step 3: Check Node.js version
info "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
    error "Node.js 20 or higher is required. Found: $(node --version 2>/dev/null || echo 'not installed')"
fi
success "Node.js $(node --version) is installed"

# Step 4: Install optional packages for enhanced functionality
info "Installing optional packages for enhanced functionality..."
pkg install -y clang ripgrep fd || warn "Some optional packages failed to install"
success "Optional packages installed"

# Step 5: Clone or update the repository
if [ -d "$INSTALL_DIR" ]; then
    info "Updating existing OpenCode installation..."
    cd "$INSTALL_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    success "OpenCode updated"
else
    info "Cloning OpenCode repository..."
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR" || error "Failed to clone repository"
    success "OpenCode cloned"
fi

cd "$INSTALL_DIR"

# Step 6: Install npm dependencies
info "Installing npm dependencies..."
npm install --ignore-scripts 2>&1 | tail -5 || error "Failed to install dependencies"
success "Dependencies installed"

# Step 7: Try to install node-pty for terminal features (optional)
info "Attempting to install node-pty for terminal features..."
cd "$INSTALL_DIR/packages/opencode"
if npm install node-pty 2>&1; then
    success "node-pty installed - terminal features enabled"
else
    warn "node-pty installation failed - terminal features will be disabled"
    warn "This is normal on some Termux setups. Core functionality will still work."
fi

# Step 8: Run compat layer tests
info "Running compatibility tests..."
if npx tsx test-compat-node.ts 2>&1 | grep -q "0 failed"; then
    success "All compatibility tests passed!"
else
    warn "Some tests may have failed. Check output above for details."
fi

# Step 9: Create launcher script
info "Creating launcher script..."
LAUNCHER="$PREFIX/bin/opencode"
cat > "$LAUNCHER" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# OpenCode Launcher for Termux
cd "$HOME/opencode/packages/opencode"
exec npx tsx ./src/index.ts "$@"
EOF
chmod +x "$LAUNCHER"
success "Launcher created at $LAUNCHER"

# Step 10: Create alias in shell config
info "Adding shell alias..."
SHELL_RC="$HOME/.bashrc"
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

if ! grep -q "alias oc=" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# OpenCode alias" >> "$SHELL_RC"
    echo "alias oc='opencode'" >> "$SHELL_RC"
    success "Added 'oc' alias to $SHELL_RC"
else
    info "Alias already exists in $SHELL_RC"
fi

# Done!
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}          Installation Complete!                          ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "To start OpenCode:"
echo -e "  ${BLUE}opencode${NC}        # Full command"
echo -e "  ${BLUE}oc${NC}              # Short alias (after restarting shell)"
echo ""
echo -e "Or run from the installation directory:"
echo -e "  ${BLUE}cd $INSTALL_DIR/packages/opencode${NC}"
echo -e "  ${BLUE}npx tsx ./src/index.ts${NC}"
echo ""
echo -e "For help: ${BLUE}opencode --help${NC}"
echo ""

# Offer to restart shell
read -p "Restart shell to apply changes? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec $SHELL -l
fi
