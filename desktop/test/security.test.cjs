'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { resolveAppPath, isSafeExternal, CSP } = require('../security.cjs');

const root = path.join(path.sep, 'opt', 'paintland', 'app');

test('serves files inside the app folder', () => {
  assert.strictEqual(resolveAppPath(root, 'app://paintland/index.html', 'paintland'), path.join(root, 'index.html'));
  assert.strictEqual(resolveAppPath(root, 'app://paintland/', 'paintland'), path.join(root, 'index.html'));
  assert.strictEqual(resolveAppPath(root, 'app://paintland/assets/a%20b.js', 'paintland'), path.join(root, 'assets', 'a b.js'));
});

test('never resolves outside the app folder', () => {
  const inside = (f) => f === null || f.startsWith(root + path.sep);
  const attacks = ['app://paintland/../secret.txt', 'app://paintland/%2e%2e/%2e%2e/etc/passwd', 'app://paintland/..%2f..%2fwin.ini', 'app://paintland/assets/..%2f..%2f..%2fx', 'app://paintland/a%5c..%5c..%5cx', 'app://paintland/%00'];
  for (const url of attacks) assert.ok(inside(resolveAppPath(root, url, 'paintland')), url);
  // Encoded slashes that climb out, other hosts and junk are refused outright.
  assert.strictEqual(resolveAppPath(root, 'app://paintland/..%2f..%2fwin.ini', 'paintland'), null);
  assert.strictEqual(resolveAppPath(root, 'app://paintland/a%5c..%5c..%5cx', 'paintland'), null);
  assert.strictEqual(resolveAppPath(root, 'app://other/index.html', 'paintland'), null);
  assert.strictEqual(resolveAppPath(root, 'not a url', 'paintland'), null);
});

test('only https and mailto links open outside', () => {
  assert.ok(isSafeExternal('https://helao2.com'));
  assert.ok(isSafeExternal('mailto:support@helao2.com'));
  for (const url of ['http://example.com', 'file:///C:/Windows', 'javascript:alert(1)', 'ms-settings:', 'smb://x/y', 'x']) assert.ok(!isSafeExternal(url), url);
});

test('CSP blocks inline scripts, plugins, framing and form posts', () => {
  assert.match(CSP, /script-src 'self'(;|$)/);
  assert.doesNotMatch(CSP, /script-src[^;]*unsafe/);
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "form-action 'none'", "base-uri 'none'"]) assert.ok(CSP.includes(d), d);
});
