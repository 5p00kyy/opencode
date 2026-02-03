import z from "zod"
import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import { Filesystem } from "../util/filesystem"
import { NamedError } from "@opencode-ai/util/error"
import { file, write, spawn, readableStreamToText, isBun, which as whichBin, isArmLinux } from "../compat"
import { createRequire } from "module"
import { Lock } from "../util/lock"

export namespace BunProc {
  const log = Log.create({ service: "bun" })
  const req = createRequire(import.meta.url)

  /**
   * Run a command through the package manager runtime.
   * On Bun: runs `bun <cmd>`
   * On Node: runs `npm <cmd>` for package commands, `node <cmd>` for scripts
   */
  export async function run(cmd: string[], options?: { cwd?: string; env?: Record<string, string | undefined> }) {
    // Determine the actual command based on runtime
    const fullCmd = isBun ? [which(), ...cmd] : buildNodeCommand(cmd)

    log.info("running", {
      cmd: fullCmd,
      runtime: isBun ? "bun" : "node",
      ...options,
    })
    const result = spawn(fullCmd, {
      ...options,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        ...options?.env,
        ...(isBun ? { BUN_BE_BUN: "1" } : {}),
      },
    })
    const code = await result.exited
    const stdout = result.stdout
      ? typeof result.stdout === "number"
        ? result.stdout
        : await readableStreamToText(result.stdout)
      : undefined
    const stderr = result.stderr
      ? typeof result.stderr === "number"
        ? result.stderr
        : await readableStreamToText(result.stderr)
      : undefined
    log.info("done", {
      code,
      stdout,
      stderr,
    })
    if (code !== 0) {
      throw new Error(`Command failed with exit code ${code}`)
    }
    return result
  }

  /**
   * Build Node.js equivalent command for Bun commands
   */
  function buildNodeCommand(cmd: string[]): string[] {
    const [subCmd, ...args] = cmd

    switch (subCmd) {
      case "x":
        // bun x pkg args -> npx pkg args
        return ["npx", "--yes", ...args]
      case "add":
      case "install":
        // bun add/install -> npm install
        return ["npm", "install", ...args.filter((a) => a !== "--force" && a !== "--no-cache")]
      case "run":
        // bun run script.js -> node script.js
        return ["node", ...args]
      default:
        // For other commands, try npm
        return ["npm", subCmd, ...args]
    }
  }

  /**
   * Get the runtime executable path.
   * Returns `bun` path on Bun, `node` path on Node.js
   */
  export function which() {
    return process.execPath
  }

  /**
   * Build command array for executing a package (like npx/bunx)
   * Use this instead of manually building ["x", pkg, ...args]
   */
  export function npx(pkg: string, args: string[] = []): string[] {
    if (isBun) {
      return [process.execPath, "x", pkg, ...args]
    }
    return ["npx", "--yes", pkg, ...args]
  }

  /**
   * Build command array for running a JavaScript file
   */
  export function runScript(script: string, args: string[] = []): string[] {
    if (isBun) {
      return [process.execPath, "run", script, ...args]
    }
    return ["node", script, ...args]
  }

  /**
   * Build command array for installing a package to a directory
   */
  export function npmInstall(pkg: string, options?: { cwd?: string; global?: boolean }): string[] {
    if (isBun) {
      const args = ["install"]
      if (options?.global) args.push("-g")
      args.push(pkg)
      return [process.execPath, ...args]
    }
    const args = ["install"]
    if (options?.global) args.push("-g")
    args.push(pkg)
    return ["npm", ...args]
  }

  /**
   * Get binary and args for running a JS script.
   * Returns [binary, ...args] where:
   * - On Bun: ["bun", "run", script, ...extraArgs]
   * - On Node: ["node", script, ...extraArgs]
   */
  export function scriptCommand(script: string, extraArgs: string[] = []): { binary: string; args: string[] } {
    if (isBun) {
      return { binary: process.execPath, args: ["run", script, ...extraArgs] }
    }
    return { binary: "node", args: [script, ...extraArgs] }
  }

  /**
   * Check if we're running on Bun
   */
  export const runningOnBun = isBun

  export const InstallFailedError = NamedError.create(
    "BunInstallFailedError",
    z.object({
      pkg: z.string(),
      version: z.string(),
    }),
  )

  /**
   * Install a single package from npm via tarball download + extraction.
   * Returns the resolved version string.
   */
  async function fetchAndExtractTarball(pkg: string, version: string, nodeModulesDir: string): Promise<string> {
    // Get the tarball URL from the npm registry
    // Scoped packages (e.g. @gitlab/foo) need URL-encoded scope in the registry URL
    const encodedPkg = pkg.startsWith("@") ? `@${encodeURIComponent(pkg.slice(1))}` : pkg
    const registryUrl = `https://registry.npmjs.org/${encodedPkg}/${version}`
    const response = await fetch(registryUrl)
    if (!response.ok) throw new Error(`Failed to fetch ${pkg}@${version}: ${response.status}`)
    const info = (await response.json()) as { dist?: { tarball?: string }; version?: string }
    const tarballUrl = info.dist?.tarball
    if (!tarballUrl) throw new Error(`No tarball URL found for ${pkg}@${version}`)

    // Download the tarball
    const tarballResponse = await fetch(tarballUrl)
    if (!tarballResponse.ok) throw new Error(`Failed to download tarball: ${tarballResponse.status}`)
    const tarballData = new Uint8Array(await tarballResponse.arrayBuffer())

    // Write tarball to temp file
    const safeName = pkg.replace(/\//g, "-").replace(/^@/, "")
    const tarballPath = path.join(nodeModulesDir, `_${safeName}.tgz`)
    await write(tarballPath, tarballData)

    // Ensure the target directory exists and is clean
    const modDir = path.join(nodeModulesDir, pkg)
    const rmResult = spawn(["rm", "-rf", modDir], { stdout: "pipe", stderr: "pipe" })
    await rmResult.exited
    const mkdirResult = spawn(["mkdir", "-p", modDir], { stdout: "pipe", stderr: "pipe" })
    await mkdirResult.exited

    // Extract tarball (npm tarballs have a `package/` prefix)
    const extractResult = spawn(["tar", "xzf", tarballPath, "-C", modDir, "--strip-components=1"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const extractCode = await extractResult.exited
    if (extractCode !== 0) {
      const stderrText = extractResult.stderr
        ? typeof extractResult.stderr === "number"
          ? String(extractResult.stderr)
          : await readableStreamToText(extractResult.stderr)
        : ""
      throw new Error(`Failed to extract tarball for ${pkg}: exit ${extractCode} ${stderrText}`)
    }

    // Clean up tarball
    spawn(["rm", "-f", tarballPath], { stdout: "pipe", stderr: "pipe" })

    return info.version ?? version
  }

  /**
   * Repair empty packages in node_modules after a broken `bun add`.
   * On ARM Linux / proot, bun creates directory structures but fails to extract files.
   * This scans all installed directories and re-installs any empty ones via tarball.
   */
  async function repairEmptyPackages(nodeModulesDir: string) {
    // List all directories in node_modules (including scoped packages)
    const listResult = spawn(
      [
        "sh",
        "-c",
        `for d in "${nodeModulesDir}"/*/; do [ -d "$d" ] && echo "$d"; done; for d in "${nodeModulesDir}"/@*/*/; do [ -d "$d" ] && echo "$d"; done`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    )
    await listResult.exited
    const dirs =
      listResult.stdout && typeof listResult.stdout !== "number"
        ? (await readableStreamToText(listResult.stdout)).trim().split("\n").filter(Boolean)
        : []

    let repaired = 0
    for (const dir of dirs) {
      // Skip . files and the parent scope dirs
      const relative = dir.replace(nodeModulesDir + "/", "").replace(/\/$/, "")
      if (relative.startsWith(".") || !relative) continue
      // Skip scope directories themselves (e.g. @openauthjs/) - only process @scope/pkg
      if (relative.startsWith("@") && !relative.includes("/")) continue

      const pkgJsonPath = path.join(dir, "package.json")
      const pkgJsonFile = file(pkgJsonPath)
      const exists = await pkgJsonFile.exists().catch(() => false)
      if (exists) continue

      // This package directory is empty - try to repair it
      // Read the version from the lockfile or just use "latest"
      log.warn("repairing empty package", { pkg: relative })
      try {
        await fetchAndExtractTarball(relative, "latest", nodeModulesDir)
        repaired++
      } catch (e) {
        log.error("failed to repair package", { pkg: relative, error: String(e) })
      }
    }

    if (repaired > 0) {
      log.info("repaired empty packages", { count: repaired })
    }
  }

  export async function install(pkg: string, version = "latest") {
    // Use lock to ensure only one install at a time
    using _ = await Lock.write("bun-install")

    const mod = path.join(Global.Path.cache, "node_modules", pkg)
    const pkgjsonPath = path.join(Global.Path.cache, "package.json")
    const pkgjson = file(pkgjsonPath)
    const parsed = await pkgjson.json().catch(async () => {
      const result = { dependencies: {} }
      await write(pkgjsonPath, JSON.stringify(result, null, 2))
      return result
    })
    const dependencies = parsed.dependencies ?? {}
    if (!parsed.dependencies) parsed.dependencies = dependencies
    const modExists = await Filesystem.exists(mod)
    if (dependencies[pkg] === version && modExists) {
      // Double-check the package actually has files (bun bug on ARM Linux creates empty dirs)
      const modPkgJson = file(path.join(mod, "package.json"))
      const modPkgExists = await modPkgJson.exists().catch(() => false)
      if (modPkgExists) return mod
      log.warn("package directory exists but is empty, reinstalling", { pkg, version })
    }

    const proxied = !!(
      process.env.HTTP_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.http_proxy ||
      process.env.https_proxy
    )

    // On Termux/proot (ARM Linux), bun needs --backend=copyfile because
    // Android SELinux blocks hardlinks. The env var can be set by the launcher,
    // or we auto-detect ARM Linux as a fallback.
    const needsCopyfile = isBun && (!!process.env.OPENCODE_BUN_BACKEND || isArmLinux)

    // Build command arguments - use npm on Node.js, bun add on Bun
    const args = isBun
      ? [
          "add",
          "--force",
          "--exact",
          ...(needsCopyfile ? ["--backend=copyfile"] : []),
          ...(proxied ? ["--no-cache"] : []),
          "--cwd",
          Global.Path.cache,
          pkg + "@" + version,
        ]
      : ["install", "--save-exact", pkg + "@" + version]

    log.info("installing package", {
      pkg,
      version,
      runtime: isBun ? "bun" : "node",
      needsCopyfile,
    })

    await BunProc.run(args, {
      cwd: Global.Path.cache,
    }).catch((e) => {
      throw new InstallFailedError(
        { pkg, version },
        {
          cause: e,
        },
      )
    })

    // Verify the package was actually installed correctly.
    // On ARM Linux / proot, bun creates empty directories (all backends affected).
    // Fall back to direct tarball download + extraction if the package.json is missing.
    const nodeModulesDir = path.join(Global.Path.cache, "node_modules")
    const installedPkgJsonPath = path.join(mod, "package.json")
    const installedPkgJsonFile = file(installedPkgJsonPath)
    const pkgJsonExists = await installedPkgJsonFile.exists().catch(() => false)

    let resolvedVersion = version
    if (!pkgJsonExists) {
      log.warn("bun add created empty directories, repairing all packages via tarball", { pkg, version })
      // Repair ALL empty packages (the main one and its dependencies)
      await repairEmptyPackages(nodeModulesDir)
      // Read the resolved version from the now-populated package
      const repairedPkgJson = (await file(installedPkgJsonPath)
        .json()
        .catch(() => null)) as { version?: string } | null
      resolvedVersion = repairedPkgJson?.version ?? version
    } else if (version === "latest") {
      const installedPkg = (await installedPkgJsonFile.json().catch(() => null)) as { version?: string } | null
      if (installedPkg?.version) {
        resolvedVersion = installedPkg.version
      }
    }

    parsed.dependencies[pkg] = resolvedVersion
    await write(pkgjsonPath, JSON.stringify(parsed, null, 2))
    return mod
  }
}
