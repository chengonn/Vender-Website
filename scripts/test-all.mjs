import { spawnSync } from "node:child_process";
for (const args of [["run"], ["run", "--config", "vitest.backend.config.ts"]]) {
  const r = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", ...args],
    { stdio: "inherit" },
  );
  if (r.status !== 0) process.exit(r.status || 1);
}
