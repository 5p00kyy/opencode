# glibc-runner Scripts for Termux

These scripts help set up and run Bun/OpenCode via glibc-runner on the Termux host, eliminating proot overhead.

## Prerequisites

- Termux installed on Android
- Run these scripts from the Termux host (NOT inside proot-distro)
- Bun already installed (via proot or manual install)

## Scripts

### 1. install-glibc-runner-termux.sh

Installs glibc-runner and creates helper scripts on the Termux host.

**Usage:**

```bash
# From Termux (not proot)
curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/scripts/install-glibc-runner-termux.sh | bash
```

**What it does:**

- Installs glibc-runner (grun) via pkg
- Installs strace for debugging
- Creates `bun-grun` wrapper for easy Bun access
- Creates diagnostic scripts

**After installation:**

```bash
# Test Bun via glibc-runner
bun-grun --version

# Run diagnostics
diagnose-bun-network.sh
```

---

### 2. fix-glibc-dns.sh

Fixes DNS resolution issues when Bun can't reach the network via glibc-runner.

**Problem:**
Bun via glibc-runner often fails to resolve hostnames because the glibc environment doesn't see Termux's DNS configuration.

**Solution:**
This script copies `/etc/resolv.conf` to the glibc environment.

**Usage:**

```bash
# When bun-grun network fails
bash /path/to/fix-glibc-dns.sh
```

**Manual fix (if script fails):**

```bash
cp /etc/resolv.conf $PREFIX/glibc/etc/resolv.conf
```

---

### 3. opencode-grun.sh

Runs OpenCode directly via glibc-runner without proot.

**Requirements:**

- glibc-runner installed
- Bun working via grun
- DNS fix applied (if needed)
- OpenCode cloned to ~/opencode

**Usage:**

```bash
# Run OpenCode TUI
bash /path/to/opencode-grun.sh

# Run specific command
bash /path/to/opencode-grun.sh serve --port 4096
```

---

### 4. strace-bun.sh

Debugs Bun network issues using strace.

**Usage:**

```bash
# Trace all network calls
strace-bun.sh --version

# View the log
tail -100 ~/bun-strace.log
```

---

### 5. diagnose-bun-network.sh

Comprehensive diagnostic script for Bun + glibc-runner network issues.

**Usage:**

```bash
diagnose-bun-network.sh
```

**Checks:**

- System info (Termux version, architecture)
- DNS configuration
- Network connectivity
- Bun version via glibc-runner
- Package registry connectivity
- glibc DNS setup

---

## Setup Workflow

1. **Install glibc-runner (run once):**

   ```bash
   bash install-glibc-runner-termux.sh
   source ~/.bashrc
   ```

2. **Test Bun:**

   ```bash
   bun-grun --version
   ```

3. **If network fails, fix DNS:**

   ```bash
   bash fix-glibc-dns.sh
   ```

4. **Verify network works:**

   ```bash
   bun-grun pm ping
   ```

5. **Run OpenCode:**
   ```bash
   bash opencode-grun.sh
   ```

---

## Troubleshooting

### "cannot execute: required file not found"

The Bun binary needs the glibc dynamic linker. Use `grun`:

```bash
# Wrong
./bun --version

# Right
grun ./bun --version
```

### "Connection refused" or "Network is unreachable"

DNS resolution failing. Apply the DNS fix:

```bash
bash fix-glibc-dns.sh
```

### "error while loading shared libraries: libdl.so"

LD_PRELOAD is set. Use grun which handles this:

```bash
unset LD_PRELOAD
grun bun --version
```

---

## Performance Comparison

| Method         | Overhead | Status    |
| -------------- | -------- | --------- |
| Native Bun     | 0%       | Not avail |
| glibc-runner   | ~5%      | Phase 3   |
| proot-distro   | ~25%     | Working   |
| Node.js compat | ~40%     | Headless  |

---

## Notes

- These scripts run on the Termux host, NOT inside proot-distro
- glibc-runner eliminates proot overhead (~20% performance gain)
- Main issue is DNS/network resolution in glibc environment
- Once working, OpenCode will run with near-native performance
