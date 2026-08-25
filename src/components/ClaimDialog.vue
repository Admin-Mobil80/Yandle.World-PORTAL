<script setup>
import { currentHost } from '../lib/host.js';
import { computed, ref, watch } from 'vue';
import { api } from '../lib/api.js';
import LocationField from './LocationField.vue';
import { getSession } from '../lib/auth.js';
import { guessCountry, countryOptions, splitE164, flagFor, DIAL_CODES } from '../lib/dialcode.js';

const props = defineProps({
  modelValue: Boolean,
  handle: { type: String, default: '' },
  tier: { type: Object, default: null },
  /**
   * Existing profile. Its presence is what puts the dialog in edit mode:
   * the fields prefill and submitting saves without reserving, because the
   * Yandle is already theirs.
   */
  profile: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'claimed', 'saved']);

const editing = computed(() => Boolean(props.profile));

const name = ref('');
const description = ref('');
const websiteUrl = ref('');
const whatsapp = ref('');
// Read-only, and pinned to the signed-in account rather than stored per
// profile. A contact address that can be typed freely is one that can be
// typed wrong — and an Email button pointing at a typo is worse than no
// button, because it looks like it works.
const email = computed(() => getSession()?.email ?? '');
const logoUrl = ref('');
const logoBusy = ref(false);
const pendingLogo = ref(null);
const logoInput = ref(null);
const logoError = ref(null);
const countries = countryOptions();
const country = ref(guessCountry() ?? 'IN');
// The national part only. The dial code lives in the dropdown beside it, so
// nobody has to remember whether to type the +, the 0, or both.
const waNational = ref('');
const waE164 = computed(() => {
  const digits = waNational.value.replace(/\D/g, '').replace(/^0+/, '');
  return digits ? `+${DIAL_CODES[country.value] ?? ''}${digits}` : '';
});
const location = ref(null);
// Validation waits for blur. Judging a URL after one keystroke tells someone
// their half-typed address is wrong, which it obviously is — they are still
// typing it.
const urlTouched = ref(false);
const busy = ref(false);
const error = ref(null);

watch(() => props.modelValue, (open) => {
  if (open) {
    error.value = null;
    urlTouched.value = false;
    pendingLogo.value = null;
    logoError.value = null;
    if (props.profile) {
      const p = props.profile;
      name.value = p.displayName ?? '';
      description.value = p.description ?? p.tagline ?? '';
      websiteUrl.value = p.websiteUrl ?? '';
      whatsapp.value = p.whatsapp ?? '';
      logoUrl.value = p.logoUrl ?? '';
      location.value = p.location ?? null;
      const split = splitE164(p.whatsapp);
      if (split.iso) country.value = split.iso;
      waNational.value = split.national ?? '';
    }
    // Their sign-in address is almost always the one they want on the card,
    // so offer it rather than making them retype it. Editable — plenty of
    // owners publish a contact@ that is not the account they signed up with.
    // Their own number is not readable by any browser, so the most we can do
    // is fill the country code and let OS autofill offer the rest.

  }
});

const nameValid = computed(() => name.value.trim().length > 0 && name.value.length <= 60);
// Mirrors LIMITS.descriptionChars on the server. The server is the authority;
// this only stops someone reaching Reserve and being rejected there.
const DESC_MAX = 200;
const descValid = computed(() => description.value.length <= DESC_MAX);
// Mirrors the server: a bare domain is fine, dangerous schemes are not.
const urlValid = computed(() => {
  const v = websiteUrl.value.trim();
  if (!v) return true;
  const scheme = v.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return false;
  const host = v.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  return host.includes('.') && !host.endsWith('.');
});
// E.164 — wa.me accepts nothing else, and a bad number fails silently.
// Empty is fine — WhatsApp is optional. Anything typed has to survive E.164.
const waValid = computed(() => !waE164.value || /^\+[1-9]\d{7,14}$/.test(waE164.value));
const canSubmit = computed(() =>
  nameValid.value && descValid.value && urlValid.value && waValid.value
  && !busy.value && !logoBusy.value);

/**
 * Reads the picked file, downscales it in the browser, and sends it up.
 *
 * Downscaling here rather than server-side is what makes the 200 KB cap
 * livable: a phone camera shot is 3-6 MB and would be rejected outright,
 * which reads as "your logo is not allowed" rather than "too big".
 */
async function pickLogo(files) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return;
  logoError.value = null;
  logoBusy.value = true;
  try {
    const dataUrl = await downscale(file, 400);
    if (editing.value) {
      // Already theirs, so it can go straight up.
      logoUrl.value = (await api.uploadLogo(props.handle, dataUrl)).url;
      pendingLogo.value = null;
    } else {
      // Not reserved yet — the server would reject the upload as belonging to
      // nobody. Hold it and send it the moment the reservation lands.
      pendingLogo.value = dataUrl;
      logoUrl.value = dataUrl;   // data URL previews just as well as an https one
    }
  } catch (err) {
    logoError.value = err.message;
  } finally {
    logoBusy.value = false;
  }
}

/** Fit inside `max` px, re-encode as PNG (or JPEG if that lands smaller). */
function downscale(file, max) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      return reject(new Error('Logo must be a PNG, JPEG or WEBP image.'));
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL('image/png');
      const jpg = canvas.toDataURL('image/jpeg', 0.85);
      resolve(png.length <= jpg.length ? png : jpg);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a readable image.')); };
    img.src = url;
  });
}

async function claim() {
  busy.value = true; error.value = null;
  try {
    // Reserve first — but only when claiming. Re-reserving a Yandle the
    // account already owns would be rejected, so an edit must skip straight
    // to the save.
    //
    // If the profile save fails the hold still stands, so a new handle is not
    // lost to someone else while the form is corrected.
    if (!editing.value) await api.reserve(props.handle);

    // The logo could not be uploaded before the reservation existed, so it
    // goes up now — between reserve and setProfile, so the profile save
    // carries the real https URL rather than a data URL.
    if (pendingLogo.value) {
      try {
        logoUrl.value = (await api.uploadLogo(props.handle, pendingLogo.value)).url;
        pendingLogo.value = null;
      } catch (err) {
        // A failed logo must not cost them the Yandle they just reserved.
        logoError.value = `Logo could not be saved: ${err.message}`;
        logoUrl.value = '';
      }
    }

    await api.setProfile(props.handle, {
      displayName: name.value.trim(),
      description: description.value.trim() || undefined,
      websiteUrl: websiteUrl.value.trim() || undefined,
      // A bare "+91" is the placeholder we put there, not a number they
      // gave us. Saving it would render a WhatsApp button that opens to
      // nothing.
      whatsapp: waE164.value || undefined,
      logoUrl: logoUrl.value || undefined,
      email: email.value.trim() || undefined,
      location: location.value
        ? { label: location.value.label, lat: location.value.lat, lon: location.value.lon }
        : undefined,
      // Preserved rather than reset: the dialog does not edit action links,
      // and sending [] would silently wipe any the owner already has.
      actions: props.profile?.actions ?? [],
    });
    emit(editing.value ? 'saved' : 'claimed', props.handle);
    emit('update:modelValue', false);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

const host = currentHost();
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" scrollable
            @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-5 px-6">
        <div class="text-h6">
          {{ editing ? 'Edit' : 'Claim' }} {{ host }}/{{ handle }}
        </div>
        <div v-if="editing" class="text-body-2 text-medium-emphasis mt-1">
          Changes go live on your page as soon as you save.
        </div>
        <div v-else-if="tier" class="text-body-2 text-medium-emphasis mt-1">
          Reserved for {{ tier.holdLabel }} — no payment now.
        </div>
      </v-card-title>

      <v-card-text class="px-6">
        <v-text-field
          v-model="name" label="Name" placeholder="Apex Coffee Roasters"
          variant="outlined" density="comfortable" counter="60"
          :error="!!name && !nameValid" class="mb-3" autofocus
        />
        <v-textarea
          v-model="description" label="Description" rows="6" auto-grow max-rows="14"
          placeholder="Who we are, what we do, how we work…"
          variant="outlined" density="comfortable" :counter="DESC_MAX"
          :error="!descValid" class="mb-3"
          hint="Line breaks are kept."
          persistent-hint
        />
        <v-text-field
          v-model="websiteUrl" label="Primary link" placeholder="instagram.com/yourbrand"
          variant="outlined" density="comfortable" class="mb-3"
          inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"
          :error="urlTouched && !urlValid"
          :error-messages="urlTouched && !urlValid ? 'That does not look like a link' : ''"
          @blur="urlTouched = true"
          hint="Your site, Instagram, YouTube, Linktree — wherever you want people to land. No need to type https://"
          persistent-hint
        />
        <LocationField v-model="location" class="mb-3" />
        <div class="d-flex ga-2 align-start">
          <v-autocomplete
            v-model="country"
            :items="countries"
            item-title="title"
            item-value="value"
            label="Country"
            variant="outlined"
            density="comfortable"
            class="country-select"
            auto-select-first
            hide-details
            :menu-props="{ maxHeight: 320 }"
          >
            <!-- Collapsed to flag + dial code: the country NAME would push
                 the number field off a narrow screen, and the flag already
                 says which country it is. -->
            <template #selection="{ item }">
              <span class="cc-sel">
                <span class="cc-flag">{{ item.raw.flag }}</span>
                <span>{{ item.raw.dial }}</span>
              </span>
            </template>
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="undefined">
                <template #prepend>
                  <span class="cc-flag mr-3">{{ item.raw.flag }}</span>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <template #append>
                  <span class="text-medium-emphasis text-body-2">{{ item.raw.dial }}</span>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <v-text-field
            v-model="waNational" label="WhatsApp" placeholder="9845012345"
            variant="outlined" density="comfortable" class="flex-grow-1"
            type="tel" inputmode="tel" autocomplete="tel" name="tel"
            :error="!waValid"
            :error-messages="!waValid ? 'That number does not look right' : ''"
            hint="Type or search a country, then the number without its code."
            persistent-hint
          />
        </div>
        <div class="field-block">
          <div class="text-caption text-medium-emphasis mb-2">Business logo</div>
          <div class="d-flex align-center ga-3">
            <v-avatar size="56" rounded="lg" :color="logoUrl ? undefined : 'grey-lighten-2'">
              <v-img v-if="logoUrl" :src="logoUrl" alt="Logo preview" contain />
              <v-icon v-else icon="mdi-image-outline" />
            </v-avatar>
            <div class="flex-grow-1">
              <v-btn
                variant="tonal" size="small" prepend-icon="mdi-camera-outline"
                :loading="logoBusy" @click="logoInput?.click()"
              >{{ logoUrl ? 'Change logo' : 'Upload logo' }}</v-btn>
              <v-btn
                v-if="logoUrl" variant="text" size="small" class="ml-1"
                @click="logoUrl = ''; pendingLogo = null"
              >Remove</v-btn>
              <div class="text-caption text-medium-emphasis mt-1">
                PNG, JPEG or WEBP — resized automatically.
              </div>
            </div>
          </div>
          <input
            ref="logoInput" type="file" class="d-none"
            accept="image/png,image/jpeg,image/webp"
            @change="pickLogo($event.target.files?.[0]); $event.target.value = ''"
          >
        </div>
        <v-alert v-if="logoError" type="error" variant="tonal" density="compact" class="mb-3">
          {{ logoError }}
        </v-alert>

        <!-- Greyed as well as readonly. `readonly` alone still renders as a
             live-looking field, so people try to type into it and nothing
             happens — which reads as broken rather than as fixed. -->
        <v-text-field
          :model-value="email" label="Contact email"
          variant="outlined" density="comfortable" class="mt-3 email-locked"
          readonly disabled
          prepend-inner-icon="mdi-lock-outline"
          hint="Your account email. Adds an Email button that opens the visitor's mail app."
          persistent-hint
        />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">{{ error }}</v-alert>
      </v-card-text>

      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" :loading="busy" @click="claim">
          {{ editing ? 'Save changes' : 'Reserve' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.field-block { margin: 0 0 1.25rem; }
/* Disabled fields dim their hint to near-invisible; the hint here is the bit
   that explains WHY it cannot be edited, so it stays readable. */
.email-locked :deep(.v-messages) { opacity: .85; }
.email-locked :deep(.v-field__input) { opacity: .75; }
.country-select { max-width: 11rem; min-width: 9.5rem; }
.cc-sel { display: inline-flex; align-items: center; gap: .4rem; white-space: nowrap; }
/* Flag glyphs render small next to Latin text; nudged up so the pair sits
   on one optical baseline. */
.cc-flag { font-size: 1.15rem; line-height: 1; }
</style>
