/**
 * OpenCode Node.js Compatibility Layer Test
 * Run with: npx tsx test-compat-node.ts
 * Run with Bun: bun test-compat-node.ts
 */

import {
  isBun, isNode, runtime, arch, platform, isArm64, isArm, isX64, isTermux,
  isLinux, isDarwin, isWindows, tmpdir, termuxPrefix, termuxHome,
  file, write, $, which, sleep, hash, Glob, spawn, readableStreamToText,
  readableStreamToArrayBuffer, readableStreamToBlob, getPtySpawn, serve,
  stdin, stdout, stderr, color
} from './src/compat/index.ts'
import path from 'path'
import fs from 'fs/promises'

let passed = 0
let failed = 0
let skipped = 0

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
    passed++
    return true
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e instanceof Error ? e.message : e}`)
    failed++
    return false
  }
}

function skip(name: string, reason: string) {
  console.log(`  \x1b[33m○\x1b[0m ${name} (skipped: ${reason})`)
  skipped++
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, name = 'value') {
  if (actual !== expected) throw new Error(`${name}: expected ${expected}, got ${actual}`)
}

function assertType<T>(value: unknown, type: string, name = 'value') {
  if (typeof value !== type) throw new Error(`${name}: expected type ${type}, got ${typeof value}`)
}

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║     OpenCode Node.js Compatibility Layer Test Suite      ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Runtime Detection Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Runtime Detection')

  await test('isBun/isNode are mutually exclusive', async () => {
    assert(isBun !== isNode, `isBun=${isBun}, isNode=${isNode} - should be mutually exclusive`)
  })

  await test('runtime matches detection flags', async () => {
    if (isBun) assertEqual(runtime, 'bun', 'runtime')
    else if (isNode) assertEqual(runtime, 'node', 'runtime')
    else assertEqual(runtime, 'unknown', 'runtime')
  })

  await test('arch is defined and valid', async () => {
    assertType(arch, 'string', 'arch')
    const valid = ['arm64', 'arm', 'x64', 'ia32', 'ppc64', 's390x', 'mips', 'mipsel']
    assert(valid.includes(arch), `arch "${arch}" not in valid list`)
  })

  await test('platform is defined and valid', async () => {
    assertType(platform, 'string', 'platform')
    const valid = ['linux', 'darwin', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix', 'android']
    assert(valid.includes(platform), `platform "${platform}" not in valid list`)
  })

  await test('platform detection flags are consistent', async () => {
    if (platform === 'linux') assert(isLinux, 'isLinux should be true')
    if (platform === 'darwin') assert(isDarwin, 'isDarwin should be true')
    if (platform === 'win32') assert(isWindows, 'isWindows should be true')
    // Only one should be true
    const count = [isLinux, isDarwin, isWindows].filter(Boolean).length
    assert(count <= 1, 'Multiple platform flags are true')
  })

  await test('architecture detection flags are consistent', async () => {
    if (arch === 'arm64') {
      assert(isArm64, 'isArm64 should be true')
      assert(isArm, 'isArm should be true for arm64')
    }
    if (arch === 'arm') assert(isArm, 'isArm should be true')
    if (arch === 'x64') assert(isX64, 'isX64 should be true')
  })

  await test('tmpdir is a valid path string', async () => {
    assertType(tmpdir, 'string', 'tmpdir')
    assert(tmpdir.length > 0, 'tmpdir should not be empty')
    assert(path.isAbsolute(tmpdir), 'tmpdir should be absolute path')
  })

  await test('tmpdir directory exists or can be accessed', async () => {
    try {
      const stat = await fs.stat(tmpdir)
      assert(stat.isDirectory(), 'tmpdir should be a directory')
    } catch (e: any) {
      // On some systems, the tmpdir might not exist yet, which is acceptable
      if (e.code !== 'ENOENT') throw e
    }
  })

  await test('isTermux detection works', async () => {
    // Just verify it's a boolean, actual value depends on environment
    assertType(isTermux, 'boolean', 'isTermux')
    if (isTermux) {
      assertType(termuxPrefix, 'string', 'termuxPrefix')
      assertType(termuxHome, 'string', 'termuxHome')
    }
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // File Operations Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ File Operations')

  const testDir = path.join(tmpdir, `opencode-test-${Date.now()}`)
  await fs.mkdir(testDir, { recursive: true })

  const testPath = path.join(testDir, 'test.txt')
  const testContent = 'Hello from OpenCode compat layer!'

  await test('write() creates file', async () => {
    const bytes = await write(testPath, testContent)
    assertEqual(bytes, Buffer.byteLength(testContent), 'bytes written')
    const stat = await fs.stat(testPath)
    assert(stat.isFile(), 'File not created')
  })

  await test('file().exists() returns true for existing file', async () => {
    const exists = await file(testPath).exists()
    assert(exists, 'File should exist')
  })

  await test('file().exists() returns false for non-existing file', async () => {
    const exists = await file(path.join(testDir, 'nonexistent.txt')).exists()
    assert(!exists, 'File should not exist')
  })

  await test('file().text() reads content correctly', async () => {
    const content = await file(testPath).text()
    assertEqual(content, testContent, 'content')
  })

  await test('file().size returns correct size', async () => {
    const f = file(testPath)
    // Bun uses .size property, our compat layer uses .size() method
    const size = typeof f.size === 'function' ? await f.size() : f.size
    assertEqual(size, Buffer.byteLength(testContent), 'size')
  })

  await test('file().bytes() returns Uint8Array', async () => {
    const bytes = await file(testPath).bytes()
    assert(bytes instanceof Uint8Array, 'Should be Uint8Array')
    assertEqual(bytes.length, Buffer.byteLength(testContent), 'byte length')
  })

  await test('file().arrayBuffer() returns ArrayBuffer', async () => {
    const ab = await file(testPath).arrayBuffer()
    assert(ab instanceof ArrayBuffer, 'Should be ArrayBuffer')
    assertEqual(ab.byteLength, Buffer.byteLength(testContent), 'byte length')
  })

  await test('file().stat() returns file stats', async () => {
    const stat = await file(testPath).stat()
    assert(stat.isFile(), 'Should be a file')
    assert(!stat.isDirectory(), 'Should not be a directory')
    assertEqual(stat.size, Buffer.byteLength(testContent), 'size')
    assert(stat.mtime instanceof Date, 'mtime should be Date')
  })

  const jsonPath = path.join(testDir, 'test.json')
  const jsonData = { name: 'test', count: 42, nested: { value: true } }

  await test('file().json() parses JSON correctly', async () => {
    await write(jsonPath, JSON.stringify(jsonData))
    const data = await file(jsonPath).json<typeof jsonData>()
    assertEqual(data.name, jsonData.name, 'name')
    assertEqual(data.count, jsonData.count, 'count')
    assertEqual(data.nested.value, jsonData.nested.value, 'nested.value')
  })

  await test('file().type returns mime type', async () => {
    const f = file(jsonPath)
    // Bun includes charset, our compat layer doesn't
    assert(f.type.startsWith('application/json'), `type should start with application/json, got ${f.type}`)
  })

  await test('write() with Uint8Array', async () => {
    const binaryPath = path.join(testDir, 'binary.bin')
    const data = new Uint8Array([0x00, 0x01, 0x02, 0xff])
    await write(binaryPath, data)
    const read = await file(binaryPath).bytes()
    assertEqual(read.length, data.length, 'length')
    for (let i = 0; i < data.length; i++) {
      assertEqual(read[i], data[i], `byte ${i}`)
    }
  })

  await test('write() creates parent directories', async () => {
    const nestedPath = path.join(testDir, 'nested', 'deep', 'file.txt')
    await write(nestedPath, 'nested content')
    const exists = await file(nestedPath).exists()
    assert(exists, 'Nested file should exist')
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Shell Operations Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Shell Operations')

  await test('$`echo` basic execution', async () => {
    const result = await $`echo "shell test"`.quiet()
    assert(result.stdout.includes('shell test'), `Output: ${result.stdout}`)
    assertEqual(result.exitCode, 0, 'exitCode')
  })

  await test('$.quiet() suppresses output', async () => {
    const result = await $`echo "quiet test"`.quiet()
    assertEqual(result.exitCode, 0, 'exitCode')
    assert(result.stdout.includes('quiet test'), 'stdout should still be captured')
  })

  await test('$.nothrow() handles non-zero exit', async () => {
    const result = await $`exit 42`.quiet().nothrow()
    assertEqual(result.exitCode, 42, 'exitCode')
  })

  await test('$.nothrow() handles command failure', async () => {
    const result = await $`false`.quiet().nothrow()
    assert(result.exitCode !== 0, 'exitCode should be non-zero')
  })

  await test('$.cwd() changes working directory', async () => {
    const result = await $`pwd`.quiet().cwd(testDir)
    // Bun returns Buffer for stdout, Node returns string
    const output = typeof result.stdout === 'string' ? result.stdout : result.stdout.toString()
    assert(output.trim().endsWith(path.basename(testDir)), `cwd: ${output}`)
  })

  await test('shell command with arguments via template', async () => {
    const name = 'world'
    const result = await $`echo "hello ${name}"`.quiet()
    assert(result.stdout.includes('hello world'), `Output: ${result.stdout}`)
  })

  await test('shell result.text() returns stdout', async () => {
    const result = await $`echo "text method"`.quiet()
    const text = result.text()
    assert(text.includes('text method'), `text: ${text}`)
  })

  await test('shell result.json() parses JSON output', async () => {
    const result = await $`echo '{"key":"value"}'`.quiet()
    const json = result.json<{ key: string }>()
    assertEqual(json.key, 'value', 'key')
  })

  await test('shell stdout capture works', async () => {
    const result = await $`echo "stdout capture"`.quiet()
    // Bun returns Buffer, Node returns string - both are valid
    const output = typeof result.stdout === 'string' ? result.stdout : result.stdout.toString()
    assert(output.includes('stdout capture'), 'stdout content')
  })

  await test('shell stderr capture works', async () => {
    // Use node -e for cross-platform stderr output
    const result = await $`node -e "console.error('stderr test')"`.quiet()
    const output = typeof result.stderr === 'string' ? result.stderr : result.stderr.toString()
    assert(output.includes('stderr test'), `stderr content: ${output}`)
  })

  await test('shell stdoutBytes returns Uint8Array', async () => {
    const result = await $`echo "bytes"`.quiet()
    // Bun has .bytes() method, our compat layer has .stdoutBytes property
    const bytes = typeof result.bytes === 'function' ? result.bytes() : result.stdoutBytes
    assert(bytes instanceof Uint8Array || Buffer.isBuffer(bytes), 'Should be Uint8Array or Buffer')
    assert(bytes.length > 0, 'Should have content')
  })

  await test('shell chaining methods returns new promise', async () => {
    // Verify that chaining creates independent commands
    const base = $`echo "base"`.quiet()
    const withNothrow = base.nothrow()
    const withCwd = base.cwd('/tmp')
    // They should all resolve independently
    const r1 = await base
    const r2 = await withNothrow
    assertEqual(r1.exitCode, 0, 'base exitCode')
    assertEqual(r2.exitCode, 0, 'nothrow exitCode')
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Utility Functions Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Utility Functions')

  await test('which() finds node', async () => {
    const nodePath = which('node')
    assert(nodePath !== null, 'node not found')
    assert(nodePath!.length > 0, 'path should not be empty')
  })

  await test('which() finds npm', async () => {
    const npmPath = which('npm')
    // npm might not be available in all environments
    if (npmPath === null) {
      console.log('    (npm not found, skipping)')
    } else {
      assert(npmPath.length > 0, 'path should not be empty')
    }
  })

  await test('which() returns null for nonexistent command', async () => {
    const result = which('nonexistent-command-xyz-12345')
    assertEqual(result, null, 'result')
  })

  await test('which() with custom PATH', async () => {
    const result = which('node', { PATH: '' })
    // With empty PATH, it shouldn't find node
    assertEqual(result, null, 'result with empty PATH')
  })

  await test('sleep() delays execution', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    assert(elapsed >= 40, `Only ${elapsed}ms elapsed`)
    assert(elapsed < 200, `Too slow: ${elapsed}ms`)
  })

  await test('sleep() with zero delay', async () => {
    const start = Date.now()
    await sleep(0)
    const elapsed = Date.now() - start
    assert(elapsed < 50, `Should be nearly instant: ${elapsed}ms`)
  })

  await test('hash() returns consistent number', async () => {
    const h1 = hash('test string')
    const h2 = hash('test string')
    assertEqual(h1, h2, 'hash')
    assertType(h1, 'number', 'hash type')
  })

  await test('hash() different inputs produce different hashes', async () => {
    const h1 = hash('input one')
    const h2 = hash('input two')
    assert(h1 !== h2, 'Hashes should differ')
  })

  await test('hash() works with objects', async () => {
    const h1 = hash({ key: 'value', num: 42 })
    const h2 = hash({ key: 'value', num: 42 })
    assertEqual(h1, h2, 'hash of same object')
    const h3 = hash({ key: 'different' })
    assert(h1 !== h3, 'hash of different object')
  })

  await test('hash() returns unsigned 32-bit integer', async () => {
    const h = hash('anything')
    assert(h >= 0, 'Hash should be unsigned')
    assert(h <= 0xFFFFFFFF, 'Hash should be 32-bit')
  })

  await test('color() returns ANSI code for known colors', async () => {
    const red = color('red', 'ansi')
    assert(red !== null, 'red should return value')
    assert(red!.includes('\x1b['), 'should be ANSI escape')
  })

  await test('color() returns null for unknown colors', async () => {
    const unknown = color('notacolor', 'ansi')
    assertEqual(unknown, null, 'unknown color')
  })

  await test('stdout.write() works', async () => {
    // Write to stdout - Bun returns promise, Node returns number
    const result = stdout.write('')
    // Just verify it doesn't throw
    if (result instanceof Promise) await result
  })

  await test('stderr.write() works', async () => {
    const result = stderr.write('')
    // Just verify it doesn't throw
    if (result instanceof Promise) await result
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Glob Operations Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Glob Operations')

  // Create test files for glob
  const globDir = path.join(testDir, 'glob-test')
  await fs.mkdir(path.join(globDir, 'subdir'), { recursive: true })
  await write(path.join(globDir, 'file1.ts'), 'ts1')
  await write(path.join(globDir, 'file2.ts'), 'ts2')
  await write(path.join(globDir, 'file.js'), 'js')
  await write(path.join(globDir, 'subdir', 'nested.ts'), 'nested')

  await test('Glob *.ts finds files in directory', async () => {
    const glob = new Glob('*.ts')
    const files: string[] = []
    for await (const f of glob.scan({ cwd: globDir })) {
      files.push(f)
    }
    assertEqual(files.length, 2, 'file count')
    assert(files.includes('file1.ts'), 'should include file1.ts')
    assert(files.includes('file2.ts'), 'should include file2.ts')
  })

  await test('Glob **/*.ts finds files recursively', async () => {
    const glob = new Glob('**/*.ts')
    const files: string[] = []
    for await (const f of glob.scan({ cwd: globDir })) {
      files.push(f)
    }
    assert(files.length >= 3, `Expected >= 3 files, got ${files.length}`)
    assert(files.some(f => f.includes('nested')), 'should include nested file')
  })

  await test('Glob *.js excludes .ts files', async () => {
    const glob = new Glob('*.js')
    const files: string[] = []
    for await (const f of glob.scan({ cwd: globDir })) {
      files.push(f)
    }
    assertEqual(files.length, 1, 'file count')
    assert(files.includes('file.js'), 'should include file.js')
  })

  await test('Glob with absolute option', async () => {
    const glob = new Glob('*.ts')
    const files: string[] = []
    for await (const f of glob.scan({ cwd: globDir, absolute: true })) {
      files.push(f)
    }
    assert(files.every(f => path.isAbsolute(f)), 'All paths should be absolute')
  })

  await test('Glob.match() returns boolean', async () => {
    const glob = new Glob('*.ts')
    assert(glob.match('file.ts'), 'should match file.ts')
    assert(!glob.match('file.js'), 'should not match file.js')
  })

  await test('Glob.match() with complex patterns', async () => {
    const glob = new Glob('src/**/*.test.ts')
    assert(glob.match('src/utils/helper.test.ts'), 'should match nested test')
    // Note: ** matching varies between implementations
    // Some require at least one directory level, some don't
    // We test both behaviors to ensure basic ** support works
    const directMatch = glob.match('src/helper.test.ts')
    const deepMatch = glob.match('src/a/b/helper.test.ts')
    assert(directMatch || deepMatch, 'should match at least one pattern with **')
    assert(!glob.match('src/helper.ts'), 'should not match non-test')
    assert(!glob.match('other/helper.test.ts'), 'should not match wrong prefix')
  })

  await test('Glob handles no matches gracefully', async () => {
    const glob = new Glob('*.nonexistent')
    const files: string[] = []
    for await (const f of glob.scan({ cwd: globDir })) {
      files.push(f)
    }
    assertEqual(files.length, 0, 'should find no files')
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Spawn Operations Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Spawn Operations')

  await test('spawn() executes basic command', async () => {
    const proc = spawn(['node', '--version'], { stdout: 'pipe' })
    const exitCode = await proc.exited
    assertEqual(exitCode, 0, 'exitCode')
  })

  await test('spawn() provides pid', async () => {
    const proc = spawn(['node', '--version'], { stdout: 'pipe' })
    assertType(proc.pid, 'number', 'pid')
    assert(proc.pid > 0, 'pid should be positive')
    await proc.exited
  })

  await test('spawn() stdout is readable', async () => {
    const proc = spawn(['echo', 'spawn stdout'], { stdout: 'pipe' })
    const text = await readableStreamToText(proc.stdout)
    await proc.exited
    assert(text.includes('spawn stdout'), `Output: ${text}`)
  })

  await test('spawn() stderr is readable', async () => {
    const proc = spawn(['node', '-e', 'console.error("spawn stderr")'], {
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const text = await readableStreamToText(proc.stderr)
    await proc.exited
    assert(text.includes('spawn stderr'), `Stderr: ${text}`)
  })

  await test('spawn() with cwd option', async () => {
    const proc = spawn(['pwd'], { stdout: 'pipe', cwd: testDir })
    const text = await readableStreamToText(proc.stdout)
    await proc.exited
    assert(text.trim().endsWith(path.basename(testDir)), `cwd: ${text}`)
  })

  await test('spawn() with env option', async () => {
    const proc = spawn(['node', '-e', 'console.log(process.env.TEST_VAR)'], {
      stdout: 'pipe',
      env: { TEST_VAR: 'hello123' }
    })
    const text = await readableStreamToText(proc.stdout)
    await proc.exited
    assert(text.includes('hello123'), `env: ${text}`)
  })

  await test('spawn() object-style arguments', async () => {
    const proc = spawn({
      cmd: ['echo', 'object style'],
      stdout: 'pipe'
    })
    const text = await readableStreamToText(proc.stdout)
    await proc.exited
    assert(text.includes('object style'), `Output: ${text}`)
  })

  await test('spawn() kill() terminates process', async () => {
    const proc = spawn(['sleep', '10'], { stdout: 'pipe' })
    proc.kill()
    const exitCode = await proc.exited
    // Process should exit (possibly with signal)
    assertType(exitCode, 'number', 'exitCode after kill')
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // Stream Utilities Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ Stream Utilities')

  await test('readableStreamToText() converts stream', async () => {
    const proc = spawn(['echo', 'stream test'], { stdout: 'pipe' })
    const text = await readableStreamToText(proc.stdout)
    await proc.exited
    assert(text.includes('stream test'), `Text: ${text}`)
  })

  await test('readableStreamToText() handles null stream', async () => {
    const text = await readableStreamToText(null)
    assertEqual(text, '', 'null stream should return empty string')
  })

  await test('readableStreamToArrayBuffer() converts stream', async () => {
    const proc = spawn(['echo', 'buffer test'], { stdout: 'pipe' })
    const buffer = await readableStreamToArrayBuffer(proc.stdout)
    await proc.exited
    assert(buffer instanceof ArrayBuffer, 'Should be ArrayBuffer')
    assert(buffer.byteLength > 0, 'Should have content')
  })

  await test('readableStreamToArrayBuffer() handles null stream', async () => {
    const buffer = await readableStreamToArrayBuffer(null)
    assert(buffer instanceof ArrayBuffer, 'Should be ArrayBuffer')
    assertEqual(buffer.byteLength, 0, 'Should be empty')
  })

  await test('readableStreamToBlob() converts stream', async () => {
    const proc = spawn(['echo', 'blob test'], { stdout: 'pipe' })
    const blob = await readableStreamToBlob(proc.stdout)
    await proc.exited
    assert(blob instanceof Blob, 'Should be Blob')
    assert(blob.size > 0, 'Should have content')
  })

  await test('readableStreamToBlob() with type parameter', async () => {
    const proc = spawn(['echo', '{"key":"value"}'], { stdout: 'pipe' })
    const blob = await readableStreamToBlob(proc.stdout, 'application/json')
    await proc.exited
    // Bun may add charset, so just check it starts with our type
    assert(blob.type.startsWith('application/json'), `type should start with application/json, got ${blob.type}`)
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // HTTP Server Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ HTTP Server')

  await test('serve() starts server on available port', async () => {
    const server = await serve({
      port: 0, // Let OS pick port
      fetch: () => new Response('OK')
    })
    assert(server.port > 0, 'port should be assigned')
    assertType(server.hostname, 'string', 'hostname')
    assert(server.url instanceof URL, 'url should be URL')
    await server.stop()
  })

  await test('serve() responds to HTTP requests', async () => {
    const server = await serve({
      port: 0,
      fetch: (req) => {
        return new Response(`Hello from ${req.url}`)
      }
    })
    const response = await fetch(`http://localhost:${server.port}/test`)
    const text = await response.text()
    assert(text.includes('Hello'), `Response: ${text}`)
    assert(text.includes('/test'), `Should include path: ${text}`)
    await server.stop()
  })

  await test('serve() handles JSON responses', async () => {
    const server = await serve({
      port: 0,
      fetch: () => {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    })
    const response = await fetch(`http://localhost:${server.port}`)
    const json = await response.json()
    assertEqual(json.status, 'ok', 'status')
    await server.stop()
  })

  await test('serve() handles different methods', async () => {
    const server = await serve({
      port: 0,
      fetch: (req) => new Response(req.method)
    })
    const getResponse = await fetch(`http://localhost:${server.port}`)
    assertEqual(await getResponse.text(), 'GET', 'GET method')
    const postResponse = await fetch(`http://localhost:${server.port}`, { method: 'POST' })
    assertEqual(await postResponse.text(), 'POST', 'POST method')
    await server.stop()
  })

  await test('serve() stop() cleanly shuts down', async () => {
    const server = await serve({
      port: 0,
      fetch: () => new Response('OK')
    })
    const port = server.port
    await server.stop()
    // After stopping, connection should fail
    // Give time for socket to close
    await sleep(100)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 500)
      await fetch(`http://localhost:${port}`, { signal: controller.signal })
      clearTimeout(timeout)
      throw new Error('Connection should have failed')
    } catch (e: any) {
      // Expected - connection refused, timeout, or abort
      const isExpected = e.code === 'ECONNREFUSED' ||
        e.name === 'TimeoutError' ||
        e.name === 'AbortError' ||
        e.cause?.code === 'ECONNREFUSED' ||
        e.message?.includes('Unable to connect') ||
        e.message?.includes('fetch failed')
      assert(isExpected, `Expected connection failure, got: ${e.name} - ${e.message}`)
    }
  })

  await test('serve() handles request with headers', async () => {
    const server = await serve({
      port: 0,
      fetch: (req) => {
        const auth = req.headers.get('Authorization')
        return new Response(auth || 'no auth')
      }
    })
    const response = await fetch(`http://localhost:${server.port}`, {
      headers: { Authorization: 'Bearer token123' }
    })
    const text = await response.text()
    assertEqual(text, 'Bearer token123', 'auth header')
    await server.stop()
  })

  console.log('')

  // ════════════════════════════════════════════════════════════════════════
  // PTY Operations Tests
  // ════════════════════════════════════════════════════════════════════════
  console.log('▸ PTY Operations')

  await test('getPtySpawn() loads or returns null gracefully', async () => {
    const ptySpawn = await getPtySpawn()
    // Either returns a function or null - both are valid
    if (ptySpawn !== null) {
      assertType(ptySpawn, 'function', 'ptySpawn')
      console.log('    (PTY available)')
    } else {
      console.log('    (PTY not available)')
    }
  })

  // ════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ════════════════════════════════════════════════════════════════════════
  
  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }

  // ════════════════════════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════════════════════════
  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  Runtime: ${runtime} (${arch}/${platform})`)
  console.log(`  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, \x1b[33m${skipped} skipped\x1b[0m`)
  console.log('════════════════════════════════════════════════════════════')
  console.log('')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Test suite failed:', e)
  process.exit(1)
})
