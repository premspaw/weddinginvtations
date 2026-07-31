const { mkdirSync, copyFileSync, cpSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const dist = join(process.cwd(), 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'src'), { recursive: true });
copyFileSync('index.html', join(dist, 'index.html'));
cpSync('src', join(dist, 'src'), { recursive: true });
cpSync('assets', join(dist, 'assets'), { recursive: true });
console.log('Static wedding invitation built in dist/');
