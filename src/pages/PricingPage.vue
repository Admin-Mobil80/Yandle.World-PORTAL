<script setup>
import { computed, onMounted, ref } from 'vue';
import { formatPrice } from '../lib/parse.js';
import { loadConfig } from '../lib/config.js';
import { SEED } from '../lib/seed.js';
import LegalLayout from './LegalLayout.vue';

const config = ref(SEED);
onMounted(async () => { config.value = await loadConfig(); });

const tiers = computed(() =>
  Object.values(config.value.tiers).sort((a, b) => a.wordCount - b.wordCount));

const PACKS = [
  { id: '5 credits', price: 500, handles: 5 },
  { id: '12 credits', price: 1000, handles: 12 },
  { id: '30 credits', price: 2000, handles: 30 },
];
</script>

<template>
  <LegalLayout title="Pricing" subtitle="One payment. No renewals, no subscription.">
    <p>
      A Yandle handle is one to four words from a fixed list of
      {{ config.words.length }}. Shorter handles are scarcer, so they cost more.
      Every price below is a <strong>single one-time payment in US dollars</strong>.
      There is no recurring charge and nothing to cancel.
    </p>

    <v-table class="my-6">
      <thead>
        <tr><th>Handle</th><th>Example</th><th>Free hold</th><th>Own it forever</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in tiers" :key="t.wordCount">
          <td>{{ t.wordCount }} word{{ t.wordCount > 1 ? 's' : '' }}</td>
          <td><code>yandle.world/{{ ['gold','sharp-mind','sky-bird-lake','sky-bird-lake-gold'][t.wordCount - 1] }}</code></td>
          <td>{{ t.holdLabel }}</td>
          <td class="font-weight-medium">{{ formatPrice(t.buyoutCents) }}</td>
        </tr>
      </tbody>
    </v-table>

    <h2>Holding a handle before you buy</h2>
    <p>
      You can reserve any available handle free of charge for the period shown
      above. A hold costs nothing and requires no payment details — only a
      verified email address. If you do not buy it before the hold ends, the
      handle returns to the public pool and anyone else may claim it.
    </p>

    <h2>Four-word handles and credits</h2>
    <p>
      Four-word handles are $1 each, bought with credits rather than
      individually. Card networks charge a fixed fee on every transaction that
      would consume most of a one-dollar payment, so credits let a single
      payment cover several handles.
    </p>
    <v-table class="my-4" density="compact">
      <thead><tr><th>Pack</th><th>Price</th><th>Handles</th><th>Per handle</th></tr></thead>
      <tbody>
        <tr v-for="p in PACKS" :key="p.id">
          <td>{{ p.id }}</td><td>{{ formatPrice(p.price) }}</td>
          <td>{{ p.handles }}</td><td>{{ formatPrice(p.price / p.handles) }}</td>
        </tr>
      </tbody>
    </v-table>
    <p class="text-medium-emphasis">Credits do not expire and are not transferable between accounts.</p>

    <h2>What you get</h2>
    <ul>
      <li>The handle, for as long as the service operates, with no renewal fee.</li>
      <li>A redirect to any HTTPS address you choose, changeable at any time.</li>
      <li>Or a hosted profile page: logo, headline, a 160-character description and up to four action links.</li>
      <li>Click counts for your handle.</li>
    </ul>

    <h2>Tax</h2>
    <p>
      Prices are shown excluding tax. Any VAT, GST or sales tax due in your
      country is calculated and added at checkout by our payment provider,
      who is the seller of record for the transaction.
    </p>
  </LegalLayout>
</template>
