# Bun to Node.js Migration - Quick Reference

## One-Line Replacements

### File I/O

```typescript
// Bun
const text = await Bun.file(path).text()
const buffer = await Bun.file(path).arrayBuffer()
const json = await Bun.file(path).json()
const exists = await Bun.file(path).exists()

// Node.js
import { readFile } from "fs/promises"
const text = await readFile(path, "utf-8")
const buffer = await readFile(path)
const json = JSON.parse(await readFile(path, "utf-8"))
const exists = await access(path).then(() => true).catch(() => false)
```

```typescript
// Bun
await Bun.write(path, content)

// Node.js
import { writeFile } from "fs/promises"
await writeFile(path, content, "utf-8")
```

### Process Operations

```typescript
// Bun
const proc = Bun.spawn(cmd, opts)
const code = await proc.exited

// Node.js
import { execa } from "execa"
const result = await execa(cmd[0], cmd.slice(1), opts)
const code = result.exitCode
```

```typescript
// Bun
import { $ } from "bun"
const result = await $`git status`

// Node.js
import { $ } from "zx"
const result = await $`git status`
```

### Sleep

```typescript
// Bun
await Bun.sleep(1000)

// Node.js - Option 1
await new Promise(r => setTimeout(r, 1000))

// Node.js - Option 2
import { setTimeout } from "timers/promises"
await setTimeout(1000)

// Node.js - Option 3 (recommended)
import { sleep } from "@opencode-ai/util"
await sleep(1000)
```

### Environment Variables

```typescript
// Bun
const key = Bun.env.API_KEY

// Node.js (no change!)
const key = process.env.API_KEY
```

### Glob

```typescript
// Bun
const files = await Bun.glob("**/*.ts")

// Node.js
import { glob } from "glob"
const files = await glob("**/*.ts")
```

### HTTP Server

```typescript
// Bun
const server = Bun.serve({ port: 3000, fetch })

// Node.js
import { Hono } from "hono"
import { serve } from "@hono/node-server"
const app = new Hono()
const server = serve({ fetch: app.fetch, port: 3000 })
```

### Testing

```typescript
// Bun
import { describe, test, expect } from "bun:test"

// Node.js
import { describe, test, expect } from "vitest"
```

---

## Package Installation

```bash
# Core replacements
npm install fs-extra execa zx glob

# Build tools
npm install esbuild

# Dev dependencies
npm install --save-dev vitest @vitest/ui tsx typescript

# Optional frameworks
npm install express hono
npm install bcrypt argon2
npm install better-sqlite3 prisma
```

---

## Import Updates

### Search and Replace Patterns

```bash
# Replace Bun imports
sed -i "s/from \"bun\"/from \"zx\"/g" **/*.ts
sed -i "s/from 'bun'/from 'zx'/g" **/*.ts

# Replace bun:test
sed -i "s/from \"bun:test\"/from \"vitest\"/g" **/*.ts
sed -i "s/from 'bun:test'/from 'vitest'/g" **/*.ts
```

---

## Files to Update (by Usage Pattern)

### Files using `Bun.$`
- Find: `grep -r "from ['\"]bun['\"]" --include="*.ts"`
- Replace: `from "zx"`

### Files using `Bun.file()` / `Bun.write()`
- Find: `grep -r "Bun\.\(file\|write\)" --include="*.ts"`
- Replace with `fs/promises` or `fs-extra`

### Files using `Bun.spawn()`
- Find: `grep -r "Bun\.spawn" --include="*.ts"`
- Replace with `execa` or `child_process.spawn`

### Files using `Bun.sleep()`
- Find: `grep -r "Bun\.sleep" --include="*.ts"`
- Replace with custom `sleep()` utility

### Files using `bun:test`
- Find: `grep -r "from ['\"]bun:test['\"]" --include="*.ts"`
- Replace with `from "vitest"`

---

## Configuration Files

### Create `.npmrc`
```
save-exact=true
legacy-peer-deps=true
```

### Create or Update `vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
  },
})
```

### Update `package.json`
```json
{
  "packageManager": "node@20.13.0 npm@10.5.0",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Common Code Patterns

### Create custom utilities

**sleep.ts:**
```typescript
export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))
```

**stream.ts:**
```typescript
import { Readable } from "stream"

export async function readableStreamToText(
  stream: Readable
): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stream) {
    chunks.push(chunk.toString())
  }
  return chunks.join("")
}
```

---

## NPM Scripts Template

```json
{
  "scripts": {
    "dev": "tsx packages/opencode/src/index.ts",
    "build": "esbuild packages/opencode/src/index.ts --bundle --platform=node --format=esm --outdir=dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  }
}
```

---

## Validation Commands

```bash
# Check for remaining Bun imports
grep -r "from ['\"]bun['\"]" --include="*.ts" --include="*.tsx" | grep -v node_modules

# Check for remaining Bun.* calls
grep -r "Bun\." --include="*.ts" --include="*.tsx" | grep -v node_modules

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

---

## API Mapping Table

| Bun | Node.js | Package |
|-----|---------|---------|
| `Bun.file().text()` | `readFile()` | fs/promises |
| `Bun.write()` | `writeFile()` | fs/promises |
| `Bun.serve()` | `http.createServer()` or Hono | hono |
| `Bun.spawn()` | `spawn()` or execa | execa |
| `Bun.sleep()` | `setTimeout()` | timers/promises |
| `Bun.env` | `process.env` | - |
| `Bun.glob()` | `glob()` | glob |
| `Bun.build()` | `esbuild.build()` | esbuild |
| `Bun.$` | `$` | zx |
| `bun:test` | vitest | vitest |

---

## Priority Order

1. **Utilities** - Create custom wrappers (sleep, stream helpers)
2. **File I/O** - Update all Bun.file() and Bun.write() calls
3. **Process** - Replace Bun.spawn() and Bun.$
4. **Tests** - Migrate from bun:test to vitest
5. **Servers** - Replace Bun.serve() with Express/Hono
6. **Build** - Replace Bun.build() with esbuild
7. **Config** - Update package.json and create config files

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `Cannot find module 'bun'` | Replace with `zx` or remove import |
| `Bun is not defined` | Use `process.env` instead of `Bun.env` |
| `import.meta.dir undefined` | Use `fileURLToPath()` + `path.dirname()` |
| Tests failing | Update imports from `bun:test` to `vitest` |
| Type errors | Remove Bun types, use `@types/node` |

---

## Generated Files to Keep

Keep in repo as reference:
- `BUN_TO_NODE_MIGRATION_GUIDE.md` - Comprehensive guide
- `MIGRATION_IMPLEMENTATION_GUIDE.md` - Step-by-step instructions
- This file - Quick reference

---

## Post-Migration

- [ ] All tests passing
- [ ] Typecheck passing
- [ ] Build succeeding
- [ ] Dev server working
- [ ] Production build verified
- [ ] Documentation updated
- [ ] Team trained on new setup

