# Bun to Node.js Migration - Complete Documentation Summary

## Overview

This package contains comprehensive documentation for migrating OpenCode from Bun to Node.js. The project currently uses 100+ instances of Bun-specific APIs that need to be replaced with Node.js equivalents.

## Documents Included

### 1. **BUN_TO_NODE_MIGRATION_GUIDE.md** (1,748 lines, 37KB)
The most comprehensive guide covering:
- Executive summary of migration scope
- Detailed mapping for all 13 major Bun APIs
- Node.js alternatives with code examples
- Package recommendations for each API
- Comparison tables for different options
- Real-world migration examples from OpenCode codebase
- Migration checklist (7 phases)
- Troubleshooting guide with solutions
- Performance considerations
- Additional resources and links

**Best for:** Understanding the full scope and making architectural decisions

### 2. **MIGRATION_IMPLEMENTATION_GUIDE.md** (768 lines, 16KB)
Practical step-by-step implementation guide:
- Quick start checklist
- Package.json transformation examples
- File-by-file migration instructions (8 priority levels)
- Priority 1-8 migrations with before/after code
- Testing strategy (4 phases)
- Build system migration
- Validation checklist
- Troubleshooting specific errors
- Next steps

**Best for:** Actually implementing the migration in the codebase

### 3. **MIGRATION_QUICK_REFERENCE.md** (342 lines, 6.8KB)
Quick lookup guide for developers:
- One-line code replacements
- Installation commands for all packages
- Search and replace patterns
- Files to update organized by usage pattern
- Configuration file templates
- Common code patterns
- NPM scripts template
- Validation commands
- Common issues and fixes table
- Priority order summary

**Best for:** Quick lookups during implementation, desk reference

## Bun APIs Covered (13 Major Categories)

### Core File Operations
1. **Bun.file()** - File reading
   - Replacement: `fs/promises.readFile()`
   - Alternative: `fs-extra`

2. **Bun.write()** - File writing
   - Replacement: `fs/promises.writeFile()`
   - Alternative: `fs-extra.outputFile()`

### Process & Shell
3. **Bun.spawn()** - Process spawning
   - Replacement: `child_process.spawn()`
   - Recommended: `execa` package

4. **Bun.$** - Shell commands
   - Replacement: `zx` package (drop-in replacement)
   - Alternative: `child_process.exec()`

### Async Utilities
5. **Bun.sleep()** - Async sleep
   - Built-in: Custom utility wrapper
   - Modern: `timers/promises.setTimeout()`

6. **Bun.env** - Environment variables
   - Replacement: `process.env` (no change!)

### File Operations (Advanced)
7. **Bun.glob()** - Glob patterns
   - Replacement: `glob` package
   - Faster alternative: `fast-glob`

### Networking & Build
8. **Bun.serve()** - HTTP server
   - Built-in: `http.createServer()`
   - Recommended: `express` or `hono`

9. **Bun.build()** - Bundler
   - Replacement: `esbuild`
   - Alternatives: `vite`, `webpack`

### Advanced APIs
10. **Bun.password** - Password hashing
    - Recommended: `bcrypt`
    - Secure alternative: `argon2`

11. **Bun.sql / SQLite** - Database
    - Replacement: `better-sqlite3`
    - ORM: `prisma`

12. **Bun.Transpiler** - TypeScript transpilation
    - Replacement: `esbuild`
    - Alternatives: `swc`, `typescript`

### Testing & Config
13. **bun:test** - Testing framework
    - Replacement: `vitest`
    - Alternative: Node.js built-in `node:test`

14. **bunfig.toml** - Configuration
    - Replacement: `package.json`
    - Supplementary: `vitest.config.ts`, `.npmrc`

## Key Statistics from OpenCode Codebase

- **100+ Bun API usages** found across codebase
- **50+ files** need updates
- **Main areas:**
  - File I/O: 60+ instances of `Bun.file()` and `Bun.write()`
  - Shell commands: 35+ files using `import { $ } from "bun"`
  - Process spawning: 15+ usages of `Bun.spawn()`
  - Sleep operations: 12+ instances of `Bun.sleep()`
  - HTTP servers: 9 instances of `Bun.serve()`
  - Testing: 30+ test files using `bun:test`

## Migration Complexity

### Easy (1-3 days)
- File I/O operations
- Environment variables
- Sleep utilities
- Configuration updates

### Medium (3-5 days)
- Shell commands and process spawning
- Testing framework migration
- Build system updates

### Complex (1-2 weeks)
- HTTP server refactoring
- Advanced process management
- Integration testing

**Total Estimated Time: 2-3 weeks** for a team of 2-3 developers

## NPM Packages to Install

### Direct Replacements (Required)
```bash
npm install fs-extra execa zx glob @types/node
npm install --save-dev vitest @vitest/ui esbuild tsx
```

### Build Tools (Required)
```bash
npm install --save-dev esbuild
```

### HTTP Frameworks (Choose one)
```bash
npm install express        # Traditional, feature-rich
npm install hono          # Lightweight, modern
```

### Optional
```bash
npm install bcrypt              # Password hashing
npm install better-sqlite3      # SQLite database
npm install @prisma/client      # ORM
npm install semver              # Version comparison
```

## Migration Phases (Recommended Order)

### Phase 1: Setup (Day 1)
- [ ] Install Node.js 18+
- [ ] Update package.json
- [ ] Install core dependencies
- [ ] Create configuration files

### Phase 2: Core Utilities (Day 1-2)
- [ ] Create sleep utility
- [ ] Create stream utility
- [ ] Create env helpers

### Phase 3: File Operations (Day 2-3)
- [ ] Replace Bun.file() calls
- [ ] Replace Bun.write() calls
- [ ] Update path resolution

### Phase 4: Shell & Process (Day 3-4)
- [ ] Update Bun.$ imports to zx
- [ ] Replace Bun.spawn() calls
- [ ] Test process operations

### Phase 5: Testing (Day 4-5)
- [ ] Update test imports
- [ ] Migrate test utilities
- [ ] Run test suite

### Phase 6: Servers & Build (Day 5-6)
- [ ] Migrate HTTP servers
- [ ] Update build scripts
- [ ] Test build output

### Phase 7: Validation (Day 6-7)
- [ ] Full test suite
- [ ] Type checking
- [ ] Production build
- [ ] Documentation

## Key Recommendations

### 1. File I/O
- Use `fs/promises` for simplicity (built-in)
- Use `fs-extra` for convenience (auto-mkdir)
- Both options are production-ready

### 2. Shell Commands
- Use `zx` for drop-in replacement of `Bun.$`
- Nearly identical syntax and behavior
- Small learning curve

### 3. Process Spawning
- Use `execa` for better developer experience
- Use `child_process.spawn` for lower overhead
- Both work well for OpenCode's use cases

### 4. Testing
- Migrate to `vitest` (Jest-compatible, fast)
- Use Vitest UI for debugging: `npm run test:ui`
- Run tests frequently during migration

### 5. HTTP Server
- Use `Hono` for best compatibility
- Use `Express` if you need more ecosystem packages
- Consider keeping in-memory servers for tests

### 6. Build System
- Use `esbuild` (nearly as fast as Bun)
- Configure for ESM output
- Include source maps for debugging

## Success Criteria

After migration, verify:
- [ ] All tests passing: `npm test`
- [ ] Type checking passing: `npm run typecheck`
- [ ] Build succeeding: `npm run build`
- [ ] Dev server starting: `npm run dev`
- [ ] No remaining Bun imports in codebase
- [ ] Performance within acceptable range
- [ ] All team members trained

## Risk Mitigation

### Risks
1. Performance regression - Unlikely, esbuild is comparable
2. Missing edge cases - Possible, test thoroughly
3. Subtle behavior differences - Low, use mature packages

### Mitigations
1. Keep detailed benchmarks before/after
2. Migrate incrementally with test validation
3. Create abstraction utilities for common patterns
4. Document all custom solutions

## File Locations

All migration guides are in the root of the repository:
- `/BUN_TO_NODE_MIGRATION_GUIDE.md` - Comprehensive reference
- `/MIGRATION_IMPLEMENTATION_GUIDE.md` - Step-by-step implementation
- `/MIGRATION_QUICK_REFERENCE.md` - Quick lookup guide
- `/MIGRATION_SUMMARY.md` - This file

## How to Use These Documents

### For Project Managers
1. Read `MIGRATION_SUMMARY.md` (this file) for overview
2. Use "Migration Phases" section for planning
3. Refer to "Key Statistics" for time estimates

### For Developers
1. Start with `MIGRATION_QUICK_REFERENCE.md` for quick lookups
2. Refer to `MIGRATION_IMPLEMENTATION_GUIDE.md` during actual migration
3. Use `BUN_TO_NODE_MIGRATION_GUIDE.md` for deeper understanding

### For Architects
1. Review `BUN_TO_NODE_MIGRATION_GUIDE.md` for complete API mapping
2. Read comparison tables for package selection
3. Review "Troubleshooting" section for edge cases

## Additional Resources

### Official Documentation
- [Node.js Documentation](https://nodejs.org/api/)
- [Vitest Documentation](https://vitest.dev/)
- [esbuild Documentation](https://esbuild.github.io/)
- [Hono Documentation](https://hono.dev/)

### Community Tools
- [execa - Process execution](https://github.com/sindresorhus/execa)
- [zx - Bash scripting](https://github.com/google/zx)
- [fs-extra - File system utilities](https://github.com/jprichardson/node-fs-extra)

### Related Migration Guides
- [Migrating from Deno to Node.js](https://docs.deno.com/)
- [TypeScript Migration Guide](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

## Questions & Support

For questions about the migration:
1. Check `MIGRATION_QUICK_REFERENCE.md` for common issues
2. Consult `TROUBLESHOOTING` sections in detailed guides
3. Search codebase for existing patterns
4. Refer to package documentation

## Document Updates

These guides are living documents. Update when:
- New Bun APIs are discovered in codebase
- Better alternatives are found
- Team learns new patterns
- Blockers are resolved

---

**Last Updated:** January 31, 2026
**Status:** Ready for implementation
**Estimated Duration:** 2-3 weeks
**Team Size:** 2-3 developers recommended

