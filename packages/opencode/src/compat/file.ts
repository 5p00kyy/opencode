/**
 * File operations compatibility layer
 * Provides Bun.file() and Bun.write() equivalents for Node.js
 */

import { readFile, writeFile, stat, mkdir } from "fs/promises"
import { dirname } from "path"
import { isBun } from "./runtime"

export interface FileHandle {
  name: string
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
  arrayBuffer(): Promise<ArrayBuffer>
  exists(): Promise<boolean>
  stat(): Promise<{ size: number; mtime: Date; isDirectory(): boolean; isFile(): boolean }>
  write(data: string | Uint8Array): Promise<number>
}

// Node.js implementation of file handle
class NodeFileHandle implements FileHandle {
  constructor(public name: string) {}

  async text(): Promise<string> {
    return readFile(this.name, "utf-8")
  }

  async json<T = unknown>(): Promise<T> {
    const text = await this.text()
    return JSON.parse(text)
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buffer = await readFile(this.name)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }

  async exists(): Promise<boolean> {
    try {
      await stat(this.name)
      return true
    } catch {
      return false
    }
  }

  async stat() {
    const s = await stat(this.name)
    return {
      size: s.size,
      mtime: s.mtime,
      isDirectory: () => s.isDirectory(),
      isFile: () => s.isFile(),
    }
  }

  async write(data: string | Uint8Array): Promise<number> {
    await mkdir(dirname(this.name), { recursive: true })
    await writeFile(this.name, data)
    return typeof data === "string" ? Buffer.byteLength(data) : data.length
  }
}

/**
 * Create a file handle - works like Bun.file()
 */
export function file(path: string): FileHandle {
  if (isBun) {
    return Bun.file(path) as unknown as FileHandle
  }
  return new NodeFileHandle(path)
}

/**
 * Write to a file - works like Bun.write()
 */
export async function write(
  destination: string | FileHandle,
  data: string | Uint8Array | ArrayBuffer | Blob | Response
): Promise<number> {
  const path = typeof destination === "string" ? destination : destination.name

  if (isBun) {
    return Bun.write(path, data as any)
  }

  // Node.js implementation
  await mkdir(dirname(path), { recursive: true })

  let content: string | Uint8Array
  if (typeof data === "string") {
    content = data
  } else if (data instanceof Uint8Array) {
    content = data
  } else if (data instanceof ArrayBuffer) {
    content = new Uint8Array(data)
  } else if (data instanceof Blob) {
    content = new Uint8Array(await data.arrayBuffer())
  } else if (data instanceof Response) {
    content = new Uint8Array(await data.arrayBuffer())
  } else {
    content = String(data)
  }

  await writeFile(path, content)
  return typeof content === "string" ? Buffer.byteLength(content) : content.length
}
