# Comprehensive Bun to Node.js Migration Guide for OpenCode

## Executive Summary

This guide provides detailed mappings for migrating OpenCode from Bun to Node.js. The project heavily relies on Bun's convenient APIs (file I/O, shell execution, spawning) and test framework. This migration requires careful handling of these dependencies with appropriate Node.js equivalents and community packages.

**Key Migration Areas:**
- File I/O operations
- Process spawning and shell execution
- HTTP server setup
- Build tooling
- Testing framework
- Configuration files

---

## 1. Bun.file() - File Reading API

### Current Bun Usage

```typescript
// Read text
const content = await Bun.file(path).text()
const json = await Bun.file(path).json()
const buffer = await Bun.file(path).arrayBuffer()

// Check existence
const exists = await Bun.file(path).exists()
```

### Node.js Equivalents

**Option A: Using `fs/promises` (Recommended - Built-in)**

```typescript
import { readFile } from "fs/promises"

// Read text
const content = await readFile(path, "utf-8")
const json = JSON.parse(await readFile(path, "utf-8"))
const buffer = await readFile(path)

// Check existence
import { access, constants } from "fs/promises"
const exists = await access(path, constants.F_OK)
  .then(() => true)
  .catch(() => false)
```

**Option B: Using `fs-extra` (More convenient)**

```bash
npm install fs-extra
npm install --save-dev @types/fs-extra
```

```typescript
import { readFile, pathExists } from "fs-extra"

// Read text
const content = await readFile(path, "utf-8")
const json = JSON.parse(await readFile(path, "utf-8"))
const buffer = await readFile(path)

// Check existence
const exists = await pathExists(path)
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/opencode/script/build.ts
const modelsData = process.env.MODELS_DEV_API_JSON
  ? await Bun.file(process.env.MODELS_DEV_API_JSON).text()
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text())
```

**After (Node.js with fs/promises):**
```typescript
import { readFile } from "fs/promises"

const modelsData = process.env.MODELS_DEV_API_JSON
  ? await readFile(process.env.MODELS_DEV_API_JSON, "utf-8")
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text())
```

**After (Node.js with fs-extra):**
```typescript
import { readFile } from "fs-extra"

const modelsData = process.env.MODELS_DEV_API_JSON
  ? await readFile(process.env.MODELS_DEV_API_JSON, "utf-8")
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text())
```

### Related APIs

| Bun API | Node.js Equivalent | Package |
|---------|-------------------|---------|
| `Bun.file(path).text()` | `readFile(path, "utf-8")` | `fs/promises` |
| `Bun.file(path).json()` | `JSON.parse(await readFile(...))` | `fs/promises` |
| `Bun.file(path).arrayBuffer()` | `readFile(path)` | `fs/promises` |
| `Bun.file(path).bytes()` | `readFile(path)` | `fs/promises` |
| `Bun.file(path).exists()` | `pathExists(path)` | `fs-extra` |
| `Bun.file(path).size` | `stat(path).then(s => s.size)` | `fs/promises` |
| `Bun.file(path).type` | Manual MIME detection | `mime-types` |

---

## 2. Bun.write() - File Writing API

### Current Bun Usage

```typescript
// Write text, buffer, or JSON
await Bun.write(path, "text content")
await Bun.write(path, buffer)
await Bun.write(path, json)

// Append
const file = Bun.file(path)
await Bun.write(file, "append content")
```

### Node.js Equivalents

**Using `fs/promises` (Built-in):**

```typescript
import { writeFile, appendFile } from "fs/promises"

// Write text
await writeFile(path, "text content", "utf-8")

// Write buffer
await writeFile(path, buffer)

// Write JSON
await writeFile(path, JSON.stringify(json, null, 2), "utf-8")

// Append
await appendFile(path, "append content", "utf-8")
```

**Using `fs-extra` (More convenient):**

```bash
npm install fs-extra
```

```typescript
import { writeFile, outputFile, appendFile } from "fs-extra"

// Write with auto directory creation
await outputFile(path, "text content")
await outputFile(path, JSON.stringify(json, null, 2))

// Append
await appendFile(path, "append content")
```

### Migration Examples

**Before (Bun):**
```typescript
// script/version.ts
await Bun.write(file, body)
await Bun.write(process.env.GITHUB_OUTPUT, output.join("\n"))

// script/stats.ts
await Bun.write(file, content + line)
```

**After (Node.js):**
```typescript
import { writeFile, appendFile } from "fs/promises"
import { outputFile } from "fs-extra"

// Simple write
await writeFile(file, body, "utf-8")
await writeFile(process.env.GITHUB_OUTPUT!, output.join("\n"), "utf-8")

// With directory creation
await outputFile(file, content + line)
```

### Related APIs

| Bun API | Node.js Equivalent | Package |
|---------|-------------------|---------|
| `Bun.write(path, text)` | `writeFile(path, text, "utf-8")` | `fs/promises` |
| `Bun.write(path, buffer)` | `writeFile(path, buffer)` | `fs/promises` |
| `Bun.write(path, file)` | `copyFile(...)` | `fs/promises` |
| Auto mkdir | `outputFile(path, content)` | `fs-extra` |

---

## 3. Bun.serve() - HTTP Server

### Current Bun Usage

```typescript
const server = Bun.serve({
  port: 3000,
  hostname: "localhost",
  fetch(request) {
    return new Response("Hello")
  },
})
```

### Node.js Equivalents

**Option A: Using native `http` module (Built-in):**

```typescript
import http from "http"

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Hello")
})

server.listen(3000, "localhost")

// Close server
server.close()
```

**Option B: Using Express.js (Recommended for complex apps):**

```bash
npm install express
npm install --save-dev @types/express
```

```typescript
import express from "express"

const app = express()

app.get("/", (req, res) => {
  res.send("Hello")
})

const server = app.listen(3000, "localhost")

// Close server
server.close()
```

**Option C: Using Hono (Drop-in replacement):**

```bash
npm install hono
```

```typescript
import { Hono } from "hono"
import { serve } from "@hono/node-server"

const app = new Hono()

app.get("/", (c) => c.text("Hello"))

serve({
  fetch: app.fetch,
  port: 3000,
  hostname: "localhost",
})
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/opencode/src/server/server.ts
return Bun.serve({ ...args, port })

// packages/opencode/test/session/llm.test.ts
state.server = Bun.serve({
  port: 0,
  fetch(req) {
    // request handler
  },
})
```

**After (Node.js with Hono - recommended):**

```typescript
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import type { Server } from "http"

let server: Server

// In test setup
server = serve({
  fetch: app.fetch,
  port: 0,
})

// Close
server.close()
```

**After (Node.js with Express):**

```typescript
import express from "express"
import type { Server } from "http"

const app = express()
let server: Server | null = null

// In test setup
server = app.listen(0, () => {
  const addr = server?.address()
  if (typeof addr === "object" && addr?.port) {
    // Use port
  }
})

// Close
server?.close()
```

### Compatibility Notes

- Bun's `fetch` handler is actually a Web Standard API, so Hono is the most compatible
- For production servers, Express is more mature and feature-rich
- Port 0 still works in Node.js and assigns a random available port

---

## 4. Bun.build() - Bundler

### Current Bun Usage

```typescript
const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "./dist",
  target: "node",
})
```

### Node.js Equivalents

**Option A: Using esbuild (Recommended):**

```bash
npm install esbuild
```

```typescript
import esbuild from "esbuild"

const result = await esbuild.build({
  entryPoints: ["src/index.ts"],
  outdir: "./dist",
  platform: "node",
  bundle: true,
  format: "esm",
})
```

**Option B: Using Vite:**

```bash
npm install vite --save-dev
```

```typescript
import { build } from "vite"

await build({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    outDir: "./dist",
  },
})
```

**Option C: Using webpack:**

```bash
npm install webpack webpack-cli --save-dev
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/opencode/script/build.ts
await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
})
```

**After (esbuild):**
```typescript
import esbuild from "esbuild"

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outdir: "./dist",
  platform: "node",
  bundle: true,
  format: "esm",
})
```

### Comparison

| Feature | Bun.build | esbuild | Vite | webpack |
|---------|-----------|---------|------|---------|
| Speed | Very Fast | Very Fast | Fast | Slower |
| Configuration | Simple | Simple | Complex | Complex |
| TypeScript | Native | Via loader | Native | Via loader |
| ESM Output | Yes | Yes | Yes | Yes |
| Tree-shaking | Yes | Yes | Yes | Yes |

---

## 5. Bun.spawn() / Bun.spawnSync() - Process Spawning

### Current Bun Usage

```typescript
// Async spawn
const proc = Bun.spawn(["command", "arg1", "arg2"], {
  stdout: "pipe",
  stderr: "pipe",
  cwd: "/path",
})
const code = await proc.exited

// Sync spawn
const result = Bun.spawnSync(["command", "arg1"], {
  stdout: "pipe",
})
```

### Node.js Equivalents

**Using `child_process` (Built-in):**

```typescript
import { spawn, spawnSync } from "child_process"

// Async spawn
const proc = spawn("command", ["arg1", "arg2"], {
  stdio: ["inherit", "pipe", "pipe"],
  cwd: "/path",
})

proc.on("exit", (code) => {
  // Handle exit
})

// Get output
let stdout = ""
proc.stdout?.on("data", (data) => {
  stdout += data.toString()
})

// Sync spawn
const result = spawnSync("command", ["arg1"], {
  stdio: ["inherit", "pipe", "pipe"],
  encoding: "utf-8",
})
const stdout = result.stdout
```

**Using `execa` (Recommended - better DX):**

```bash
npm install execa
```

```typescript
import { execa, execaSync } from "execa"

// Async
const { stdout, stderr, exitCode } = await execa("command", ["arg1", "arg2"], {
  cwd: "/path",
})

// Sync
const result = execaSync("command", ["arg1"], {
  encoding: "utf-8",
})
```

### Migration Examples

**Before (Bun):**
```typescript
// script/stats.ts
await Bun.spawn(["bunx", "prettier", "--write", file]).exited

// packages/opencode/src/bun/index.ts
const result = Bun.spawn([which(), ...cmd], {
  stdout: "pipe",
  stderr: "pipe",
})
const code = await result.exited
const stdout = await readableStreamToText(result.stdout)
```

**After (using execa):**
```typescript
import { execa } from "execa"

// Simple execution
await execa("prettier", ["--write", file])

// With output capture
const result = await execa(which(), cmd, {
  stdio: ["inherit", "pipe", "pipe"],
})
const stdout = result.stdout
```

**After (using child_process):**
```typescript
import { spawn } from "child_process"
import { readableStreamToText } from "bun" // or implement custom reader

const proc = spawn(which(), cmd, {
  stdio: ["inherit", "pipe", "pipe"],
})

let stdout = ""
proc.stdout?.on("data", (data) => {
  stdout += data.toString()
})

const code = await new Promise(resolve => {
  proc.on("exit", resolve)
})
```

### Comparison

| Feature | Bun.spawn | child_process | execa |
|---------|-----------|---------------|-------|
| Learning Curve | Easy | Medium | Easy |
| Error Handling | Simple | Complex | Simple |
| Promise-based | Yes | No | Yes |
| Output Capture | Native | Manual | Built-in |
| Stream Handling | Simple | Complex | Simple |

---

## 6. Bun.sleep() - Async Sleep

### Current Bun Usage

```typescript
await Bun.sleep(1000) // milliseconds
await Bun.sleep(10000)
```

### Node.js Equivalents

**Using native Promise (Built-in - Recommended):**

```typescript
// Option A: Reusable function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

await sleep(1000)

// Option B: Inline
await new Promise(resolve => setTimeout(resolve, 1000))

// Option C: Create helper util (Recommended)
// packages/util/src/sleep.ts
export const sleep = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))
```

**Using `timers/promises` (Node.js 15+):**

```typescript
import { setTimeout } from "timers/promises"

await setTimeout(1000)
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/opencode/src/shell/shell.ts
await Bun.sleep(SIGKILL_TIMEOUT_MS)

// packages/opencode/src/plugin/codex.ts
await Bun.sleep(interval + OAUTH_POLLING_SAFETY_MARGIN_MS)

// packages/opencode/test/session/retry.test.ts
await Bun.sleep(10000)
```

**After (timers/promises - modern):**
```typescript
import { setTimeout } from "timers/promises"

await setTimeout(SIGKILL_TIMEOUT_MS)
```

**After (custom util - compatible):**
```typescript
// packages/util/src/sleep.ts
export const sleep = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Usage
import { sleep } from "@opencode-ai/util"
await sleep(SIGKILL_TIMEOUT_MS)
```

### Recommendation

Create a simple utility in `@opencode-ai/util`:

```typescript
// packages/util/src/sleep.ts
/**
 * Sleep for a given number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the given time
 */
export const sleep = (ms: number) => 
  new Promise<void>(resolve => setTimeout(resolve, ms))
```

Then use throughout the codebase for consistency.

---

## 7. Bun.env - Environment Variables

### Current Bun Usage

```typescript
const apiKey = Bun.env.API_KEY
const debugMode = Bun.env.DEBUG === "true"
```

### Node.js Equivalents

**Using `process.env` (Built-in - Drop-in replacement):**

```typescript
const apiKey = process.env.API_KEY
const debugMode = process.env.DEBUG === "true"
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/script/src/index.ts
const env = {
  OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"],
  OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
  // ...
}
```

**After (Node.js - no changes needed!):**
```typescript
// Already uses process.env internally
const env = {
  OPENCODE_CHANNEL: process.env.OPENCODE_CHANNEL,
  OPENCODE_BUMP: process.env.OPENCODE_BUMP,
  // ...
}
```

### Type Safety Enhancement

```bash
npm install dotenv
npm install --save-dev @types/node
```

```typescript
// Create environment schema
import z from "zod"

const envSchema = z.object({
  API_KEY: z.string(),
  DEBUG: z.enum(["true", "false"]).default("false"),
  PORT: z.string().transform(Number).default("3000"),
})

export const env = envSchema.parse(process.env)
```

### Differences

| Feature | Bun.env | process.env | dotenv |
|---------|---------|------------|--------|
| Access | `Bun.env.KEY` | `process.env.KEY` | Via process.env |
| Type Safety | Typed | Untyped | Via schema |
| .env file | Auto-loaded | Requires dotenv | Auto-loaded |
| Null safety | Type-safe | Manual checks | Via schema |

**Note:** `process.env` is already available in Node.js and is the standard approach. Bun's `Bun.env` is just a type-safe wrapper.

---

## 8. Bun.glob() - Glob Patterns

### Current Bun Usage

```typescript
const files = await Bun.glob("**/*.ts")
const filtered = await Bun.glob(["src/**/*.{ts,tsx}", "!**/*.test.ts"])
```

### Node.js Equivalents

**Using `glob` package (Recommended):**

```bash
npm install glob
npm install --save-dev @types/glob
```

```typescript
import { glob } from "glob"

const files = await glob("**/*.ts")
const filtered = await glob(["src/**/*.{ts,tsx}", "!**/*.test.ts"])
```

**Using `fast-glob` (Faster):**

```bash
npm install fast-glob
npm install --save-dev @types/fast-glob
```

```typescript
import fg from "fast-glob"

const files = await fg("**/*.ts")
const filtered = await fg(["src/**/*.{ts,tsx}", "!**/*.test.ts"])
```

**Using Node.js 21.2+ `fs.glob()` (Built-in):**

```typescript
import { glob } from "fs/promises"

const files = []
for await (const file of glob("**/*.ts")) {
  files.push(file)
}
```

### Migration Examples

**Before (Bun):**
```typescript
// Implementation would use Bun.glob internally
const allFiles = await Bun.glob("**/*.{ts,tsx,js,jsx}")
```

**After (using glob package):**
```typescript
import { glob } from "glob"

const allFiles = await glob("**/*.{ts,tsx,js,jsx}")
```

**After (using fast-glob):**
```typescript
import fg from "fast-glob"

const allFiles = await fg("**/*.{ts,tsx,js,jsx}")
```

### Comparison

| Package | Speed | Compatibility | API |
|---------|-------|---------------|-----|
| glob | Good | Excellent | Simple |
| fast-glob | Excellent | Good | Simple |
| fs.glob (Node 21+) | Good | Modern Node only | Async iterator |

---

## 9. Bun.password - Password Hashing

### Current Bun Usage

```typescript
const hash = await Bun.password.hash(password)
const isValid = await Bun.password.verify(password, hash)
```

### Node.js Equivalents

**Using `bcrypt` (Recommended):**

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

```typescript
import bcrypt from "bcrypt"

const hash = await bcrypt.hash(password, 10)
const isValid = await bcrypt.compare(password, hash)
```

**Using `argon2` (More secure):**

```bash
npm install argon2
```

```typescript
import { hash, verify } from "argon2"

const hashedPassword = await hash(password)
const isValid = await verify(hashedPassword, password)
```

**Using `scrypt` (Built-in Node.js):**

```typescript
import { scrypt, randomBytes, timingSafeEqual } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = await scryptAsync(password, salt, 64)
  return `${salt}:${derivedKey.toString("hex")}`
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":")
  const derivedKey = await scryptAsync(password, salt, 64)
  return timingSafeEqual(Buffer.from(key, "hex"), derivedKey)
}
```

### Migration Examples

**Before (Bun):**
```typescript
// If password hashing is used
const hash = await Bun.password.hash(userPassword)
const isValid = await Bun.password.verify(userPassword, storedHash)
```

**After (bcrypt - recommended):**
```typescript
import bcrypt from "bcrypt"

const hash = await bcrypt.hash(userPassword, 10)
const isValid = await bcrypt.compare(userPassword, storedHash)
```

**After (argon2 - most secure):**
```typescript
import { hash, verify } from "argon2"

const hashedPassword = await hash(userPassword, {
  type: argon2id,
})
const isValid = await verify(hashedPassword, userPassword)
```

### Comparison

| Package | Speed | Security | Setup |
|---------|-------|----------|-------|
| bcrypt | Good | Good | Easy |
| argon2 | Good | Excellent | Requires native build |
| scrypt | Good | Good | No dependencies |

**Recommendation:** Use bcrypt for most applications. It's battle-tested, well-maintained, and has good performance/security balance.

---

## 10. Bun.sql / Bun SQLite - Database

### Current Bun Usage

```typescript
import { sql } from "bun"

const db = sql`./database.db`
const rows = await db`SELECT * FROM users WHERE id = ${id}`
```

### Node.js Equivalents

**Using `sqlite3` (npm package):**

```bash
npm install sqlite3
npm install --save-dev @types/node
```

```typescript
import sqlite3 from "sqlite3"

const db = new sqlite3.Database("./database.db")

db.all("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
  if (err) console.error(err)
  console.log(rows)
})

// Promise-based wrapper
import { open } from "sqlite"

const db = await open({
  filename: "./database.db",
  driver: sqlite3.Database,
})

const rows = await db.all("SELECT * FROM users WHERE id = ?", id)
```

**Using `better-sqlite3` (Recommended - synchronous):**

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

```typescript
import Database from "better-sqlite3"

const db = new Database("./database.db")

const rows = db.prepare("SELECT * FROM users WHERE id = ?").all(id)
```

**Using `sql.js` (In-memory):**

```bash
npm install sql.js
```

```typescript
import initSqlJs from "sql.js"

const SQL = await initSqlJs()
const db = new SQL.Database()

const stmt = db.prepare("SELECT * FROM users WHERE id = ?")
stmt.bind([id])
const results = []
while (stmt.step()) {
  results.push(stmt.getAsObject())
}
stmt.free()
```

**Using `prisma` (ORM - Recommended for complex apps):**

```bash
npm install @prisma/client
npm install --save-dev prisma
npx prisma init
```

```typescript
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const user = await prisma.user.findUnique({
  where: { id },
})
```

### Migration Examples

**Before (Bun):**
```typescript
// If SQLite is used
import { sql } from "bun"

const db = sql`./database.db`
const results = await db`SELECT * FROM users`
```

**After (better-sqlite3 - direct replacement):**
```typescript
import Database from "better-sqlite3"

const db = new Database("./database.db")
const results = db.prepare("SELECT * FROM users").all()
```

**After (Prisma - recommended for new projects):**
```typescript
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const results = await prisma.user.findMany()
```

### Comparison

| Package | Type | Async | Learning Curve | SQL |
|---------|------|-------|-----------------|-----|
| sqlite3 | Driver | Yes | Medium | Native |
| better-sqlite3 | Driver | No | Easy | Native |
| sql.js | In-memory | No | Hard | Native |
| Prisma | ORM | Yes | Medium | Generated |

---

## 11. Bun.Transpiler - TypeScript Transpilation

### Current Bun Usage

```typescript
const transpiler = new Bun.Transpiler({
  loader: "ts",
  target: "esnext",
})

const result = transpiler.transformSync(code)
```

### Node.js Equivalents

**Using `esbuild` (Recommended):**

```bash
npm install esbuild
```

```typescript
import esbuild from "esbuild"

const result = esbuild.transformSync(code, {
  loader: "ts",
  target: "esnext",
})

console.log(result.code)
```

**Using `swc` (Faster):**

```bash
npm install @swc/core
```

```typescript
import { transformSync } from "@swc/core"

const result = transformSync(code, {
  jsc: {
    parser: {
      syntax: "typescript",
    },
  },
})

console.log(result.code)
```

**Using `TypeScript` compiler directly:**

```bash
npm install typescript
```

```typescript
import ts from "typescript"

const result = ts.transpileModule(code, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
  },
})

console.log(result.outputText)
```

### Migration Examples

**Before (Bun):**
```typescript
// If transpilation is needed
const transpiler = new Bun.Transpiler()
const compiled = transpiler.transformSync(sourceCode)
```

**After (esbuild):**
```typescript
import esbuild from "esbuild"

const { code } = esbuild.transformSync(sourceCode, {
  loader: "ts",
})
```

**After (TypeScript compiler):**
```typescript
import ts from "typescript"

const { outputText } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
  },
})
```

### Comparison

| Package | Speed | Features | Learning Curve |
|---------|-------|----------|-----------------|
| esbuild | Very Fast | Bundling + Transpiling | Easy |
| swc | Fastest | Bundling + Transpiling | Easy |
| TypeScript | Slower | Full type checking | Medium |

---

## 12. Bun.$ Shell - Shell Commands

### Current Bun Usage

```typescript
import { $ } from "bun"

const result = await $`git status`
const output = result.stdout.toString()
const exitCode = result.exitCode

// Piping and error handling
const piped = await $`cat file.txt | grep "pattern"`
const safe = await $`command`.nothrow()
```

### Node.js Equivalents

**Using `zx` (Recommended - Bun $ equivalent):**

```bash
npm install zx
```

```typescript
import { $ } from "zx"

const result = await $`git status`
const output = result.stdout
const exitCode = result.exitCode

// Piping works the same
const piped = await $`cat file.txt | grep "pattern"`

// Error handling
try {
  await $`failing-command`
} catch (e) {
  console.log(e.message)
}
```

**Using `execa` with shell:**

```bash
npm install execa
```

```typescript
import { execa } from "execa"

const { stdout, exitCode } = await execa("sh", ["-c", "git status"], {
  shell: true,
})

// Or simpler with shell: true in options
const result = await execa("git status", { shell: true, stdio: "inherit" })
```

**Using native `child_process.execFile()`:**

```typescript
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const { stdout } = await execAsync("git status")
```

### Migration Examples

**Before (Bun):**
```typescript
// script/version.ts
import { $ } from "bun"

const release = await $`gh release view v${Script.version} --json id,tagName`.json()
const output = release.id

// script/stats.ts
await $`gh release create v${Script.version} ...`

// script/publish.ts
await $`bun publish`.quiet()
```

**After (using zx - drop-in replacement):**
```typescript
import { $ } from "zx"

const release = JSON.parse((await $`gh release view v${Script.version} --json id,tagName`).stdout)
const output = release.id

// zx uses the same syntax
await $`gh release create v${Script.version} ...`
await $`bun publish`.quiet()
```

**After (using execa):**
```typescript
import { execa } from "execa"

const result = await execa("gh", ["release", "view", `v${Script.version}`, "--json", "id,tagName"])
const release = JSON.parse(result.stdout)
const output = release.id

await execa("gh", ["release", "create", `v${Script.version}`, ...args])
```

### Comparison

| Package | Template Strings | Piping | Learning Curve |
|---------|-----------------|--------|-----------------|
| zx | Yes | Yes | Easy |
| execa | No | Via string | Medium |
| child_process | No | Via string | Hard |

**Recommendation:** Use `zx` for a near drop-in replacement of Bun's `$` syntax.

---

## 13. bunfig.toml - Configuration

### Current Bun Configuration

**bunfig.toml:**
```toml
[install]
exact = true

[test]
root = "./do-not-run-tests-from-root"
```

### Node.js Equivalents

Node.js doesn't have a single config file like bunfig.toml. Use these alternatives:

**Option A: package.json (Recommended):**

```json
{
  "name": "opencode",
  "packageManager": "node@20.0.0 npm@10.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "dev": "node src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Option B: npm .npmrc:**

```text
# .npmrc
save-exact=true
legacy-peer-deps=true
strict-peer-dependencies=false
```

**Option C: Separate config files:**

- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test runner configuration
- `.npmrc` - npm configuration
- `.editorconfig` - Editor configuration

### Migration Examples

**Before (Bun):**
```toml
# bunfig.toml
[install]
exact = true

[test]
root = "./do-not-run-tests-from-root"
```

**After (package.json):**
```json
{
  "name": "opencode",
  "type": "module",
  "packageManager": "node@20.0.0 npm@10.0.0",
  "scripts": {
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**After (.npmrc for exact installs):**
```text
save-exact=true
```

**After (vitest.config.ts for test configuration):**
```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: "./packages",
  },
})
```

---

## 14. Testing Framework Migration

### Current Bun Usage

```typescript
import { describe, test, expect } from "bun:test"

describe("My Tests", () => {
  test("should work", () => {
    expect(1).toBe(1)
  })
})
```

### Node.js Equivalents

**Option A: Using Vitest (Recommended - most compatible):**

```bash
npm install --save-dev vitest @vitest/ui
```

```typescript
import { describe, test, expect } from "vitest"

describe("My Tests", () => {
  test("should work", () => {
    expect(1).toBe(1)
  })
})
```

**Option B: Using Node.js built-in test runner (Node.js 18+):**

```typescript
import { describe, test } from "node:test"
import assert from "node:assert"

describe("My Tests", () => {
  test("should work", () => {
    assert.strictEqual(1, 1)
  })
})
```

**Option C: Using Jest:**

```bash
npm install --save-dev jest @types/jest ts-jest
```

```typescript
describe("My Tests", () => {
  test("should work", () => {
    expect(1).toBe(1)
  })
})
```

### Migration Examples

**Before (Bun):**
```typescript
// packages/opencode/test/util/filesystem.test.ts
import { describe, expect, test } from "bun:test"

describe("Filesystem", () => {
  test("should read files", async () => {
    const content = await Bun.file("test.txt").text()
    expect(content).toBe("expected")
  })
})

test.run()
```

**After (Vitest):**
```typescript
import { describe, expect, test } from "vitest"
import { readFile } from "fs/promises"

describe("Filesystem", () => {
  test("should read files", async () => {
    const content = await readFile("test.txt", "utf-8")
    expect(content).toBe("expected")
  })
})
```

**After (Node.js built-in):**
```typescript
import { describe, test } from "node:test"
import assert from "node:assert"
import { readFile } from "fs/promises"

describe("Filesystem", () => {
  test("should read files", async () => {
    const content = await readFile("test.txt", "utf-8")
    assert.equal(content, "expected")
  })
})
```

### Comparison

| Framework | Learning Curve | Ecosystem | Speed | Compatibility |
|-----------|-----------------|-----------|-------|----------------|
| Vitest | Easy | Large | Fast | Excellent |
| Node.js built-in | Easy | Minimal | Fast | Limited |
| Jest | Medium | Very Large | Slower | Good |

**Recommendation:** Use Vitest for the best balance. It has Jest-compatible API, excellent TypeScript support, and fast execution.

---

## 15. Additional Bun APIs in Use

### readableStreamToText()

**Before:**
```typescript
import { readableStreamToText } from "bun"

const text = await readableStreamToText(stream)
```

**After:**
```typescript
import { Readable } from "stream"

async function readableStreamToText(stream: Readable): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stream) {
    chunks.push(chunk.toString())
  }
  return chunks.join("")
}

// Or use simpler approach
async function readStreamAsText(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ""
    stream.on("data", chunk => { data += chunk })
    stream.on("end", () => resolve(data))
    stream.on("error", reject)
  })
}
```

### type SystemError

**Before:**
```typescript
import { type SystemError } from "bun"
```

**After:**
```typescript
// Node.js uses standard Error with errno property
interface NodeSystemError extends Error {
  errno?: number
  code?: string
  syscall?: string
  path?: string
}

// Or just use Error type
try {
  // something
} catch (error) {
  if (error instanceof Error && "code" in error) {
    // Handle system error
  }
}
```

### Bun.file.name / BunFile type

**Before:**
```typescript
import type { BunFile } from "bun"

const file: BunFile = Bun.file(path)
```

**After:**
```typescript
// Node.js doesn't have a BunFile type, just use paths
import { readFile, writeFile } from "fs/promises"

const filePath = path
const content = await readFile(filePath, "utf-8")
```

---

## Summary Table: All Bun APIs and Replacements

| Bun API | Node.js Equivalent | Package | Recommendation |
|---------|-------------------|---------|-----------------|
| `Bun.file()` | `readFile()` | `fs/promises` | Built-in |
| `Bun.write()` | `writeFile()` | `fs/promises` | Built-in |
| `Bun.serve()` | `http.createServer()` | Built-in | Express or Hono |
| `Bun.build()` | `esbuild.build()` | `esbuild` | esbuild |
| `Bun.spawn()` | `spawn()` | `child_process` | execa |
| `Bun.sleep()` | `setTimeout()` | Built-in | timers/promises |
| `Bun.env` | `process.env` | Built-in | No change |
| `Bun.glob()` | `glob()` | `glob` | glob or fast-glob |
| `Bun.password` | `bcrypt` | `bcrypt` | bcrypt |
| `Bun.sql` | `better-sqlite3` | `better-sqlite3` | Prisma |
| `Bun.Transpiler` | `esbuild.transform()` | `esbuild` | esbuild |
| `Bun.$` | `$` | `zx` | zx |
| `bunfig.toml` | `package.json` | Built-in | package.json |
| `bun:test` | `vitest` | `vitest` | Vitest |

---

## Migration Checklist

### Phase 1: Core Dependencies
- [ ] Install Node.js 18+ LTS
- [ ] Update package.json with Node.js equivalents
- [ ] Install: `fs-extra`, `execa`, `zx`, `esbuild`
- [ ] Install: `vitest`, `@vitest/ui`

### Phase 2: File Operations
- [ ] Replace `Bun.file().text()` with `readFile()`
- [ ] Replace `Bun.write()` with `writeFile()`
- [ ] Replace `Bun.file().exists()` with `pathExists()` or `access()`
- [ ] Test all file operations

### Phase 3: Process Operations
- [ ] Replace `Bun.spawn()` with `execa()` or `spawn()`
- [ ] Replace `Bun.$` with `zx`'s `$`
- [ ] Update all shell script commands
- [ ] Test process spawning

### Phase 4: Core APIs
- [ ] Replace `Bun.sleep()` with custom utility or `timers/promises`
- [ ] Replace `Bun.serve()` with Express or Hono
- [ ] Replace `Bun.build()` with esbuild
- [ ] Replace `Bun.glob()` with glob package

### Phase 5: Testing
- [ ] Replace `bun:test` with Vitest
- [ ] Update all test imports
- [ ] Replace Bun-specific test utilities
- [ ] Run full test suite

### Phase 6: Configuration
- [ ] Update package.json with Node.js engines field
- [ ] Create .npmrc for npm configuration
- [ ] Create vitest.config.ts for test runner
- [ ] Remove bunfig.toml (optional keep for reference)

### Phase 7: Documentation
- [ ] Update README with Node.js setup
- [ ] Update CONTRIBUTING.md
- [ ] Document build process changes
- [ ] Create migration guide for contributors

---

## Troubleshooting Common Issues

### Issue: Import.meta.dir not available

**Problem:** Bun's `import.meta.dir` doesn't exist in Node.js

**Solution:**
```typescript
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.dirname(__dirname)
```

### Issue: Stream handling differences

**Problem:** Different APIs for reading streams

**Solution:** Create a utility wrapper
```typescript
// packages/util/src/stream.ts
import { Readable } from "stream"

export async function readableStreamToText(stream: Readable): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stream) {
    chunks.push(chunk.toString())
  }
  return chunks.join("")
}
```

### Issue: Type definitions missing

**Problem:** Bun types (`BunFile`, `SystemError`) not available

**Solution:** Use standard Node.js types
```typescript
// Instead of: import type { BunFile } from "bun"
// Use: string paths directly
// Instead of: import type { SystemError } from "bun"
// Use: Error with extended properties
interface SystemError extends Error {
  code?: string
  errno?: number
  syscall?: string
}
```

### Issue: Module resolution differences

**Problem:** Module resolution may differ between Bun and Node.js

**Solution:** Use consistent import paths
```typescript
// Good - explicit file extensions for ESM
import { util } from "./util.js"
import { sql } from "sql.js"

// Avoid - Bun can resolve these, Node.js may struggle
import { util } from "./util"
```

---

## Performance Considerations

### File I/O
- **Bun.file()** is highly optimized; `fs/promises` is comparable in Node.js
- Use `fs-extra` for convenience with minimal performance penalty

### Process Spawning
- **execa** has slightly more overhead than raw `spawn()`, but better DX
- For high-volume spawning, use `child_process.spawn()` directly

### Bundling
- **esbuild** is nearly as fast as Bun's bundler
- For production builds, consider caching and incremental builds

### Testing
- **Vitest** has comparable speed to Bun:test
- Node.js built-in test runner is fastest but less feature-rich

---

## Next Steps

1. **Start with Phase 1**: Get basic Node.js setup working
2. **Gradually migrate** by component, testing as you go
3. **Leverage community packages** - don't reinvent the wheel
4. **Maintain compatibility** - create utility wrappers for shared abstractions
5. **Document decisions** - especially for non-obvious replacements

The good news: OpenCode's architecture is well-suited for this migration. The heavy use of TypeScript, modular design, and dependency injection patterns means most replacements are straightforward.

---

## Additional Resources

### Official Documentation
- [Node.js File System Docs](https://nodejs.org/api/fs.html)
- [Node.js Child Process Docs](https://nodejs.org/api/child_process.html)
- [Node.js Express Guide](https://expressjs.com/)

### Community Packages
- [execa - Modern process execution](https://github.com/sindresorhus/execa)
- [zx - Bash scripting for Node.js](https://github.com/google/zx)
- [esbuild - Fast bundler](https://esbuild.github.io/)
- [Vitest - Unit test framework](https://vitest.dev/)
- [Hono - Lightweight web framework](https://hono.dev/)

### Migration Tools
- [codemod-scripts](https://github.com/codemod-com/codemod) - Automated code transformations
- [jscodeshift](https://github.com/facebook/jscodeshift) - JavaScript codemod toolkit

