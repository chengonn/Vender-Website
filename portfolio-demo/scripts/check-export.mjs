import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve("portfolio-demo/out");
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, entry.name);
    if (entry.isDirectory()) walk(f);
    else files.push(f);
  }
}
walk(root);
const forbidden = files.filter((f) =>
  /sqlite|vault|grand-ocean|\.env/i.test(f),
);
const html = readFileSync(join(root, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
  (x) => x[1],
);
const missing = assets.filter((a) => !existsSync(join(root, a)));
const originalBrand = files.filter(
  (f) =>
    /\.(html|js|txt|css)$/.test(f) &&
    /泱宏|GRAND OCEAN|grand-ocean/.test(readFileSync(f, "utf8")),
);
const result = {
  files: files.length,
  forbidden,
  originalBrand,
  assets: assets.length,
  missing,
  nojekyll: existsSync(join(root, ".nojekyll")),
};
console.log(JSON.stringify(result, null, 2));
if (
  forbidden.length ||
  missing.length ||
  originalBrand.length ||
  !result.nojekyll
)
  process.exitCode = 1;
