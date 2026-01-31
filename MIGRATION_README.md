# Bun to Node.js Migration Documentation

Welcome! This folder contains comprehensive documentation for migrating OpenCode from Bun to Node.js.

## Start Here

**New to this migration?** Read in this order:

1. **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - 5 minute overview
   - Project overview and statistics
   - Document descriptions
   - Timeline and complexity estimates

2. **[MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md)** - 10 minute quick lookup
   - One-line code replacements
   - Common patterns
   - Validation commands

3. **[MIGRATION_IMPLEMENTATION_GUIDE.md](./MIGRATION_IMPLEMENTATION_GUIDE.md)** - During implementation
   - Step-by-step instructions
   - File-by-file guidance
   - Practical examples

4. **[BUN_TO_NODE_MIGRATION_GUIDE.md](./BUN_TO_NODE_MIGRATION_GUIDE.md)** - Deep dive
   - Complete API mappings
   - Package comparisons
   - Troubleshooting details

## Document Map

```
MIGRATION_README.md (you are here)
├── MIGRATION_SUMMARY.md
│   ├── Overview
│   ├── Key statistics
│   ├── Timeline estimates
│   └── Resource planning
├── MIGRATION_QUICK_REFERENCE.md
│   ├── One-line replacements
│   ├── Installation commands
│   ├── Search patterns
│   └── Common issues
├── MIGRATION_IMPLEMENTATION_GUIDE.md
│   ├── Quick start
│   ├── 8-phase migration plan
│   ├── File-by-file instructions
│   └── Validation checklist
└── BUN_TO_NODE_MIGRATION_GUIDE.md
    ├── 13 API mappings (2000+ lines)
    ├── Package comparisons
    ├── Detailed examples
    ├── 7-phase checklist
    └── Comprehensive troubleshooting
```

## At a Glance

### What's Being Migrated

| Category | Bun API | Node.js | Status |
|----------|---------|--------|--------|
| File I/O | `Bun.file()` / `Bun.write()` | `fs/promises` | Documented |
| Shell | `Bun.$` | `zx` package | Documented |
| Process | `Bun.spawn()` | `execa` package | Documented |
| Sleep | `Bun.sleep()` | Custom utility | Documented |
| Env | `Bun.env` | `process.env` | Documented |
| Glob | `Bun.glob()` | `glob` package | Documented |
| Server | `Bun.serve()` | Express/Hono | Documented |
| Build | `Bun.build()` | `esbuild` | Documented |
| Password | `Bun.password` | `bcrypt` | Documented |
| Database | `Bun.sql` | `better-sqlite3` | Documented |
| Transpile | `Bun.Transpiler` | `esbuild` | Documented |
| Testing | `bun:test` | `vitest` | Documented |
| Config | `bunfig.toml` | `package.json` | Documented |

### Quick Install

```bash
# Core replacements
npm install fs-extra execa zx glob @types/node

# Dev dependencies
npm install --save-dev vitest @vitest/ui esbuild tsx

# Choose HTTP framework (optional)
npm install express  # or
npm install hono
```

## Usage by Role

### Project Manager
- Read: `MIGRATION_SUMMARY.md`
- Use: "Migration Phases" for planning
- Reference: "Key Statistics" for estimates
- **Time: 15 minutes**

### Developer
1. Read: `MIGRATION_QUICK_REFERENCE.md`
2. Follow: `MIGRATION_IMPLEMENTATION_GUIDE.md`
3. Deep dive: `BUN_TO_NODE_MIGRATION_GUIDE.md` when needed
- **Time: Ongoing**

### Architect
- Read: `BUN_TO_NODE_MIGRATION_GUIDE.md` (all sections)
- Review: Package comparison tables
- Plan: Verify strategy aligns with architecture
- **Time: 1-2 hours**

### Team Lead
1. Read: `MIGRATION_SUMMARY.md` (overview)
2. Review: `MIGRATION_IMPLEMENTATION_GUIDE.md` (implementation)
3. Check: Validation checklists in both docs
- **Time: 30-45 minutes**

## Key Numbers

- **100+** Bun API usages to migrate
- **50+** files need updating
- **2-3 weeks** estimated timeline
- **2-3** developers recommended
- **13** major API categories covered
- **2,800+** lines of documentation
- **70+** code examples provided

## Critical Path (Minimum)

To get the project running with Node.js:

1. **Day 1:** Setup and core utilities
   - Install Node.js
   - Update package.json
   - Create config files

2. **Days 2-3:** Essential APIs
   - File I/O (`fs/promises`)
   - Shell commands (`zx`)
   - Process spawning (`execa`)

3. **Days 4-5:** Testing
   - Migrate to `vitest`
   - Update test files
   - Run test suite

4. **Days 6-7:** Build & validation
   - Update build scripts (`esbuild`)
   - Validate everything works
   - Document decisions

## Common Questions

**Q: Do I need to read all 4 documents?**
A: No. Start with Summary, then Reference, then Implementation. Read the comprehensive guide only for specific APIs.

**Q: How long will this take?**
A: 2-3 weeks for a team of 2-3. See MIGRATION_SUMMARY.md for detailed estimates.

**Q: What's the hardest part?**
A: HTTP servers and advanced process management. See Troubleshooting sections.

**Q: Can I do this incrementally?**
A: Yes! Follow the 8 priority levels in MIGRATION_IMPLEMENTATION_GUIDE.md.

**Q: What about performance?**
A: See "Performance Considerations" in BUN_TO_NODE_MIGRATION_GUIDE.md. esbuild is nearly as fast as Bun.

**Q: Will tests still work?**
A: Yes, Vitest is Jest-compatible. Most tests will work with minimal changes.

## Validation Commands

Verify your migration is complete:

```bash
# Check for remaining Bun imports
grep -r "from ['\"]bun['\"]" --include="*.ts" | grep -v node_modules

# Check for Bun.* calls
grep -r "Bun\." --include="*.ts" | grep -v node_modules

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## File Organization

Keep these files in the repository root:
- `MIGRATION_README.md` - This file
- `MIGRATION_SUMMARY.md` - Overview and statistics
- `MIGRATION_QUICK_REFERENCE.md` - Quick lookup
- `MIGRATION_IMPLEMENTATION_GUIDE.md` - Step-by-step instructions
- `BUN_TO_NODE_MIGRATION_GUIDE.md` - Comprehensive reference

Consider archiving in `/docs/migration/` after project uses Node.js.

## Getting Help

### Within These Docs
1. Use Ctrl+F to search for your issue
2. Check "Troubleshooting" sections
3. Look for comparison tables
4. Review code examples

### Online Resources
- [Node.js Docs](https://nodejs.org/api/)
- [Vitest Docs](https://vitest.dev/)
- [esbuild Docs](https://esbuild.github.io/)
- [execa Docs](https://github.com/sindresorhus/execa)
- [zx Docs](https://github.com/google/zx)

## Next Steps

1. **Right now:** Read MIGRATION_SUMMARY.md (15 min)
2. **Today:** Bookmark MIGRATION_QUICK_REFERENCE.md
3. **This week:** Start Phase 1 of MIGRATION_IMPLEMENTATION_GUIDE.md
4. **Ongoing:** Reference guides as needed

## Document Quality

These guides include:
- ✓ Real code examples from OpenCode
- ✓ Multiple options for each API
- ✓ Comparison tables for decision-making
- ✓ Troubleshooting for common issues
- ✓ Before/after code samples
- ✓ Step-by-step instructions
- ✓ Timeline and complexity estimates
- ✓ Validation checklists

## Feedback & Updates

These are living documents. If you find:
- Errors: Please note for correction
- Missing information: Suggest additions
- Better solutions: Document alternatives
- Questions: Add to FAQ section

---

**Ready to start?** → Open [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

**Want quick reference?** → Open [MIGRATION_QUICK_REFERENCE.md](./MIGRATION_QUICK_REFERENCE.md)

**Starting implementation?** → Open [MIGRATION_IMPLEMENTATION_GUIDE.md](./MIGRATION_IMPLEMENTATION_GUIDE.md)

**Need comprehensive details?** → Open [BUN_TO_NODE_MIGRATION_GUIDE.md](./BUN_TO_NODE_MIGRATION_GUIDE.md)

---

Last Updated: January 31, 2026 | Status: Ready for Implementation
