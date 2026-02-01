/**
 * OpenCode Runtime Compatibility Layer
 * 
 * Provides a unified API that works on both Bun and Node.js runtimes.
 * This enables OpenCode to run natively on Termux ARM64 where Bun is not available.
 * 
 * Usage:
 *   import { file, write, $, spawn, Glob } from "../compat"
 * 
 * Instead of:
 *   import { $ } from "bun"
 *   Bun.file(path)
 *   Bun.write(path, data)
 */

// Runtime detection and utilities
export { isBun, isNode, runtime, isTermux, termuxPrefix, termuxHome, tmpdir, which, sleep, hash, stdin, stderr, stdout, color, stringWidth, type SystemError, arch, isArm64, isArm, isX64, platform, isLinux, isDarwin, isWindows, isArmLinux } from "./runtime"

// File operations (replaces Bun.file, Bun.write)
export { file, write, type FileHandle } from "./file"

// Shell operations (replaces Bun.$)
export { $, exec, ShellError, type ShellResult, type ShellPromise } from "./shell"

// Process spawning (replaces Bun.spawn)
export { spawn, spawnSync, type SpawnResult, type SpawnOptionsType } from "./spawn"

// Glob patterns (replaces Bun.Glob)
export { Glob, createGlob, type GlobScanOptions } from "./glob"

// Stream utilities (replaces readableStreamToText from "bun")
export { readableStreamToText, readableStreamToArrayBuffer, readableStreamToBlob } from "./stream"

// HTTP Server (replaces Bun.serve)
export { serve, serveSimple, type ServeOptions, type ServerInstance, type ServerHandle } from "./serve"

// PTY (abstracts bun-pty and node-pty)
export { getPtySpawn, isPtyAvailable, getPtyError, type IPty, type PtySpawnOptions, type PtySpawnFn } from "./pty"
