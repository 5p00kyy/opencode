/**
 * Stream utilities compatibility layer
 * Provides readableStreamToText equivalent for Node.js
 */

import { isBun } from "./runtime"

/**
 * Convert a ReadableStream to text - works like Bun's readableStreamToText
 */
export async function readableStreamToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return ""

  if (isBun) {
    // Use Bun's native implementation
    const { readableStreamToText: bunReadable } = await import("bun")
    return bunReadable(stream)
  }

  // Node.js implementation
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(decoder.decode(value, { stream: true }))
    }
    chunks.push(decoder.decode())
  } finally {
    reader.releaseLock()
  }

  return chunks.join("")
}

/**
 * Convert a ReadableStream to an ArrayBuffer
 */
export async function readableStreamToArrayBuffer(stream: ReadableStream<Uint8Array> | null): Promise<ArrayBuffer> {
  if (!stream) return new ArrayBuffer(0)

  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.length
    }
  } finally {
    reader.releaseLock()
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result.buffer
}

/**
 * Convert a ReadableStream to a Blob
 */
export async function readableStreamToBlob(stream: ReadableStream<Uint8Array> | null, type?: string): Promise<Blob> {
  const buffer = await readableStreamToArrayBuffer(stream)
  return new Blob([buffer], { type })
}
