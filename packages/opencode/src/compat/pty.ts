/**
 * PTY compatibility layer - abstracts bun-pty (Bun) and node-pty (Node.js)
 * 
 * Both libraries have compatible APIs, so we just need to conditionally import.
 * On Termux ARM64, node-pty needs to be compiled from source.
 */

import { isBun } from "./runtime"

/**
 * PTY process interface - compatible with both bun-pty and node-pty
 */
export interface IPty {
  pid: number
  onData: (callback: (data: string) => void) => void
  onExit: (callback: (exit: { exitCode: number; signal?: number }) => void) => void
  resize: (cols: number, rows: number) => void
  write: (data: string) => void
  kill: (signal?: string) => void
}

export interface PtySpawnOptions {
  name?: string
  cols?: number
  rows?: number
  cwd?: string
  env?: Record<string, string>
}

export type PtySpawnFn = (command: string, args: string[], options: PtySpawnOptions) => IPty

let cachedSpawn: PtySpawnFn | null = null
let loadError: Error | null = null

/**
 * Get the PTY spawn function, loading the appropriate library for the runtime.
 * Returns null if PTY is not available (e.g., missing native module on ARM64).
 */
export async function getPtySpawn(): Promise<PtySpawnFn | null> {
  if (cachedSpawn) return cachedSpawn
  if (loadError) return null

  try {
    if (isBun) {
      const bunPty = await import("bun-pty")
      cachedSpawn = bunPty.spawn as PtySpawnFn
    } else {
      // On Node.js, use node-pty
      // This may fail on ARM64 if native module isn't compiled
      // Using dynamic require to avoid TypeScript errors when node-pty isn't installed
      const { createRequire } = await import("module")
      const require = createRequire(import.meta.url)
      const nodePty = require("node-pty") as { spawn: PtySpawnFn }
      cachedSpawn = nodePty.spawn
    }
    return cachedSpawn
  } catch (e) {
    loadError = e instanceof Error ? e : new Error(String(e))
    console.warn(`PTY not available: ${loadError.message}`)
    return null
  }
}

/**
 * Check if PTY is available without loading it
 */
export function isPtyAvailable(): boolean {
  return cachedSpawn !== null || loadError === null
}

/**
 * Get the PTY load error if any
 */
export function getPtyError(): Error | null {
  return loadError
}
