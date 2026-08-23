import { onUnmounted, ref, shallowRef } from 'vue';

/**
 * Web Speech wrapper for the microphone.
 *
 * Availability is genuinely uneven — Chrome and Safari implement
 * webkitSpeechRecognition, Firefox does not — so `supported` gates the button
 * and the keyboard path stays fully usable. Voice is never the only way in.
 */
export function useVoice(onResult, { transcribe } = {}) {
  const Recognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Web Speech where it exists (instant, free); recording + server
  // transcription everywhere else. MediaRecorder is supported essentially
  // universally, so voice now works in Firefox and in-app webviews too.
  const canRecord = typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
  const supported = Boolean(Recognition) || (canRecord && !!transcribe);
  const mode = Recognition ? 'live' : 'record';
  let recorder = null;
  let chunks = [];
  const listening = ref(false);
  const error = ref(null);
  const instance = shallowRef(null);

  async function startRecording() {
    error.value = null;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      error.value = 'MIC_DENIED';
      return;
    }

    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      // Release the mic immediately; a lingering recording indicator is
      // alarming and browsers keep it lit until every track is stopped.
      stream.getTracks().forEach((t) => t.stop());
      listening.value = false;
      if (!chunks.length) return;

      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      try {
        const transcript = await transcribe(blob);
        if (transcript) onResult({ transcript, alternatives: [transcript], isFinal: true });
        else error.value = 'NO_SPEECH';
      } catch {
        error.value = 'TRANSCRIBE_FAILED';
      }
    };
    recorder.start();
    listening.value = true;
    // Nobody says a four-word phrase for longer than this, and an open mic
    // that never stops is both a privacy problem and a cost one.
    setTimeout(() => { if (recorder?.state === 'recording') recorder.stop(); }, 6000);
  }

  function start() {
    if (!supported) {
      error.value = 'UNSUPPORTED';
      return;
    }
    if (!Recognition) return startRecording();
    error.value = null;

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    // Ask for alternatives so the caller can arbitrate the confusable pairs
    // (gold/cold, warm/worm) instead of committing to the top guess.
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const alternatives = Array.from(last, (alt) => alt.transcript);
      onResult({ transcript: alternatives[0] ?? '', alternatives, isFinal: last.isFinal });
    };
    recognition.onerror = (event) => {
      error.value = event.error ?? 'UNKNOWN';
      listening.value = false;
    };
    recognition.onend = () => { listening.value = false; };

    instance.value = recognition;
    recognition.start();
    listening.value = true;
  }

  function stop() {
    if (recorder?.state === 'recording') { recorder.stop(); return; }
    instance.value?.stop();
    listening.value = false;
  }

  onUnmounted(() => instance.value?.abort());

  return { supported, mode, listening, error, start, stop };
}
