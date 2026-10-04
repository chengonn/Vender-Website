import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const [page, test] = process.argv.slice(2);
if (!page || !test)
  throw new Error("Usage: npm run check:page -- PAGE tests/PAGE.test.tsx");
const commands = [
  ["format", "node_modules/prettier/bin/prettier.cjs", ["--check", "."]],
  ["typecheck", "scripts/typecheck.mjs", []],
  ["test", "node_modules/vitest/vitest.mjs", ["run", test]],
];
const checks = [];
for (const [name, bin, args] of commands) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    stdio: "inherit",
  });
  checks.push({ name, exitCode: result.status, error: result.error?.message });
}
mkdirSync("docs", { recursive: true });
const log = "docs/checks.json";
const entries = existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : [];
entries.push({ page, test, checkedAt: new Date().toISOString(), checks });
writeFileSync(log, JSON.stringify(entries, null, 2) + "\n");
if (checks.some((check) => check.exitCode !== 0)) process.exitCode = 1;
