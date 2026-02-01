#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode Termux Installation Script
# ====================================
# This script installs OpenCode on Termux ARM64 (Android)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux.sh | bash
#
# Options:
#   --reinstall    Force a fresh installation (removes existing installation)
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

# Parse arguments
REINSTALL=false
for arg in "$@"; do
    case $arg in
        --reinstall)
            REINSTALL=true
            shift
            ;;
        --help|-h)
            echo "OpenCode Termux Installation Script"
            echo ""
            echo "Usage:"
            echo "  curl -fsSL <url> | bash"
            echo "  curl -fsSL <url> | bash -s -- --reinstall"
            echo ""
            echo "Options:"
            echo "  --reinstall    Force a fresh installation (removes existing)"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
    esac
done

# Banner
echo ""
echo -e "${BLUE}+----------------------------------------------------------+${NC}"
echo -e "${BLUE}|${NC}          ${GREEN}OpenCode Termux Installation${NC}                    ${BLUE}|${NC}"
echo -e "${BLUE}|${NC}          ARM64 Native Support                           ${BLUE}|${NC}"
echo -e "${BLUE}+----------------------------------------------------------+${NC}"
echo ""

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux on Android"
fi

# Installation directory
INSTALL_DIR="$HOME/opencode"
REPO_URL="https://github.com/5p00kyy/opencode.git"
BRANCH="termux-arm64"

# Handle --reinstall flag
if [ "$REINSTALL" = true ] && [ -d "$INSTALL_DIR" ]; then
    warn "Reinstall requested. Removing existing installation..."
    rm -rf "$INSTALL_DIR"
    # Also remove old launcher
    rm -f "$HOME/.local/bin/opencode" 2>/dev/null || true
    rm -f "$HOME/bin/opencode" 2>/dev/null || true
    rm -f "$PREFIX/bin/opencode" 2>/dev/null || true
    success "Old installation removed"
fi

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
pkg install -y clang ripgrep fd 2>/dev/null || warn "Some optional packages failed to install"
success "Optional packages installed"

# Step 5: Clone or update the repository
if [ -d "$INSTALL_DIR" ]; then
    info "Updating existing OpenCode installation..."
    cd "$INSTALL_DIR" || error "Failed to enter installation directory"
    git fetch origin "$BRANCH" || error "Failed to fetch updates"
    git checkout "$BRANCH" || error "Failed to checkout branch"
    git pull origin "$BRANCH" || error "Failed to pull updates"
    success "OpenCode updated"
else
    info "Cloning OpenCode repository..."
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    if [ $? -ne 0 ]; then
        error "Failed to clone repository"
    fi
    # Verify clone succeeded
    if [ ! -d "$INSTALL_DIR/.git" ]; then
        error "Git clone failed - .git directory not found"
    fi
    success "OpenCode cloned"
fi

# Verify critical files exist
if [ ! -f "$INSTALL_DIR/packages/opencode/src/index.ts" ]; then
    error "Clone verification failed - source files not found at $INSTALL_DIR/packages/opencode/src/index.ts"
fi
success "Clone verification passed"

cd "$INSTALL_DIR/packages/opencode" || error "Failed to enter packages/opencode directory"

# Step 6: Use Termux-compatible package.json files (pre-resolved catalog: and workspace: references)
info "Setting up Termux-compatible package.json files..."

# Main opencode package
if [ -f "package.termux.json" ]; then
    cp package.json package.json.bak
    cp package.termux.json package.json
    success "Using Termux-compatible package.json for opencode"
else
    warn "package.termux.json not found, using original (may have issues)"
fi

# Workspace packages (util, plugin, sdk)
WORKSPACE_PACKAGES="util plugin sdk/js"
for pkg in $WORKSPACE_PACKAGES; do
    PKG_DIR="$INSTALL_DIR/packages/$pkg"
    if [ -f "$PKG_DIR/package.termux.json" ]; then
        cp "$PKG_DIR/package.json" "$PKG_DIR/package.json.bak"
        cp "$PKG_DIR/package.termux.json" "$PKG_DIR/package.json"
        success "Using Termux-compatible package.json for $pkg"
    fi
done

# Step 7: Disable workspace detection (prevent npm from reading root package.json catalog: refs)
info "Configuring npm to ignore workspace..."
# Remove the root package.json temporarily to prevent workspace detection
if [ -f "$INSTALL_DIR/package.json" ]; then
    mv "$INSTALL_DIR/package.json" "$INSTALL_DIR/package.json.workspace-bak"
fi

# Step 8: Install dependencies in workspace packages (in dependency order)
# This is required because npm doesn't auto-install deps inside file: referenced packages
info "Installing dependencies in workspace packages..."

# SDK first (no runtime deps, but install for completeness)
info "  Installing sdk/js dependencies..."
cd "$INSTALL_DIR/packages/sdk/js" || error "Failed to enter sdk/js directory"
npm install --legacy-peer-deps 2>&1 | tail -3 || warn "sdk/js install had issues"

# Util needs zod
info "  Installing util dependencies..."
cd "$INSTALL_DIR/packages/util" || error "Failed to enter util directory"
npm install --legacy-peer-deps 2>&1 | tail -3 || warn "util install had issues"

# Plugin needs zod and sdk
info "  Installing plugin dependencies..."
cd "$INSTALL_DIR/packages/plugin" || error "Failed to enter plugin directory"
npm install --legacy-peer-deps 2>&1 | tail -3 || warn "plugin install had issues"

success "Workspace package dependencies installed"

# Return to opencode directory
cd "$INSTALL_DIR/packages/opencode" || error "Failed to return to opencode directory"

# Step 9: Install main package npm dependencies
info "Installing main package dependencies (this may take a few minutes)..."
npm install --legacy-peer-deps 2>&1 | tail -20 || {
    warn "Standard install failed, trying with --force..."
    npm install --force 2>&1 | tail -20 || error "Failed to install dependencies"
}
success "Main package dependencies installed"

# Step 10: Try to install node-pty for terminal features (optional)
# Note: This must run BEFORE restoring original package.json to avoid catalog: errors
info "Attempting to install node-pty for terminal features..."
# Use --legacy-peer-deps to avoid zod version conflicts
# Capture exit status properly (don't pipe to tail which breaks exit code)
NPT_OUTPUT=$(npm install node-pty --legacy-peer-deps 2>&1) && NPT_STATUS=$? || NPT_STATUS=$?
if [ $NPT_STATUS -eq 0 ]; then
    success "node-pty installed - terminal features enabled"
else
    warn "node-pty installation failed - terminal features will be disabled"
    warn "This is normal on Termux. Core functionality will still work."
fi

# Step 11: Restore root package.json
if [ -f "$INSTALL_DIR/package.json.workspace-bak" ]; then
    mv "$INSTALL_DIR/package.json.workspace-bak" "$INSTALL_DIR/package.json"
fi

# Step 12: Restore original package.json files (for git consistency)
if [ -f "package.json.bak" ]; then
    mv package.json.bak package.json
fi

# Restore workspace packages
for pkg in $WORKSPACE_PACKAGES; do
    PKG_DIR="$INSTALL_DIR/packages/$pkg"
    if [ -f "$PKG_DIR/package.json.bak" ]; then
        mv "$PKG_DIR/package.json.bak" "$PKG_DIR/package.json"
    fi
done

# Step 13: Run compat layer tests
info "Running compatibility tests..."
TEST_LOG="${TMPDIR:-$PREFIX/tmp}/opencode-test.log"
mkdir -p "$(dirname "$TEST_LOG")" 2>/dev/null || true
if npx tsx test-compat-node.ts 2>&1 | tee "$TEST_LOG" | grep -q "0 failed"; then
    success "All compatibility tests passed!"
else
    cat "$TEST_LOG" 2>/dev/null || true
    warn "Some tests may have failed. Check output above for details."
fi
rm -f "$TEST_LOG" 2>/dev/null || true

# Step 14: Verify installation directory before creating launcher
if [ ! -d "$INSTALL_DIR/packages/opencode" ]; then
    error "Installation directory not found at $INSTALL_DIR/packages/opencode"
fi

if [ ! -f "$INSTALL_DIR/packages/opencode/src/index.ts" ]; then
    error "Entry point not found at $INSTALL_DIR/packages/opencode/src/index.ts"
fi

# Step 15: Create launcher script
info "Creating launcher script..."

# Ensure PREFIX is set (should be /data/data/com.termux/files/usr on Termux)
if [ -z "$PREFIX" ]; then
    PREFIX="/data/data/com.termux/files/usr"
fi

# Resolve absolute path for INSTALL_DIR (in case $HOME has symlinks)
RESOLVED_INSTALL_DIR="$(cd "$INSTALL_DIR" && pwd)"

# Try user directories first (more likely to succeed), then system directories
LAUNCHER_CREATED=false
for BIN_DIR in "$HOME/.local/bin" "$HOME/bin" "$PREFIX/bin"; do
    # Try to create the directory (suppress all errors)
    mkdir -p "$BIN_DIR" 2>/dev/null || continue
    
    LAUNCHER="$BIN_DIR/opencode"
    
    # Try to create the launcher file using a subshell to capture all errors
    # Use the resolved absolute path, not $HOME expansion
    if ( cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/data/data/com.termux/files/usr/bin/bash
# OpenCode Launcher for Termux
LAUNCHER_EOF
    ) 2>/dev/null; then
        # Append the dynamic parts (these expand at install time, not runtime)
        echo "OPENCODE_DIR=\"$RESOLVED_INSTALL_DIR/packages/opencode\"" >> "$LAUNCHER"
        cat >> "$LAUNCHER" << 'LAUNCHER_EOF'
if [ ! -d "$OPENCODE_DIR" ]; then
    echo "Error: OpenCode directory not found at $OPENCODE_DIR"
    echo "Please reinstall with: curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux.sh | bash -s -- --reinstall"
    exit 1
fi
cd "$OPENCODE_DIR" || exit 1
exec npx tsx ./src/index.ts "$@"
LAUNCHER_EOF
        chmod +x "$LAUNCHER" 2>/dev/null
        success "Launcher created at $LAUNCHER"
        LAUNCHER_CREATED=true
        
        # Add to PATH if using non-standard location
        if [ "$BIN_DIR" != "$PREFIX/bin" ]; then
            if ! grep -q "PATH.*$BIN_DIR" "$HOME/.bashrc" 2>/dev/null; then
                echo "" >> "$HOME/.bashrc"
                echo "# Added by OpenCode installer" >> "$HOME/.bashrc"
                echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$HOME/.bashrc"
                info "Added $BIN_DIR to PATH in .bashrc"
            fi
        fi
        break
    fi
done

if [ "$LAUNCHER_CREATED" = false ]; then
    warn "Could not create launcher in any standard location"
    warn "You can run OpenCode manually with:"
    warn "  cd $INSTALL_DIR/packages/opencode && npx tsx ./src/index.ts"
fi

# Step 16: Create alias in shell config
if [ "$LAUNCHER_CREATED" = true ]; then
    info "Adding shell alias..."
    SHELL_RC="$HOME/.bashrc"
    if [ -f "$HOME/.zshrc" ]; then
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
fi

# Done!
echo ""
echo -e "${GREEN}+----------------------------------------------------------+${NC}"
echo -e "${GREEN}|${NC}          Installation Complete!                          ${GREEN}|${NC}"
echo -e "${GREEN}+----------------------------------------------------------+${NC}"
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
echo -e "To reinstall: ${BLUE}curl -fsSL <url> | bash -s -- --reinstall${NC}"
echo ""

# Offer to restart shell
read -p "Restart shell to apply changes? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec $SHELL -l
fi
