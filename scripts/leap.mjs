// Shared by all three launchers. Vite and the game keep their own configuration.
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
const cache = join(root, '.leap');
const lock = join(cache, 'run.json');
const stamp = join(cache, 'dependencies.sha256');
const address = 'http://localhost:5173';
const statusPath = '/__leap_launcher';
const project = createHash('sha256').update(root).digest('hex');
const token = randomUUID();
const runtime = dirname(process.execPath);
const npm = process.platform === 'win32'
  ? join(runtime, 'node_modules/npm/bin/npm-cli.js')
  : join(runtime, '../lib/node_modules/npm/bin/npm-cli.js');
let server;
let installer;
let stopping = false;

process.chdir(root);

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function releaseLock() {
  if (readJson(lock)?.token === token) unlinkSync(lock);
}

function takeLock() {
  try {
    writeFileSync(lock, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' });
    process.once('exit', releaseLock);
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = readJson(lock);
    if (owner?.pid) {
      try { process.kill(owner.pid, 0); } catch (error) {
        if (error.code === 'ESRCH') {
          unlinkSync(lock);
          return takeLock();
        }
      }
    }
    return false;
  }
}

async function request(path) {
  try {
    return await fetch(address + path, { signal: AbortSignal.timeout(1500), redirect: 'error' });
  } catch { return null; }
}

async function runningGame() {
  const status = await request(statusPath);
  try {
    const info = await status?.json();
    if (info?.project === project) return info.url;
  } catch { /* A different server may return HTML. */ }
  // Also recognise this checkout when it was started with the existing npm command.
  const manifest = await request('/package.json');
  try {
    if (JSON.stringify(await manifest?.json()) !== JSON.stringify(readJson(join(root, 'package.json')))) return null;
    const page = await request('/');
    if ((await page?.text())?.includes('src="/@vite/client"')) return address;
  } catch { /* An unrelated server must never be stopped or replaced. */ }
  return null;
}

async function openGame(url, alreadyRunning = false) {
  console.log(alreadyRunning ? '\nLEAP is already running.' : '\nLEAP is ready.');
  console.log(`Open LEAP: ${url}`);
  console.log(alreadyRunning
    ? 'To quit, close the window that started LEAP, or press Ctrl+C there.\nClosing this window or the browser tab does not stop it.'
    : 'Keep this window open while you play.\nTo quit, close this window or press Ctrl+C. Closing the browser tab does not stop LEAP.');
  const [command, args] = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const browser = spawn(command, args, { detached: true, stdio: 'ignore' });
  browser.once('error', () => console.log(`Open ${url} in your browser to play.`));
  browser.unref();
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npm, ...args], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        npm_config_cache: join(cache, 'npm-cache'),
        PATH: runtime + (process.platform === 'win32' ? ';' : ':') + process.env.PATH,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    installer = child;
    let output = '';
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (data) => {
        output = (output + data).slice(-200000);
      });
    }
    child.once('error', reject);
    child.once('close', (code) => { installer = null; resolve({ code, output }); });
  });
}

async function dependencies() {
  console.log('\n[1/4] Node.js is ready. Setup stays in this game folder.');
  console.log('[2/4] Checking the packages this version of LEAP needs...');
  const hash = createHash('sha256').update(`${process.version}/${process.platform}/${process.arch}`);
  for (const file of ['package.json', 'package-lock.json']) hash.update(readFileSync(join(root, file)));
  const fingerprint = hash.digest('hex');
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === fingerprint &&
      (await runNpm(['ls', '--all', '--include=dev', '--include=optional'])).code === 0) return true;
  console.log('Downloading and installing the packages in package-lock.json.');
  console.log('This may take a few minutes. Keep this window open; the bar moves while setup is working.');
  let tick = 0;
  const progress = process.stderr.isTTY ? setInterval(() => {
    const position = tick++ % 21;
    const bar = ' '.repeat(position) + '====' + ' '.repeat(20 - position);
    process.stderr.write(`\r  Installing packages [${bar}]`);
  }, 150) : null;
  let result;
  try {
    result = await runNpm(['ci', '--include=dev', '--include=optional', '--ignore-scripts=false', '--engine-strict', '--no-audit', '--no-fund']);
  } finally {
    if (progress) { clearInterval(progress); process.stderr.write('\r\x1b[2K'); }
  }
  if (stopping) return false;
  if (result.code !== 0) {
    console.error(result.output);
    if (result.output.includes('EBADENGINE')) {
      console.error('\nLEAP needs a different Node.js version. The launcher will check the current LTS release.');
      process.exitCode = 42;
    } else {
      console.error('\nCould not get the dependencies. Check the message above and your internet connection, then try again.');
      process.exitCode = 1;
    }
    return false;
  }
  writeFileSync(stamp, fingerprint);
  console.log('The packages are ready.');
  return true;
}

async function stop() {
  if (stopping) return;
  stopping = true;
  installer?.kill('SIGTERM');
  await server?.close();
  console.log('\nLEAP has stopped.');
}

async function main() {
  const existing = await runningGame();
  if (existing) return openGame(existing, true);
  mkdirSync(cache, { recursive: true });
  if (!takeLock()) {
    console.log('\nLEAP is getting ready in another window. Keep that window open.');
    console.log(`When it is ready, open ${address} or run this launcher again.`);
    return;
  }
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, stop);
  if (!await dependencies() || stopping) return;
  console.log('[3/4] Starting LEAP on this computer...');
  const { createServer } = await import('vite');
  let url = address;
  server = await createServer({
    root,
    server: { host: 'localhost', port: 5173, strictPort: true, open: false },
    plugins: [{
      name: 'leap-launcher',
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== statusPath) return next();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ project, url }));
        });
      },
    }],
  });
  if (stopping) { await server.close(); return; }
  await server.listen();
  url = server.resolvedUrls.local[0];
  const ready = await request(new URL(url).pathname);
  if (!ready?.ok) throw new Error('LEAP did not finish starting. Open the launcher to try again.');
  await ready.body?.cancel();
  console.log('[4/4] LEAP is ready. Opening your browser...');
  await openGame(url);
}

main().catch(async (error) => {
  console.error(error.code === 'EADDRINUSE' || /Port 5173 is already in use/.test(error.message)
    ? `\n${address} is being used by another server. Close that server, then start LEAP again.`
    : `\nLEAP could not start. ${error.message}`);
  await server?.close();
  process.exitCode = 1;
});
