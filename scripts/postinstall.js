const { execSync } = require("node:child_process");
const path = require("node:path");

const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);

if (!isRender) {
  console.log("[postinstall] Skipping Chrome install outside Render.");
  process.exit(0);
}

const cacheDir =
  process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), ".cache", "puppeteer");

process.env.PUPPETEER_CACHE_DIR = cacheDir;

console.log(`[postinstall] Installing Chrome into ${cacheDir}`);

execSync("npx puppeteer browsers install chrome", {
  stdio: "inherit",
  env: process.env,
});