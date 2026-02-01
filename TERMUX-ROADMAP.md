# OpenCode Termux ARM64 Port - Development Roadmap

## Project Overview

**Goal**: Run OpenCode natively on Termux ARM64 (Android) with full functionality including TUI, MCP servers, and all CLI commands.

**Repository**: https://github.com/5p00kyy/opencode  
**Branch**: `termux-arm64`  
**Upstream**: https://github.com/anomalyco/opencode

---

## Current Status

| Component            | Status            | Notes                                      |
| -------------------- | ----------------- | ------------------------------------------ |
| Node.js Compat Layer | ✅ Complete       | Headless server works via `opencode serve` |
| PRoot Setup          | ✅ Complete       | Full Bun support via proot-distro          |
| glibc-runner         | ❌ Blocked        | Network/socket issues need fixes           |
| Native Bun           | ❌ Not Started    | Long-term goal                             |
| MCP Servers          | 🔄 Phase 2        | Next focus area                            |
| TUI Interface        | ✅ Works in PRoot | Full TUI via proot-distro                  |

---

## Phase 0: PRoot Working Solution (Week 1)

**Goal**: Get OpenCode fully functional on Termux via proot-distro for immediate use.

### Tasks

- [x] **0.1** Create `install-termux-proot.sh` script
  - [x] Auto-detect if proot-distro is installed
  - [x] Install Ubuntu/Debian in proot
  - [x] Install Bun inside proot environment
  - [x] Clone opencode repository
  - [x] Install dependencies with `bun install`
- [x] **0.2** Create wrapper scripts for seamless integration
  - [x] `opencode-proot` launcher script
  - [x] Handle `--backend=copyfile` for bun install automatically
  - [x] Pass through all CLI arguments
- [ ] **0.3** Test all OpenCode functionality in proot
  - [ ] `opencode serve --port 4096`
  - [ ] `opencode run`
  - [ ] `opencode auth`
  - [ ] Provider authentication flows
  - [ ] Session management
- [x] **0.4** Document proot setup in README
  - [x] Installation instructions
  - [x] Known limitations (20-30% performance overhead)
  - [x] Troubleshooting guide

### Success Criteria

- Users can install and run OpenCode on Termux with a single script
- All CLI commands work (except TUI which needs native Bun)
- Can connect to AI providers and run coding sessions

---

## Phase 1: On-Device Development Environment (Week 2)

**Goal**: Use OpenCode running in proot to continue developing OpenCode itself on Android.

### Tasks

- [ ] **1.1** Set up development environment in proot
  - [ ] Git configuration
  - [ ] SSH keys for GitHub
  - [ ] Editor setup (neovim/helix)
- [ ] **1.2** Verify development workflow
  - [ ] Clone fork, checkout termux-arm64 branch
  - [ ] Run `bun install`
  - [ ] Run `bun test` - verify tests pass
  - [ ] Run `bun run typecheck`
- [ ] **1.3** Test OpenCode developing itself
  - [ ] Use `opencode serve` to get AI assistance
  - [ ] Make code changes via API/web interface
  - [ ] Commit and push changes from device
- [ ] **1.4** Performance baseline
  - [ ] Measure startup time
  - [ ] Measure API response latency
  - [ ] Document performance characteristics

### Success Criteria

- Can edit OpenCode source code on Android device
- Can run tests and typecheck on device
- Can use OpenCode to assist with its own development

---

## Phase 2: MCP Server Integration (Weeks 3-4)

**Goal**: Get MCP servers working in OpenCode on Termux.

### Tasks

- [ ] **2.1** Test built-in MCP functionality
  - [ ] Verify MCP client works in proot
  - [ ] Test stdio transport
  - [ ] Test SSE transport
- [ ] **2.2** Install and configure MCP servers
  - [ ] filesystem MCP server
  - [ ] git MCP server
  - [ ] GitHub MCP server
- [ ] **2.3** Test Obsidian MCP (for roadmap tracking)
  - [ ] Install obsidian-mcp server
  - [ ] Configure vault path
  - [ ] Test note creation/reading
  - [ ] Use for tracking development progress
- [ ] **2.4** Test Context7 MCP (for documentation)
  - [ ] Install context7 MCP server
  - [ ] Test library resolution
  - [ ] Test documentation queries
- [ ] **2.5** Document MCP setup for Termux
  - [ ] Configuration examples
  - [ ] Troubleshooting common issues
  - [ ] Performance considerations

### Success Criteria

- Can use MCP servers from OpenCode on Termux
- Obsidian MCP works for note-taking and roadmap tracking
- Documentation lookup works via Context7

---

## Phase 3: glibc-runner Native Performance (Weeks 5-8)

**Goal**: Fix glibc-runner issues to achieve near-native Bun performance without proot overhead.

### Research Tasks

- [ ] **3.1** Diagnose socket/network failures
  - [ ] Run strace on failing operations
  - [ ] Compare syscalls between proot (working) and grun (failing)
  - [ ] Identify specific failing syscall or path
- [ ] **3.2** Investigate DNS resolution
  - [ ] Check `/etc/resolv.conf` in glibc environment
  - [ ] Test with hardcoded DNS servers
  - [ ] Check if it's glibc NSS issue

### Fix Tasks

- [ ] **3.3** Fix network connectivity
  - [ ] Patch resolv.conf handling if needed
  - [ ] Fix socket permission issues
  - [ ] Test package installation (`bun add`)
- [ ] **3.4** Fix REPL and bunx
  - [ ] Debug `CouldntReadCurrentDirectory` error
  - [ ] Fix working directory handling
  - [ ] Test interactive features
- [ ] **3.5** Create Termux glibc Bun package
  - [ ] Fork termux-pacman/glibc-packages
  - [ ] Add Bun package definition
  - [ ] Apply patchelf fixes
  - [ ] Submit PR upstream

### Testing Tasks

- [ ] **3.6** Comprehensive testing
  - [ ] All OpenCode CLI commands
  - [ ] MCP server integration
  - [ ] Long-running sessions
  - [ ] Memory usage monitoring

### Success Criteria

- Bun runs via glibc-runner with full functionality
- Network operations work (package install, API calls)
- Performance is 90%+ of native Linux ARM64

---

## Phase 4: Full Native Bun Port (Months 3-6)

**Goal**: Compile Bun natively for Android/Termux with Bionic libc.

### Milestone 4.1: Build JavaScriptCore for Android (8 weeks)

- [ ] **4.1.1** Study existing JSC Android builds
  - [ ] Analyze jsc-android-buildscripts (React Native)
  - [ ] Understand WebKit CMake build system
  - [ ] Document required modifications
- [ ] **4.1.2** Fork and modify oven-sh/WebKit
  - [ ] Add Android CMake configuration
  - [ ] Configure for Android NDK toolchain
  - [ ] Handle JIT restrictions (may need interpreter-only mode)
- [ ] **4.1.3** Build JSC static libraries
  - [ ] libJavaScriptCore.a
  - [ ] libWTF.a
  - [ ] libbmalloc.a
- [ ] **4.1.4** Test JSC on Android
  - [ ] Basic JavaScript execution
  - [ ] Performance benchmarks
  - [ ] Memory usage

### Milestone 4.2: Modify Bun Build System (4 weeks)

- [ ] **4.2.1** Add Android detection
  - [ ] Modify `src/env.zig`
  - [ ] Add `isAndroid` flag
  - [ ] Handle Android-specific paths
- [ ] **4.2.2** Configure Zig for Android
  - [ ] Set target to `aarch64-linux-android`
  - [ ] Configure Android NDK sysroot
  - [ ] Handle Bionic libc differences
- [ ] **4.2.3** Update CMake build
  - [ ] Add Android toolchain file
  - [ ] Link against Android JSC build
  - [ ] Configure for static linking

### Milestone 4.3: Port Platform Code (4 weeks)

- [ ] **4.3.1** Fix path handling
  - [ ] Respect `$PREFIX` environment variable
  - [ ] Handle `/data/data/com.termux/files/usr` paths
  - [ ] Fix hardcoded `/usr` references
- [ ] **4.3.2** Handle syscall differences
  - [ ] Test all I/O operations
  - [ ] Fix any Android-specific failures
  - [ ] Handle `/proc` filesystem differences
- [ ] **4.3.3** Test process spawning
  - [ ] Verify fork/exec works in Termux
  - [ ] Test shell command execution
  - [ ] Test package manager operations

### Milestone 4.4: Testing & Stabilization (4 weeks)

- [ ] **4.4.1** Unit tests
  - [ ] Port Bun test suite
  - [ ] Run on Android device
  - [ ] Fix failing tests
- [ ] **4.4.2** Integration tests
  - [ ] Test with OpenCode
  - [ ] Test all tools and commands
  - [ ] Test MCP servers
- [ ] **4.4.3** Performance benchmarks
  - [ ] Compare with proot solution
  - [ ] Compare with Linux ARM64
  - [ ] Optimize hot paths

### Milestone 4.5: Release & Upstream (Ongoing)

- [ ] **4.5.1** Create release artifacts
  - [ ] Termux package (.deb)
  - [ ] Standalone binary
  - [ ] Installation script
- [ ] **4.5.2** Documentation
  - [ ] Build instructions
  - [ ] Installation guide
  - [ ] Troubleshooting
- [ ] **4.5.3** Upstream contribution
  - [ ] Clean up patches
  - [ ] Submit PR to oven-sh/bun
  - [ ] Work with maintainers

### Success Criteria

- Bun runs natively on Termux without glibc-runner or proot
- All Bun features work (JIT, bundler, test runner, package manager)
- OpenCode runs with full TUI support
- Performance matches Linux ARM64

---

## Technical Reference

### Why Bun Doesn't Work Natively

1. **glibc vs Bionic**: Bun compiled against glibc; Android uses Bionic libc
2. **Dynamic linker**: Expects `/lib/ld-linux-aarch64.so.1`, doesn't exist on Android
3. **Hardcoded paths**: Uses `/usr` instead of Termux `$PREFIX`
4. **JavaScriptCore**: No prebuilt JSC for Android exists

### Key GitHub Issues

- [oven-sh/bun#5085](https://github.com/oven-sh/bun/issues/5085) - Bun not running in Termux
- [oven-sh/bun#8685](https://github.com/oven-sh/bun/issues/8685) - Bun on Termux docs
- [oven-sh/bun#3210](https://github.com/oven-sh/bun/issues/3210) - Respect PREFIX env var
- [termux-pacman/glibc-packages#335](https://github.com/termux-pacman/glibc-packages/issues/335) - Bun package request

### Existing Community Work

- [turbomaster95/bun-termux](https://github.com/turbomaster95/bun-termux) - glibc-runner setup
- [jsc-android-buildscripts](https://github.com/nickspaargaren/nickspaargaren) - JSC Android builds
- [termux-pacman/glibc-packages](https://github.com/termux-pacman/glibc-packages) - glibc for Termux

### Performance Expectations

| Method            | Performance | Functionality            |
| ----------------- | ----------- | ------------------------ |
| Native Bun (goal) | 100%        | Full                     |
| glibc-runner      | ~95%        | Partial (network broken) |
| proot-distro      | ~70-80%     | Full                     |
| Node.js compat    | ~60-70%     | Headless only            |

---

## Files Modified for Termux Support

### Installation Scripts

- `packages/opencode/scripts/install-termux-proot.sh` - PRoot-based installation (full Bun)
- `packages/opencode/scripts/install-termux.sh` - Node.js-based installation (headless)

### Core Compat Layer

- `packages/opencode/src/compat/loader-hooks.mjs` - ESM loader for Node.js
- `packages/opencode/src/compat/runtime.ts` - Runtime polyfills
- `packages/opencode/src/compat/index.ts` - Bun API shims

### Circular Dependency Fixes

- `packages/opencode/src/project/instance-state.ts` - Breaks circular imports

### Conditional TUI

- `packages/opencode/src/index.ts` - TUI commands conditional on Bun

### Node.js Compatibility

- `packages/opencode/src/util/rpc.ts` - Worker threads support
- `packages/opencode/src/util/log.ts` - Array.fromAsync polyfill
- `packages/opencode/src/bus/bus-event.ts` - Iterator compatibility

---

## Quick Start (Current State)

### Option 1: PRoot Automated Install (Recommended - Full Support)

```bash
# One-line install - sets up everything automatically
curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux-proot.sh | bash

# After installation, use these commands:
opencode-proot              # Launch OpenCode (full Bun + TUI)
opencode-proot serve        # Start headless API server
opencode-proot shell        # Enter proot shell for manual commands
opencode-proot update       # Update OpenCode

# Aliases (after shell restart):
ocp                         # Short for opencode-proot
ocp-serve                   # Short for opencode-proot serve
ocp-shell                   # Short for opencode-proot shell
```

### Option 2: PRoot Manual Install

```bash
# Install proot-distro
pkg install proot-distro

# Install Arch Linux (recommended for 64-bit only devices like Pixel 8)
proot-distro install archlinux
proot-distro login archlinux

# Inside Arch, install packages
pacman -Syu --noconfirm
pacman -S --noconfirm base-devel git curl ripgrep fd

# Install Bun and OpenCode
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
git clone https://github.com/5p00kyy/opencode
cd opencode && git checkout termux-arm64
bun install
bun run --cwd packages/opencode --conditions=browser ./src/index.ts serve
```

### Option 3: Node.js Compat (Headless Only - No TUI)

```bash
# Use install script - lighter weight, no proot overhead
curl -fsSL https://raw.githubusercontent.com/5p00kyy/opencode/termux-arm64/packages/opencode/scripts/install-termux.sh | bash

# Run headless server
opencode serve --port 4096
```

### Comparison

| Method               | TUI    | MCP        | Performance | Disk Space |
| -------------------- | ------ | ---------- | ----------- | ---------- |
| PRoot Arch (Default) | ✅ Yes | ✅ Yes     | ~70-80%     | ~800MB     |
| Node.js (Headless)   | ❌ No  | ⚠️ Limited | ~90%        | ~300MB     |

**Note:** Arch Linux is the default distro, optimized for 64-bit only devices (Pixel 6+). Use `--distro=ubuntu` if you prefer Ubuntu.

---

## Contributing

1. Fork the repository
2. Create feature branch from `termux-arm64`
3. Make changes and test on Termux device
4. Submit PR with description of changes

## Contact

- GitHub Issues: https://github.com/5p00kyy/opencode/issues
- Branch: `termux-arm64`
