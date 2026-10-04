import { spawnSync } from "node:child_process";
for (const [file, args] of [
  ["node_modules/next/dist/bin/next", ["typegen"]],
  ["node_modules/typescript/bin/tsc", ["--noEmit"]],
]) {
  const result = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
