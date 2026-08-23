#!/usr/bin/env node
/**
 * Fails the build when required VITE_* vars are missing.
 *
 * Vite silently substitutes `undefined` for an unset import.meta.env var, so
 * a build with no VITE_COGNITO_CLIENT_ID succeeds, deploys, and produces an
 * app nobody can sign into. That happened. A build that cannot work should
 * not produce an artifact.
 */
const REQUIRED = ['VITE_COGNITO_CLIENT_ID'];
const missing = REQUIRED.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(`\n  BUILD REFUSED — missing required env: ${missing.join(', ')}`);
  console.error('  Read them from the stack outputs, e.g.:\n');
  console.error('    export VITE_COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \\');
  console.error('      --stack-name yandle-world-dev --region us-east-1 --profile yandle-world-dev \\');
  console.error("      --query \"Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue\" --output text)\n");
  process.exit(1);
}
console.log(`env ok: ${REQUIRED.join(', ')}`);
