/**
 * Cognito custom auth (email + one-time code) for the portal.
 *
 * The same mechanism the BMS uses. No passwords anywhere in the platform:
 * nothing to leak, nothing to reset, nothing to phish, and no password field
 * in our own markup for an XSS to read.
 *
 * Talks to the Cognito IDP JSON API directly rather than pulling in the AWS
 * SDK. InitiateAuth and RespondToAuthChallenge are unauthenticated endpoints
 * that need no request signing, so the SDK would add ~200KB to the bundle to
 * do what two fetches already do.
 *
 * Authorisation is NOT decided here. This proves who you are; the `staff`
 * group claim gates the UI, and every admin command re-checks membership
 * server-side. Editing the token in devtools gets you a prettier screen and
 * exactly zero extra access.
 */

const REGION = import.meta.env.VITE_COGNITO_REGION || 'us-east-1';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

const STORE = 'yandle.portal.session';


export const configured = Boolean(CLIENT_ID);

async function idp(target, body) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-amz-json-1.1',
            'x-amz-target': `AWSCognitoIdentityProviderService.${target}`,
        },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `${target} failed`);
    return json;
}

/** Step 1: ask Cognito to send a code. Returns an opaque session to carry back. */
export async function requestCode(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) throw new Error('Enter your email address.');

    const result = await idp('InitiateAuth', {
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: normalized },
    });

    return {
        session: result.Session,
        email: normalized,
        // Cognito's own masked address, so the UI can say where it went
        // without us re-deriving it.
        maskedEmail: result.ChallengeParameters?.email || normalized,
        expiresMinutes: Number(result.ChallengeParameters?.expiresMinutes || 10),
    };
}

/** Step 2: submit the code. Three wrong answers and Cognito kills the session. */
export async function submitCode({ session, email, code }) {
    const result = await idp('RespondToAuthChallenge', {
        ChallengeName: 'CUSTOM_CHALLENGE',
        ClientId: CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: email, ANSWER: String(code || '').trim() },
    });

    if (!result.AuthenticationResult) {
        // Cognito hands back a fresh session for the next attempt rather than
        // an error, so a wrong code is a retry, not a restart.
        return { ok: false, session: result.Session, error: 'INCORRECT_CODE' };
    }

    const tokens = result.AuthenticationResult;
    const claims = decodeJwt(tokens.IdToken);
    const stored = {
        idToken: tokens.IdToken,
        accessToken: tokens.AccessToken,
        expiresAt: Date.now() + (tokens.ExpiresIn ?? 3600) * 1000,
        email: claims?.email ?? email,
        sub: claims?.sub ?? null,
        groups: claims?.['cognito:groups'] ?? [],
    };
    sessionStorage.setItem(STORE, JSON.stringify(stored));
    return { ok: true, session: stored };
}

export function getSession() {
    try {
        const raw = sessionStorage.getItem(STORE);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session.expiresAt <= Date.now()) {
            sessionStorage.removeItem(STORE);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export function signOut() {
    sessionStorage.removeItem(STORE);
}



/**
 * Reads claims for display only. The signature is NOT verified here and must
 * never be trusted for an access decision — the backend verifies it against
 * the pool on every call.
 */
function decodeJwt(token) {
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}
