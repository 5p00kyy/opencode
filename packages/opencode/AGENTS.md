# OpenCode Package - Agent Guidelines

## Quick Reference

```bash
# Run (development)
bun run --conditions=browser ./src/index.ts

# Typecheck (uses tsgo for speed)
bun run typecheck

# Test all
bun test

# Test single file
bun test test/tool/grep.test.ts

# Test with pattern
bun test --grep "basic search"

# Build
bun run build

# Regenerate SDK after server changes
./script/generate.ts
```

## Testing Patterns

### Test Context Setup

```typescript
import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

const ctx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}
```

### Using Instance.provide()

```typescript
test("my test", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      // Test code runs with Instance context
      const tool = await MyTool.init()
      const result = await tool.execute(params, ctx)
      expect(result.output).toContain("expected")
    },
  })
})
```

### Using tmpdir() for File Tests

```typescript
test("file operation", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(path.join(dir, "test.txt"), "content")
    },
  })
  // tmp.path contains the temporary directory
  // Automatically cleaned up after test
})
```

## Tool Implementation

### Define a New Tool

```typescript
import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./my-tool.txt"  // Tool description in separate file

export const MyTool = Tool.define("my-tool", {
  description: DESCRIPTION,
  parameters: z.object({
    input: z.string().describe("Description for the AI"),
    optional: z.string().optional().describe("Optional parameter"),
  }),
  async execute(params, ctx) {
    // Request permission if needed
    await ctx.ask({
      permission: "my-tool",
      patterns: [params.input],
      always: ["*"],
      metadata: { input: params.input },
    })

    // Implementation
    const result = await doSomething(params.input)

    return {
      title: params.input,
      output: `Result: ${result}`,
      metadata: { processed: true },
    }
  },
})
```

## Path Aliases

```typescript
// @/* maps to ./src/*
import { Tool } from "@/tool/tool"

// @tui/* maps to ./src/cli/cmd/tui/*
import { Component } from "@tui/component"
```

## Server Endpoints

When adding/modifying endpoints in `src/server/server.ts`:

1. Make your changes to the server
2. Run `./script/generate.ts` to regenerate SDK
3. Update any TUI code using the SDK

## Key Modules

| Module | Purpose |
|--------|---------|
| `src/tool/` | Tool definitions (grep, read, write, bash, etc.) |
| `src/session/` | Session and message management |
| `src/provider/` | AI provider integrations (OpenAI, Anthropic, etc.) |
| `src/server/` | HTTP API server (Hono) |
| `src/cli/` | CLI commands and TUI |
| `src/mcp/` | MCP server integration |
| `src/project/` | Project/instance management |
| `src/config/` | Configuration handling |

## Common Patterns

### Compat Layer (for Node.js support)

```typescript
import { spawn, file } from "../compat"  // Use instead of Bun.spawn, Bun.file
```

### Logging

```typescript
import { Log } from "../util/log"
const log = Log.create({ service: "my-service" })
log.info("message", { key: "value" })
```

### File Operations

```typescript
import { file } from "../compat"

const f = file(path)
const content = await f.text()
const stats = await f.stat()
```
