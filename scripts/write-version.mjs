#!/usr/bin/env node
/**
 * Stamps dist/version.json with this build's identity and its release notes.
 *
 * A SPA hands the browser a bundle and never mentions it again, so a tab left
 * open keeps running whatever shipped when it opened — through every deploy
 * after. The app polls this file and offers a reload.
 *
 * Keyed on the hashed asset filename rather than a timestamp, so rebuilding
 * identical code does NOT nag people to reload for nothing.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_NOTES } from '../src/release-notes.js';

const dist = join(process.cwd(), 'dist');
const assets = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .sort()
  .join('|');

const version = Buffer.from(assets).toString('base64url').slice(0, 24);
const latest = RELEASE_NOTES[0] ?? null;

writeFileSync(join(dist, 'version.json'), JSON.stringify({
  version,
  builtAt: new Date().toISOString(),
  notes: latest ? { title: latest.title, items: latest.items } : null,
}) + '\n');

console.log(`version.json -> ${version}${latest ? ` (${latest.items.length} note(s))` : ''}`);
