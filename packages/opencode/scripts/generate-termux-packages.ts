import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../../..")
const PACKAGES_DIR = path.join(ROOT, "packages")

const PACKAGES = [
  { dir: "opencode", from: "../" },
  { dir: "util", from: "../" },
  { dir: "plugin", from: "../" },
  { dir: "sdk/js", from: "../../" },
]

const EXCLUDED_DEPS = new Set([
  "@parcel/watcher-darwin-arm64",
  "@parcel/watcher-darwin-x64",
  "@parcel/watcher-linux-x64-gnu",
  "@parcel/watcher-linux-x64-glibc",
  "@parcel/watcher-win32-x64",
  "bun-pty",
  "tree-sitter-bash",
  "@types/bun",
  "@typescript/native-preview",
  "@hey-api/openapi-ts",
])

function read(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf-8"))
}

function write(file: string, data: object) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
}

function resolveCatalog(catalog: Record<string, string>, version: string) {
  if (version === "catalog:") return catalog
  if (version.startsWith("catalog:")) {
    const key = version.slice("catalog:".length)
    return catalog[key]
  }
  return undefined
}

function transformDeps(
  deps: Record<string, string> | undefined,
  catalog: Record<string, string>,
  from: string
): Record<string, string> | undefined {
  if (!deps) return undefined

  const result: Record<string, string> = {}

  for (const [name, version] of Object.entries(deps)) {
    if (EXCLUDED_DEPS.has(name)) continue

    const catalogVersion = resolveCatalog(catalog, version)
    if (catalogVersion) {
      result[name] = catalog[name]
      continue
    }

    if (version === "workspace:*") {
      const relative = workspacePath(name, from)
      if (relative) {
        result[name] = `file:${relative}`
        continue
      }
    }

    result[name] = version
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function workspacePath(name: string, from: string): string | undefined {
  const mapping: Record<string, string> = {
    "@opencode-ai/util": "util",
    "@opencode-ai/plugin": "plugin",
    "@opencode-ai/sdk": "sdk/js",
    "@opencode-ai/script": "script",
  }
  const dir = mapping[name]
  if (!dir) return undefined
  return from + dir
}

function generate() {
  console.log("Reading root package.json for catalog...")
  const root = read(path.join(ROOT, "package.json"))
  const catalog = root.workspaces?.catalog ?? {}
  console.log(`Found ${Object.keys(catalog).length} catalog entries\n`)

  for (const pkg of PACKAGES) {
    const dir = path.join(PACKAGES_DIR, pkg.dir)
    const source = path.join(dir, "package.json")
    const target = path.join(dir, "package.termux.json")

    console.log(`Processing ${pkg.dir}...`)

    const original = read(source)
    const transformed: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(original)) {
      if (key === "dependencies") {
        const deps = transformDeps(value as Record<string, string>, catalog, pkg.from)
        if (deps) transformed[key] = deps
      } else if (key === "devDependencies") {
        const deps = transformDeps(value as Record<string, string>, catalog, pkg.from)
        if (deps) transformed[key] = deps
      } else if (key === "scripts" && pkg.dir === "sdk/js") {
        transformed[key] = { typecheck: "tsc --noEmit" }
      } else if (key === "scripts" && pkg.dir === "plugin") {
        transformed[key] = { typecheck: "tsc --noEmit", build: "tsc" }
      } else {
        transformed[key] = value
      }
    }

    write(target, transformed)
    console.log(`  -> ${path.relative(ROOT, target)}`)
  }

  console.log("\nDone!")
}

generate()
