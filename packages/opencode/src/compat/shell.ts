/**
 * Shell command compatibility layer
 * Provides Bun.$ equivalent for Node.js using child_process
 */

import { spawn } from "child_process"
import { isBun } from "./runtime"

export interface ShellResult {
  stdout: string
  stderr: string
  exitCode: number
  text(): string
  json<T = unknown>(): T
  arrayBuffer(): Promise<ArrayBuffer>
  // Byte versions for Bun compatibility
  readonly stdoutBytes: Uint8Array
  readonly stderrBytes: Uint8Array
}

/**
 * Shell error class for compatibility with Bun.$.ShellError
 */
export class ShellError extends Error implements ShellResult {
  stdout: string
  stderr: string
  exitCode: number
  private _stdoutBytes: Uint8Array | null = null
  private _stderrBytes: Uint8Array | null = null

  constructor(message: string, stdout: string, stderr: string, exitCode: number) {
    super(message)
    this.name = "ShellError"
    this.stdout = stdout
    this.stderr = stderr
    this.exitCode = exitCode
  }

  text(): string {
    return this.stdout
  }

  json<T = unknown>(): T {
    return JSON.parse(this.stdout)
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    return encoder.encode(this.stdout).buffer as ArrayBuffer
  }

  get stdoutBytes(): Uint8Array {
    if (!this._stdoutBytes) {
      this._stdoutBytes = new TextEncoder().encode(this.stdout)
    }
    return this._stdoutBytes
  }

  get stderrBytes(): Uint8Array {
    if (!this._stderrBytes) {
      this._stderrBytes = new TextEncoder().encode(this.stderr)
    }
    return this._stderrBytes
  }
}

class NodeShellResult implements ShellResult {
  private _stdoutBytes: Uint8Array | null = null
  private _stderrBytes: Uint8Array | null = null

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

  async arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    return encoder.encode(this.stdout).buffer as ArrayBuffer
  }

  get stdoutBytes(): Uint8Array {
    if (!this._stdoutBytes) {
      this._stdoutBytes = new TextEncoder().encode(this.stdout)
    }
    return this._stdoutBytes
  }

  get stderrBytes(): Uint8Array {
    if (!this._stderrBytes) {
      this._stderrBytes = new TextEncoder().encode(this.stderr)
    }
    return this._stderrBytes
  }
}

export interface ShellPromise extends Promise<ShellResult> {
  quiet(): ShellPromise
  nothrow(): ShellPromise
  throws(shouldThrow: boolean): ShellPromise
  cwd(dir: string): ShellPromise
  env(vars: Record<string, string | undefined>): ShellPromise
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
  arrayBuffer(): Promise<ArrayBuffer>
  lines(): AsyncIterable<string>
}

interface ShellOptions {
  quiet?: boolean
  nothrow?: boolean
  cwd?: string
  env?: Record<string, string | undefined>
}

/**
 * Execute a shell command - works like Bun.$
 * Usage: await $`git status`
 */
export function $(strings: TemplateStringsArray, ...values: unknown[]): ShellPromise {
  const command = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")

  const createPromise = (opts: ShellOptions = {}): ShellPromise => {
    if (isBun) {
      // Use Bun's native shell
      const bunShell = (globalThis as any).Bun.$
      let result = bunShell(strings, ...values)
      if (opts.quiet) result = result.quiet()
      if (opts.nothrow) result = result.nothrow()
      if (opts.cwd) result = result.cwd(opts.cwd)
      if (opts.env) result = result.env(opts.env)
      return result
    }

    // Node.js implementation
    const executePromise = new Promise<ShellResult>((resolve, reject) => {
      const proc = spawn(command, {
        shell: true,
        cwd: opts.cwd,
        stdio: ["inherit", "pipe", "pipe"],
        env: { ...process.env, ...opts.env } as NodeJS.ProcessEnv,
      })

      let stdout = ""
      let stderr = ""

      proc.stdout?.on("data", (data) => {
        stdout += data.toString()
        if (!opts.quiet) process.stdout.write(data)
      })

      proc.stderr?.on("data", (data) => {
        stderr += data.toString()
        if (!opts.quiet) process.stderr.write(data)
      })

      proc.on("close", (code) => {
        const result = new NodeShellResult(stdout, stderr, code ?? 0)
        if (code !== 0 && code !== null && !opts.nothrow) {
          const error = new ShellError(`Command failed: ${command}`, stdout, stderr, code ?? 1)
          reject(error)
        } else {
          resolve(result)
        }
      })

      proc.on("error", (err) => {
        if (opts.nothrow) {
          resolve(new NodeShellResult("", err.message, 1))
        } else {
          reject(err)
        }
      })
    }) as ShellPromise

    // Add chainable methods
    executePromise.quiet = () => createPromise({ ...opts, quiet: true })
    executePromise.nothrow = () => createPromise({ ...opts, nothrow: true })
    executePromise.throws = (shouldThrow: boolean) => createPromise({ ...opts, nothrow: !shouldThrow })
    executePromise.cwd = (dir: string) => createPromise({ ...opts, cwd: dir })
    executePromise.env = (vars: Record<string, string | undefined>) => createPromise({ ...opts, env: { ...opts.env, ...vars } })
    executePromise.text = async () => (await executePromise).text()
    executePromise.json = async <T>() => (await executePromise).json<T>()
    executePromise.arrayBuffer = async () => (await executePromise).arrayBuffer()
    executePromise.lines = async function* () {
      const result = await executePromise
      const lines = result.stdout.split("\n")
      for (const line of lines) {
        yield line
      }
    }

    return executePromise
  }

  return createPromise()
}

// Attach ShellError to $ function for compatibility with Bun.$.ShellError
;($ as any).ShellError = ShellError

/**
 * Execute a command with arguments array
 */
export async function exec(cmd: string, args: string[] = [], options: { cwd?: string; env?: Record<string, string>; quiet?: boolean } = {}): Promise<ShellResult> {
  if (isBun) {
    const proc = (globalThis as any).Bun.spawn([cmd, ...args], {
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
