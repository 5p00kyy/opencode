#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode Termux PRoot Installation Script
# ==========================================
# This script installs OpenCode on Termux using proot-distro
# for FULL Bun support (including TUI)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux-proot.sh | bash
#
# Options:
#   --reinstall    Force a fresh installation
#   --distro=NAME  Use specific distro (default: archlinux)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# Configuration
DISTRO="archlinux"
REINSTALL=false
REPO_URL="https://github.com/5p00kyy/opencode.git"
BRANCH="termux-arm64"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --reinstall)
            REINSTALL=true
            ;;
        --distro=*)
            DISTRO="${arg#*=}"
            ;;
        --help|-h)
            echo "OpenCode Termux PRoot Installation Script"
            echo ""
            echo "This installs OpenCode with full Bun support using proot-distro."
            echo ""
            echo "Usage:"
            echo "  curl -fsSL <url> | bash"
            echo "  curl -fsSL <url> | bash -s -- --reinstall"
            echo "  curl -fsSL <url> | bash -s -- --distro=debian"
            echo ""
            echo "Options:"
            echo "  --reinstall       Force a fresh installation"
            echo "  --distro=NAME     Use specific distro (default: archlinux)"
            echo "                    Supported: archlinux, ubuntu, debian, alpine"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "After installation:"
            echo "  opencode-proot          # Launch OpenCode in proot"
            echo "  opencode-proot serve    # Start headless server"
            echo "  proot-distro login $DISTRO  # Enter proot shell"
            exit 0
            ;;
    esac
done

# Banner
echo ""
echo -e "${BLUE}+----------------------------------------------------------+${NC}"
echo -e "${BLUE}|${NC}      ${GREEN}OpenCode Termux PRoot Installation${NC}                  ${BLUE}|${NC}"
echo -e "${BLUE}|${NC}      Full Bun Support via proot-distro                   ${BLUE}|${NC}"
echo -e "${BLUE}+----------------------------------------------------------+${NC}"
echo ""

# Check if running in Termux
if [ -z "$TERMUX_VERSION" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux on Android"
fi

# Ensure PREFIX is set
if [ -z "$PREFIX" ]; then
    PREFIX="/data/data/com.termux/files/usr"
fi

# ============================================================
# STEP 1: Install proot-distro
# ============================================================
step "1/7: Installing proot-distro..."

pkg update -y || warn "Failed to update repos, continuing..."

if ! command -v proot-distro &> /dev/null; then
    info "Installing proot-distro..."
    pkg install -y proot-distro || error "Failed to install proot-distro"
    success "proot-distro installed"
else
    success "proot-distro already installed"
fi

# ============================================================
# STEP 2: Install or update the Linux distribution
# ============================================================
step "2/7: Setting up $DISTRO distribution..."

# Check if distro is installed (proot-distro list shows installed distros)
DISTRO_INSTALLED=false
if proot-distro list 2>/dev/null | grep -qE "^${DISTRO}[[:space:]]|^${DISTRO}$"; then
    DISTRO_INSTALLED=true
fi

if [ "$REINSTALL" = true ] && [ "$DISTRO_INSTALLED" = true ]; then
    warn "Reinstall requested. Removing existing $DISTRO installation..."
    # proot-distro remove requires confirmation, use yes to auto-confirm
    yes | proot-distro remove "$DISTRO" 2>/dev/null || true
    DISTRO_INSTALLED=false
    success "Old $DISTRO removed"
fi

if [ "$DISTRO_INSTALLED" = false ]; then
    info "Installing $DISTRO (this may take a few minutes)..."
    proot-distro install "$DISTRO" || error "Failed to install $DISTRO"
    success "$DISTRO installed"
else
    success "$DISTRO already installed"
fi

# ============================================================
# STEP 3: Create proot setup script
# ============================================================
step "3/7: Creating proot environment setup script..."

PROOT_SETUP_SCRIPT="$HOME/.opencode-proot-setup.sh"

cat > "$PROOT_SETUP_SCRIPT" << 'SETUP_SCRIPT'
#!/bin/bash
#
# OpenCode PRoot Environment Setup
# This runs inside the proot environment
#

# Don't exit on error - we want to handle errors gracefully
set +e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

REPO_URL="__REPO_URL__"
BRANCH="__BRANCH__"
DISTRO_TYPE="__DISTRO__"
INSTALL_DIR="$HOME/opencode"
BUN_INSTALL="$HOME/.bun"

info "Running inside proot environment ($DISTRO_TYPE)..."

# ============================================================
# STEP A: Install system packages
# ============================================================
info "Installing system packages..."

if command -v pacman &> /dev/null; then
    # Arch Linux
    info "Detected Arch Linux, using pacman..."
    
    # Initialize pacman keyring (required in proot)
    info "Initializing pacman keyring (this may take a moment)..."
    pacman-key --init 2>&1 | tail -3
    pacman-key --populate archlinux 2>&1 | tail -3
    
    # Update and install essential packages
    info "Updating system..."
    pacman -Sy --noconfirm 2>&1 | tail -5
    
    info "Installing packages..."
    pacman -S --noconfirm --needed \
        base-devel \
        git \
        curl \
        wget \
        unzip \
        ripgrep \
        fd \
        jq \
        which \
        2>&1 | tail -10
    
    if [ $? -eq 0 ]; then
        success "System packages installed"
    else
        warn "Some packages may have failed, continuing..."
    fi
    
elif command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    info "Detected Debian/Ubuntu, using apt..."
    apt-get update -qq
    apt-get install -y curl git unzip build-essential ca-certificates ripgrep fd-find jq 2>&1 | tail -5
    success "System packages installed"
    
elif command -v apk &> /dev/null; then
    # Alpine
    info "Detected Alpine, using apk..."
    apk update
    apk add --no-cache curl git unzip build-base ca-certificates ripgrep fd jq bash
    success "System packages installed"
    
else
    warn "Unknown package manager, skipping system packages"
fi

# ============================================================
# STEP B: Install Bun
# ============================================================
info "Installing Bun..."

# Always set up Bun paths
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Check if Bun is already installed and working
if command -v bun &> /dev/null && bun --version &> /dev/null; then
    success "Bun already installed: $(bun --version)"
else
    info "Downloading and installing Bun..."
    
    # Remove any broken installation
    rm -rf "$BUN_INSTALL" 2>/dev/null || true
    
    # Install Bun
    curl -fsSL https://bun.sh/install | bash
    
    # Source the new paths
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Verify installation
    if command -v bun &> /dev/null && bun --version &> /dev/null; then
        success "Bun installed: $(bun --version)"
    else
        err "Bun installation failed!"
        err "PATH=$PATH"
        err "BUN_INSTALL=$BUN_INSTALL"
        ls -la "$BUN_INSTALL/bin/" 2>/dev/null || err "Bun bin directory not found"
        exit 1
    fi
fi

# ============================================================
# STEP C: Clone or update OpenCode
# ============================================================
info "Setting up OpenCode repository..."

if [ -d "$INSTALL_DIR/.git" ]; then
    info "Updating existing OpenCode installation..."
    cd "$INSTALL_DIR"
    git fetch origin "$BRANCH" 2>&1 | tail -3
    git checkout "$BRANCH" 2>&1 | tail -3
    git pull origin "$BRANCH" 2>&1 | tail -3 || warn "Pull failed, using existing code"
    success "OpenCode updated"
else
    info "Cloning OpenCode repository..."
    rm -rf "$INSTALL_DIR" 2>/dev/null || true
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    if [ $? -eq 0 ]; then
        success "OpenCode cloned"
    else
        err "Failed to clone OpenCode repository"
        exit 1
    fi
fi

cd "$INSTALL_DIR"

# ============================================================
# STEP D: Install dependencies
# ============================================================
info "Installing npm dependencies (this may take several minutes)..."

cd "$INSTALL_DIR"

# Clear bun cache to avoid stale dependency issues
info "Clearing bun cache..."
rm -rf "$HOME/.bun/install/cache" 2>/dev/null || true

# Run bun install from the repo root
bun install 2>&1 | tail -10

if [ $? -ne 0 ]; then
    warn "bun install had issues, trying again..."
    bun install 2>&1 | tail -10
fi

# @babel/core is required by @opentui/solid but often not resolved in monorepos
# Install it explicitly at the root level
info "Installing @babel/core (required by @opentui/solid)..."
bun add @babel/core@latest -d 2>&1 | tail -3

# Verify it was installed
if [ -d "$INSTALL_DIR/node_modules/@babel/core" ]; then
    success "@babel/core installed at root"
else
    warn "@babel/core not at root, trying packages/opencode..."
    cd "$INSTALL_DIR/packages/opencode"
    bun add @babel/core@latest -d 2>&1 | tail -3
fi

success "Dependencies installed"

# ============================================================
# STEP E: Configure shell
# ============================================================
info "Configuring shell profile..."

# Ensure .bashrc exists
touch "$HOME/.bashrc"

# Add Bun to PATH
if ! grep -q "BUN_INSTALL" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" << 'BASHRC'

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
BASHRC
fi

# Add OpenCode alias
if ! grep -q "alias opencode=" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" << 'BASHRC'

# OpenCode
alias opencode="cd ~/opencode && bun run --cwd packages/opencode --conditions=browser ./src/index.ts"
alias oc="opencode"
BASHRC
fi

success "Shell configured"

# ============================================================
# STEP F: Verify installation
# ============================================================
info "Verifying installation..."

cd "$INSTALL_DIR/packages/opencode"

# Quick smoke test
if bun --version &> /dev/null; then
    success "Bun is working"
else
    err "Bun is not working!"
    exit 1
fi

if [ -f "./src/index.ts" ]; then
    success "OpenCode source files present"
else
    err "OpenCode source files missing!"
    exit 1
fi

# ============================================================
# Done
# ============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  PRoot Environment Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Run OpenCode with: ${BLUE}opencode${NC} or ${BLUE}oc${NC}"
echo -e "Or from Termux:    ${BLUE}opencode-proot${NC} or ${BLUE}ocp${NC}"
echo ""
SETUP_SCRIPT

# Replace placeholders
sed -i "s|__REPO_URL__|$REPO_URL|g" "$PROOT_SETUP_SCRIPT"
sed -i "s|__BRANCH__|$BRANCH|g" "$PROOT_SETUP_SCRIPT"
sed -i "s|__DISTRO__|$DISTRO|g" "$PROOT_SETUP_SCRIPT"

chmod +x "$PROOT_SETUP_SCRIPT"
success "Setup script created"

# ============================================================
# STEP 4: Run setup inside proot
# ============================================================
step "4/7: Setting up OpenCode inside proot environment..."

info "This may take several minutes on first run..."
proot-distro login "$DISTRO" -- bash -c "$(cat "$PROOT_SETUP_SCRIPT")"

success "PRoot environment configured"

# ============================================================
# STEP 5: Create Termux launcher wrapper
# ============================================================
step "5/7: Creating launcher wrapper..."

# Create bin directory
mkdir -p "$HOME/.local/bin"

LAUNCHER="$HOME/.local/bin/opencode-proot"

cat > "$LAUNCHER" << LAUNCHER_SCRIPT
#!/data/data/com.termux/files/usr/bin/bash
#
# OpenCode PRoot Launcher
# Runs OpenCode inside proot-distro for full Bun support
#

DISTRO="$DISTRO"

# Check if proot-distro is available
if ! command -v proot-distro &> /dev/null; then
    echo "Error: proot-distro not found. Please reinstall."
    exit 1
fi

# Handle special commands
case "\$1" in
    shell)
        # Enter interactive shell in proot
        shift
        exec proot-distro login "\$DISTRO" "\$@"
        ;;
    update)
        # Update OpenCode in proot
        exec proot-distro login "\$DISTRO" -- bash -c "cd ~/opencode && git pull && bun install"
        ;;
    *)
        # Run OpenCode with arguments
        if [ \$# -eq 0 ]; then
            # No arguments - run TUI (or serve if TUI fails)
            exec proot-distro login "\$DISTRO" -- bash -c 'export BUN_INSTALL="\$HOME/.bun" && export PATH="\$BUN_INSTALL/bin:\$PATH" && cd ~/opencode && bun run --cwd packages/opencode --conditions=browser ./src/index.ts'
        else
            # Pass arguments to OpenCode
            ARGS="\$(printf '%q ' "\$@")"
            exec proot-distro login "\$DISTRO" -- bash -c "export BUN_INSTALL=\"\\\$HOME/.bun\" && export PATH=\"\\\$BUN_INSTALL/bin:\\\$PATH\" && cd ~/opencode && bun run --cwd packages/opencode --conditions=browser ./src/index.ts \$ARGS"
        fi
        ;;
esac
LAUNCHER_SCRIPT

chmod +x "$LAUNCHER"
success "Launcher created at $LAUNCHER"

# ============================================================
# STEP 6: Add to PATH
# ============================================================
step "6/7: Configuring shell..."

SHELL_RC="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

# Add to PATH if needed
if ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# Local bin' >> "$SHELL_RC"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
fi

# Add aliases
if ! grep -q "alias ocp=" "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# OpenCode PRoot aliases' >> "$SHELL_RC"
    echo 'alias ocp="opencode-proot"' >> "$SHELL_RC"
    echo 'alias ocp-shell="opencode-proot shell"' >> "$SHELL_RC"
    echo 'alias ocp-serve="opencode-proot serve"' >> "$SHELL_RC"
fi

success "Shell configured"

# ============================================================
# STEP 7: Create bun install wrapper for --backend=copyfile
# ============================================================
step "7/7: Creating bun install wrapper..."

BUN_WRAPPER="$HOME/.local/bin/bun-proot"
cat > "$BUN_WRAPPER" << 'BUN_WRAPPER_SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
#
# Bun wrapper that automatically uses --backend=copyfile for install/add
# This is needed on Android due to SELinux restrictions on hardlinks
#

DISTRO="__DISTRO__"

# Check for install/add commands that need the copyfile backend
case "$1" in
    install|add|i|a)
        # Check if --backend is already specified
        if [[ "$*" != *"--backend"* ]]; then
            # Insert --backend=copyfile after the command
            CMD="$1"
            shift
            exec proot-distro login "$DISTRO" -- bash -c "export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && bun $CMD --backend=copyfile $*"
        fi
        ;;
esac

# For other commands, pass through directly
exec proot-distro login "$DISTRO" -- bash -c "export BUN_INSTALL=\"\$HOME/.bun\" && export PATH=\"\$BUN_INSTALL/bin:\$PATH\" && bun $*"
BUN_WRAPPER_SCRIPT

sed -i "s|__DISTRO__|$DISTRO|g" "$BUN_WRAPPER"
chmod +x "$BUN_WRAPPER"
success "Bun wrapper created (auto-adds --backend=copyfile)"

# ============================================================
# Done!
# ============================================================
echo ""
echo -e "${GREEN}+----------------------------------------------------------+${NC}"
echo -e "${GREEN}|${NC}          Installation Complete!                          ${GREEN}|${NC}"
echo -e "${GREEN}+----------------------------------------------------------+${NC}"
echo ""
echo -e "Commands available after restarting shell:"
echo ""
echo -e "  ${CYAN}opencode-proot${NC}         Launch OpenCode (full Bun support)"
echo -e "  ${CYAN}opencode-proot serve${NC}   Start headless API server"
echo -e "  ${CYAN}opencode-proot shell${NC}   Enter proot shell"
echo -e "  ${CYAN}opencode-proot update${NC}  Update OpenCode"
echo ""
echo -e "  ${CYAN}ocp${NC}                    Alias for opencode-proot"
echo -e "  ${CYAN}ocp-serve${NC}              Alias for opencode-proot serve"
echo -e "  ${CYAN}ocp-shell${NC}              Alias for opencode-proot shell"
echo ""
echo -e "  ${CYAN}bun-proot <cmd>${NC}        Run bun commands in proot"
echo ""
echo -e "Inside proot (after ${CYAN}ocp-shell${NC}):"
echo -e "  ${CYAN}opencode${NC}               Run OpenCode directly"
echo -e "  ${CYAN}bun install${NC}            Install npm packages"
echo -e "  ${CYAN}pacman -S <pkg>${NC}        Install Arch packages"
echo -e "  ${CYAN}yay -S <pkg>${NC}           Install AUR packages"
echo ""
echo -e "${YELLOW}Note:${NC} PRoot has ~20-30% performance overhead compared to native."
echo -e "      For headless-only use, consider the Node.js install script instead."
echo ""

# Offer to restart shell
if [ -t 0 ]; then
    read -p "Restart shell to apply changes? [y/N] " -n 1 -r </dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        exec $SHELL -l
    fi
else
    info "Run 'source ~/.bashrc' or restart your terminal to apply changes."
fi
