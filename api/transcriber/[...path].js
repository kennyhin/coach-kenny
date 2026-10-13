import { handleTranscriber } from '../../lib/transcriber/handler.js';

export const maxDuration = 60;

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default async function handler(req, res) {
  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host || 'localhost';
    const url = `${proto}://${host}${req.url}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    const skip = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null || skip.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else headers.set(key, String(value));
    }
    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });
    const response = await handleTranscriber(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key === 'content-length') return;
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Something went wrong' }));
  }
}
