# OpenCode Agent Guidelines

## Repository Info

- **Default branch**: `dev` (upstream), `termux-arm64` (this fork)
- **Runtime**: Bun 1.3.5 with TypeScript ESM modules
- **Monorepo**: Uses Bun workspaces with packages in `packages/*`
- **Main package**: `packages/opencode` (CLI and server)
- **Termux Port**: See [[TERMUX-ROADMAP.md]] for ARM64 Android development plan

## Termux ARM64 Port Status

This fork adds Termux/Android ARM64 support. Current status:
- ✅ Node.js compat layer (headless `opencode serve` works)
- 🔄 PRoot solution (full Bun via proot-distro)
- ❌ Native Bun (long-term goal)

For Termux development, see `TERMUX-ROADMAP.md` for the full plan.

## Build/Run Commands

```bash
# Install dependencies
bun install

# Run OpenCode (development)
bun run dev                                    # From repo root
bun run --conditions=browser ./src/index.ts    # From packages/opencode

# Typecheck
bun run typecheck                              # Uses turbo, runs across all packages
bun run --cwd packages/opencode typecheck      # Single package (uses tsgo)

# Build
bun run --cwd packages/opencode build          # Build opencode package
```

## Testing

```bash
# Run all tests (from packages/opencode)
bun test

# Run single test file
bun test test/tool/grep.test.ts

# Run tests matching pattern
bun test --grep "basic search"

# Run with coverage
bun test --coverage
```

**Testing rules:**
- NEVER use mocks - test actual implementation
- Do not duplicate logic into tests
- Use `Instance.provide()` for test context
- Use `tmpdir()` fixture for filesystem tests

## SDK Regeneration

When modifying server endpoints in `packages/opencode/src/server/server.ts`:
```bash
./packages/sdk/js/script/build.ts
# Or from packages/opencode:
./script/generate.ts
```

## Code Style

### General Principles

- Prefer automation: execute actions without confirmation unless blocked
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE
- Keep functions focused unless composable/reusable
- Rely on type inference; avoid explicit annotations unless necessary for exports
- Avoid `any` type

### Imports

- Use relative imports for local modules
- Named imports preferred over default
- Path aliases: `@/*` → `./src/*`, `@tui/*` → `./src/cli/cmd/tui/*`

```typescript
// Good
import { Tool } from "./tool"
import { Instance } from "../project/instance"

// Bad
import Tool from "./tool"
```

### Variables and Naming

- Prefer `const` over `let`
- Use single-word names when possible
- camelCase for variables/functions, PascalCase for classes/namespaces

```typescript
// Good
const foo = condition ? 1 : 2
const result = await fetch()

// Bad
let foo
if (condition) foo = 1
else foo = 2

const fooBarBaz = 1  // Avoid multi-word when single word works
```

### Control Flow

- Avoid `else` statements - use early returns
- Use ternary for simple conditionals
- Use IIFE for complex conditional assignments

```typescript
// Good
function process(x: number) {
  if (x < 0) return null
  return x * 2
}

// Bad
function process(x: number) {
  if (x < 0) return null
  else return x * 2
}
```

### Destructuring

- Avoid unnecessary destructuring - preserve context

```typescript
// Good
console.log(user.name, user.email)

// Bad (loses context)
const { name, email } = user
console.log(name, email)
```

### Error Handling

- Use Result patterns, avoid throwing in tools
- Avoid try/catch where possible
- Tools should return structured results, not throw

### Types and Validation

- Zod schemas for runtime validation
- TypeScript interfaces for structure
- Namespace-based organization: `Tool.define()`, `Session.create()`

```typescript
// Tool definition pattern
export const MyTool = Tool.define("my-tool", {
  description: DESCRIPTION,
  parameters: z.object({
    input: z.string().describe("The input value"),
  }),
  async execute(params, ctx) {
    // Implementation
    return { output: "result", metadata: {} }
  },
})
```

## Architecture Patterns

### Dependency Injection
```typescript
import { App } from "../app"
const service = App.provide(MyService)
```

### Logging
```typescript
import { Log } from "../util/log"
const log = Log.create({ service: "my-service" })
log.info("message", { data })
```

### Context
- Pass `sessionID` in tool context
- Use `ctx.ask()` for permissions
- Use `ctx.abort` for cancellation

### Bun APIs
Prefer Bun APIs when available:
```typescript
// Good
await Bun.write(path, content)
const content = await Bun.file(path).text()

// Instead of
fs.writeFileSync(path, content)
```

### Termux/Node.js Compatibility
For code that must work on both Bun and Node.js (Termux support):
```typescript
// Use compat layer instead of direct Bun APIs
import { spawn, file } from "../compat"

const f = file(path)          // Works on both Bun and Node.js
const proc = spawn(["cmd"])   // Works on both runtimes
```

## Local Development

### Backend + App (separate servers)
```bash
# Terminal 1: Backend (from packages/opencode)
bun run --conditions=browser ./src/index.ts serve --port 4096

# Terminal 2: App (from packages/app)
bun dev -- --port 4444

# Open http://localhost:4444
```

### SolidJS (packages/app)
- Prefer `createStore` over multiple `createSignal` calls
- `opencode dev web` proxies production - use separate servers for local UI changes

## Debugging

- NEVER restart the app or server process during debugging
- Use `agent-browser` for web automation testing

## File Structure

```
packages/
├── opencode/          # Main CLI and server
│   ├── src/
│   │   ├── tool/      # Tool implementations
│   │   ├── session/   # Session management
│   │   ├── server/    # HTTP server (Hono)
│   │   ├── provider/  # AI provider integrations
│   │   └── cli/       # CLI commands
│   └── test/          # Tests mirror src/ structure
├── app/               # Web UI (SolidJS)
├── sdk/js/            # TypeScript SDK
└── ui/                # Shared UI components
```
