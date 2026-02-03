#!/data/data/com.termux/files/usr/bin/bash
#
# Fix DNS Resolution for glibc-runner
# ====================================
# Copies Termux's DNS config to glibc environment
#
# Usage:
#   Run from Termux host when Bun network fails
#

set -e

PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

info "Fixing DNS resolution for glibc-runner..."

# Check if running in Termux
if [ ! -f "/data/data/com.termux/files/usr/bin/termux-info" ] && [ ! -d "/data/data/com.termux" ]; then
    error "This script must be run in Termux"
fi

# Check Termux resolv.conf exists
if [ ! -f "/etc/resolv.conf" ]; then
    warn "Termux /etc/resolv.conf not found"
    info "Creating basic resolv.conf with Google DNS..."
    echo "nameserver 8.8.8.8" > /etc/resolv.conf
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf
fi

# Create glibc etc directory if needed
if [ ! -d "$PREFIX/glibc/etc" ]; then
    info "Creating $PREFIX/glibc/etc directory..."
    mkdir -p "$PREFIX/glibc/etc"
fi

# Copy resolv.conf to glibc location
info "Copying DNS configuration to glibc environment..."
cp /etc/resolv.conf "$PREFIX/glibc/etc/resolv.conf"
success "DNS config copied to $PREFIX/glibc/etc/resolv.conf"

# Also create hosts file if needed
if [ -f /etc/hosts ]; then
    cp /etc/hosts "$PREFIX/glibc/etc/hosts"
    success "hosts file copied"
fi

# Fix permissions
chmod 644 "$PREFIX/glibc/etc/resolv.conf" 2>/dev/null || true

# Test DNS resolution
info "Testing DNS resolution..."
if grun "$HOME/.bun/bin/bun" pm ping 2>&1 | grep -q "pong"; then
    success "DNS fix successful - Bun can reach registry!"
else
    warn "DNS test inconclusive - Bun may still have issues"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check network connectivity: ping 8.8.8.8"
    echo "  2. Check resolv.conf content: cat $PREFIX/glibc/etc/resolv.conf"
    echo "  3. Try manual test: grun ~/.bun/bin/bun --version"
    echo "  4. Check for proxy settings: echo \$HTTP_PROXY"
fi

echo ""
echo -e "${GREEN}DNS Fix Applied${NC}"
