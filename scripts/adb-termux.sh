#!/bin/bash
# Helper to run commands inside Termux's proot environment via ADB
# Usage: ./scripts/adb-termux.sh "command to run"
# Usage: ./scripts/adb-termux.sh --termux "command in termux (no proot)"
# Usage: ./scripts/adb-termux.sh --proot "command inside proot"

SERIAL="${ADB_SERIAL:-$(adb devices | grep -v '^List' | grep 'device$' | head -1 | awk '{print $1}')}"

if [ -z "$SERIAL" ]; then
  echo "Error: No Android device connected"
  echo "Connect your device via USB with USB debugging enabled"
  echo "Or set ADB_SERIAL environment variable"
  exit 1
fi
PREFIX="/data/data/com.termux/files/usr"
HOME_DIR="/data/data/com.termux/files/home"
DISTRO="archlinux"

termux_cmd() {
  adb -s "$SERIAL" shell "run-as com.termux $PREFIX/bin/bash -c 'export PREFIX=$PREFIX && export HOME=$HOME_DIR && export PATH=\$HOME/.local/bin:\$PREFIX/bin:\$PATH && export TERMUX_VERSION=1 && $1'"
}

proot_cmd() {
  adb -s "$SERIAL" shell "run-as com.termux $PREFIX/bin/bash -c 'export PREFIX=$PREFIX && export HOME=$HOME_DIR && export PATH=\$HOME/.local/bin:\$PREFIX/bin:\$PATH && proot-distro login $DISTRO -- bash -c \"$1\"'"
}

case "$1" in
  --termux)
    shift
    termux_cmd "$*"
    ;;
  --proot)
    shift
    proot_cmd "$*"
    ;;
  *)
    proot_cmd "$*"
    ;;
esac
