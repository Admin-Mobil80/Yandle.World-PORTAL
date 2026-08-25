/**
 * The legal copy, as data.
 *
 * Kept out of .vue files so the same text can be rendered to static HTML at
 * build time. Paddle's domain checker fetches the raw page: a client-rendered
 * policy is an empty page to a crawler, and gets the domain rejected for
 * "no terms of service" even though a human sees it fine.
 */
import { COMPANY, COMPANY_ADDRESS } from './legal.js';

const contact = (email) =>
  `<p><a href="mailto:${email}">${email}</a> — ${COMPANY.legalName}, ${COMPANY_ADDRESS}</p>`;

export const PAGES = {
  pricing: {
    title: 'Pricing',
    subtitle: 'One payment. No renewals, no subscription.',
    body: `
<p>A Yandle handle is one to four words from a fixed list of 100. Shorter handles are
scarcer, so they cost more. Every price below is a <strong>single one-time payment in
US dollars</strong>. There is no recurring charge and nothing to cancel.</p>

<table>
<thead><tr><th>Handle</th><th>Example</th><th>Free hold</th><th>Own it forever</th></tr></thead>
<tbody>
<tr><td>1 word</td><td><code>yandle.world/gold</code></td><td>1 day</td><td>$1,000</td></tr>
<tr><td>2 words</td><td><code>yandle.world/sharp-mind</code></td><td>7 days</td><td>$100</td></tr>
<tr><td>3 words</td><td><code>yandle.world/sky-bird-lake</code></td><td>15 days</td><td>$10</td></tr>
<tr><td>4 words</td><td><code>yandle.world/sky-bird-lake-gold</code></td><td>30 days</td><td>$1</td></tr>
</tbody></table>

<h2>Holding a handle before you buy</h2>
<p>You can reserve any available handle free of charge for the period shown above. A hold
costs nothing and requires no payment details — only a verified email address. If you do
not buy it before the hold ends, the handle returns to the public pool and anyone else
may claim it.</p>

<h2>One handle per account</h2>
<p>Each account may hold or own one handle. We do not sell handles in bulk.</p>

<h2>What you get</h2>
<ul>
<li>The handle, for as long as the service operates, with no renewal fee.</li>
<li>A redirect to any HTTPS address you choose, changeable at any time.</li>
<li>Or a hosted profile page: logo, headline, a description of up to 1,000 characters, your location, a WhatsApp link and up to four action links.</li>
<li>Click counts for your handle.</li>
</ul>

<h2>Refunds</h2>
<p>1- and 2-word handles can be refunded in full within 14 days, no reason needed.
3- and 4-word handles are final sale — at $10 and $1 the free hold period is there
so you can be certain before you pay. See the
<a href="/refunds">refund policy</a> for the exceptions we always honour.</p>

<h2>Tax</h2>
<p>Prices are shown excluding tax. Any GST, VAT or sales tax due is calculated and added
at checkout. ${COMPANY.legalName} is the seller of record for the transaction.</p>
`,
  },

  terms: {
    title: 'Terms of Service',
    body: `
<p>These terms govern your use of ${COMPANY.tradingName}, operated by ${COMPANY.legalName}
("we", "us"). By reserving or purchasing a handle you agree to them.</p>

<h2>1. What the service does</h2>
<p>We let you reserve a short phrase made of one to four words from a fixed public list,
and point it at a web address of your choosing or at a profile page we host. Visitors who
enter that phrase are sent to your destination.</p>

<h2>2. Accounts</h2>
<p>An account requires a working email address, verified with a one-time code. We do not
use passwords. You are responsible for keeping access to that mailbox; anyone who can read
it can sign in as you. Each account may hold or own one handle.</p>

<h2>3. Reservations and ownership</h2>
<ul>
<li>A free hold lasts for the period shown at the time of reservation and costs nothing.</li>
<li>If the hold ends without purchase, the handle returns to the public pool and anyone may claim it. We are not obliged to warn you first, though we do send reminders.</li>
<li>After a hold you allowed to lapse, you cannot immediately re-reserve that same handle. A cooldown applies, so that free holds cannot be used to occupy a handle indefinitely without paying.</li>
<li>A purchased handle is yours for as long as we operate the service, with no renewal fee. It is not property, and it is not transferable except through a process we provide.</li>
</ul>

<h2>4. Acceptable use</h2>
<p>You may not point a handle at, or use a handle to promote:</p>
<ul>
<li>phishing, malware, or any attempt to obtain credentials or payment details by deception;</li>
<li>content that is illegal where you or your visitors are;</li>
<li>material that sexualises minors, incites violence, or harasses a specific person;</li>
<li>impersonation of another person, business, or public body;</li>
<li>anything that misrepresents its association with us.</li>
</ul>
<p>We scan destinations automatically and re-check them periodically. A destination that has
not been cleared is shown to visitors with its real address displayed, rather than being
redirected to silently.</p>

<h2>5. Suspension</h2>
<p>We may suspend a handle immediately, without notice and without refund, if it breaches
section 4 or if we reasonably believe it is being used to harm someone. We will tell you the
reason and you may appeal by replying to that message. We will restore a handle suspended in
error.</p>

<h2>6. Automated use</h2>
<p>Scripting reservations, or creating multiple accounts to hold more than one handle, are
grounds for suspension and for the release of the handles concerned.</p>

<h2>7. Availability</h2>
<p>We aim to keep the service running continuously but do not guarantee it. We may change or
discontinue features. If we discontinue the service entirely, we will give at least 90 days'
notice so you can move your traffic elsewhere.</p>

<h2>8. Liability</h2>
<p>The service is provided as is. To the extent the law allows, our total liability to you
for any claim is limited to the amount you paid us for the handle concerned. We are not
liable for lost profits, lost traffic, or indirect losses.</p>

<h2>9. Changes</h2>
<p>We may update these terms. If a change materially reduces your rights we will email
account holders at least 30 days before it takes effect.</p>

<h2>10. Governing law</h2>
<p>These terms are governed by the laws of ${COMPANY.country}, and disputes fall to
${COMPANY.jurisdiction}.</p>

<h2>Contact</h2>
${contact(COMPANY.legalEmail)}
`,
  },

  privacy: {
    title: 'Privacy Policy',
    body: `
<p>This explains what ${COMPANY.legalName} collects when you use ${COMPANY.tradingName},
why, and what you can ask us to do about it.</p>

<h2>What we collect</h2>
<ul>
<li><strong>Your email address.</strong> Needed to hold a handle, to sign you in, and to warn you before a hold lapses. It is the only personal detail we require.</li>
<li><strong>Your handle and its settings</strong> — the destination address or profile content you configure.</li>
<li><strong>Click counts.</strong> We count visits to each handle. We do not store visitors' IP addresses against a handle, and we do not build profiles of the people who follow one.</li>
<li><strong>Operational logs</strong> from our infrastructure, which may include IP addresses, kept for up to 30 days for security and debugging.</li>
</ul>
<p>We do not use advertising trackers and we do not sell data to anyone.</p>

<h2>What we do not collect</h2>
<p>We never ask for or store payment card details. Card details are entered on our payment
provider's own checkout and never reach our servers; we receive only confirmation that a
payment succeeded, and a reference for it.</p>

<h2>Cookies and local storage</h2>
<p>We use browser storage to keep you signed in and to cache the word list so the site works
offline. We do not use cookies for advertising or cross-site tracking.</p>

<h2>Who else processes your data</h2>
<ul>
<li><strong>A cloud infrastructure provider</strong> — hosting, database and email delivery.</li>
<li><strong>A payment provider</strong> — payment processing and, where applicable, tax.</li>
<li><strong>A URL reputation service</strong> — checking destination links for malware and phishing.</li>
</ul>
<p>We will name any of these on request. Write to
<a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a>.</p>

<p>Destination URLs are also checked against automated malware and phishing
databases before they are allowed to redirect. Only the URL is checked, never
your identity.</p>

<h2>Where your data is held</h2>
<p>On cloud infrastructure located in the United States. If you are in the EEA or UK, that
is a transfer outside your region; we rely on standard contractual clauses in our agreement
with that provider.</p>

<h2>How long we keep it</h2>
<ul>
<li>Account and handle records: while your account is open, and for 90 days after you close it.</li>
<li>Operational logs: up to 30 days.</li>
<li>Records we must keep for tax or accounting: as long as the law requires.</li>
</ul>

<h2>Your rights</h2>
<p>You can ask us for a copy of your data, to correct it, or to delete it. Email
<a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a> and we will respond
within 30 days. Deleting your account releases your handle back to the public pool; that
cannot be undone.</p>

<h2>Children</h2>
<p>The service is not intended for anyone under 16, and we do not knowingly collect their data.</p>

<h2>Changes</h2>
<p>We will email account holders before any change that materially affects how we handle your data.</p>

<h2>Contact</h2>
${contact(COMPANY.legalEmail)}
`,
  },

  refunds: {
    title: 'Refund Policy',
    subtitle: 'Fourteen days on 1- and 2-word handles.',
    body: `
<h2>At a glance</h2>
<table>
<thead><tr><th>Handle</th><th>Price</th><th>Refund</th></tr></thead>
<tbody>
<tr><td>1 word</td><td>$1,000</td><td>14 days, no reason needed</td></tr>
<tr><td>2 words</td><td>$100</td><td>14 days, no reason needed</td></tr>
<tr><td>3 words</td><td>$10</td><td>Final sale</td></tr>
<tr><td>4 words</td><td>$1</td><td>Final sale</td></tr>
</tbody></table>

<h2>1- and 2-word handles</h2>
<p>If you are unhappy with a 1- or 2-word handle for any reason, email us within
<strong>14 days</strong> of purchase and we will refund you in full. You do not need to
give a reason.</p>

<h2>3- and 4-word handles</h2>
<p>These are $10 and $1 respectively. At those prices the cost of processing a refund
exceeds the payment itself, so they are sold as final. Every handle can be held free
for 15 or 30 days before you pay anything — please use the free hold to be sure before
you buy.</p>

<h2>What we refund regardless of tier</h2>
<p>The rule above is our discretionary policy. It does not limit the following, which we
refund at any time, on any handle:</p>
<ul>
<li>you were charged twice, or charged for something you did not buy;</li>
<li>we suspended your handle in error;</li>
<li>we discontinue the service;</li>
<li>the handle did not work and we could not fix it.</li>
</ul>

<h2>Your statutory rights</h2>
<p>Nothing in this policy limits rights you have under the consumer law of your own
country, including any statutory right to cancel a digital purchase. Where such a right
applies, it applies to every tier, and we will honour it.</p>

<h2>How to request a refund</h2>
<p>Email <a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a> from the
address on the account, with the handle. We aim to reply within two working days and to
process approved refunds within five. The money returns to the original payment method;
how quickly it appears depends on your bank.</p>

<h2>What happens to the handle</h2>
<p>A refunded handle returns to the public pool and someone else may claim it. If you had
traffic pointed at it, that traffic will stop resolving. Please move it before requesting
the refund.</p>

<h2>Suspended handles</h2>
<p>A handle suspended for breaching our <a href="/terms">acceptable use rules</a> is not
refunded. If you believe the suspension was wrong, appeal it — and if we agree, you get
the handle back or a full refund, your choice.</p>

<h2>Contact</h2>
${contact(COMPANY.supportEmail)}
`,
  },
};
