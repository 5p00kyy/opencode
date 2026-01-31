/**
 * Runtime detection and compatibility layer for Bun/Node.js
 * Enables OpenCode to run on both runtimes, including Termux ARM64
 */

import { existsSync } from "fs"
import { join } from "path"

export const isBun = typeof globalThis.Bun !== "undefined"
export const isNode = !isBun && typeof process !== "undefined" && !!process.versions?.node

export const runtime = isBun ? "bun" : isNode ? "node" : "unknown"

// Termux detection
export const isTermux =
  process.env.TERMUX_VERSION !== undefined ||
  process.env.PREFIX?.includes("com.termux") ||
  process.env.HOME?.includes("com.termux")

// Get the Termux prefix path
export const termuxPrefix = process.env.PREFIX || "/data/data/com.termux/files/usr"
export const termuxHome = process.env.HOME || "/data/data/com.termux/files/home"

// Temp directory - use Termux path if in Termux
export const tmpdir = isTermux ? `${termuxPrefix}/tmp` : process.env.TMPDIR || "/tmp"

export interface WhichOptions {
  PATH?: string
  cwd?: string
}

/**
 * Find executable in PATH - works like Bun.which()
 */
export function which(name: string, options?: WhichOptions): string | null {
  if (isBun) {
    return (globalThis as any).Bun.which(name, options)
  }

  // Node.js implementation
  const pathEnv = options?.PATH ?? process.env.PATH ?? ""
  const paths = pathEnv.split(process.platform === "win32" ? ";" : ":")
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ".com", ""] : [""]

  for (const dir of paths) {
    for (const ext of extensions) {
      const full = join(dir, name + ext)
      if (existsSync(full)) {
        return full
      }
    }
  }
  return null
}

/**
 * Sleep for specified milliseconds - works like Bun.sleep()
 */
export function sleep(ms: number): Promise<void> {
  if (isBun) {
    return (globalThis as any).Bun.sleep(ms)
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Simple hash function - works like Bun.hash.xxHash32()
 * Uses a fast djb2 variant for Node.js
 */
export function hash(input: string | object): number {
  if (isBun) {
    const data = typeof input === "string" ? input : JSON.stringify(input)
    return (globalThis as any).Bun.hash.xxHash32(data)
  }

  // Node.js implementation - djb2 hash
  const str = typeof input === "string" ? input : JSON.stringify(input)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return hash >>> 0 // Convert to unsigned 32-bit
}

/**
 * Stdin wrapper - works like Bun.stdin
 */
export const stdin = {
  async text(): Promise<string> {
    if (isBun) {
      return (globalThis as any).Bun.stdin.text()
    }
    // Node.js implementation
    return new Promise((resolve) => {
      let data = ""
      process.stdin.setEncoding("utf8")
      process.stdin.on("data", (chunk) => {
        data += chunk
      })
      process.stdin.on("end", () => resolve(data))
      // Handle case where stdin is already closed or empty
      if (process.stdin.readableEnded) resolve(data)
    })
  },
}

/**
 * Stderr wrapper - works like Bun.stderr
 */
export const stderr = {
  write(data: string | Uint8Array): number {
    if (isBun) {
      return (globalThis as any).Bun.stderr.write(data)
    }
    // Node.js implementation
    const str = typeof data === "string" ? data : new TextDecoder().decode(data)
    process.stderr.write(str)
    return typeof data === "string" ? Buffer.byteLength(data) : data.length
  },
}

/**
 * Stdout wrapper - works like Bun.stdout
 */
export const stdout = {
  write(data: string | Uint8Array): number {
    if (isBun) {
      return (globalThis as any).Bun.stdout.write(data)
    }
    // Node.js implementation
    const str = typeof data === "string" ? data : new TextDecoder().decode(data)
    process.stdout.write(str)
    return typeof data === "string" ? Buffer.byteLength(data) : data.length
  },
}

/**
 * Color converter - works like Bun.color()
 * Converts color names to ANSI codes
 */
const ansiColors: Record<string, string> = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  grey: "\x1b[90m",
  reset: "\x1b[0m",
}

export function color(name: string, format: "ansi" | "css" = "ansi"): string | null {
  if (isBun) {
    return (globalThis as any).Bun.color(name, format)
  }
  if (format === "ansi") {
    return ansiColors[name.toLowerCase()] ?? null
  }
  // CSS format - return simple color name
  return name
}

/**
 * SystemError type compatible with both Bun and Node.js
 * Used for handling system-level errors like ECONNRESET, ENOENT, etc.
 */
export interface SystemError extends Error {
  code?: string
  syscall?: string
  errno?: number
  path?: string
}
