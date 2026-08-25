/**
 * Guessing the visitor's country dialling code.
 *
 * A browser cannot read the phone's own number — there is no web API for it
 * on any platform, and there will not be one, because a page that could
 * silently harvest your number would be a tracking disaster. So the field is
 * always typed or autofilled by the person.
 *
 * What we CAN do is remove the annoying part: pre-fill the "+91" so they only
 * type the ten digits they know by heart. The guess comes from the device's
 * own locale and time zone, never from the network, and it is only ever a
 * default the person can overwrite.
 */

/**
 * IANA zone prefix → ISO country, for the zones that actually disambiguate.
 * Kept short on purpose: the locale is the primary signal and this is only
 * the fallback for a device whose language carries no region ("en" alone).
 */
const ZONE_COUNTRY = Object.freeze({
  'Asia/Calcutta': 'IN', 'Asia/Kolkata': 'IN',
  'Asia/Dubai': 'AE', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Seoul': 'KR',
  'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Asia/Bangkok': 'TH',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Lisbon': 'PT', 'Europe/Warsaw': 'PL',
  'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR', 'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR', 'America/Bogota': 'CO', 'America/Lima': 'PE',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG', 'Africa/Accra': 'GH',
  'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW',
  'Asia/Jerusalem': 'IL', 'Asia/Hong_Kong': 'HK', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Ho_Chi_Minh': 'VN',
});

/** Country names, for the picker. Only the countries we list dial codes for. */
export const COUNTRY_NAMES = Object.freeze({
  IN: 'India', US: 'United States', CA: 'Canada', GB: 'United Kingdom',
  IE: 'Ireland', AU: 'Australia', NZ: 'New Zealand', AE: 'UAE',
  SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain',
  PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal',
  MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', PH: 'Philippines',
  TH: 'Thailand', VN: 'Vietnam', HK: 'Hong Kong', CN: 'China', JP: 'Japan',
  KR: 'South Korea', FR: 'France', DE: 'Germany', ES: 'Spain', IT: 'Italy',
  NL: 'Netherlands', BE: 'Belgium', PT: 'Portugal', CH: 'Switzerland',
  AT: 'Austria', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  PL: 'Poland', CZ: 'Czechia', GR: 'Greece', RO: 'Romania', HU: 'Hungary',
  RU: 'Russia', UA: 'Ukraine', TR: 'Turkey', IL: 'Israel', EG: 'Egypt',
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana',
  TZ: 'Tanzania', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', CL: 'Chile',
  CO: 'Colombia', PE: 'Peru',
});

/** ISO country → E.164 country calling code. */
export const DIAL_CODES = Object.freeze({
  IN: '91', US: '1', CA: '1', GB: '44', IE: '353', AU: '61', NZ: '64',
  AE: '971', SA: '966', QA: '974', KW: '965', OM: '968', BH: '973',
  PK: '92', BD: '880', LK: '94', NP: '977', MY: '60', SG: '65', ID: '62',
  PH: '63', TH: '66', VN: '84', HK: '852', CN: '86', JP: '81', KR: '82',
  FR: '33', DE: '49', ES: '34', IT: '39', NL: '31', BE: '32', PT: '351',
  CH: '41', AT: '43', SE: '46', NO: '47', DK: '45', FI: '358', PL: '48',
  CZ: '420', GR: '30', RO: '40', HU: '36', RU: '7', UA: '380', TR: '90',
  IL: '972', EG: '20', ZA: '27', NG: '234', KE: '254', GH: '233', TZ: '255',
  MX: '52', BR: '55', AR: '54', CL: '56', CO: '57', PE: '51',
});

/**
 * The device's ISO country, or null when it will not say.
 *
 * Time zone is checked FIRST, and that ordering is the whole point. Locale
 * was tried first originally, which guessed +1 for someone sitting in
 * Bangalore: plenty of people run their phone in en-US while living nowhere
 * near the US. A time zone of Asia/Calcutta is a statement about where the
 * device physically is; en-US is a statement about what language it speaks.
 * For a phone number, only the first one is evidence.
 */
export function guessCountry() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ZONE_COUNTRY[zone]) return ZONE_COUNTRY[zone];
  } catch { /* no Intl at all — fall through to locale */ }
  try {
    // Only a region-TAGGED locale counts. Bare "en" maximizes to en-Latn-US,
    // which would hand back the United States on no evidence whatsoever.
    for (const tag of navigator.languages ?? [navigator.language]) {
      if (!/-[A-Za-z]{2}$|-[0-9]{3}$/.test(tag)) continue;
      const region = new Intl.Locale(tag).maximize().region;
      if (region && DIAL_CODES[region]) return region;
    }
  } catch { /* Intl.Locale is missing on very old engines. */ }
  return null;
}

/**
 * The flag emoji for an ISO country code.
 *
 * Built from regional indicator symbols rather than shipped as images: two
 * code points per flag, no asset requests, and it inherits the system's own
 * flag artwork. Platforms that decline to render flags (Windows) fall back to
 * showing the two letters, which is still a usable label.
 */
export function flagFor(iso) {
  const code = String(iso ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** "+91" for a phone in India, or null when the country is unknown. */
export function guessDialCode() {
  const country = guessCountry();
  return country && DIAL_CODES[country] ? `+${DIAL_CODES[country]}` : null;
}

/**
 * Picker options, the guessed country first so it is the default without
 * hiding the rest.
 */
export function countryOptions() {
  const guess = guessCountry();
  const rows = Object.keys(DIAL_CODES).map((iso) => ({
    iso,
    value: iso,
    flag: flagFor(iso),
    name: COUNTRY_NAMES[iso] ?? iso,
    dial: `+${DIAL_CODES[iso]}`,
    // `title` is what v-autocomplete filters against, so it carries the name,
    // the dial code and the ISO letters — people search by all three.
    title: `${COUNTRY_NAMES[iso] ?? iso} +${DIAL_CODES[iso]} ${iso}`,
  })).sort((a, b) => a.name.localeCompare(b.name));
  if (!guess) return rows;
  return [rows.find((r) => r.iso === guess), ...rows.filter((r) => r.iso !== guess)].filter(Boolean);
}

/** Split a stored E.164 number back into (country, national part). */
export function splitE164(value) {
  const v = String(value ?? '').replace(/[\s()\-.]/g, '');
  if (!v.startsWith('+')) return { iso: guessCountry(), national: v };
  // Longest dial code first: +1 would otherwise swallow +1... nothing, but
  // +9 vs +91 vs +971 genuinely collide.
  const codes = Object.entries(DIAL_CODES).sort((a, b) => b[1].length - a[1].length);
  for (const [iso, dial] of codes) {
    if (v.startsWith(`+${dial}`)) return { iso, national: v.slice(dial.length + 1) };
  }
  return { iso: guessCountry(), national: v.replace(/^\+/, '') };
}
