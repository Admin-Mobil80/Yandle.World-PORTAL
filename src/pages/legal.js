/**
 * Company details used across the legal pages.
 *
 * Paddle's review checks that the entity named on the site matches the entity
 * on the account, and that a real postal address and contact route exist.
 * Placeholders below are marked and MUST be filled before submitting —
 * shipping them as-is is what gets an application rejected.
 */
export const COMPANY = {
  tradingName: 'Yandle.world',
  legalName: 'Mobil80 Technologies',        // TODO: exact registered name
  address: 'TODO: registered address',       // TODO: full postal address
  country: 'India',
  supportEmail: 'support@yandle.world',
  legalEmail: 'legal@yandle.world',
  jurisdiction: 'the courts of Bengaluru, Karnataka, India',  // TODO: confirm
  effectiveDate: '23 August 2026',
};

/** Everything still needing a human decision before Paddle review. */
export const OPEN_ITEMS = [
  'Registered legal entity name',
  'Registered postal address',
  'Governing-law jurisdiction',
  'support@ and legal@ mailboxes actually receiving mail',
  'Review by a lawyer — these are drafted, not advised',
];
