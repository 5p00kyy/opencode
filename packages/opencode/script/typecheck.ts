#!/usr/bin/env bun
/**
 * Typecheck script with platform detection
 * Uses tsgo (fast native TypeScript) on supported platforms
 * Falls back to tsc on Android/ARM64 where tsgo is unavailable
 */

import { spawn } from "child_process"

const isAndroid =
  process.platform === "android" ||
  (process.platform === "linux" && process.arch === "arm64" && !process.env.PROOT_DISTRO)

// On Android/ARM64 Linux without proot, use tsc instead of tsgo
if (isAndroid) {
  console.log("Android/ARM64 detected - using tsc instead of tsgo")
  const proc = spawn("npx", ["tsc", "--noEmit"], {
    stdio: "inherit",
    shell: true,
  })
  proc.on("exit", (code) => process.exit(code ?? 0))
} else {
  // Use native tsgo for faster typechecking
  const proc = spawn("tsgo", ["--noEmit"], {
    stdio: "inherit",
    shell: true,
  })
  proc.on("exit", (code) => process.exit(code ?? 0))
}
