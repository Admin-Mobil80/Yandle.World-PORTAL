/**
 * Portal API client.
 *
 * Public reads (availability, config) need no token. Anything that touches a
 * handle goes through /api/command with the Cognito id token, and the Lambda
 * derives identity from that token alone — never from the body.
 */
import { getSession, signOut } from './auth.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function command(name, params = {}) {
  const session = getSession();
  if (!session) throw new ApiError('Sign in to continue.', 401);

  const res = await fetch('/api/command', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.idToken}` },
    body: JSON.stringify({ command: name, ...params }),
  }).catch(() => { throw new ApiError('Could not reach the API.', 0); });

  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* not our API */ }

  // A non-JSON 403 is S3 or a misroute, not an auth failure. Signing the user
  // out on it would be a confusing lie.
  if (body === null) {
    throw new ApiError(`The API did not respond as expected (HTTP ${res.status}).`, res.status);
  }
  if (res.status === 401 || res.status === 403) {
    signOut();
    throw new ApiError('Your session expired. Sign in again.', res.status);
  }
  if (typeof body === 'string') throw new ApiError(body, res.status);
  if (body.status !== 'SUCCESS') {
    throw new ApiError(body.status_message || body.error || `${name} failed`, res.status);
  }
  return body.data ?? {};
}

export const api = {
  availability: async (input) => {
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const body = await res.json();
    return body?.data ?? null;
  },
  reserve: (handle) => command('reserveHandle', { handle }),
  release: (handle) => command('releaseHandle', { handle }),
  myHandles: () => command('listMyHandles'),
  setProfile: (handle, profile) => command('setHandleProfile', { handle, profile }),
  setRedirect: (handle, target_url) => command('setHandleRedirect', { handle, target_url }),
  searchPlaces: (q) => command('searchPlaces', { q }),
  reverseGeocode: (lat, lon) => command('reverseGeocode', { lat, lon }),
};
