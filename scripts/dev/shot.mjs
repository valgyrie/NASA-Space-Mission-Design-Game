// Dev-only screenshot driver for LEAP (not part of the game or its tests).
// Drives a locally installed Microsoft Edge or Chrome (headless, GPU on) against the running dev server.
//
// Setup (once): copy this file to .leap/shots/ (git-ignored), then in that folder run
//   npm init -y && npm install puppeteer-core
// (puppeteer-core is kept out of the game's package.json on purpose). Pass --browser <path> for another browser.
// See docs/graphics-overhaul/HANDOFF.md.
//
// Usage:
//   .leap/node/node.exe .leap/shots/shot.mjs --out <dir> [--url http://localhost:5173/] [--size 1280x800] --steps "<step>;<step>;..."
//
// Steps (separated by ';'):
//   click:<text>        click the first visible button/link whose text contains <text> (case-insensitive)
//   clickxy:<x>,<y>     click at page coordinates
//   wait:<ms>           wait
//   key:<Key>[*n]       press a key n times (e.g. key:f*20, key:Escape)
//   hold:<Key>,<ms>     hold a key down for ms (camera keys: w a s d q e r f + -)
//   wheel:<deltaY>[*n]  mouse wheel at the screen centre (negative zooms in)
//   drag:<x1>,<y1>,<x2>,<y2>[,right]   mouse drag (right button turns/tilts the camera)
//   eval:<js>           run JS in the page (window.leap is available in dev)
//   shot:<name>         save <out>/<name>.png
//   log                 print the page's console errors so far
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(arg('out', '.leap/shots/out'));
const url = arg('url', 'http://localhost:5173/');
const [width, height] = arg('size', '1280x800').split('x').map(Number);
const steps = (arg('steps', 'wait:3000;shot:page') || '').split(';').map((s) => s.trim()).filter(Boolean);
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: arg('browser', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),
  headless: 'new',
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--mute-audio', `--window-size=${width},${height}`],
  defaultViewport: { width, height },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const step of steps) {
  const i = step.indexOf(':');
  const name = i < 0 ? step : step.slice(0, i);
  const value = i < 0 ? '' : step.slice(i + 1);
  try {
    if (name === 'click') {
      const ok = await page.evaluate((text) => {
        const want = text.toLowerCase();
        const els = [...document.querySelectorAll('button, a, [role="button"], label, summary')];
        const el = els.find((e) => e.offsetParent !== null && (e.textContent || '').toLowerCase().includes(want));
        if (!el) return false;
        el.click();
        return true;
      }, value);
      if (!ok) console.log(`!! click: nothing visible contains "${value}"`);
    } else if (name === 'clickxy') {
      const [x, y] = value.split(',').map(Number);
      await page.mouse.click(x, y);
    } else if (name === 'wait') {
      await sleep(Number(value));
    } else if (name === 'key') {
      const [key, n] = value.split('*');
      for (let k = 0; k < Number(n || 1); k++) await page.keyboard.press(key);
    } else if (name === 'hold') {
      const [key, ms] = value.split(',');
      await page.keyboard.down(key);
      await sleep(Number(ms));
      await page.keyboard.up(key);
    } else if (name === 'wheel') {
      const [dy, n] = value.split('*');
      await page.mouse.move(width / 2, height / 2);
      for (let k = 0; k < Number(n || 1); k++) {
        await page.mouse.wheel({ deltaY: Number(dy) });
        await sleep(60);
      }
    } else if (name === 'drag') {
      const [x1, y1, x2, y2, button] = value.split(',');
      await page.mouse.move(Number(x1), Number(y1));
      await page.mouse.down({ button: button === 'right' ? 'right' : 'left' });
      await page.mouse.move(Number(x2), Number(y2), { steps: 12 });
      await page.mouse.up({ button: button === 'right' ? 'right' : 'left' });
    } else if (name === 'eval') {
      const result = await page.evaluate(`(async () => { ${value} })()`);
      if (result !== undefined) console.log('eval →', JSON.stringify(result));
    } else if (name === 'shot') {
      const file = join(out, `${value || 'shot'}.png`);
      await page.screenshot({ path: file });
      console.log(`saved ${file}`);
    } else if (name === 'log') {
      console.log(errors.length ? errors.join('\n') : '(no console errors)');
    } else {
      console.log(`!! unknown step "${step}"`);
    }
  } catch (e) {
    console.log(`!! step "${step}" failed: ${e.message}`);
  }
}
if (errors.length) console.log(`-- ${errors.length} console error/warning line(s):\n${errors.slice(0, 30).join('\n')}`);
await browser.close();
