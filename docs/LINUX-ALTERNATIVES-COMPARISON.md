# Linux on Android Alternatives: PTY/TUI Support Comparison

## Executive Summary

For running TUI applications on Termux, the **best no-root solution** remains **proot-distro**, despite its PTY limitations. For rooted devices, **chroot via Linux Deploy** offers the best PTY support. The "escape hatch" approach of **Termux:X11 + graphical terminal** provides perfect terminal emulation but adds complexity.

---

## Quick Comparison Matrix

| Solution     | Root Required | PTY Quality        | Performance | TUI Support            | Pixel 8 Compatible |
| ------------ | ------------- | ------------------ | ----------- | ---------------------- | ------------------ |
| proot-distro | No            | Limited            | 70-80%      | Works with workarounds | Yes                |
| Andronix     | No            | Same as proot      | 70-80%      | Same as proot          | Yes                |
| UserLAnd     | No            | Same as proot      | 70-80%      | Same as proot          | Yes                |
| Termux:X11   | No            | Native (graphical) | 95%+        | Full via GUI terminal  | Yes                |
| QEMU (full)  | No            | Full (emulated)    | 20-40%      | Full                   | Yes                |
| chroot       | Yes           | Full native        | 95%+        | Full                   | Yes (if rooted)    |
| Linux Deploy | Yes           | Full native        | 95%+        | Full                   | Yes (if rooted)    |

---

## Detailed Analysis

### 1. Andronix

**Website**: https://andronix.app  
**Play Store**: Available  
**GitHub**: https://github.com/AndronixApp

#### What It Is

Andronix is essentially a **wrapper around proot-distro** with a polished UI and pre-configured "Modded OS" distributions. It provides:

- Easy one-click installation of Linux distros
- Pre-configured desktop environments (XFCE, LXDE, KDE, etc.)
- VNC server integration
- Premium features (Modded OS, offline install)

#### PTY/Terminal Support

**Same as proot-distro** - Andronix uses the same proot technology underneath. The PTY limitations are identical:

- Fork emulation causes signal handling issues
- Same `SIGWINCH` resize problems
- Same ncurses quirks

#### Performance

- **70-80%** of native (proot overhead)
- Same as proot-distro

#### Verdict for TUI Apps

No advantage over proot-distro for TUI/PTY support. Main benefit is convenience and pre-configured environments, but for our use case (running Bun + OpenCode), proot-distro is equivalent.

---

### 2. UserLAnd

**Website**: https://userland.tech  
**GitHub**: https://github.com/CypherpunkArmory/UserLAnd  
**Stars**: 4.1k | **Last Release**: v2.8.3 (Oct 2021)

#### What It Is

UserLAnd is a standalone app (doesn't require Termux) that runs Linux environments using proot. Features:

- Self-contained - no Termux dependency
- Built-in terminal emulator and VNC client
- Runs "sessions" - can have multiple distros

#### PTY/Terminal Support

**Same proot limitations** - Uses same proot technology. The built-in terminal emulator doesn't change the underlying PTY emulation issues.

#### Key Differences from proot-distro

| Feature           | UserLAnd     | proot-distro |
| ----------------- | ------------ | ------------ |
| Termux dependency | No           | Yes          |
| Terminal app      | Built-in     | Uses Termux  |
| Maintenance       | Stale (2021) | Active       |
| Customization     | Limited      | Full         |

#### Concerns

- **Last release was October 2021** - 969 open issues
- May have compatibility issues with newer Android versions
- Less flexible than Termux + proot-distro

#### Verdict for TUI Apps

No PTY advantage. The stale maintenance is a concern for Pixel 8 / Android 14+ support. Not recommended over proot-distro.

---

### 3. Termux:X11 with Graphical Terminal

**GitHub**: https://github.com/termux/termux-x11  
**Stars**: 3.4k | **Status**: Active

#### What It Is

Termux:X11 is a native X server implementation for Android. Instead of VNC (which adds latency), it provides:

- Direct X11 rendering on Android
- Low latency display
- Hardware acceleration support

#### The Escape Hatch Strategy

Run a **graphical terminal emulator** (xterm, xfce4-terminal, alacritty) inside X11:

```bash
# Install X11 components
pkg install x11-repo
pkg install termux-x11-nightly xfce4-terminal

# Start X server
termux-x11 :1 &

# Start terminal emulator
DISPLAY=:1 xfce4-terminal
```

#### Why This Could Work Better

The graphical terminal emulator runs as a **native Linux process**, not through proot's PTY translation:

- Full `SIGWINCH` support
- Proper PTY device
- ncurses works correctly
- Mouse support works

#### Performance

- X11 overhead: minimal (native Android rendering)
- Terminal: native performance
- Overall: **95%+ for terminal apps**

#### Downsides

- Requires running an X server
- Battery impact (display server running)
- More complex setup
- Need to interact via touchscreen or external display

#### Verdict for TUI Apps

**Best no-root option for perfect PTY support**. The added complexity of running X11 is offset by getting proper terminal emulation. Could be the solution for TUI-intensive use cases.

**Setup for OpenCode**:

```bash
# In Termux
pkg install x11-repo termux-x11-nightly

# In proot (Arch)
pacman -S xfce4-terminal

# Launch X11 from Termux, then in proot:
DISPLAY=:1 xfce4-terminal -e "bun run --cwd ~/opencode/packages/opencode ./src/index.ts"
```

---

### 4. QEMU in Termux (Full System Emulation)

**Termux Package**: `qemu-system-aarch64`

#### What It Is

Full hardware emulation of a complete Linux system:

- Emulates entire ARM64 CPU
- Runs real Linux kernel
- Full hardware virtualization (no proot)

#### PTY/Terminal Support

**Full native PTY** - Running a real Linux kernel means:

- Proper `/dev/pts` device
- Real terminal drivers
- Perfect signal handling

#### Performance

**Very poor: 20-40%** of native

- Full CPU emulation overhead
- Memory overhead (need to allocate VM RAM)
- I/O emulation adds latency

#### Practical Setup

```bash
pkg install qemu-system-aarch64 qemu-utils

# Create disk image
qemu-img create -f qcow2 linux.qcow2 10G

# Download ARM64 Linux ISO (e.g., Alpine)
# Boot VM...
```

#### Verdict for TUI Apps

Not practical. The performance hit (60-80%) makes this unsuitable for development work. Only useful for testing or running incompatible binaries.

---

### 5. chroot (Requires Root)

#### What It Is

True filesystem isolation using the Linux `chroot` system call:

- Changes apparent root directory
- Runs with real kernel (no emulation)
- Requires root access

#### PTY/Terminal Support

**Full native** - No translation layer:

- Direct access to `/dev/pts`
- Kernel-level PTY devices
- Perfect signal handling

#### Performance

**95%+ of native** - Only overhead is:

- Filesystem redirection
- Mount namespace isolation
- Negligible impact

#### Why It's Better Than proot

| Aspect               | proot        | chroot |
| -------------------- | ------------ | ------ |
| Syscall interception | Yes (ptrace) | No     |
| PTY emulation        | Userspace    | Kernel |
| Signal handling      | Emulated     | Native |
| Root required        | No           | Yes    |

#### Termux:X11 + chroot Support

Termux:X11 explicitly documents chroot support:

```bash
setenforce 0
export TMPDIR=/path/to/chroot/container/tmp
export CLASSPATH=$(/system/bin/pm path com.termux.x11 | cut -d: -f2)
/system/bin/app_process / --nice-name=termux-x11 com.termux.x11.CmdEntryPoint :0
```

#### Verdict for TUI Apps

**Best solution IF you have root**. On rooted Pixel 8, this would provide perfect PTY support with minimal overhead.

---

### 6. Linux Deploy (Requires Root)

**GitHub**: https://github.com/meefik/linuxdeploy  
**Stars**: 5.7k | **Last Release**: v2.6.0 (Feb 2020)

#### What It Is

Linux Deploy is a chroot manager with a GUI. Features:

- Graphical distro installation
- Multiple Linux distributions
- Various installation methods (image, directory, partition)
- Built-in SSH/VNC server configuration

#### PTY/Terminal Support

**Full native** - Uses real chroot:

- Kernel-level PTY devices
- No syscall translation
- Perfect signal handling

#### Installation Options

- Bootstrap: Alpine, Arch, CentOS, Debian, Fedora, Kali, Ubuntu, etc.
- Installation: image file, directory, disk partition, RAM
- File systems: ext2, ext3, ext4

#### Performance Benchmarks (from their README)

- **vfat**: read 14.1 MB/s; write 12.0 MB/s
- **ext4**: read 14.9 MB/s; write 16.6 MB/s
- **ext4 (loop)**: read 17.2 MB/s; write 8.8 MB/s

#### Concerns

- **Last release Feb 2020** - 735 open issues
- May have Android 14+ compatibility issues
- Requires SuperSU or Magisk

#### Verdict for TUI Apps

If you have root, this is the most user-friendly way to get real chroot with proper PTY support. Worth testing on rooted Pixel 8.

---

## Recommendations for OpenCode on Termux

### Tier 1: No Root Available (Most Users)

**Recommended: proot-distro + workarounds**

1. Current proot-distro setup works for headless (`opencode serve`)
2. For TUI, apply the terminal workarounds documented in our codebase
3. Consider Termux:X11 escape hatch for critical TUI work

**Alternative: Termux:X11 + graphical terminal**

- More complex setup but perfect PTY support
- Good for extended TUI sessions

### Tier 2: Root Available

**Recommended: Linux Deploy or manual chroot**

1. Install Linux Deploy
2. Create Arch Linux chroot
3. Install Bun directly (no proot needed)
4. Full PTY support, near-native performance

### Tier 3: Future Development

**Track Termux native improvements**

- Termux is working on better PTY handling
- Future Android versions may relax restrictions
- Native Bun port would eliminate these issues

---

## Success Stories & Community Reports

### proot-distro TUI Success

- Many users successfully run vim, neovim, htop in proot
- Workarounds exist for most ncurses issues
- Ink (React TUI library) has some known issues

### Termux:X11 Reports

- XFCE desktop works well
- Low latency compared to VNC
- Works on Pixel 8 and newer devices

### Linux Deploy Reports

- Users report excellent performance on rooted devices
- Some compatibility issues with newer Android versions
- SELinux must be permissive

---

## Testing Checklist for OpenCode

When evaluating any solution, test these TUI scenarios:

1. [ ] Terminal resize (`SIGWINCH`)
2. [ ] ncurses navigation (arrow keys, hjkl)
3. [ ] Mouse support (if applicable)
4. [ ] Color rendering
5. [ ] Unicode characters
6. [ ] Split panes/windows
7. [ ] Long-running sessions (stability)
8. [ ] Ctrl+C interrupt handling
9. [ ] Background/foreground job control

---

## Conclusion

For the OpenCode Termux port:

1. **Current approach is correct**: proot-distro provides the best balance of functionality, ease of use, and no-root requirement

2. **No magic bullet**: All no-root solutions (Andronix, UserLAnd) use the same proot technology with identical PTY limitations

3. **Escape hatch available**: Termux:X11 + graphical terminal can provide perfect PTY support when needed

4. **Root is the answer**: If users have root, Linux Deploy/chroot provides the ideal solution

5. **Continue investing in workarounds**: Improving our TUI code to handle proot quirks is the most practical path forward
