import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
function key(create = true) {
  const path = resolve(
    /* turbopackIgnore: true */ process.env.DEMO_VAULT_KEY_PATH ||
      ".secrets/password-vault.key",
  );
  if (!existsSync(path)) {
    if (!create) throw new Error("Password vault key is missing");
    mkdirSync(dirname(path), { recursive: true });
    try {
      writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  const value = readFileSync(path);
  if (value.length !== 32) throw new Error("Invalid vault key");
  return value;
}
export function encryptPassword(password: string, username: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(username));
  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}
export function decryptPassword(value: string, username: string) {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1") throw new Error("Unsupported vault format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(false),
    Buffer.from(iv, "base64"),
  );
  decipher.setAAD(Buffer.from(username));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
