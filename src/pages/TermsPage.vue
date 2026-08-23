<script setup>
import LegalLayout from './LegalLayout.vue';
import { COMPANY } from './legal.js';
</script>

<template>
  <LegalLayout title="Terms of Service">
    <p>
      These terms govern your use of {{ COMPANY.tradingName }}, operated by
      {{ COMPANY.legalName }} ("we", "us"). By reserving or purchasing a handle
      you agree to them.
    </p>

    <h2>1. What the service does</h2>
    <p>
      We let you reserve a short phrase made of one to four words from a fixed
      public list, and point it at a web address of your choosing or at a
      profile page we host. Visitors who enter that phrase are sent to your
      destination.
    </p>

    <h2>2. Accounts</h2>
    <p>
      An account requires a working email address, verified with a one-time
      code. We do not use passwords. You are responsible for keeping access to
      that mailbox; anyone who can read it can sign in as you.
    </p>

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
    <p>
      We scan destinations automatically and re-check them periodically. A
      destination that has not been cleared is shown to visitors with its real
      address displayed, rather than being redirected to silently.
    </p>

    <h2>5. Suspension</h2>
    <p>
      We may suspend a handle immediately, without notice and without refund,
      if it breaches section 4 or if we reasonably believe it is being used to
      harm someone. We will tell you the reason and you may appeal by replying
      to that message. We will restore a handle suspended in error.
    </p>

    <h2>6. Automated and bulk use</h2>
    <p>
      Reserving handles in bulk, scripting reservations, or holding handles
      with no intention of using them are all grounds for suspension and for
      the release of the handles concerned. Limits apply to how many handles
      one account may hold at once.
    </p>

    <h2>7. Availability</h2>
    <p>
      We aim to keep the service running continuously but do not guarantee it.
      We may change or discontinue features. If we discontinue the service
      entirely, we will give at least 90 days' notice so you can move your
      traffic elsewhere.
    </p>

    <h2>8. Liability</h2>
    <p>
      The service is provided as is. To the extent the law allows, our total
      liability to you for any claim is limited to the amount you paid us for
      the handle concerned. We are not liable for lost profits, lost traffic,
      or indirect losses.
    </p>

    <h2>9. Changes</h2>
    <p>
      We may update these terms. If a change materially reduces your rights we
      will email account holders at least 30 days before it takes effect.
    </p>

    <h2>10. Governing law</h2>
    <p>These terms are governed by the laws of {{ COMPANY.country }}, and disputes fall to {{ COMPANY.jurisdiction }}.</p>

    <h2>Contact</h2>
    <p><a :href="`mailto:${COMPANY.legalEmail}`">{{ COMPANY.legalEmail }}</a> — {{ COMPANY.legalName }}, {{ COMPANY.address }}</p>
  </LegalLayout>
</template>
