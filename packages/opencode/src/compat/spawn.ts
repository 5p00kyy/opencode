/**
 * Process spawn compatibility layer
 * Provides Bun.spawn equivalent for Node.js
 */

import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "child_process"
import { isBun } from "./runtime"
import { readableStreamToText } from "./stream"

export interface SpawnResult {
  pid: number
  stdin: WritableStream | null
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

/**
 * Spawn a process - works like Bun.spawn()
 */
export function spawn(cmd: string[], options: SpawnOptionsType = {}): SpawnResult {
  if (isBun) {
    return Bun.spawn(cmd, options as any) as unknown as SpawnResult
  }

  // Node.js implementation
  const [command, ...args] = cmd
  const proc = nodeSpawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env } as NodeJS.ProcessEnv,
    stdio: [
      options.stdin === "pipe" ? "pipe" : options.stdin === "inherit" ? "inherit" : "ignore",
      options.stdout === "pipe" ? "pipe" : options.stdout === "inherit" ? "inherit" : "ignore",
      options.stderr === "pipe" ? "pipe" : options.stderr === "inherit" ? "inherit" : "ignore",
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
    stdin: proc.stdin ? nodeStreamToWebStream(proc.stdin, "writable") : null,
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
