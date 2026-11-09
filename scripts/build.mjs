import { build, context } from "esbuild";

const options = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  target: "es2021",
  minify: true,
  legalComments: "none",
  outfile: "dist/smo-schedule-card.js",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
