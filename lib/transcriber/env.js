export function env(name) {
  const fromNetlify = readNetlify(name);
  if (fromNetlify) return fromNetlify;
  return process.env[name] || '';
}

function readNetlify(name) {
  try {
    const netlify = globalThis.Netlify;
    if (!netlify || !netlify.env || typeof netlify.env.get !== 'function') return '';
    const value = netlify.env.get(name);
    return value == null ? '' : String(value);
  } catch {
    return '';
  }
}
