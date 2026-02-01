// ESM loader hooks for Node.js to handle special file imports
// This mimics Bun's behavior of importing text files as strings

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

// File extensions to treat as text imports
const textExtensions = [".txt", ".scm", ".md"]

// Stub for bun:ffi - provides empty implementations
const bunFfiStub = `
export const dlopen = () => { throw new Error("bun:ffi not available in Node.js"); };
export const FFIType = {};
export const JSCallback = class { constructor() { throw new Error("bun:ffi not available"); } };
export const toArrayBuffer = () => null;
export const ptr = () => 0;
export default { dlopen, FFIType, JSCallback, toArrayBuffer, ptr };
`

// Stub for bun:sqlite
const bunSqliteStub = `
export class Database { constructor() { throw new Error("bun:sqlite not available in Node.js"); } }
export default Database;
`

export function resolve(specifier, context, nextResolve) {
  // Handle bun: protocol imports
  if (specifier.startsWith("bun:")) {
    return {
      url: "bun-compat:" + specifier.slice(4),
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  // Handle bun: compat stubs
  if (url.startsWith("bun-compat:")) {
    const module = url.slice(11)
    let source = `export default {};`
    if (module === "ffi") source = bunFfiStub
    else if (module === "sqlite") source = bunSqliteStub
    return {
      format: "module",
      source,
      shortCircuit: true,
    }
  }

  // Handle text files
  if (textExtensions.some((ext) => url.endsWith(ext))) {
    const filepath = fileURLToPath(url)
    const content = readFileSync(filepath, "utf-8")
    return {
      format: "module",
      source: `export default ${JSON.stringify(content)};`,
      shortCircuit: true,
    }
  }

  // Handle WASM files - export as URL path for dynamic loading
  if (url.endsWith(".wasm")) {
    const filepath = fileURLToPath(url)
    return {
      format: "module",
      source: `export default ${JSON.stringify(filepath)};`,
      shortCircuit: true,
    }
  }

  return nextLoad(url, context)
}
