/**
 * Company details used across the legal pages.
 *
 * `legalName` is copied verbatim from the Paddle account record. Paddle's
 * review checks that the entity named on the site matches the entity on the
 * account, so this string must not be "tidied" — an ampersand where their
 * record has "and" is the kind of mismatch that fails a review.
 */
export const COMPANY = {
  tradingName: 'Yandle.world',
  legalName: 'Mobil80 Solutions and Services Pvt Ltd',
  addressLines: [
    'No. 588, Above Polar Bear',
    'Vidyaranyapura Main Road, HMT Layout',
    'Bangalore 560097',
    'Karnataka, India',
  ],
  country: 'India',
  // A known-working mailbox beats a pretty one. Paddle's reviewer may email
  // the address on the site, and support@yandle.world does not exist yet.
  // Pending confirmation with Jisha/Manoj that this is monitored.
  supportEmail: 'contactus@mobil80.com',
  legalEmail: 'contactus@mobil80.com',
  jurisdiction: 'the courts of Bangalore, Karnataka, India',
  effectiveDate: '23 August 2026',
};

/** Single-line form, for footers and inline references. */
export const COMPANY_ADDRESS = COMPANY.addressLines.join(', ');
