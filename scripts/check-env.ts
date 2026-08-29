/**
 * Configuration pre-flight.
 *
 * Run before a deploy. Every problem it reports would otherwise surface as a
 * confusing 500 on the first request that happened to need the missing value.
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/check-env.ts
 */
import { auditEnv, env } from "../lib/config/env.ts";

const { fatal, warnings } = auditEnv();

console.log(`Environment: ${env.NODE_ENV}\n`);

for (const warning of warnings) console.log(`WARN  ${warning}\n`);
for (const problem of fatal) console.log(`FAIL  ${problem}\n`);

if (fatal.length > 0) {
  console.error(
    `${fatal.length} fatal configuration problem(s). This deployment is not safe to serve.`,
  );
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `Configuration is safe to serve, with ${warnings.length} reduced-capability warning(s).`
    : "Configuration is complete.",
);
