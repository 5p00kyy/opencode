# Bun to Node.js Migration - Implementation Guide

This document provides practical, step-by-step instructions for implementing the migration based on actual usage patterns found in the OpenCode codebase.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Package.json Updates](#packagejson-updates)
3. [File-by-File Migration](#file-by-file-migration)
4. [Testing Strategy](#testing-strategy)
5. [Build System Migration](#build-system-migration)

---

## Quick Start

### Prerequisites

```bash
# Install Node.js 18+ LTS
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher

# Clone and navigate to project
cd opencode-termux
```

### Step 1: Update package.json

Replace the packageManager field and add Node.js engines:

```bash
npm install fs-extra execa zx esbuild --save
npm install --save-dev vitest @vitest/ui glob
```

Update `package.json`:

```json
{
  "packageManager": "node@20.13.0 npm@10.5.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit"
  }
}
```

### Step 2: Create Configuration Files

**Create `vitest.config.ts`:**

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: "./packages",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
      ],
    },
  },
})
```

**Create `.npmrc`:**

```
save-exact=true
legacy-peer-deps=true
```

### Step 3: Test the Setup

```bash
npm test
npm run typecheck
```

---

## Package.json Updates

### Current state

```json
{
  "packageManager": "bun@1.3.5",
  "scripts": {
    "dev": "bun run --cwd packages/opencode --conditions=browser src/index.ts",
    "typecheck": "bun turbo typecheck"
  }
}
```

### Target state

```json
{
  "packageManager": "node@20.13.0 npm@10.5.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "dev": "node --loader tsx packages/opencode/src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "build": "esbuild packages/opencode/src/index.ts --bundle --platform=node --format=esm --outdir=dist",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "execa": "^8.0.0",
    "fs-extra": "^11.2.0",
    "glob": "^10.3.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.3.0",
    "@vitest/ui": "^1.3.0",
    "zx": "^7.2.0"
  }
}
```

### Install required packages

```bash
npm install fs-extra execa zx glob @types/node
npm install --save-dev vitest @vitest/ui esbuild tsx ts-node
```

---

## File-by-File Migration

### Priority 1: Core Utilities

These files should be migrated first as they're used by other modules.

#### 1. packages/util/src/sleep.ts

**Before (used as `Bun.sleep`):**
```typescript
// Currently: await Bun.sleep(1000)
```

**After (new utility):**
```typescript
/**
 * Sleep for a given number of milliseconds
 * Replacement for Bun.sleep()
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))
```

**Usage:**
```typescript
import { sleep } from "@opencode-ai/util"
await sleep(1000)
```

#### 2. packages/util/src/stream.ts

**After (new utility):**
```typescript
import { Readable } from "stream"

/**
 * Convert a readable stream to text
 * Replacement for readableStreamToText from Bun
 */
export async function readableStreamToText(stream: Readable): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString())
  }
  return chunks.join("")
}
```

**Usage:**
```typescript
import { readableStreamToText } from "@opencode-ai/util"
const text = await readableStreamToText(proc.stdout)
```

---

### Priority 2: File Operations

#### script/version.ts

**Before:**
```typescript
import { $ } from "bun"

await Bun.write(file, body)
await Bun.write(process.env.GITHUB_OUTPUT, output.join("\n"))
```

**After:**
```typescript
import { $ } from "zx"
import { writeFile } from "fs/promises"
import { outputFile } from "fs-extra"

await writeFile(file, body, "utf-8")
await writeFile(process.env.GITHUB_OUTPUT!, output.join("\n"), "utf-8")
// Or with fs-extra for auto-mkdir:
await outputFile(file, body)
```

#### script/stats.ts

**Before:**
```typescript
import { $ } from "bun"

content = await Bun.file(file).text()
await Bun.write(file, content + line)
await Bun.spawn(["bunx", "prettier", "--write", file]).exited
```

**After:**
```typescript
import { $ } from "zx"
import { readFile, writeFile } from "fs/promises"
import { execa } from "execa"

content = await readFile(file, "utf-8")
await writeFile(file, content + line, "utf-8")
await execa("prettier", ["--write", file])
// Or using zx:
await $`prettier --write ${file}`
```

#### packages/script/src/index.ts

**Before:**
```typescript
import { $, semver } from "bun"

const rootPkg = await Bun.file(rootPkgPath).json()
```

**After:**
```typescript
import { $ } from "zx"
import { readFile } from "fs/promises"
import semver from "semver"

const pkg = JSON.parse(await readFile(rootPkgPath, "utf-8"))
```

#### packages/ui/script/tailwind.ts

**Before:**
```typescript
const colors = await Bun.file(import.meta.dir + "/colors.txt").text()
await Bun.file(import.meta.dir + "/../src/styles/tailwind/colors.css").write(output.trim())
```

**After:**
```typescript
import { fileURLToPath } from "url"
import path from "path"
import { readFile, writeFile } from "fs/promises"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const colors = await readFile(path.join(__dirname, "colors.txt"), "utf-8")
await writeFile(
  path.join(__dirname, "../src/styles/tailwind/colors.css"),
  output.trim(),
  "utf-8"
)
```

---

### Priority 3: Process Spawning

#### packages/opencode/src/bun/index.ts

**Before:**
```typescript
import { readableStreamToText } from "bun"

const result = Bun.spawn([which(), ...cmd], {
  stdout: "pipe",
  stderr: "pipe",
})
const code = await result.exited
const stdout = await readableStreamToText(result.stdout)
```

**After:**
```typescript
import { spawn } from "child_process"
import { readableStreamToText } from "@opencode-ai/util"

const proc = spawn(which(), cmd, {
  stdio: ["inherit", "pipe", "pipe"],
})

let stdout = ""
let stderr = ""

proc.stdout?.on("data", (data) => {
  stdout += data.toString()
})
proc.stderr?.on("data", (data) => {
  stderr += data.toString()
})

const code = await new Promise<number>((resolve, reject) => {
  proc.on("exit", (code) => {
    resolve(code ?? 1)
  })
  proc.on("error", reject)
})

// Or using execa (simpler):
import { execa } from "execa"

const result = await execa(which(), cmd)
const stdout = result.stdout
const code = result.exitCode
```

#### packages/opencode/src/tool/bash.ts

**Before:**
```typescript
import { spawn } from "bun"

const proc = Bun.spawn([rgPath, ...args], {
  stdout: "pipe",
  stderr: "pipe",
})
```

**After:**
```typescript
import { spawn } from "child_process"

const proc = spawn(rgPath, args, {
  stdio: ["inherit", "pipe", "pipe"],
})
```

---

### Priority 4: Shell Commands

All files using `import { $ } from "bun"` should be updated.

**Replace:**
```typescript
import { $ } from "bun"
```

**With:**
```typescript
import { $ } from "zx"
```

**Files affected:**
- script/version.ts ✓ (update shell template syntax)
- script/publish.ts
- script/format.ts
- script/sync-zed.ts
- script/changelog.ts
- script/generate.ts
- script/beta.ts
- packages/script/src/index.ts ✓
- packages/sdk/js/script/build.ts
- packages/sdk/js/script/publish.ts
- packages/opencode/test/project/project.test.ts
- packages/opencode/test/snapshot/snapshot.test.ts
- packages/opencode/test/fixture/fixture.ts
- packages/opencode/src/worktree/index.ts
- packages/opencode/src/util/archive.ts
- packages/opencode/src/tool/bash.ts ✓
- packages/opencode/src/snapshot/index.ts
- packages/opencode/src/storage/storage.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/project/vcs.ts
- packages/opencode/src/project/project.ts
- packages/opencode/src/lsp/server.ts
- packages/opencode/src/installation/index.ts
- packages/opencode/src/file/watcher.ts
- packages/opencode/src/file/ripgrep.ts
- packages/opencode/src/file/index.ts
- packages/opencode/src/cli/cmd/uninstall.ts
- packages/opencode/src/cli/cmd/pr.ts
- packages/opencode/src/cli/cmd/github.ts
- packages/opencode/src/cli/cmd/tui/util/clipboard.ts
- packages/opencode/src/bun/index.ts ✓
- packages/opencode/script/build.ts
- packages/opencode/script/publish.ts
- packages/plugin/script/publish.ts
- packages/desktop/scripts/copy-bundles.ts
- packages/desktop/scripts/utils.ts
- github/index.ts

---

### Priority 5: Sleep Operations

Replace all `Bun.sleep()` calls:

**Files affected:**
- packages/opencode/src/shell/shell.ts
- packages/opencode/src/plugin/copilot.ts
- packages/opencode/src/plugin/codex.ts
- packages/opencode/src/cli/cmd/tui/worker.ts
- packages/opencode/src/cli/cmd/auth.ts
- packages/opencode/src/cli/cmd/github.ts
- packages/opencode/src/cli/cmd/debug/lsp.ts
- github/index.ts

**Before:**
```typescript
await Bun.sleep(1000)
```

**After:**
```typescript
import { sleep } from "@opencode-ai/util"
await sleep(1000)
```

---

### Priority 6: HTTP Server

#### packages/opencode/src/server/server.ts

**Before:**
```typescript
return Bun.serve({ ...args, port })
```

**After (using Express):**
```typescript
import express from "express"
import http from "http"

const app = express()
// ... configure app

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

return server
```

**Or using Hono (recommended for compatibility):**
```typescript
import { Hono } from "hono"
import { serve } from "@hono/node-server"

const app = new Hono()
// ... configure app

const server = serve({
  fetch: app.fetch,
  port,
})

return server
```

#### Test file updates (packages/opencode/test/session/llm.test.ts)

**Before:**
```typescript
state.server = Bun.serve({
  port: 0,
  fetch(req) {
    return new Response(...)
  },
})
```

**After (with Hono):**
```typescript
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import type { Server } from "http"

const app = new Hono()

app.post("/api/endpoint", async (c) => {
  return c.json({ ... })
})

const server = serve({
  fetch: app.fetch,
  port: 0,
})

// After test
server.close()
```

---

### Priority 7: Build System

#### packages/opencode/script/build.ts

**Before:**
```typescript
import { $ } from "bun"

const modelsData = process.env.MODELS_DEV_API_JSON
  ? await Bun.file(process.env.MODELS_DEV_API_JSON).text()
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text())

await Bun.write(
  path.join(dir, "src/provider/models-snapshot.ts"),
  `export const snapshot = ${modelsData} as const\n`,
)

await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
})
```

**After:**
```typescript
import { $ } from "zx"
import esbuild from "esbuild"
import { readFile, writeFile } from "fs/promises"

const modelsData = process.env.MODELS_DEV_API_JSON
  ? await readFile(process.env.MODELS_DEV_API_JSON, "utf-8")
  : await fetch(`${modelsUrl}/api.json`).then((x) => x.text())

await writeFile(
  path.join(dir, "src/provider/models-snapshot.ts"),
  `export const snapshot = ${modelsData} as const\n`,
  "utf-8"
)

const result = await esbuild.build({
  entryPoints: ["src/index.ts"],
  outdir: "./dist",
  platform: "node",
  bundle: true,
  format: "esm",
  splitting: true,
  sourcemap: true,
})

if (result.errors.length > 0) {
  throw new Error("Build failed")
}
```

---

### Priority 8: Testing Framework

#### All test files

**Before:**
```typescript
import { describe, expect, test } from "bun:test"
```

**After:**
```typescript
import { describe, expect, test } from "vitest"
```

**File changes:**
- Replace all `from "bun:test"` imports with `from "vitest"`
- Replace all `Bun.file()` calls with `readFile()` or `writeFile()`
- Replace all `Bun.write()` calls with file system operations
- Replace all `Bun.spawn()` calls with `execa` or `spawn`

**Example transformation:**

**Before:**
```typescript
import { describe, expect, test } from "bun:test"

describe("Filesystem", () => {
  test("should read files", async () => {
    await Bun.write(path.join(dir, "test.txt"), "hello")
    const content = await Bun.file(path.join(dir, "test.txt")).text()
    expect(content).toBe("hello")
  })
})
```

**After:**
```typescript
import { describe, expect, test } from "vitest"
import { readFile, writeFile } from "fs/promises"

describe("Filesystem", () => {
  test("should read files", async () => {
    const file = path.join(dir, "test.txt")
    await writeFile(file, "hello", "utf-8")
    const content = await readFile(file, "utf-8")
    expect(content).toBe("hello")
  })
})
```

---

## Testing Strategy

### Phase 1: Unit Tests

Run unit tests to verify individual API replacements:

```bash
npm run test
```

### Phase 2: Integration Tests

Test integrated modules together:

```bash
npm run test -- packages/opencode/test
```

### Phase 3: Full Test Suite

Run complete test suite:

```bash
npm test
```

### Phase 4: Manual Testing

For components without tests:

```bash
npm run dev
```

---

## Build System Migration

### Replace bunfig.toml

Create `package.json` configuration and remove `bunfig.toml`:

```bash
rm bunfig.toml
```

Configuration is now in:
- `package.json` - npm/Node.js configuration
- `vitest.config.ts` - test runner configuration
- `tsconfig.json` - TypeScript configuration
- `.npmrc` - npm-specific configuration

---

## Validation Checklist

After migration, verify:

- [ ] All imports updated from `bun` to Node.js equivalents
- [ ] `package.json` updated with new scripts and dependencies
- [ ] Configuration files created (`vitest.config.ts`, `.npmrc`)
- [ ] All tests passing with Vitest
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] Development server starts: `npm run dev`
- [ ] All shell scripts work with `zx`
- [ ] Process spawning works with `execa` or `spawn`
- [ ] File I/O operations work with `fs/promises` or `fs-extra`
- [ ] HTTP servers work with Express or Hono

---

## Troubleshooting

### Module not found errors

**Problem:** `Cannot find module 'bun'`

**Solution:** Ensure all Bun imports are replaced:
```bash
grep -r "from ['\"]bun" --include="*.ts" --include="*.tsx"
grep -r "Bun\." --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

### TypeScript errors

**Problem:** Type definitions for Bun not found

**Solution:** Remove Bun types from tsconfig.json:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  }
}
```

### Test failures

**Problem:** Tests fail after migration

**Solution:**
1. Check import statements are updated
2. Verify test utilities are migrated
3. Use `npm run test:ui` to debug visually

### Performance issues

**Problem:** Build or tests are slower

**Solution:**
- Use incremental builds with esbuild
- Enable caching in Vitest
- Consider using `tsx` for faster TypeScript execution

---

## Next Steps

1. Follow the Priority sections in order
2. Run tests after each section
3. Commit changes after each major component
4. Document any custom solutions
5. Update documentation for team members

