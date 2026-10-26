// Turning recordings into text, two free ways:
//   on this device (Whisper in the browser, private, works offline after one download), or
//   with the Heirloom server (Whisper on Cloudflare Workers AI, free daily allowance).
'use strict';

const STT_MODELS = {
  base: { id: 'onnx-community/whisper-base', label: 'Quick', size: 'about 80 MB' },
  small: { id: 'onnx-community/whisper-small', label: 'More accurate', size: 'about 250 MB' },
};
// Whisper names languages in English words.
const WHISPER_LANG = { en: 'english', te: 'telugu', hi: 'hindi', es: 'spanish', ta: 'tamil', kn: 'kannada', bn: 'bengali', gu: 'gujarati', ur: 'urdu', zh: 'chinese', vi: 'vietnamese' };
const sttSupported = () => typeof Worker !== 'undefined' && typeof OfflineAudioContext !== 'undefined';

// Decode any recording the browser can play and resample it to 16 kHz mono, which Whisper expects.
async function decodeTo16k(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  let audio;
  try { audio = await ctx.decodeAudioData(await blob.arrayBuffer()); } finally { ctx.close?.(); }
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = audio; src.connect(off.destination); src.start();
  return (await off.startRendering()).getChannelData(0);
}
// 16-bit PCM WAV, the safest format to send to a speech service.
function wavBlob(samples, rate = 16000) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}

let STT_WORKER = null;
const STT_JOBS = new Map();
function sttWorker() {
  if (STT_WORKER) return STT_WORKER;
  STT_WORKER = new Worker('js/stt-worker.js', { type: 'module' });
  STT_WORKER.onmessage = e => {
    const job = STT_JOBS.get(e.data.id);
    if (!job) return;
    if (e.data.type === 'done') { STT_JOBS.delete(e.data.id); job.resolve(e.data.text); }
    else if (e.data.type === 'error') { STT_JOBS.delete(e.data.id); job.reject(new Error(e.data.message)); }
    else job.onProgress?.(e.data);
  };
  STT_WORKER.onerror = e => {
    for (const j of STT_JOBS.values()) j.reject(new Error(e.message || 'The speech model could not start.'));
    STT_JOBS.clear(); STT_WORKER = null;
  };
  return STT_WORKER;
}
// Download progress across all of the model's files, as one percentage.
function progressTracker(onText) {
  const files = new Map();
  return p => {
    if (p.type === 'working') return onText('Listening to the recording…');
    if (p.file && p.total) files.set(p.file, [p.loaded || 0, p.total]);
    const [got, all] = [...files.values()].reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
    if (p.status === 'progress' && all) onText(`Downloading the speech model (one time only)… ${Math.round(got / all * 100)}%`);
    else if (p.status === 'ready') onText('Speech model ready. Listening…');
  };
}
async function transcribeOnDevice(blob, lang, modelKey, onText) {
  const audio = await decodeTo16k(blob);
  const id = uid('stt');
  return new Promise((resolve, reject) => {
    STT_JOBS.set(id, { resolve, reject, onProgress: progressTracker(onText) });
    sttWorker().postMessage({ id, model: (STT_MODELS[modelKey] || STT_MODELS.base).id, audio, language: WHISPER_LANG[lang] || null }, [audio.buffer]);
  });
}
async function transcribeWithServer(blob, lang) { return serverTranscribe(wavBlob(await decodeTo16k(blob)), lang); }

function sttChooserHTML(clipId) {
  const mode = S.sttMode || 'device', model = S.sttModel || 'base';
  return `<h2>Turn recordings into text</h2>
    <p class="small muted">Both ways are free. Pick one; you can change it later from the menu.</p>
    <div class="choice-list">
      <label class="choice ${mode === 'device' ? 'on' : ''}"><input type="radio" name="stt-mode" value="device" data-stt-mode ${mode === 'device' ? 'checked' : ''}>
        <span><b>On this phone</b> · private, works offline<br><span class="small muted">Nothing leaves your device. The first time, it downloads a speech model and keeps it for next time. Slower on older phones.</span></span></label>
      ${mode === 'device' ? `<div class="pills sub">${Object.entries(STT_MODELS).map(([k, m]) => `<button class="pill-btn" data-action="stt-model" data-model="${k}" aria-pressed="${model === k}">${m.label} · ${m.size}</button>`).join('')}</div>
        <p class="small muted sub">"More accurate" is better for Telugu, Tamil and other languages besides English, Spanish and Hindi.</p>` : ''}
      ${cloudOn() ? `<label class="choice ${mode === 'server' ? 'on' : ''}"><input type="radio" name="stt-mode" value="server" data-stt-mode ${mode === 'server' ? 'checked' : ''}>
        <span><b>With the Heirloom server</b> · fast on any phone<br><span class="small muted">The recording goes to the server and Cloudflare's speech service and is not stored. There is a free daily limit.</span></span></label>` : ''}
    </div>
    <div class="row"><button class="btn primary" data-action="stt-save" data-clip="${clipId || ''}">${clipId ? 'Turn into text' : 'Save'}</button><button class="btn" data-action="m-close">Cancel</button></div>`;
}
