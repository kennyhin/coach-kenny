import { handleTranscriber } from '../../lib/transcriber/handler.js';

export default async function handler(req) {
  return handleTranscriber(req);
}

export const config = {
  path: ['/api/transcriber/:action', '/api/transcriber/:action/:id'],
};
