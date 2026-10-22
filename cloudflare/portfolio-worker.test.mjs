import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { createSession } from './portfolio-worker.mjs';
const origin = 'https://portfolio.example';
function fixture() {
  let reads = 0;
  const env = {
    PORTFOLIO_PASSWORD: 'test-only-password',
    SESSION_SECRET: 'test-only-session-secret-at-least-32-characters',
    LOGIN_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => { reads++; return new Response('PRIVATE CONTENT'); } }
  };
  return { env, reads: () => reads };
}
function request(path = '/', init = {}) { return new Request(origin + path, init); }
function submit(password, next = '/', extra = {}) {
  return request('/_portfolio/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...extra }, body: new URLSearchParams({ password, next }) });
}
test('pages, images, fonts and HEAD never reach assets without authentication', async () => {
  const { env, reads } = fixture();
  for (const path of ['/', '/office-my-home.html', '/assets/private.jpg', '/assets/font.woff2', '/demos/m-furniture/index.html']) {
    const r = await worker.fetch(request(path), env);
    assert.match(await r.text(), /Please enter the password/);
    assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
  }
  assert.equal((await worker.fetch(request('/assets/private.jpg', { method: 'HEAD' }), env)).status, 401);
  assert.equal(reads(), 0);
});
test('missing configuration fails closed', async () => {
  const { env, reads } = fixture();
  for (const key of ['PORTFOLIO_PASSWORD', 'SESSION_SECRET', 'ASSETS', 'LOGIN_LIMITER']) {
    assert.equal((await worker.fetch(request(), { ...env, [key]: undefined })).status, 503);
  }
  assert.equal(reads(), 0);
});
test('incorrect password gives no session or private content', async () => {
  const { env, reads } = fixture();
  const r = await worker.fetch(submit('wrong'), env);
  assert.equal(r.status, 401); assert.equal(r.headers.get('Set-Cookie'), null);
  assert.equal(reads(), 0);
});
test('successful login sets secure session and returns to requested page', async () => {
  const { env, reads } = fixture();
  const r = await worker.fetch(submit(env.PORTFOLIO_PASSWORD, '/office-my-home.html?view=2'), env);
  assert.equal(r.status, 303); assert.equal(r.headers.get('Location'), '/office-my-home.html?view=2');
  const cookie = r.headers.get('Set-Cookie');
  for (const flag of ['Secure', 'HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag));
  const page = await worker.fetch(request('/assets/private.jpg', { headers: { Cookie: cookie.split(';')[0] } }), env);
  assert.equal(await page.text(), 'PRIVATE CONTENT'); assert.equal(reads(), 1);
  assert.equal(page.headers.get('Cache-Control'), 'private, no-store');
});
test('modified, expired, other-host and old-password sessions fail', async () => {
  const { env, reads } = fixture();
  const token = await createSession(env, origin);
  const expired = await createSession(env, origin, Math.floor(Date.now() / 1000) - 1);
  const other = await createSession(env, 'https://other.example');
  for (const value of [token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), expired, other, 'bad']) {
    const r = await worker.fetch(request('/assets/private.jpg', { headers: { Cookie: '__Host-portfolio=' + value } }), env);
    assert.match(await r.text(), /Please enter the password/);
  }
  const r = await worker.fetch(request('/', { headers: { Cookie: '__Host-portfolio=' + token } }), { ...env, PORTFOLIO_PASSWORD: 'a-new-test-password' });
  assert.match(await r.text(), /Please enter the password/); assert.equal(reads(), 0);
});
test('cross-origin submissions and rate-limited requests cannot log in', async () => {
  const { env } = fixture();
  assert.equal((await worker.fetch(submit(env.PORTFOLIO_PASSWORD, '/', { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await worker.fetch(submit(env.PORTFOLIO_PASSWORD), { ...env, LOGIN_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
});
test('return paths cannot redirect to an external website or inject HTML', async () => {
  const { env } = fixture();
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example', '/_portfolio/login']) {
    assert.equal((await worker.fetch(submit(env.PORTFOLIO_PASSWORD, next), env)).headers.get('Location'), '/');
  }
  const r = await worker.fetch(request('/_portfolio/login?next=' + encodeURIComponent('/?x=" autofocus onfocus="alert(1)')), env);
  assert.ok(!(await r.text()).includes('value="/?x=" autofocus'));
});
test('oversized submission and unsupported methods fail', async () => {
  const { env } = fixture();
  assert.equal((await worker.fetch(submit('x'.repeat(3000)), env)).status, 413);
  assert.equal((await worker.fetch(request('/assets/private.jpg', { method: 'PUT' }), env)).status, 405);
});
test('logout clears session only on same-origin POST', async () => {
  const { env } = fixture();
  const r = await worker.fetch(request('/_portfolio/logout', { method: 'POST', headers: { Origin: origin } }), env);
  assert.equal(r.status, 303); assert.match(r.headers.get('Set-Cookie'), /Max-Age=0/);
});
