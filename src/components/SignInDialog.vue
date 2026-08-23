<script setup>
import { computed, ref, watch } from 'vue';
import { requestCode, submitCode, configured } from '../lib/auth.js';

const props = defineProps({ modelValue: Boolean, reason: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'signed-in']);

const step = ref('email');
const email = ref('');
const code = ref('');
const challenge = ref(null);
const busy = ref(false);
const error = ref(null);

const emailValid = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()));
const codeValid = computed(() => /^\d{6}$/.test(code.value.trim()));

watch(() => props.modelValue, (open) => {
  if (open) { step.value = 'email'; code.value = ''; error.value = null; }
});

async function sendCode() {
  busy.value = true; error.value = null;
  try {
    challenge.value = await requestCode(email.value);
    step.value = 'code';
  } catch {
    // Never distinguish "no such user" — that turns this into an oracle for
    // whether an address has an account.
    error.value = 'Could not send a code to that address.';
  } finally { busy.value = false; }
}

async function verify() {
  busy.value = true; error.value = null;
  try {
    const result = await submitCode({
      session: challenge.value.session, email: challenge.value.email, code: code.value,
    });
    if (result.ok) { emit('signed-in', result.session); emit('update:modelValue', false); return; }
    challenge.value = { ...challenge.value, session: result.session };
    code.value = '';
    error.value = 'That code was not correct. Try again.';
  } catch {
    error.value = 'Too many attempts. Request a new code.';
    step.value = 'email';
  } finally { busy.value = false; }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-text class="pa-6">
        <h2 class="text-h6 mb-1">Sign in</h2>
        <p class="text-body-2 text-medium-emphasis mb-5">
          {{ reason || 'We send a six-digit code. No password needed.' }}
        </p>

        <v-alert v-if="!configured" type="warning" variant="tonal" density="compact" class="mb-4">
          Sign-in is not configured for this build.
        </v-alert>

        <template v-else-if="step === 'email'">
          <v-text-field
            v-model="email" label="Email" type="email" autocomplete="email"
            variant="outlined" density="comfortable" hide-details :disabled="busy"
            class="mb-4" autofocus @keyup.enter="emailValid && sendCode()"
          />
          <v-btn color="primary" block size="large" :disabled="!emailValid" :loading="busy" @click="sendCode">
            Email me a code
          </v-btn>
        </template>

        <template v-else>
          <p class="text-body-2 mb-4">Code sent to <strong>{{ challenge.maskedEmail }}</strong></p>
          <v-otp-input
            v-model="code" length="6" type="number" autofocus
            :disabled="busy" class="mb-4" @finish="verify"
          />
          <v-btn color="primary" block size="large" :disabled="!codeValid" :loading="busy" @click="verify">
            Continue
          </v-btn>
          <v-btn variant="text" size="small" block class="mt-2" :disabled="busy" @click="step = 'email'">
            Use a different email
          </v-btn>
        </template>

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">{{ error }}</v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
