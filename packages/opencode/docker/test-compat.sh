#!/bin/bash
# OpenCode Node.js Compatibility Layer Test Script
#
# This script tests the compat layer functionality on Node.js
# Run from the packages/opencode directory

set -e

echo "=== OpenCode Node.js Compatibility Layer Tests ==="
echo ""

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "Architecture: $(node -e 'console.log(process.arch)')"
echo "Platform: $(node -e 'console.log(process.platform)')"
echo ""

# Test runtime detection
echo "Testing runtime detection..."
node --experimental-strip-types -e "
import { isBun, isNode, runtime, arch, platform, isArm64, isArm, isTermux } from './src/compat/index.ts';
console.log('  isBun:', isBun);
console.log('  isNode:', isNode);
console.log('  runtime:', runtime);
console.log('  arch:', arch);
console.log('  platform:', platform);
console.log('  isArm:', isArm);
console.log('  isArm64:', isArm64);
console.log('  isTermux:', isTermux);
"
echo ""

# Test file operations
echo "Testing file operations..."
node --experimental-strip-types -e "
import { file, write, tmpdir } from './src/compat/index.ts';
const testPath = tmpdir + '/opencode-compat-test.txt';
const testContent = 'Hello from OpenCode compat layer! ' + new Date().toISOString();

await write(testPath, testContent);
console.log('  Wrote to:', testPath);

const readContent = await file(testPath).text();
console.log('  Read content:', readContent);

const exists = await file(testPath).exists();
console.log('  File exists:', exists);

// Cleanup
const fs = await import('fs/promises');
await fs.rm(testPath);
console.log('  Cleaned up test file');
"
echo ""

# Test shell operations
echo "Testing shell operations..."
node --experimental-strip-types -e "
import { \\$ } from './src/compat/index.ts';

const result = await \\$\\\`echo 'Shell test passed'\\\`;
console.log('  Shell output:', result.stdout.trim());

const lsResult = await \\$\\\`ls -la src/compat | head -5\\\`;
console.log('  Directory listing (first 5 lines):');
console.log(lsResult.stdout.split('\\n').map(l => '    ' + l).join('\\n'));
"
echo ""

# Test which function
echo "Testing which() function..."
node --experimental-strip-types -e "
import { which } from './src/compat/index.ts';

const nodeWhich = which('node');
console.log('  node:', nodeWhich);

const npmWhich = which('npm');
console.log('  npm:', npmWhich);

const missingWhich = which('nonexistent-command-12345');
console.log('  nonexistent:', missingWhich);
"
echo ""

# Test Glob operations
echo "Testing Glob operations..."
node --experimental-strip-types -e "
import { Glob } from './src/compat/index.ts';

const glob = new Glob('*.ts');
const files = [];
for await (const file of glob.scan('./src/compat')) {
  files.push(file);
}
console.log('  TypeScript files in src/compat:', files);
"
echo ""

# Test spawn operations
echo "Testing spawn operations..."
node --experimental-strip-types -e "
import { spawn, readableStreamToText } from './src/compat/index.ts';

const proc = spawn(['node', '--version'], { stdout: 'pipe' });
const stdout = await readableStreamToText(proc.stdout);
const exitCode = await proc.exited;
console.log('  Spawned node --version');
console.log('  Exit code:', exitCode);
console.log('  Output:', stdout.trim());
"
echo ""

echo "=== All tests passed! ==="
