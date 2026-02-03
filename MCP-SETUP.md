# MCP Server Configuration for Termux

This document describes the Model Context Protocol (MCP) server setup for OpenCode running on Termux/ARM64 via proot.

## Current MCP Servers

### 1. Context7 (Remote) - **WORKING**

**Purpose**: Up-to-date documentation lookup for libraries

**Configuration**:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    }
  }
}
```

**Status**: Connected and functional
**Tools Available**: Library documentation lookup

### 2. Filesystem (Local) - **CONFIGURED**

**Purpose**: File operations via MCP protocol

**Configuration**:

```json
{
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem@2026.1.14", "/root/opencode"]
    }
  }
}
```

**Note**: Using `npx` instead of `bunx` for better dependency resolution.

### 3. Git (Local) - **CONFIGURED**

**Purpose**: Git repository operations

**Configuration**:

```json
{
  "mcp": {
    "git": {
      "type": "local",
      "command": ["npx", "-y", "-p", "@modelcontextprotocol/server-git@latest", "mcp-server-git"]
    }
  }
}
```

**Package**: Part of @modelcontextprotocol/servers monorepo

## Configuration Location

Global user config: `~/.opencode/opencode.jsonc`

Project config: `/root/opencode/.opencode/opencode.jsonc`

## Testing MCP Servers

Run the test script:

```bash
cd /root/opencode/packages/opencode
bun run test-mcp.ts
```

Or use OpenCode CLI:

```bash
opencode mcp list
```

## Troubleshooting

### Bunx vs Npx

On Termux/ARM64, `bunx` may have issues with package resolution. Use `npx` instead:

- Change `bun x` to `npx -y`
- Add `-p package-name` for monorepo packages

### Connection Failures

If MCP servers fail to connect:

1. Check the command runs standalone: `npx -y package-name`
2. Verify directory permissions for filesystem server
3. Check for missing dependencies in npx cache

### Context7 Authentication

The Context7 server works without authentication for basic queries. For higher rate limits, obtain an API key from context7.com.

## Future MCP Servers

To be evaluated:

- GitHub MCP (requires token)
- Obsidian MCP (for note-taking)
- Additional documentation servers

## Related Files

- `~/.opencode/opencode.jsonc` - Global MCP configuration
- `/root/opencode/packages/opencode/src/mcp/index.ts` - MCP client implementation
- `/root/opencode/packages/opencode/test-mcp.ts` - MCP test script
