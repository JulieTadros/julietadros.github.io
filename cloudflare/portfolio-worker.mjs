const COOKIE = '__Host-portfolio';
const TTL = 86400;
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
</style></head><body><header>Julie Tadros</header><main><section class="entry"><p class="eyebrow">Selected work</p><h1>A little introduction.</h1><p class="intro">Please enter the password to view my portfolio.</p><form method="post" action="/_portfolio/login"><input type="hidden" name="next" value="${escape(next)}"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" ${message ? 'aria-invalid="true" aria-describedby="message"' : ''}><button type="submit">Enter portfolio <span aria-hidden="true">↗</span></button>${message ? `<p class="message" id="message" role="alert">${escape(message)}</p>` : ''}</form><p class="note">Use the password included with your portfolio link.</p></section></main><footer>Design · Interiors · Editorial</footer></body></html>`;
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
  if (!token || token.length > 200) return false;
  const match = /^(v1:(\d{10}):[a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[2]), now = Math.floor(Date.now() / 1000);
  if (expiry <= now || expiry > now + TTL + 60) return false;
  const signature = Uint8Array.from(match[3].match(/../g), v => parseInt(v, 16));
  return crypto.subtle.verify('HMAC', await signingKey(env), signature, encoder.encode(new URL(request.url).origin + '\0' + match[1]));
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
