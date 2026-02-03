# OpenCode Agent Guidelines

## Repository Info

- **Default branch**: `dev` (upstream), `termux-arm64` (this fork)
- **Runtime**: Bun 1.3.5, TypeScript ESM (`"type": "module"`)
- **Monorepo**: Bun workspaces — `packages/*`, `packages/console/*`, `packages/sdk/js`, `packages/slack`
- **Main package**: `packages/opencode` (CLI, server, TUI)
- **Typechecker**: `tsgo` (native TypeScript), invoked via `turbo`
- **Formatter**: Prettier — `semi: false`, `printWidth: 120`
- **No linter** configured (no ESLint/Biome)

## Build/Run Commands

```bash
bun install                                                        # Install all workspace deps
bun run dev                                                        # Run OpenCode TUI (from repo root)
bun run --cwd packages/opencode --conditions=browser ./src/index.ts  # Run directly (--conditions=browser required)
bun run typecheck                                                  # Typecheck all packages (turbo + tsgo)
bun run --cwd packages/opencode typecheck                          # Typecheck single package
bun run --cwd packages/opencode build                              # Build opencode package
```

**SDK regeneration** (after modifying `packages/opencode/src/server/server.ts`):

```bash
./packages/sdk/js/script/build.ts    # From repo root
./script/generate.ts                 # From packages/opencode
```

## Testing

Tests run with `bun test` from `packages/opencode/`. Do NOT run tests from root.

```bash
bun test                              # All tests
bun test test/tool/grep.test.ts       # Single test file
bun test --grep "basic search"        # Tests matching pattern
bun test --coverage                   # With coverage
bun test --timeout 15000              # Override default 10s timeout
```

- **Timeout**: 10 seconds (configured in `packages/opencode/bunfig.toml`)
- **Preload**: `test/preload.ts` runs before all tests
- **NEVER mock** — test actual implementations
- Do not duplicate logic into tests
- Use `Instance.provide()` for test context, `tmpdir()` for filesystem tests

## Code Style

### Formatting

- **No semicolons** — enforced by Prettier (`semi: false`)
- **120 char line width** — `printWidth: 120`
- No explicit Prettier runs needed; follow the convention manually

### Imports

- Relative imports for local modules — `import { Tool } from "./tool"`
- Named imports preferred over default — `import { Foo }` not `import Foo`
- Path aliases: `@/*` → `./src/*`, `@tui/*` → `./src/cli/cmd/tui/*`

### Naming

- `const` over `let`; single-word names when possible
- camelCase for variables/functions, PascalCase for classes/namespaces
- Namespace-based organization: `Tool.define()`, `Session.create()`

### Control Flow

- **No `else`** — use early returns
- Ternary for simple conditionals
- IIFE for complex conditional assignments

```typescript
// Good                          // Bad
function process(x: number) {   function process(x: number) {
  if (x < 0) return null          if (x < 0) return null
  return x * 2                     else return x * 2
}                                }
```

### Destructuring

Avoid unnecessary destructuring — preserve context:

```typescript
console.log(user.name, user.email) // Good: context preserved
const { name, email } = user // Bad: loses context
```

### Error Handling

- Result patterns over throwing — tools return structured results, not exceptions
- Avoid `try/catch` where possible
- Tools should never throw; return `{ output, metadata }`

### Types

- Rely on type inference; explicit annotations only for exports
- Avoid `any`
- Zod schemas for runtime validation, TypeScript interfaces for structure

## Architecture Patterns

### Tool Definition

```typescript
export const MyTool = Tool.define("my-tool", {
  description: DESCRIPTION, // Imported from .txt file
  parameters: z.object({ input: z.string().describe("The input") }),
  async execute(params, ctx) {
    await ctx.ask({ permission: "my-tool", patterns: [params.input], always: ["*"] })
    return { title: params.input, output: "result", metadata: {} }
  },
})
```

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
- `ctx.ask()` for permissions, `ctx.abort` for cancellation

### Bun APIs Preferred

```typescript
await Bun.write(path, content) // Not fs.writeFileSync
const text = await Bun.file(path).text() // Not fs.readFileSync
```

### Termux/Node.js Compat Layer

For code that must work on both Bun and Node.js:

```typescript
import { spawn, file } from "../compat" // Works on both runtimes
```

## File Structure

```
packages/
├── opencode/            # Main CLI and server
│   ├── src/
│   │   ├── tool/        # Tool implementations (grep, read, write, bash)
│   │   ├── session/     # Session management
│   │   ├── server/      # HTTP API server (Hono)
│   │   ├── provider/    # AI provider integrations
│   │   ├── cli/         # CLI commands and TUI
│   │   ├── mcp/         # MCP server integration
│   │   ├── project/     # Project/instance management
│   │   └── config/      # Configuration handling
│   └── test/            # Tests mirror src/ structure
├── app/                 # Web UI (SolidJS + Vite)
├── sdk/js/              # TypeScript SDK (auto-generated)
└── ui/                  # Shared UI components
```

## Local Development

```bash
# Terminal 1: Backend (from packages/opencode)
bun run --conditions=browser ./src/index.ts serve --port 4096

# Terminal 2: Web app (from packages/app)
bun dev -- --port 4444
# Open http://localhost:4444
```

- SolidJS: prefer `createStore` over multiple `createSignal` calls
- `opencode dev web` proxies production — use separate servers for local UI changes

## Debugging

- NEVER restart the app or server process during debugging
- Use `agent-browser` for web automation testing
- Termux ARM64 port details: see `TERMUX-ROADMAP.md`
