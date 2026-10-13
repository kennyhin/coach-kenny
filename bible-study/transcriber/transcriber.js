import { apiOrigin } from './config.js';
import { downloadBody, downloadName, joinUtterance } from './text.js';

const TOKEN_KEY = 'ck-transcriber-token';
const DRAFT_KEY = 'ck-transcriber-draft-v1';
const CHUNK_MS = 12000;
const SILENCE_RMS = 0.005;

const gate = document.getElementById('gate');
const gateForm = document.getElementById('gate-form');
const pinInput = document.getElementById('pin');
const unlockBtn = document.getElementById('unlock');
const gateMsg = document.getElementById('gate-msg');
const app = document.getElementById('app');
const lockBtn = document.getElementById('lock-btn');
const titleInput = document.getElementById('title');
const listenBtn = document.getElementById('listen');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const meterBar = document.getElementById('meter-bar');
const wordsEl = document.getElementById('words');
const liveEl = document.getElementById('live');
const transcriptEl = document.getElementById('transcript');
const autosaveEl = document.getElementById('autosave');
const saveBtn = document.getElementById('save');
const copyBtn = document.getElementById('copy');
const downloadBtn = document.getElementById('download');
const clearBtn = document.getElementById('clear');
const saveMsg = document.getElementById('save-msg');
const savedEl = document.getElementById('saved');
const apiHelp = document.getElementById('api-help');
const browserNote = document.getElementById('browser-note');
const sink = document.getElementById('sink');

let token = '';
let listening = false;
let engine = '';
let source = '';
let serverStt = false;
let stream = null;
let currentStop = null;
let loopDone = Promise.resolve();
let chain = Promise.resolve();
let pending = 0;
let listenedMs = 0;
let runStarted = 0;
let timerId = 0;
let meterOn = false;
let audioCtx = null;
let wakeLock = null;
let speechRec = null;
let speechStop = null;
let savedId = '';
let draftTimer = 0;
let whisper = null;

const chromium = /Chrome|Chromium|Edg\//.test(navigator.userAgent);
if (!chromium) {
  browserNote.hidden = false;
  browserNote.textContent = 'Tab audio works in Chrome on a computer. Other browsers can still try the microphone.';
}

gateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  unlock(pinInput.value.trim());
});
lockBtn.addEventListener('click', lock);
listenBtn.addEventListener('click', () => { if (listening) stopListening(); else startListening(); });
saveBtn.addEventListener('click', saveTranscript);
copyBtn.addEventListener('click', () => copyText(transcriptEl.value));
downloadBtn.addEventListener('click', () => downloadText(titleInput.value, transcriptEl.value));
clearBtn.addEventListener('click', clearDraft);
titleInput.addEventListener('input', scheduleDraft);
transcriptEl.addEventListener('input', () => { updateWords(); scheduleDraft(); });
window.addEventListener('beforeunload', (event) => {
  if (!listening) return;
  event.preventDefault();
  event.returnValue = '';
});

restoreDraft();
renderApiHelp();
boot();

async function boot() {
  token = sessionStorage.getItem(TOKEN_KEY) || '';
  if (!token) {
    pinInput.focus();
    return;
  }
  gateMsg.textContent = 'Checking…';
  try {
    await loadConfig();
    showApp();
  } catch {
    token = '';
    sessionStorage.removeItem(TOKEN_KEY);
    gateMsg.textContent = '';
    pinInput.focus();
  }
}

async function unlock(pin) {
  unlockBtn.disabled = true;
  gateMsg.className = '';
  gateMsg.textContent = 'Checking…';
  try {
    const data = await api('/api/transcriber/session', { method: 'POST', json: { pin }, auth: false });
    token = data.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    pinInput.value = '';
    await loadConfig();
    showApp();
  } catch (err) {
    gateMsg.className = 'err';
    gateMsg.textContent = err.message || 'Could not unlock';
  } finally {
    unlockBtn.disabled = false;
  }
}

async function lock() {
  if (listening || runStarted) await stopListening();
  token = '';
  sessionStorage.removeItem(TOKEN_KEY);
  showGate();
}

function showApp() {
  gate.hidden = true;
  app.hidden = false;
  lockBtn.hidden = false;
  renderApiHelp();
  loadSaved();
  titleInput.focus();
}

function showGate() {
  app.hidden = true;
  lockBtn.hidden = true;
  gate.hidden = false;
  gateMsg.textContent = '';
  pinInput.focus();
}

async function loadConfig() {
  const cfg = await api('/api/transcriber/config');
  serverStt = Boolean(cfg.serverStt);
}

async function startListening() {
  if (listening) return;
  listenBtn.disabled = true;
  setStatus('In the share dialog, pick the tab or screen with the video and turn audio on.');
  try {
    const captured = await capture();
    stream = captured.stream;
    source = captured.source;
    engine = chooseEngine(source, stream);
    listening = true;
    runStarted = Date.now();
    listenBtn.dataset.state = 'on';
    listenBtn.textContent = 'Stop';
    listenBtn.setAttribute('aria-pressed', 'true');
    startTimer();
    await keepAwake();
    if (stream) startMeter(stream);
    setStatus(engine === 'whisper'
      ? 'Listening to the shared audio. The first time downloads a speech model (about 40 MB). Keep this tab in the foreground.'
      : engineStatus());
    if (engine === 'webspeech') startSpeech();
    else loopDone = recordLoop();
  } catch (err) {
    listening = false;
    runStarted = 0;
    releaseStream();
    listenBtn.dataset.state = '';
    listenBtn.textContent = 'Start';
    listenBtn.setAttribute('aria-pressed', 'false');
    setStatus(err.message || 'Could not start listening', true);
  } finally {
    listenBtn.disabled = false;
  }
}

let stopPromise = null;

async function stopListening() {
  if (stopPromise) return stopPromise;
  if (!listening && !runStarted) return;
  stopPromise = finishListening().finally(() => { stopPromise = null; });
  return stopPromise;
}

async function finishListening() {
  listening = false;
  if (currentStop) currentStop();
  if (speechStop) speechStop();
  listenBtn.disabled = true;
  setStatus('Finishing the last few seconds…');
  try {
    await loopDone;
    await chain;
  } catch { /* chunk errors are already shown */ }
  if (runStarted) {
    listenedMs += Date.now() - runStarted;
    runStarted = 0;
  }
  releaseStream();
  stopMeter();
  releaseWake();
  stopTimer();
  liveEl.textContent = '';
  listenBtn.dataset.state = '';
  listenBtn.textContent = 'Start';
  listenBtn.setAttribute('aria-pressed', 'false');
  listenBtn.disabled = false;
  setStatus('Stopped. This transcript stays in the browser until you tap Save.');
  scheduleDraft();
}

async function capture() {
  let displayError = null;
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    try {
      const shared = await shareDisplay();
      if (shared.getAudioTracks().length) return { stream: shared, source: 'tab' };
      shared.getTracks().forEach((track) => track.stop());
      setStatus('That share had no audio. Switching to the microphone.');
    } catch (err) {
      displayError = err;
      if (err && err.name !== 'NotAllowedError' && err.name !== 'AbortError' && err.name !== 'NotSupportedError') {
        setStatus('Could not share the tab. Trying the microphone.');
      }
    }
  }
  try {
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    return { stream: mic, source: 'mic' };
  } catch (err) {
    if (hasSpeech()) return { stream: null, source: 'mic' };
    const blocked = displayError && (displayError.name === 'NotAllowedError' || displayError.name === 'AbortError');
    if (blocked) throw new Error('Share was cancelled, and the microphone is blocked.');
    throw new Error('This browser could not open the microphone or share audio.');
  }
}

async function shareDisplay() {
  const attempts = [
    { video: true, audio: true, systemAudio: 'include', selfBrowserSurface: 'exclude' },
    { video: true, audio: true },
  ];
  let last;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (err) {
      last = err;
      if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError' || err.name === 'NotSupportedError')) throw err;
    }
  }
  throw last || new Error('Could not share audio');
}

function chooseEngine(kind, media) {
  if (serverStt && media) return 'server';
  if (kind === 'mic' && hasSpeech()) return 'webspeech';
  if (media && window.Worker) return 'whisper';
  if (hasSpeech()) return 'webspeech';
  throw new Error('This browser cannot transcribe audio. Use Chrome on a computer.');
}

function engineStatus() {
  if (engine === 'server' && source === 'tab') return 'Listening to the shared audio. Text arrives every few seconds.';
  if (engine === 'server') return 'Listening to the microphone. Text arrives every few seconds.';
  if (engine === 'webspeech') return 'Listening with Chrome live captions on the microphone. Keep this tab open.';
  return 'Listening to the shared audio in this browser. Keep this tab in the foreground.';
}

function hasSpeech() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

async function recordLoop() {
  const mime = pickMime();
  const audioTracks = stream ? stream.getAudioTracks() : [];
  const onEnded = () => { if (listening) stopListening(); };
  audioTracks.forEach((track) => track.addEventListener('ended', onEnded));
  try {
    while (listening && stream) {
      const blob = await recordOne(stream, mime, CHUNK_MS);
      if (blob && blob.size >= 800) enqueue(blob);
    }
  } finally {
    audioTracks.forEach((track) => track.removeEventListener('ended', onEnded));
  }
}

function recordOne(media, mime, ms) {
  return new Promise((resolve, reject) => {
    let rec;
    try {
      rec = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
    } catch (err) {
      reject(err);
      return;
    }
    const parts = [];
    const finish = () => resolve(new Blob(parts, { type: rec.mimeType || mime || 'audio/webm' }));
    rec.ondataavailable = (event) => { if (event.data && event.data.size) parts.push(event.data); };
    rec.onerror = finish;
    rec.onstop = finish;
    rec.start();
    const timer = setTimeout(() => halt(), ms);
    const halt = () => {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
    };
    currentStop = halt;
    sink.srcObject = media;
    sink.play().catch(() => {});
  });
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (!window.MediaRecorder) return '';
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function enqueue(blob) {
  pending += 1;
  refreshPending();
  chain = chain.then(() => transcribeChunk(blob)).catch((err) => {
    setStatus(err.message || 'A piece of audio failed', true);
    commit('[gap]');
  }).finally(() => {
    pending -= 1;
    refreshPending();
  });
}

async function transcribeChunk(blob) {
  const audio = await decodeTo16k(blob);
  if (!audio || rms(audio) < SILENCE_RMS) return;
  if (engine === 'server') {
    const body = new FormData();
    body.append('audio', blob, 'chunk.webm');
    const data = await api('/api/transcriber/transcribe', { method: 'POST', body });
    commit(data.text || '');
    return;
  }
  setStatus('Transcribing the last few seconds…');
  const text = await whisperText(audio);
  commit(filterWhisper(text));
  if (listening && pending <= 1) setStatus(engineStatus());
}

async function decodeTo16k(blob) {
  const bytes = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    const length = Math.max(1, Math.ceil(decoded.duration * 16000));
    const offline = new OfflineAudioContext(1, length, 16000);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice(0);
  } catch {
    return null;
  } finally {
    ctx.close();
  }
}

function rms(samples) {
  let sum = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(samples.length / 8000));
  for (let i = 0; i < samples.length; i += step) {
    sum += samples[i] * samples[i];
    count += 1;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

function filterWhisper(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const key = clean.toLowerCase().replace(/[.!?,]/g, '');
  const junk = new Set([
    'thank you',
    'thanks for watching',
    'thanks for watching',
    'you',
    'bye',
    'subtitles by the amaraorg community',
    'music',
    '[music]',
    '[applause]',
  ]);
  if (!clean || junk.has(key)) return '';
  return clean;
}

function whisperText(audio) {
  return ensureWhisper().then((engineApi) => engineApi.transcribe(audio));
}

function ensureWhisper() {
  if (whisper) return whisper;
  whisper = new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./whisper-worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    const pendingJobs = new Map();
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('The speech model took too long to download. Check the connection and tap Start again.'));
    }, 180000);
    worker.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'progress') {
        const pct = progressPercent(msg.progress);
        if (pct != null) setStatus('Downloading speech model… ' + pct + '%');
        return;
      }
      if (msg.type === 'ready') {
        clearTimeout(timer);
        setStatus('Speech model is ready. Transcribing…');
        return;
      }
      if (msg.type === 'result' || msg.type === 'error') {
        const job = pendingJobs.get(msg.id);
        if (!job) return;
        pendingJobs.delete(msg.id);
        if (msg.type === 'error') job.reject(new Error(msg.message || 'Speech model failed'));
        else job.resolve(msg.text || '');
      }
    };
    worker.onerror = () => {
      clearTimeout(timer);
      reject(new Error('The in-browser speech model could not start.'));
    };
    resolve({
      transcribe(audio) {
        const id = Math.random().toString(36).slice(2);
        return new Promise((res, rej) => {
          pendingJobs.set(id, { resolve: res, reject: rej });
          const copy = audio.slice(0);
          worker.postMessage({ type: 'transcribe', id, audio: copy }, [copy.buffer]);
        });
      },
    });
  });
  whisper.catch(() => { whisper = null; });
  return whisper;
}

function progressPercent(progress) {
  if (!progress) return null;
  if (typeof progress.progress === 'number') return Math.round(progress.progress);
  if (typeof progress === 'number') return Math.round(progress <= 1 ? progress * 100 : progress);
  return null;
}

function startSpeech() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new Rec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  let backoff = 300;
  let failed = false;
  let restartTimer = 0;
  rec.onresult = (event) => {
    backoff = 300;
    let interim = '';
    let finals = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) finals += piece;
      else interim += piece;
    }
    if (finals) commit(finals);
    liveEl.textContent = interim.trim();
  };
  rec.onerror = (event) => {
    const code = event.error || '';
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      listening = false;
      setStatus('Microphone permission was blocked.', true);
      return;
    }
    if (code !== 'no-speech' && code !== 'aborted') failed = true;
  };
  rec.onend = () => {
    if (!listening) return;
    const wait = failed ? backoff : 200;
    if (failed) backoff = Math.min(backoff * 2, 10000);
    failed = false;
    restartTimer = setTimeout(() => {
      if (!listening) return;
      try { rec.start(); } catch { /* already started */ }
    }, wait);
  };
  speechRec = rec;
  try { rec.start(); } catch (err) { throw new Error(err.message || 'Live captions could not start'); }
  speechStop = () => {
    clearTimeout(restartTimer);
    try { rec.onend = null; rec.stop(); } catch { /* already stopped */ }
  };
}

function commit(addition) {
  const next = joinUtterance(transcriptEl.value, addition, elapsed());
  if (next === transcriptEl.value) return;
  const follow = transcriptEl.scrollHeight - transcriptEl.scrollTop - transcriptEl.clientHeight < 120;
  transcriptEl.value = next;
  if (follow) transcriptEl.scrollTop = transcriptEl.scrollHeight;
  updateWords();
  scheduleDraft();
}

function elapsed() {
  return listenedMs + (runStarted ? Date.now() - runStarted : 0);
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => { timerEl.textContent = formatElapsed(elapsed()); }, 500);
  timerEl.textContent = formatElapsed(elapsed());
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = 0;
  timerEl.textContent = formatElapsed(elapsed());
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : mm + ':' + ss;
}

function startMeter(media) {
  stopMeter();
  const ctx = new AudioContext();
  audioCtx = ctx;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  ctx.createMediaStreamSource(media).connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  meterOn = true;
  const tick = () => {
    if (!meterOn) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const level = Math.min(100, Math.sqrt(sum / data.length) * 220);
    meterBar.style.width = level + '%';
    requestAnimationFrame(tick);
  };
  ctx.resume().then(tick).catch(() => {});
}

function stopMeter() {
  meterOn = false;
  meterBar.style.width = '0%';
  if (audioCtx) audioCtx.close().catch(() => {});
  audioCtx = null;
}

async function keepAwake() {
  if (!navigator.wakeLock) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
  document.addEventListener('visibilitychange', rewake);
}

async function rewake() {
  if (document.visibilityState === 'visible' && listening && navigator.wakeLock) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
  }
}

function releaseWake() {
  document.removeEventListener('visibilitychange', rewake);
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}

function releaseStream() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  sink.srcObject = null;
  currentStop = null;
  speechStop = null;
  speechRec = null;
}

function refreshPending() {
  if (!listening) return;
  if (pending > 1) setStatus(engineStatus() + ' ' + pending + ' pieces still transcribing.');
  else if (pending === 0) setStatus(engineStatus());
}

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = isError ? 'status err' : 'status';
}

function updateWords() {
  const text = transcriptEl.value.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordsEl.textContent = count + (count === 1 ? ' word' : ' words');
}

function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 400);
}

function saveDraft() {
  const payload = {
    title: titleInput.value,
    text: transcriptEl.value,
    id: savedId,
    listenedMs,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    autosaveEl.textContent = transcriptEl.value ? 'Saved in this browser just now.' : '';
  } catch {
    autosaveEl.textContent = 'This browser could not store the draft.';
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return;
    if (draft.title) titleInput.value = draft.title;
    if (draft.text) transcriptEl.value = draft.text;
    if (draft.id) savedId = draft.id;
    if (draft.listenedMs) listenedMs = draft.listenedMs;
    updateWords();
    timerEl.textContent = formatElapsed(elapsed());
    if (draft.text) {
      const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'earlier';
      autosaveEl.textContent = 'Restored unsaved work from this browser (' + when + ').';
    }
  } catch { /* ignore a broken draft */ }
}

async function clearDraft() {
  if (transcriptEl.value && !confirm('Clear the transcript on screen? Saved copies stay in the list.')) return;
  if (listening || runStarted) await stopListening();
  transcriptEl.value = '';
  savedId = '';
  listenedMs = 0;
  liveEl.textContent = '';
  updateWords();
  timerEl.textContent = '0:00';
  saveMsg.textContent = '';
  saveDraft();
  autosaveEl.textContent = 'Cleared.';
}

async function saveTranscript() {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    setSave('Add a title first.', true);
    return;
  }
  if (!transcriptEl.value.trim()) {
    setSave('Nothing to save yet.', true);
    return;
  }
  saveBtn.disabled = true;
  setSave('Saving…');
  try {
    const data = await api('/api/transcriber/transcripts', {
      method: 'POST',
      json: { title, text: transcriptEl.value, id: savedId || undefined },
    });
    savedId = data.id;
    saveDraft();
    setSave('Saved.');
    await loadSaved();
  } catch (err) {
    setSave(err.message || 'Could not save', true);
  } finally {
    saveBtn.disabled = false;
  }
}

function setSave(text, isError) {
  saveMsg.textContent = text;
  saveMsg.className = isError ? 'status err' : 'status';
}

async function loadSaved() {
  savedEl.textContent = 'Loading…';
  try {
    const data = await api('/api/transcriber/transcripts');
    renderSaved(data.transcripts || []);
  } catch (err) {
    savedEl.textContent = '';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = err.message || 'Could not load saved transcripts';
    savedEl.appendChild(p);
  }
}

function renderSaved(items) {
  savedEl.textContent = '';
  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No saved transcripts yet.';
    savedEl.appendChild(p);
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'item';
    const h = document.createElement('h3');
    h.textContent = item.title;
    const p = document.createElement('p');
    const when = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    p.textContent = when + (item.characters ? ' · ' + item.characters.toLocaleString() + ' characters' : '');
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      actionButton('Copy', () => withFull(item.id, (doc) => copyText(doc.text))),
      actionButton('Download', () => withFull(item.id, (doc) => downloadText(doc.title, doc.text, doc.createdAt))),
      actionButton('Delete', () => removeSaved(item), 'danger'),
    );
    card.append(h, p, row);
    savedEl.appendChild(card);
  });
}

function actionButton(label, onClick, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', onClick);
  return button;
}

async function withFull(id, fn) {
  try {
    const doc = await api('/api/transcriber/transcripts/' + id);
    await fn(doc);
  } catch (err) {
    setSave(err.message || 'Could not open that transcript', true);
  }
}

async function removeSaved(item) {
  if (!confirm('Delete “' + item.title + '”?')) return;
  try {
    await api('/api/transcriber/transcripts/' + item.id, { method: 'DELETE' });
    if (savedId === item.id) savedId = '';
    await loadSaved();
  } catch (err) {
    setSave(err.message || 'Could not delete', true);
  }
}

async function copyText(text) {
  const value = String(text || '');
  if (!value.trim()) {
    setSave('Nothing to copy yet.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    setSave('Copied.');
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    setSave('Copied.');
  }
}

function downloadText(title, text, when) {
  const value = String(text || '');
  if (!value.trim()) {
    setSave('Nothing to download yet.', true);
    return;
  }
  const blob = new Blob([downloadBody(title, value, when || new Date().toISOString())], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = downloadName(title);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function renderApiHelp() {
  const base = (apiOrigin() || location.origin).replace(/\/$/, '');
  apiHelp.textContent = [
    'GET ' + base + '/api/transcriber/transcripts',
    'GET ' + base + '/api/transcriber/transcripts?full=1',
    'GET ' + base + '/api/transcriber/transcripts/{id}',
    'Header: X-Transcriber-Pin: <pin>',
  ].join('\n');
}

async function api(path, opts) {
  const options = opts || {};
  const headers = new Headers(options.headers || {});
  if (options.auth !== false && token) headers.set('Authorization', 'Bearer ' + token);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }
  let res;
  try {
    res = await fetch(apiOrigin() + path, { method: options.method || 'GET', headers, body });
  } catch {
    throw new Error('Could not reach the transcriber API.');
  }
  const type = res.headers.get('content-type') || '';
  let data = null;
  if (type.includes('json')) data = await res.json();
  else {
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(raw.trim().startsWith('<') || res.status === 404
        ? 'The transcriber API is not running on this host. It needs Vercel (Blob + TRANSCRIBER_PIN) or Netlify.'
        : raw.slice(0, 180));
    }
  }
  if (res.status === 401) throw new Error('Wrong PIN');
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
}
