// ESM loader hooks for Node.js to handle .txt file imports
// This mimics Bun's behavior of importing text files as strings

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export async function load(url, context, nextLoad) {
  if (url.endsWith(".txt")) {
    const filepath = fileURLToPath(url)
    const content = readFileSync(filepath, "utf-8")
    return {
      format: "module",
      source: `export default ${JSON.stringify(content)};`,
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}
