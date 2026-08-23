import { onUnmounted, ref, shallowRef } from 'vue';

/**
 * Web Speech wrapper for the microphone.
 *
 * Availability is genuinely uneven — Chrome and Safari implement
 * webkitSpeechRecognition, Firefox does not — so `supported` gates the button
 * and the keyboard path stays fully usable. Voice is never the only way in.
 */
export function useVoice(onResult) {
  const Recognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const supported = Boolean(Recognition);
  const listening = ref(false);
  const error = ref(null);
  const instance = shallowRef(null);

  function start() {
    if (!supported) {
      error.value = 'UNSUPPORTED';
      return;
    }
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
    instance.value?.stop();
    listening.value = false;
  }

  onUnmounted(() => instance.value?.abort());

  return { supported, listening, error, start, stop };
}
