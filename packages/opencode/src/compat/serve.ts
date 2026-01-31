/**
 * HTTP Server compatibility layer
 * Provides Bun.serve equivalent for Node.js using @hono/node-server
 */

import { isBun } from "./runtime"

export interface ServeOptions {
  port: number
  hostname?: string
  fetch: (request: Request) => Response | Promise<Response>
  websocket?: {
    message?: (ws: WebSocket, message: string | ArrayBuffer) => void
    open?: (ws: WebSocket) => void
    close?: (ws: WebSocket, code: number, reason: string) => void
    error?: (ws: WebSocket, error: Error) => void
  }
  idleTimeout?: number
}

export interface ServerInstance {
  port: number
  hostname: string
  url: URL
  stop(closeActiveConnections?: boolean): Promise<void>
}

/**
 * Start an HTTP server - works like Bun.serve()
 * For Node.js, uses @hono/node-server for Hono apps
 */
export async function serve(options: ServeOptions): Promise<ServerInstance> {
  if (isBun) {
    return (globalThis as any).Bun.serve(options)
  }

  // Node.js implementation using @hono/node-server
  const { serve: nodeServe } = await import("@hono/node-server")
  const { createServer } = await import("http")
  
  const hostname = options.hostname || "0.0.0.0"
  
  // Create a simple handler that wraps the fetch function
  const server = createServer(async (req, res) => {
    try {
      const url = `http://${hostname}:${options.port}${req.url}`
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value[0] : value)
      }
      
      // Collect body
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined
      
      const request = new Request(url, {
        method: req.method,
        headers,
        body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
      })
      
      const response = await options.fetch(request)
      
      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      
      const responseBody = await response.arrayBuffer()
      res.end(Buffer.from(responseBody))
    } catch (error) {
      res.statusCode = 500
      res.end("Internal Server Error")
    }
  })

  return new Promise((resolve, reject) => {
    server.listen(options.port, hostname, () => {
      const address = server.address()
      const port = typeof address === "object" ? address?.port ?? options.port : options.port
      
      const instance: ServerInstance = {
        port,
        hostname,
        url: new URL(`http://${hostname}:${port}`),
        async stop(closeActiveConnections = false) {
          return new Promise((resolve, reject) => {
            server.close((err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        },
      }
      
      resolve(instance)
    })
    
    server.on("error", reject)
  })
}

/**
 * Simple HTTP server for OAuth callbacks and similar use cases
 */
export function serveSimple(options: {
  port: number
  hostname?: string
  fetch: (request: Request) => Response | Promise<Response>
}): Promise<ServerInstance> {
  return serve(options)
}
