// Linux integration checks: real Vite, with installs and browser opening replaced.
// Run with: node --test scripts/leap.test.mjs (port 5173 must be free).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = join(dirname(fileURLToPath(import.meta.url)), '..');

test('LEAP launchers', { skip: process.platform !== 'linux', timeout: 90000 }, async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "LEAP launcher's checks & "));
  const toolchain = join(workspace, 'runtime');
  const node = join(toolchain, 'bin/node');
  const children = new Set();
  const fixtures = [];
  await mkdir(join(toolchain, 'bin'), { recursive: true });
  await mkdir(join(toolchain, 'lib/node_modules/npm/bin'), { recursive: true });
  await copyFile(process.execPath, node);
  await writeFile(join(toolchain, 'lib/node_modules/npm/bin/npm-cli.js'), `
    const fs = require('node:fs');
    const args = process.argv.slice(2);
    fs.appendFileSync('npm-calls', JSON.stringify({ args, mode: process.env.NODE_ENV }) + '\\n');
    const mode = fs.existsSync('npm-mode') ? fs.readFileSync('npm-mode', 'utf8') : '';
    if (args[0] === 'ls') process.exit(mode === 'broken' ? 1 : 0);
    if (mode === 'engine') { console.error('npm error code EBADENGINE'); process.exit(1); }
    if (mode === 'failed') { console.error('npm error network unavailable'); process.exit(1); }
    if (mode === 'slow') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
    if (!fs.existsSync('node_modules')) fs.symlinkSync(${JSON.stringify(join(source, 'node_modules'))}, 'node_modules', 'dir');
    if (mode) fs.unlinkSync('npm-mode');
  `);
  const bin = join(workspace, 'openers');
  await mkdir(bin);
  await writeFile(join(bin, 'xdg-open'), '#!/bin/sh\nprintf "%s\\n" "$1" >> "$LEAP_TEST_BROWSER_LOG"\n', { mode: 0o755 });

  async function fixture(cached = true) {
    const root = await mkdtemp(join(workspace, 'game '));
    fixtures.push(root);
    await mkdir(join(root, 'scripts'));
    await mkdir(join(root, '.leap'));
    if (cached) await symlink(toolchain, join(root, '.leap/node'), 'dir');
    for (const file of ['scripts/leap.mjs', 'LEAP.sh', 'LEAP.command']) await copyFile(join(source, file), join(root, file));
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'leap', private: true, type: 'module' }));
    await writeFile(join(root, 'package-lock.json'), '{"name":"leap","lockfileVersion":3,"packages":{}}');
    await writeFile(join(root, 'index.html'), '<html><title>LEAP</title><body>Ready</body></html>');
    return root;
  }

  function launch(root, args = [join(root, 'scripts/leap.mjs')], executable = node, extraEnv = {}) {
    const child = spawn(executable, args, {
      cwd: root,
      env: { ...process.env, PATH: bin + ':' + process.env.PATH, DISPLAY: '', WAYLAND_DISPLAY: '', NODE_ENV: 'production', LEAP_TEST_BROWSER_LOG: join(root, 'browser-calls'), ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.add(child);
    const run = { child, output: '', done: once(child, 'exit').then(([code, signal]) => ({ code, signal })) };
    child.stdout.on('data', (data) => { run.output += data; });
    child.stderr.on('data', (data) => { run.output += data; });
    return run;
  }

  async function until(check, detail) {
    for (let i = 0; i < 150; i++) {
      if (await check()) return;
      await delay(40);
    }
    assert.fail(detail());
  }
  async function ready(run) {
    await until(() => run.output.includes('Keep this window open while you play.'), () => run.output);
  }
  async function stop(run) {
    // Shell wrappers own a child Node process; stop it as Ctrl+C would.
    if (run.child.exitCode === null) run.child.kill('SIGTERM');
    await run.done;
  }
  async function calls(root) {
    return (await readFile(join(root, 'npm-calls'), 'utf8')).trim().split('\n').map(JSON.parse);
  }

  try {
    await t.test('first start, duplicate launch, shutdown and cached restart', async () => {
      const root = await fixture();
      const lockfile = await readFile(join(root, 'package-lock.json'), 'utf8');
      const run = launch(root);
      await ready(run);
      assert.equal((await fetch('http://localhost:5173/')).status, 200);
      const install = (await calls(root))[0];
      assert(install.args.includes('ci') && install.args.includes('--include=dev') && install.args.includes('--engine-strict'));
      assert.equal(install.mode, 'development');
      const duplicate = launch(root);
      assert.equal((await duplicate.done).code, 0);
      assert.match(duplicate.output, /already running/);
      assert.match(duplicate.output, /Closing this window or the browser tab does not stop it/);
      await until(async () => (await readFile(join(root, 'browser-calls'), 'utf8')).trim().split('\n').length === 2, () => duplicate.output);
      assert.equal((await calls(root)).length, 1);
      await stop(run);
      assert(!(await readdir(join(root, '.leap'))).includes('run.json'));
      const restart = launch(root);
      await ready(restart);
      assert.deepEqual((await calls(root)).map(c => c.args[0]), ['ci', 'ls']);
      assert.equal(await readFile(join(root, 'package-lock.json'), 'utf8'), lockfile);
      await stop(restart);
    });

    await t.test('updates and missing packages trigger installation', async () => {
      const root = await fixture();
      let run = launch(root);
      await ready(run);
      await stop(run);
      await writeFile(join(root, 'package-lock.json'), '{"name":"leap","lockfileVersion":3,"packages":{},"version":"next"}');
      run = launch(root);
      await ready(run);
      await stop(run);
      await writeFile(join(root, 'npm-mode'), 'broken');
      run = launch(root);
      await ready(run);
      assert.deepEqual((await calls(root)).map(c => c.args[0]), ['ci', 'ci', 'ls', 'ci']);
      await stop(run);
    });

    await t.test('failed installs remain retryable and engine failures request a runtime refresh', async () => {
      const root = await fixture();
      for (const [mode, code, text] of [['failed', 1, /network unavailable/], ['engine', 42, /current LTS release/]]) {
        await writeFile(join(root, 'npm-mode'), mode);
        const run = launch(root);
        assert.equal((await run.done).code, code);
        assert.match(run.output, text);
        assert(!run.output.includes('Opening your browser'));
        assert(!(await readdir(join(root, '.leap'))).includes('run.json'));
      }
      await rm(join(root, 'npm-mode'));
      await writeFile(join(root, '.leap/run.json'), JSON.stringify({ pid: 2147483647, token: 'stale' }));
      const run = launch(root);
      await ready(run);
      await stop(run);
    });

    await t.test('simultaneous setup only installs once', async () => {
      const root = await fixture();
      await writeFile(join(root, 'npm-mode'), 'slow');
      const first = launch(root);
      await until(() => first.output.includes('Downloading and installing'), () => first.output);
      const second = launch(root);
      assert.equal((await second.done).code, 0);
      assert.match(second.output, /getting ready in another window/);
      await ready(first);
      assert.equal((await calls(root)).length, 1);
      await stop(first);
    });

    await t.test('an occupied port is left alone', async () => {
      const other = createServer((req, res) => { res.end('Another app'); });
      await new Promise(resolve => other.listen(5173, 'localhost', resolve));
      try {
        const run = launch(await fixture());
        assert.equal((await run.done).code, 1);
        assert.match(run.output, /being used by another server/);
        assert.equal(await (await fetch('http://localhost:5173/')).text(), 'Another app');
      } finally { await new Promise(resolve => other.close(resolve)); }
    });

    await t.test('recognises the existing development command', async () => {
      const root = await fixture();
      const first = launch(root);
      await ready(first);
      await stop(first);
      const manual = launch(root, [join(source, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', '5173', '--strictPort']);
      await until(() => manual.output.includes('Local:'), () => manual.output);
      const duplicate = launch(root);
      assert.equal((await duplicate.done).code, 0);
      assert.match(duplicate.output, /already running/);
      assert.equal((await calls(root)).length, 1);
      await stop(manual);
    });

    await t.test('the shell and Finder entry points handle paths with spaces and punctuation', async () => {
      for (const script of ['LEAP.sh', 'LEAP.command']) {
        const root = await fixture();
        const run = launch(root, [join(root, script)], '/bin/sh');
        await ready(run);
        const owner = JSON.parse(await readFile(join(root, '.leap/run.json'), 'utf8'));
        process.kill(owner.pid, 'SIGTERM');
        assert.equal((await run.done).code, 0);
      }
    });

    await t.test('a Linux file-manager launch opens a terminal', async () => {
      const root = await fixture();
      const terminals = join(root, 'terminals');
      await mkdir(terminals);
      await writeFile(join(terminals, 'gnome-terminal'), '#!/bin/sh\n[ "$1" = -- ] || exit 1\nshift\nexec "$@"\n', { mode: 0o755 });
      const run = launch(root, [join(root, 'LEAP.sh')], '/bin/sh', { DISPLAY: ':test', PATH: terminals + ':' + bin + ':' + process.env.PATH });
      await ready(run);
      process.kill(JSON.parse(await readFile(join(root, '.leap/run.json'), 'utf8')).pid, 'SIGTERM');
      assert.equal((await run.done).code, 0);
    });

    await t.test('failed downloads and checksum mismatches never install a runtime', async () => {
      const downloaders = join(workspace, 'downloaders');
      await mkdir(downloaders);
      await writeFile(join(downloaders, 'curl'), `#!/bin/sh
        [ "$LEAP_TEST_DOWNLOAD_FAIL" != 1 ] || exit 22
        for argument do
          case $argument in https:*) url=$argument ;; esac
          if [ "$previous" = -o ]; then output=$argument; fi
          previous=$argument
        done
        case $url in
          */index.tab) printf 'version\\tdate\\tfiles\\tnpm\\tv8\\tuv\\tzlib\\topenssl\\tmodules\\tlts\\n' > "$output"
            printf 'v99.1.0\\tdate\\tfiles\\tnpm\\tv8\\tuv\\tzlib\\topenssl\\tmodules\\tLTS\\n' >> "$output" ;;
          */SHASUMS256.txt) printf '%064d  node-v99.1.0-linux-x64.tar.gz\\n' 0 > "$output" ;;
          *) printf 'bad archive' > "$output" ;;
        esac
      `, { mode: 0o755 });
      for (const fail of ['0', '1']) {
        const root = await fixture(false);
        const run = launch(root, [join(root, 'LEAP.sh')], '/bin/sh', { PATH: downloaders + ':' + process.env.PATH, LEAP_TEST_DOWNLOAD_FAIL: fail });
        assert.notEqual((await run.done).code, 0);
        assert.match(run.output, fail === '0' ? /did not pass its check/ : /could not start/);
        assert.deepEqual(await readdir(join(root, '.leap')), []);
      }
    });
  } finally {
    for (const root of fixtures) {
      try {
        const owner = JSON.parse(await readFile(join(root, '.leap/run.json'), 'utf8'));
        process.kill(owner.pid, 'SIGTERM');
      } catch { /* Stopped launchers have already removed their lock. */ }
    }
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await Promise.allSettled([...children].map(child => child.exitCode === null && child.signalCode === null ? once(child, 'exit') : Promise.resolve()));
    await rm(workspace, { recursive: true, force: true });
  }
});
