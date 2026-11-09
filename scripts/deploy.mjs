// Copies the built card into a Home Assistant config's www folder for local testing.
// Usage: npm run build && node scripts/deploy.mjs X:/www/smo-schedule-card
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/deploy.mjs <target-folder>   (e.g. <config>/www/smo-schedule-card)");
  process.exit(1);
}
mkdirSync(target, { recursive: true });
copyFileSync("dist/smo-schedule-card.js", join(target, "smo-schedule-card.js"));
console.log(`Copied to ${target}. Resource URL: /local/${target.split(/www[\\/]/).pop()}/smo-schedule-card.js`);
