// Speech-to-text on this device: OpenAI's open Whisper model running in the browser with Transformers.js.
// Runs in a background worker so the page stays responsive. The model downloads once from Hugging Face,
// is cached by the browser, and after that works offline. Audio never leaves the device.
// Transformers.js (Apache-2.0), pinned to one version. The offline cache keeps a copy after the first use.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js';

env.allowLocalModels = false;
let asr = null, loaded = null;

async function pickDevice() {
  try { if (navigator.gpu && await navigator.gpu.requestAdapter()) return 'webgpu'; } catch {}
  return 'wasm';
}

self.onmessage = async e => {
  const { id, model, audio, language } = e.data;
  try {
    if (!asr || loaded !== model) {
      const device = await pickDevice();
      asr = await pipeline('automatic-speech-recognition', model, {
        device,
        dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
        progress_callback: p => self.postMessage({ id, type: 'progress', ...p }),
      });
      loaded = model;
    }
    self.postMessage({ id, type: 'working' });
    const out = await asr(audio, { language: language || null, task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ id, type: 'done', text: String(out?.text || '').trim() });
  } catch (err) {
    asr = null; loaded = null;
    self.postMessage({ id, type: 'error', message: String(err?.message || err) });
  }
};
