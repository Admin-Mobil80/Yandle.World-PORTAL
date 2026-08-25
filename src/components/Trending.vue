<script setup>
import { currentHost } from '../lib/host.js';
import { computed, onMounted, ref } from 'vue';

/**
 * Ranked "most visited" board.
 *
 * A ranked list rather than a bag of chips: rank is the thing that makes a
 * leaderboard worth looking at twice, and it gives owners a reason to share
 * their handle. Rows are whole-card links so the tap target is the row, not a
 * word.
 */
const items = ref([]);
// Ten is what the landing page paints. The API sends up to a hundred, so the
// rest are one tap away rather than a second request — and nobody who paid
// for a Yandle is unreachable from the board.
const PREVIEW = 10;
const expanded = ref(false);
const stats = ref(null);
const emit = defineEmits(['stats']);

onMounted(async () => {
  try {
    const res = await fetch('/api/trending');
    const body = await res.json();
    items.value = body?.data?.items ?? [];
    stats.value = body?.data?.stats ?? null;
    emit('stats', stats.value);
  } catch {
    items.value = [];
  }
});

const shown = computed(() => (expanded.value ? items.value : items.value.slice(0, PREVIEW)));
const hidden = computed(() => Math.max(0, items.value.length - PREVIEW));

const n = (v) => (v ?? 0).toLocaleString();
const initials = (name, handle) => String(name || handle || '?')
  .split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const host = currentHost();
</script>

<template>
  <!-- Shown even when empty. Hiding it made the board invisible until
       somebody had already claimed and been visited — so nobody ever saw the
       thing that gives them a reason to claim one. An empty leaderboard with
       a first place going spare is the better invitation. -->
  <section class="board">
    <h2 class="title">Most visited <span class="scope">(amongst claimed Yandles only)</span></h2>

    <div v-if="!items.length" class="empty">
      <div class="empty-rank">#1</div>
      <div>
        <p class="empty-title">This spot is open</p>
        <p class="empty-sub">
          Claimed Yandles are ranked here by how many people visit them.
          Nobody is on the board yet.
        </p>
      </div>
    </div>

    <a
      v-for="(t, i) in shown" :key="t.handle"
      :href="`/${t.handle}`" class="row" :class="{ top: i === 0 }"
    >
      <span class="rank" :class="`r${i + 1}`">#{{ i + 1 }}</span>

      <img v-if="t.logo" :src="t.logo" :alt="t.name || t.handle" class="avatar">
      <span v-else class="avatar ph">{{ initials(t.name, t.handle) }}</span>

      <span class="body">
        <span class="name">{{ t.name || t.handle }}</span>
        <span class="handle">{{ host }}/{{ t.handle }}</span>
        <span v-if="t.description" class="desc">{{ t.description }}</span>
        <span v-if="t.location" class="loc">{{ t.location }}</span>
      </span>

      <span class="clicks"><strong>{{ n(t.clicks) }}</strong><span class="lbl">visits</span></span>
    </a>

    <div v-if="hidden" class="text-center mt-2">
      <v-btn variant="text" size="small"
             :prepend-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
             @click="expanded = !expanded">
        {{ expanded ? 'Show top 10' : `Show all ${items.length}` }}
      </v-btn>
    </div>
  </section>
</template>

<style scoped>
.empty {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.1rem 1rem; border: 1px dashed rgba(128, 128, 128, .4);
  border-radius: 14px;
}
.empty-rank {
  flex: none; width: 2.2rem; height: 2.2rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(128, 128, 128, .12); color: rgb(var(--v-theme-primary));
  font-weight: 700; font-size: .82rem;
}
.empty-title { margin: 0; font-weight: 600; font-size: .95rem; }
.empty-sub { margin: .15rem 0 0; font-size: .82rem; opacity: .7; line-height: 1.45; }

.scope { font-weight: 400; text-transform: none; letter-spacing: 0; opacity: .7; }

.board { margin-top: 3rem; }
.title {
  font-size: .75rem; text-transform: uppercase; letter-spacing: .08em;
  opacity: .55; font-weight: 600; text-align: center; margin: 0 0 .9rem;
}
.row {
  display: flex; align-items: center; gap: .8rem;
  padding: .8rem .9rem; margin-bottom: .5rem;
  border: 1px solid rgba(128,128,128,.22); border-radius: 14px;
  text-decoration: none; color: inherit; transition: border-color .15s, transform .15s;
}
.row:hover { border-color: rgb(var(--v-theme-primary)); transform: translateY(-1px); }
/* Only the leader gets tinted — tint everything and nothing stands out. */
.row.top { background: rgba(180,69,31,.06); border-color: rgba(180,69,31,.3); }

.rank {
  flex: 0 0 auto; font-size: .72rem; font-weight: 700;
  padding: .15rem .45rem; border-radius: 999px;
  background: rgba(128,128,128,.15); font-variant-numeric: tabular-nums;
}
.rank.r1 { background: rgb(var(--v-theme-primary)); color: #fff; }

.avatar {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; object-fit: cover;
  border: 1px solid rgba(128,128,128,.2);
}
.avatar.ph {
  display: flex; align-items: center; justify-content: center;
  background: rgba(128,128,128,.12); font-weight: 700; font-size: .82rem; letter-spacing: -.01em;
}

.body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.name { font-weight: 600; font-size: .95rem; line-height: 1.25; }
.handle { font-size: .74rem; opacity: .55; }
.desc {
  font-size: .82rem; opacity: .8; margin-top: .2rem;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.loc { font-size: .72rem; opacity: .5; margin-top: .15rem; }

.clicks { flex: 0 0 auto; text-align: right; line-height: 1.15; }
.clicks strong { display: block; font-size: 1rem; font-variant-numeric: tabular-nums; }
.clicks .lbl { font-size: .68rem; opacity: .5; }
</style>
