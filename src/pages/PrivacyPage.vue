<script setup>
import LegalLayout from './LegalLayout.vue';
import { COMPANY } from './legal.js';
</script>

<template>
  <LegalLayout title="Privacy Policy">
    <p>
      This explains what {{ COMPANY.legalName }} collects when you use
      {{ COMPANY.tradingName }}, why, and what you can ask us to do about it.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Your email address.</strong> Needed to hold a handle, to sign you in, and to warn you before a hold lapses. It is the only personal detail we require.</li>
      <li><strong>Your handles and their settings</strong> — the destination address or profile content you configure.</li>
      <li><strong>Click counts.</strong> We count visits to each handle. We do not store visitors' IP addresses against a handle, and we do not build profiles of the people who follow one.</li>
      <li><strong>Operational logs</strong> from our infrastructure, which may include IP addresses, kept for up to 30 days for security and debugging.</li>
    </ul>
    <p>We do not use advertising trackers and we do not sell data to anyone.</p>

    <h2>What we do not collect</h2>
    <p>
      We never ask for or store payment card details. Payments are handled
      entirely by our payment provider, who acts as seller of record; we
      receive only confirmation that a payment succeeded.
    </p>

    <h2>Cookies and local storage</h2>
    <p>
      We use browser storage to keep you signed in and to cache the word list
      so the site works offline. We do not use cookies for advertising or
      cross-site tracking.
    </p>

    <h2>Who else processes your data</h2>
    <ul>
      <li><strong>Amazon Web Services</strong> — hosting, database and email delivery, in the United States (us-east-1).</li>
      <li><strong>Paddle</strong> — payment processing and tax, as merchant of record.</li>
      <li><strong>Google Safe Browsing</strong> — we submit destination URLs for malware and phishing checks. Only the URL is sent, never your identity.</li>
    </ul>

    <h2>Where your data is held</h2>
    <p>
      On AWS infrastructure in the United States. If you are in the EEA or UK,
      that is a transfer outside your region; we rely on standard contractual
      clauses in our agreement with AWS.
    </p>

    <h2>How long we keep it</h2>
    <ul>
      <li>Account and handle records: while your account is open, and for 90 days after you close it.</li>
      <li>Operational logs: up to 30 days.</li>
      <li>Records we must keep for tax or accounting: as long as the law requires.</li>
    </ul>

    <h2>Your rights</h2>
    <p>
      You can ask us for a copy of your data, to correct it, or to delete it.
      Email <a :href="`mailto:${COMPANY.supportEmail}`">{{ COMPANY.supportEmail }}</a>
      and we will respond within 30 days. Deleting your account releases your
      handles back to the public pool; that cannot be undone.
    </p>

    <h2>Children</h2>
    <p>The service is not intended for anyone under 16, and we do not knowingly collect their data.</p>

    <h2>Changes</h2>
    <p>We will email account holders before any change that materially affects how we handle your data.</p>

    <h2>Contact</h2>
    <p><a :href="`mailto:${COMPANY.legalEmail}`">{{ COMPANY.legalEmail }}</a> — {{ COMPANY.legalName }}, {{ COMPANY.address }}</p>
  </LegalLayout>
</template>
