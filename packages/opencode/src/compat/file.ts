/**
 * File operations compatibility layer
 * Provides Bun.file() and Bun.write() equivalents for Node.js
 */

import { readFile, writeFile, stat, mkdir } from "fs/promises"
import { dirname } from "path"
import { isBun } from "./runtime"

export interface FileHandle {
  name: string
  type: string
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
  arrayBuffer(): Promise<ArrayBuffer>
  bytes(): Promise<Uint8Array>
  exists(): Promise<boolean>
  stat(): Promise<{ size: number; mtime: Date; isDirectory(): boolean; isFile(): boolean }>
  write(data: string | Uint8Array | ArrayBuffer | Blob | Response): Promise<number>
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
    // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(buffer.length)
    const view = new Uint8Array(arrayBuffer)
    view.set(buffer)
    return arrayBuffer
  }

  async bytes(): Promise<Uint8Array> {
    const buffer = await readFile(this.name)
    return new Uint8Array(buffer)
  }

  get type(): string {
    // Return mime type based on file extension
    const ext = this.name.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
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

  async write(data: string | Uint8Array | ArrayBuffer | Blob | Response): Promise<number> {
    await mkdir(dirname(this.name), { recursive: true })
    
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
    
    await writeFile(this.name, content)
    return typeof content === "string" ? Buffer.byteLength(content) : content.length
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

export interface WriteOptions {
  mode?: number
}

/**
 * Write to a file - works like Bun.write()
 */
export async function write(
  destination: string | FileHandle,
  data: string | Uint8Array | ArrayBuffer | Blob | Response,
  options?: WriteOptions
): Promise<number> {
  const path = typeof destination === "string" ? destination : destination.name

  if (isBun) {
    return (globalThis as any).Bun.write(path, data as any, options)
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

  await writeFile(path, content, { mode: options?.mode })
  return typeof content === "string" ? Buffer.byteLength(content) : content.length
}
