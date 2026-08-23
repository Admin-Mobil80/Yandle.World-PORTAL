<script setup>
import LegalLayout from './LegalLayout.vue';
import { COMPANY } from './legal.js';
</script>

<template>
  <LegalLayout title="Refund Policy" subtitle="14 days, no questions asked.">
    <h2>The short version</h2>
    <p>
      If you are unhappy with a handle for any reason, email us within
      <strong>14 days</strong> of purchase and we will refund you in full. You
      do not need to give a reason.
    </p>

    <h2>How to request one</h2>
    <p>
      Email <a :href="`mailto:${COMPANY.supportEmail}`">{{ COMPANY.supportEmail }}</a>
      from the address on the account, with the handle. We aim to reply within
      two working days and to process approved refunds within five. The money
      returns to the original payment method; how quickly it appears depends on
      your bank.
    </p>

    <h2>What happens to the handle</h2>
    <p>
      A refunded handle returns to the public pool and someone else may claim
      it. If you had traffic pointed at it, that traffic will stop resolving.
      Please move it before requesting the refund.
    </p>

    <h2>Credits</h2>
    <p>
      Unspent credits are refundable in full within 14 days of purchase.
      Credits already spent on a handle follow the handle: refunding that
      handle refunds the credit.
    </p>

    <h2>After 14 days</h2>
    <p>
      Handles are a one-time purchase with no recurring charge, so there is
      nothing to cancel and nothing further to pay. We do not generally refund
      after 14 days, but we will always refund, at any time, if:
    </p>
    <ul>
      <li>we suspended your handle in error;</li>
      <li>we discontinue the service;</li>
      <li>you were charged twice, or charged for something you did not buy.</li>
    </ul>

    <h2>Suspended handles</h2>
    <p>
      A handle suspended for breaching our
      <a href="/terms">acceptable use rules</a> is not refunded. If you believe
      the suspension was wrong, appeal it — and if we agree, you get the handle
      back or a full refund, your choice.
    </p>

    <h2>Your statutory rights</h2>
    <p>
      Nothing here limits rights you have under the consumer law of your own
      country, including any statutory right to cancel a digital purchase.
    </p>

    <h2>Contact</h2>
    <p><a :href="`mailto:${COMPANY.supportEmail}`">{{ COMPANY.supportEmail }}</a> — {{ COMPANY.legalName }}, {{ COMPANY.address }}</p>
  </LegalLayout>
</template>
