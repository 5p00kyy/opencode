/**
 * Glob pattern matching compatibility layer
 * Provides Bun.Glob equivalent for Node.js
 */

import { isBun } from "./runtime"

// Dynamic import for glob package on Node.js
let nodeGlob: typeof import("glob") | null = null
let nodeMinimatch: typeof import("minimatch") | null = null

async function getNodeGlob() {
  if (!nodeGlob) {
    nodeGlob = await import("glob")
  }
  return nodeGlob
}

// Synchronously initialize minimatch for match() method
function getMinimatch() {
  if (!nodeMinimatch) {
    // We need to preload this for sync matching
    try {
      nodeMinimatch = require("minimatch")
    } catch {
      // Fallback to a simple pattern matcher
      return null
    }
  }
  return nodeMinimatch
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

  /**
   * Synchronous match - returns boolean like Bun.Glob.match
   */
  match(path: string): boolean {
    if (isBun) {
      const bunGlob = new (globalThis as any).Bun.Glob(this.pattern)
      return bunGlob.match(path)
    }

    // Node.js implementation using minimatch
    const mm = getMinimatch()
    if (mm) {
      return mm.minimatch(path, this.pattern)
    }
    
    // Simple fallback matcher for basic patterns
    const regex = this.patternToRegex(this.pattern)
    return regex.test(path)
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")  // Escape special regex chars except * and ?
      .replace(/\*\*/g, "{{GLOBSTAR}}")       // Placeholder for **
      .replace(/\*/g, "[^/]*")                // * matches anything except /
      .replace(/\?/g, "[^/]")                 // ? matches single char except /
      .replace(/{{GLOBSTAR}}/g, ".*")         // ** matches anything including /
    return new RegExp(`^${escaped}$`)
  }
}

/**
 * Create a Glob instance - works like new Bun.Glob()
 */
export function createGlob(pattern: string): Glob {
  return new Glob(pattern)
}
