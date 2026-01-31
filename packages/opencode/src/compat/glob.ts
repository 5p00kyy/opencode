/**
 * Glob pattern matching compatibility layer
 * Provides Bun.Glob equivalent for Node.js
 */

import { isBun } from "./runtime"

// Dynamic import for glob package on Node.js
let nodeGlob: typeof import("glob") | null = null

async function getNodeGlob() {
  if (!nodeGlob) {
    nodeGlob = await import("glob")
  }
  return nodeGlob
}

export interface GlobScanOptions {
  cwd?: string
  absolute?: boolean
  onlyFiles?: boolean
  followSymlinks?: boolean
  dot?: boolean
}

export class Glob {
  constructor(private pattern: string) {}

  async *scan(options: GlobScanOptions = {}): AsyncGenerator<string> {
    if (isBun) {
      const bunGlob = new (globalThis as any).Bun.Glob(this.pattern)
      yield* bunGlob.scan(options)
      return
    }

    // Node.js implementation using glob package
    const { glob } = await getNodeGlob()
    const matches = await glob(this.pattern, {
      cwd: options.cwd || process.cwd(),
      absolute: options.absolute ?? false,
      nodir: options.onlyFiles ?? true,
      follow: options.followSymlinks ?? false,
      dot: options.dot ?? false,
    })

    for (const match of matches) {
      yield match
    }
  }

  async match(path: string): Promise<boolean> {
    if (isBun) {
      const bunGlob = new (globalThis as any).Bun.Glob(this.pattern)
      return bunGlob.match(path)
    }

    // Node.js implementation using minimatch
    const { minimatch } = await import("minimatch")
    return minimatch(path, this.pattern)
  }
}

/**
 * Create a Glob instance - works like new Bun.Glob()
 */
export function createGlob(pattern: string): Glob {
  return new Glob(pattern)
}
