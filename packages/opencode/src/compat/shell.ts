/**
 * Shell command compatibility layer
 * Provides Bun.$ equivalent for Node.js using execa
 */

import { spawn } from "child_process"
import { isBun } from "./runtime"

export interface ShellResult {
  stdout: string
  stderr: string
  exitCode: number
  text(): string
  json<T = unknown>(): T
}

class NodeShellResult implements ShellResult {
  constructor(
    public stdout: string,
    public stderr: string,
    public exitCode: number
  ) {}

  text(): string {
    return this.stdout
  }

  json<T = unknown>(): T {
    return JSON.parse(this.stdout)
  }
}

/**
 * Execute a shell command - works like Bun.$
 * Usage: await $`git status`
 */
export function $(strings: TemplateStringsArray, ...values: unknown[]): Promise<ShellResult> & { quiet(): Promise<ShellResult> } {
  const command = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")

  const execute = (quiet = false): Promise<ShellResult> => {
    if (isBun) {
      // Use Bun's native shell
      const bunShell = (globalThis as any).Bun.$
      const result = bunShell(strings, ...values)
      if (quiet) return result.quiet()
      return result
    }

    // Node.js implementation
    return new Promise((resolve, reject) => {
      const proc = spawn(command, {
        shell: true,
        stdio: ["inherit", "pipe", "pipe"],
        env: process.env,
      })

      let stdout = ""
      let stderr = ""

      proc.stdout?.on("data", (data) => {
        stdout += data.toString()
        if (!quiet) process.stdout.write(data)
      })

      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
        if (!quiet) process.stderr.write(data)
      })

      proc.on("close", (code) => {
        const result = new NodeShellResult(stdout, stderr, code ?? 0)
        if (code !== 0 && code !== null) {
          const error = new Error(`Command failed: ${command}`) as Error & ShellResult
          Object.assign(error, result)
          reject(error)
        } else {
          resolve(result)
        }
      })

      proc.on("error", reject)
    })
  }

  const promise = execute(false) as Promise<ShellResult> & { quiet(): Promise<ShellResult> }
  promise.quiet = () => execute(true)
  return promise
}

/**
 * Execute a command with arguments array
 */
export async function exec(cmd: string, args: string[] = [], options: { cwd?: string; env?: Record<string, string>; quiet?: boolean } = {}): Promise<ShellResult> {
  if (isBun) {
    const proc = Bun.spawn([cmd, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdout: "pipe",
      stderr: "pipe",
    })
    const code = await proc.exited
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    return new NodeShellResult(stdout, stderr, code)
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["inherit", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    proc.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      resolve(new NodeShellResult(stdout, stderr, code ?? 0))
    })

    proc.on("error", reject)
  })
}
