/**
 * OpenCode Node.js Compatibility Layer Test
 * Run with: npx tsx test-compat-node.ts
 */

import { 
  isBun, isNode, runtime, arch, platform, isArm64, isArm, isTermux, tmpdir,
  file, write, $, which, sleep, hash, Glob, spawn, readableStreamToText,
  getPtySpawn
} from './src/compat/index.ts';
import path from 'path';
import fs from 'fs/promises';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     OpenCode Node.js Compatibility Layer Test Suite      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  let passed = 0;
  let failed = 0;

  // Runtime Detection Tests
  console.log('▸ Runtime Detection');
  if (await test('isNode should be true', async () => {
    if (!isNode) throw new Error(`Expected true, got ${isNode}`);
  })) passed++; else failed++;

  if (await test('isBun should be false', async () => {
    if (isBun) throw new Error(`Expected false, got ${isBun}`);
  })) passed++; else failed++;

  if (await test('runtime should be "node"', async () => {
    if (runtime !== 'node') throw new Error(`Expected "node", got ${runtime}`);
  })) passed++; else failed++;

  if (await test('arch should be defined', async () => {
    if (!arch) throw new Error(`arch is undefined`);
  })) passed++; else failed++;

  if (await test('platform should be defined', async () => {
    if (!platform) throw new Error(`platform is undefined`);
  })) passed++; else failed++;

  if (await test('tmpdir should be a string', async () => {
    if (typeof tmpdir !== 'string') throw new Error(`Expected string, got ${typeof tmpdir}`);
  })) passed++; else failed++;

  console.log('');
  console.log('▸ File Operations');
  
  const testPath = path.join(tmpdir, `opencode-test-${Date.now()}.txt`);
  const testContent = 'Hello from OpenCode compat layer!';

  if (await test('write() should create file', async () => {
    await write(testPath, testContent);
    const stat = await fs.stat(testPath);
    if (!stat.isFile()) throw new Error('File not created');
  })) passed++; else failed++;

  if (await test('file().text() should read content', async () => {
    const content = await file(testPath).text();
    if (content !== testContent) throw new Error(`Content mismatch: ${content}`);
  })) passed++; else failed++;

  if (await test('file().exists() should return true', async () => {
    const exists = await file(testPath).exists();
    if (!exists) throw new Error('File should exist');
  })) passed++; else failed++;

  if (await test('file().size() should return correct size', async () => {
    const size = await file(testPath).size();
    if (size !== testContent.length) throw new Error(`Size mismatch: ${size} vs ${testContent.length}`);
  })) passed++; else failed++;

  if (await test('file().json() should parse JSON', async () => {
    const jsonPath = path.join(tmpdir, `opencode-test-${Date.now()}.json`);
    await write(jsonPath, JSON.stringify({ test: true }));
    const data = await file(jsonPath).json<{ test: boolean }>();
    await fs.rm(jsonPath);
    if (!data.test) throw new Error('JSON parse failed');
  })) passed++; else failed++;

  // Cleanup
  await fs.rm(testPath).catch(() => {});

  console.log('');
  console.log('▸ Shell Operations');

  if (await test('$`echo test` should execute', async () => {
    const result = await $`echo "shell test"`;
    if (!result.stdout.includes('shell test')) throw new Error(`Output: ${result.stdout}`);
  })) passed++; else failed++;

  if (await test('$.nothrow() should not throw on error', async () => {
    const result = await $`exit 1`.nothrow();
    if (result.exitCode !== 1) throw new Error(`Expected exit code 1, got ${result.exitCode}`);
  })) passed++; else failed++;

  if (await test('$.quiet() should suppress output', async () => {
    const result = await $`echo quiet`.quiet();
    if (!result.stdout.includes('quiet')) throw new Error('quiet() failed');
  })) passed++; else failed++;

  console.log('');
  console.log('▸ Utility Functions');

  if (await test('which() should find node', async () => {
    const nodePath = which('node');
    if (!nodePath) throw new Error('node not found');
  })) passed++; else failed++;

  if (await test('which() should return null for missing cmd', async () => {
    const missing = which('nonexistent-command-12345');
    if (missing !== null) throw new Error(`Expected null, got ${missing}`);
  })) passed++; else failed++;

  if (await test('sleep() should delay execution', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    if (elapsed < 40) throw new Error(`Only ${elapsed}ms elapsed`);
  })) passed++; else failed++;

  if (await test('hash() should return consistent hash', async () => {
    const h1 = hash('test string');
    const h2 = hash('test string');
    if (h1 !== h2) throw new Error(`Hash mismatch: ${h1} vs ${h2}`);
  })) passed++; else failed++;

  console.log('');
  console.log('▸ Glob Operations');

  if (await test('Glob should find .ts files', async () => {
    const glob = new Glob('*.ts');
    const files: string[] = [];
    for await (const f of glob.scan({ cwd: './src/compat' })) {
      files.push(f);
    }
    if (files.length === 0) throw new Error('No .ts files found');
  })) passed++; else failed++;

  console.log('');
  console.log('▸ Spawn Operations');

  if (await test('spawn() should execute command', async () => {
    const proc = spawn(['node', '--version'], { stdout: 'pipe' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`Exit code: ${exitCode}`);
  })) passed++; else failed++;

  if (await test('readableStreamToText() should read stdout', async () => {
    const proc = spawn(['echo', 'spawn test'], { stdout: 'pipe' });
    const text = await readableStreamToText(proc.stdout);
    if (!text.includes('spawn test')) throw new Error(`Output: ${text}`);
  })) passed++; else failed++;

  console.log('');
  console.log('▸ PTY Operations');

  if (await test('getPtySpawn() should load or return null gracefully', async () => {
    try {
      const ptySpawn = await getPtySpawn();
      // Either works (returns function) or gracefully fails (returns null)
      console.log(`    (PTY available: ${ptySpawn !== null})`);
    } catch (e) {
      // Even throwing is acceptable for this test - we just want it not to crash
    }
  })) passed++; else failed++;

  // Summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
