'use strict';

// Runs the CLI on the two example pages: the broken one must fail with the clipped menu
// and the horizontal overflow, the fixed one must pass.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function scan(example) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  const url = pathToFileURL(path.join(__dirname, '..', 'examples', example)).href;
  const run = spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'cli.js'), '--url', url, '--out', out], { encoding: 'utf8' });
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  const types = new Set(report.results.flatMap((r) => r.issues.filter((i) => !i.notApplicable && i.severity !== 'pass').map((i) => i.type)));
  return { status: run.status, types, report };
}

test('broken example: clipped mobile menu and horizontal overflow, exit code 1', { timeout: 300000 }, () => {
  const { status, types, report } = scan('broken.html');
  assert.equal(status, 1);
  assert.ok(types.has('mobile-menu-unreachable'), 'clipped menu detected');
  assert.ok(types.has('horizontal-overflow'), 'overflow detected');
  const iphone = report.results.find((r) => r.device === 'iPhone SE');
  const menu = iphone.issues.find((i) => i.type === 'mobile-menu-unreachable');
  assert.match(menu.title, /3 of 4 items/);
});

test('fixed example: no issues, exit code 0', { timeout: 300000 }, () => {
  const { status, types } = scan('fixed.html');
  assert.deepEqual([...types], []);
  assert.equal(status, 0);
});
