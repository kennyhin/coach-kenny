import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;

let asr = null;

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (!asr) {
      asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (progress) => self.postMessage({ type: 'progress', progress }),
      });
      self.postMessage({ type: 'ready' });
    }
    if (msg.type === 'transcribe') {
      const result = await asr(msg.audio, { language: 'english', task: 'transcribe' });
      self.postMessage({ type: 'result', id: msg.id, text: (result && result.text) || '' });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id: msg.id || '',
      message: err && err.message ? String(err.message) : 'Speech model failed',
    });
  }
};
