const COOKIE = '__Host-portfolio';
const TTL = 86400;
const LINK_TTL = 30 * 86400;
const encoder = new TextEncoder();
const baseHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noimageindex',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
function response(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...baseHeaders, ...extra } });
}
function escape(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nextPath(value, origin) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return '/';
  const target = new URL(value, origin);
  if (target.origin !== origin || target.pathname.startsWith('/_portfolio/')) return '/';
  return target.pathname + target.search + target.hash;
}
function gate(next, message = '', status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noimageindex"><title>Julie Tadros — Portfolio</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font:15px/1.6 Arial,sans-serif;min-height:100svh;display:flex;flex-direction:column}header{padding:36px clamp(24px,6vw,88px);font-size:12px;letter-spacing:.12em;text-transform:uppercase}main{flex:1;display:grid;place-items:center;padding:35px 24px 100px}.entry{width:100%;max-width:420px}.eyebrow{font-size:10px;letter-spacing:.17em;text-transform:uppercase;margin:0 0 18px}h1{font:400 clamp(42px,8vw,62px)/1.04 Georgia,serif;letter-spacing:-.035em;margin:0 0 24px}.intro{color:#555;margin:0 0 32px;max-width:34ch}label{font-size:12px;display:block;margin-bottom:9px}input{width:100%;border:1px solid #aaa;background:#fff;border-radius:0;padding:14px 15px;font:16px Arial,sans-serif;color:#111}input:focus-visible,button:focus-visible{outline:2px solid #111;outline-offset:4px}button{border:1px solid #111;border-radius:0;background:#111;color:#fff;width:100%;padding:14px 18px;font:14px Arial,sans-serif;cursor:pointer;margin-top:14px}button:hover{background:#333}.message{font-size:13px;color:#7c251d;margin:14px 0 0}.note{font-size:11px;color:#666;margin-top:20px}footer{padding:20px 24px 26px;text-align:center;font-size:10px;letter-spacing:.04em;color:#666}
</style></head><body><header>Julie Tadros</header><main><section class="entry"><p class="eyebrow">Selected work</p><h1>A private portfolio.</h1><p class="intro">Please use the private portfolio link shared with you.</p>${message ? `<p class="message" id="message" role="alert">${escape(message)}</p>` : ''}<details><summary>Owner sign-in</summary><form method="post" action="/_portfolio/login"><input type="hidden" name="next" value="${escape(next)}"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" ${message ? 'aria-invalid="true" aria-describedby="message"' : ''}><button type="submit">Enter portfolio <span aria-hidden="true">↗</span></button></form></details></section></main><footer>Design · Interiors · Editorial</footer></body></html>`;
  return response(html, status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  });
}
function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
}
async function samePassword(a, b) {
  const [x, y] = await Promise.all([a, b].map(v => crypto.subtle.digest('SHA-256', encoder.encode(v))));
  let difference = 0;
  const u = new Uint8Array(x), v = new Uint8Array(y);
  for (let i = 0; i < u.length; i++) difference |= u[i] ^ v[i];
  return difference === 0;
}
async function signingKey(env) {
  return crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET + '\0' + env.PORTFOLIO_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function createSession(env, origin, expiry = Math.floor(Date.now() / 1000) + TTL) {
  const payload = `v1:${expiry}:${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(origin + '\0' + payload));
  return payload + '.' + bytesToHex(signature);
}
async function authenticated(request, env) {
  const token = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (token?.startsWith('v2.')) return !!await verifyAccessToken(token, env, new URL(request.url).origin, 'visitor');
  if (!token || token.length > 200) return false;
  const match = /^(v1:(\d{10}):[a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[2]), now = Math.floor(Date.now() / 1000);
  if (expiry <= now || expiry > now + TTL + 60) return false;
  const signature = Uint8Array.from(match[3].match(/../g), v => parseInt(v, 16));
  return crypto.subtle.verify('HMAC', await signingKey(env), signature, encoder.encode(new URL(request.url).origin + '\0' + match[1]));
}
async function signAccessToken(payload, env, origin) {
  const encoded = btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const message = 'v2.' + encoded;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(origin + '\0' + message));
  return message + '.' + bytesToHex(signature);
}
async function verifyAccessToken(token, env, origin, kind) {
  if (!token || token.length > 1600) return null;
  const match = /^(v2\.([A-Za-z0-9_-]+))\.([a-f0-9]{64})$/.exec(token);
  if (!match) return null;
  try {
    const signature = Uint8Array.from(match[3].match(/../g), v => parseInt(v, 16));
    if (!await crypto.subtle.verify('HMAC', await signingKey(env), signature, encoder.encode(origin + '\0' + match[1]))) return null;
    const payload = JSON.parse(atob(match[2].replaceAll('-', '+').replaceAll('_', '/')));
    const now = Math.floor(Date.now() / 1000);
    if (payload.kind !== kind || !/^[a-f0-9-]{36}$/.test(payload.id) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
    if (payload.iat > now + 60 || payload.exp <= now || payload.exp <= payload.iat || payload.exp - payload.iat > (kind === 'link' ? LINK_TTL : TTL)) return null;
    const revoked = String(env.REVOKED_LINK_IDS || '').split(/[\s,]+/);
    if (revoked.includes(payload.id)) return null;
    return payload;
  } catch { return null; }
}
function managePage(result = null, message = '', status = 200) {
  return response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio access links</title><style>body{margin:0;padding:60px 24px;background:white;color:#111;font:15px/1.6 Arial,sans-serif}main{max-width:560px;margin:auto}h1{font:400 40px/1.1 Georgia,serif}label{display:block;margin:20px 0 6px}input,select,textarea,button{box-sizing:border-box;width:100%;padding:13px;font:16px Arial,sans-serif;border:1px solid #999;background:white;color:#111;border-radius:0}button{background:#111;color:white;margin-top:24px;cursor:pointer}textarea{height:150px;overflow-wrap:anywhere;font-size:13px}small{color:#555}.result{margin:30px 0;padding:20px;border:1px solid #ccc}.error{color:#7c251d}</style></head><body><main><p>JULIE TADROS · OWNER TOOLS</p><h1>Share your portfolio.</h1><p>Create a private link that opens your portfolio without asking the recipient for a password.</p>${message ? `<p class="error" role="alert">${escape(message)}</p>` : ''}${result ? `<section class="result"><h2>Your access link</h2><label for="share">Copy this entire link into your application</label><textarea id="share" readonly>${escape(result.url)}</textarea><p>Expires: ${escape(result.expires)} (UTC)</p><p>Link ID: <code>${escape(result.id)}</code></p><small>Keep the link ID if you want to revoke this link before it expires.</small></section>` : ''}<form method="post" action="/_portfolio/manage"><label for="owner">Your owner password</label><input id="owner" type="password" name="password" autocomplete="current-password" required maxlength="256"><label for="days">Link expires after</label><select id="days" name="days"><option value="30">30 days</option><option value="14">14 days</option><option value="7">7 days</option><option value="1">1 day</option></select><label for="next">Open this page</label><input id="next" name="next" value="/" maxlength="500"><small>Leave / to open the homepage.</small><button>Create access link</button></form><p><small>Your owner password is for you only. Share the generated link with employers.</small></p></main></body></html>`, status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  });
}
async function boundedBody(request) {
  if (Number(request.headers.get('Content-Length')) > 2048) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') return response('User-agent: *\nDisallow: /\n', 200, { 'Content-Type': 'text/plain' });
    // Fail closed until runtime secrets and the limiter are configured.
    if (!env.PORTFOLIO_PASSWORD || env.PORTFOLIO_PASSWORD.length < 8 || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.LOGIN_LIMITER || !env.ASSETS) {
      return response('The portfolio is being prepared. Please try again shortly.', 503, { 'Retry-After': '300' });
    }
    const login = url.pathname === '/_portfolio/login';
    if (url.pathname === '/_portfolio/open' && ['GET', 'HEAD'].includes(request.method)) {
      const link = await verifyAccessToken(url.searchParams.get('access'), env, url.origin, 'link');
      if (!link) return gate('/', 'This private link has expired or is no longer available. Please ask Julie for a new link.', 403);
      // HEAD checks do not consume the link; it remains reusable until expiry.
      if (request.method === 'HEAD') return response(null);
      const now = Math.floor(Date.now() / 1000);
      const expiry = Math.min(now + TTL, link.exp);
      const token = await signAccessToken({ kind: 'visitor', id: link.id, iat: now, exp: expiry }, env, url.origin);
      return response(null, 303, { Location: nextPath(link.next, url.origin), 'Set-Cookie': `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${expiry - now}` });
    }
    if (url.pathname === '/_portfolio/manage' && ['GET', 'HEAD'].includes(request.method)) return request.method === 'HEAD' ? response(null) : managePage();
    if (url.pathname === '/_portfolio/manage' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return response('Please submit the form from this website.', 403);
      if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return response('Unsupported form.', 415);
      let limited;
      try { limited = await env.LOGIN_LIMITER.limit({ key: 'login:' + (request.headers.get('CF-Connecting-IP') || 'unknown') }); }
      catch { return response('Please try again shortly.', 503); }
      if (!limited.success) return managePage(null, 'Please wait a minute before trying again.', 429);
      const body = await boundedBody(request);
      if (body === null) return response('Form too large.', 413);
      const form = new URLSearchParams(body);
      const password = form.get('password') || '';
      if (password.length > 256 || !await samePassword(password, env.PORTFOLIO_PASSWORD)) return managePage(null, 'That owner password doesn’t look right.', 401);
      const days = Number(form.get('days'));
      if (![1, 7, 14, 30].includes(days)) return managePage(null, 'Choose an expiry between 1 and 30 days.', 400);
      const now = Math.floor(Date.now() / 1000), id = crypto.randomUUID(), expiry = now + days * 86400;
      const token = await signAccessToken({ kind: 'link', id, iat: now, exp: expiry, next: nextPath(form.get('next'), url.origin) }, env, url.origin);
      return managePage({ url: url.origin + '/_portfolio/open?access=' + token, id, expires: new Date(expiry * 1000).toISOString().replace('T', ' ').slice(0, 16) });
    }
    if (login && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return response('Please submit the form from this website.', 403);
      if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return response('Unsupported form.', 415);
      let limited;
      try { limited = await env.LOGIN_LIMITER.limit({ key: 'login:' + (request.headers.get('CF-Connecting-IP') || 'unknown') }); }
      catch { return response('Please try again shortly.', 503); }
      if (!limited.success) return gate('/', 'Too many attempts. Please wait a minute and try again.', 429);
      const body = await boundedBody(request);
      if (body === null) return response('Form too large.', 413);
      const form = new URLSearchParams(body);
      const next = nextPath(form.get('next'), url.origin);
      const password = form.get('password') || '';
      if (password.length > 256 || !await samePassword(password, env.PORTFOLIO_PASSWORD)) return gate(next, 'That password doesn’t look right. Please try again.', 401);
      const token = await createSession(env, url.origin);
      return response(null, 303, { Location: next, 'Set-Cookie': `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL}` });
    }
    if (url.pathname === '/_portfolio/logout' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return response('Invalid request.', 403);
      return response(null, 303, { Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0` });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed.', 405, { Allow: 'GET, HEAD' });
    if (login) return request.method === 'HEAD' ? response(null) : gate(nextPath(url.searchParams.get('next'), url.origin));
    if (!await authenticated(request, env)) {
      if (request.method === 'HEAD') return response(null, 401);
      return gate(nextPath(url.pathname + url.search, url.origin));
    }
    if (url.pathname.startsWith('/_portfolio/')) return response('Not found.', 404);
    // This binding is reached only after the signed session has been verified.
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    for (const [name, value] of Object.entries(baseHeaders)) headers.set(name, value);
    return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
  }
};
export { createSession };
