#!/usr/bin/env node
/**
 * Stamps dist/version.json with this build's identity.
 *
 * A SPA hands the browser a bundle and then never mentions it again, so
 * someone who leaves a tab open keeps using whatever shipped when they opened
 * it — through every deploy after. The app polls this file and offers a
 * reload when it changes.
 *
 * Keyed on the hashed asset filename rather than a timestamp, so rebuilding
 * identical code does NOT nag people to reload for nothing.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const assets = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .sort()
  .join('|');

const version = Buffer.from(assets).toString('base64url').slice(0, 24);
writeFileSync(join(dist, 'version.json'), JSON.stringify({ version, builtAt: new Date().toISOString() }) + '\n');
console.log(`version.json -> ${version}`);
