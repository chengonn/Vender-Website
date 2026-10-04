import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    process.env.PORT || "3100",
  ],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code || 0));
