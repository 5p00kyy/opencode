/**
 * Process spawn compatibility layer
 * Provides Bun.spawn equivalent for Node.js
 */

import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "child_process"
import { isBun } from "./runtime"
import { readableStreamToText } from "./stream"

export interface SpawnStdin {
  write(data: string | Uint8Array): void
  end(): void
  // Web WritableStream method for compatibility
  getWriter(): WritableStreamDefaultWriter<any>
}

export interface SpawnResult {
  pid: number
  stdin: SpawnStdin | null
  stdout: ReadableStream<Uint8Array> | null
  stderr: ReadableStream<Uint8Array> | null
  exitCode: number | null
  exited: Promise<number>
  kill(signal?: number): void
}

export interface SpawnOptionsType {
  cwd?: string
  env?: Record<string, string | undefined>
  stdin?: "pipe" | "inherit" | "ignore" | null
  stdout?: "pipe" | "inherit" | "ignore" | null
  stderr?: "pipe" | "inherit" | "ignore" | null
}

export interface SpawnObjectOptions extends SpawnOptionsType {
  cmd: string[]
}

/**
 * Spawn a process - works like Bun.spawn()
 * Supports two calling styles:
 *   spawn(['cmd', 'arg1'], { cwd: '...' })
 *   spawn({ cmd: ['cmd', 'arg1'], cwd: '...' })
 */
export function spawn(cmdOrOptions: string[] | SpawnObjectOptions, options?: SpawnOptionsType): SpawnResult {
  // Normalize arguments - support both (cmd[], options) and ({cmd, ...options}) styles
  const cmd = Array.isArray(cmdOrOptions) ? cmdOrOptions : cmdOrOptions.cmd
  const opts: SpawnOptionsType = Array.isArray(cmdOrOptions) ? (options ?? {}) : cmdOrOptions
  if (isBun) {
    return Bun.spawn(cmd, opts as any) as unknown as SpawnResult
  }

  // Node.js implementation
  const [command, ...args] = cmd
  const proc = nodeSpawn(command, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env } as NodeJS.ProcessEnv,
    stdio: [
      opts.stdin === "pipe" ? "pipe" : opts.stdin === "inherit" ? "inherit" : "ignore",
      opts.stdout === "pipe" ? "pipe" : opts.stdout === "inherit" ? "inherit" : "ignore",
      opts.stderr === "pipe" ? "pipe" : opts.stderr === "inherit" ? "inherit" : "ignore",
    ],
  })

  let exitCode: number | null = null
  const exitPromise = new Promise<number>((resolve) => {
    proc.on("close", (code) => {
      exitCode = code ?? 0
      resolve(exitCode)
    })
  })

  return {
    pid: proc.pid ?? 0,
    stdin: proc.stdin ? createSpawnStdin(proc.stdin) : null,
    stdout: proc.stdout ? nodeStreamToWebStream(proc.stdout, "readable") : null,
    stderr: proc.stderr ? nodeStreamToWebStream(proc.stderr, "readable") : null,
    get exitCode() {
      return exitCode
    },
    exited: exitPromise,
    kill(signal?: number) {
      proc.kill(signal)
    },
  }
}

// Create a Bun-compatible stdin wrapper for Node.js streams
function createSpawnStdin(stream: NodeJS.WritableStream): SpawnStdin {
  const webStream = new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        stream.write(chunk, (err: Error | null | undefined) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },
    close() {
      return new Promise((resolve) => {
        stream.end(resolve)
      })
    },
  })

  return {
    write(data: string | Uint8Array) {
      stream.write(data)
    },
    end() {
      stream.end()
    },
    getWriter() {
      return webStream.getWriter()
    },
  }
}

// Convert Node.js stream to Web stream
function nodeStreamToWebStream(stream: NodeJS.ReadableStream, type: "readable"): ReadableStream<Uint8Array>
function nodeStreamToWebStream(stream: NodeJS.WritableStream, type: "writable"): WritableStream
function nodeStreamToWebStream(stream: NodeJS.ReadableStream | NodeJS.WritableStream, type: "readable" | "writable"): ReadableStream<Uint8Array> | WritableStream {
  if (type === "readable") {
    const readable = stream as NodeJS.ReadableStream
    return new ReadableStream({
      start(controller) {
        readable.on("data", (chunk) => {
          controller.enqueue(chunk instanceof Buffer ? new Uint8Array(chunk) : chunk)
        })
        readable.on("end", () => controller.close())
        readable.on("error", (err) => controller.error(err))
      },
    })
  } else {
    const writable = stream as NodeJS.WritableStream
    return new WritableStream({
      write(chunk) {
        return new Promise((resolve, reject) => {
          writable.write(chunk, (err: Error | null | undefined) => {
            if (err) reject(err)
            else resolve()
          })
        })
      },
      close() {
        return new Promise((resolve) => {
          writable.end(resolve)
        })
      },
    })
  }
}

/**
 * Spawn a process synchronously
 */
export { spawnSync } from "child_process"
