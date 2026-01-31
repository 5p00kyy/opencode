/**
 * Runtime detection and compatibility layer for Bun/Node.js
 * Enables OpenCode to run on both runtimes, including Termux ARM64
 */

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
