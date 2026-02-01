// Register custom loader hooks for .txt file imports on Node.js
// This should be imported before the main application via --import flag

import { register } from "node:module"
import { pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
register(pathToFileURL(join(dir, "loader-hooks.mjs")))
