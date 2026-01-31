import z from "zod"
import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import { Filesystem } from "../util/filesystem"
import { NamedError } from "@opencode-ai/util/error"
import { file, write, spawn, readableStreamToText, isBun, which as whichBin } from "../compat"
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
        return ["npm", "install", ...args.filter(a => a !== "--force" && a !== "--no-cache")]
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
    if (dependencies[pkg] === version && modExists) return mod

    const proxied = !!(
      process.env.HTTP_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.http_proxy ||
      process.env.https_proxy
    )

    // Build command arguments - use npm on Node.js, bun add on Bun
    const args = isBun
      ? [
          "add",
          "--force",
          "--exact",
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

    // Resolve actual version from installed package when using "latest"
    let resolvedVersion = version
    if (version === "latest") {
      const installedPkgJson = file(path.join(mod, "package.json"))
      const installedPkg = await installedPkgJson.json().catch(() => null)
      if (installedPkg?.version) {
        resolvedVersion = installedPkg.version
      }
    }

    parsed.dependencies[pkg] = resolvedVersion
    await write(pkgjsonPath, JSON.stringify(parsed, null, 2))
    return mod
  }
}
