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

/**
 * Find executable in PATH - works like Bun.which()
 */
export function which(name: string): string | null {
  if (isBun) {
    return (globalThis as any).Bun.which(name)
  }

  // Node.js implementation
  const paths = (process.env.PATH || "").split(process.platform === "win32" ? ";" : ":")
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
