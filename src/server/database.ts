import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { initialSuppliers } from "@/features/suppliers/supplier-model";
import { mockOrders, mockReconciliations } from "@/data/mock-orders";
import { encryptPassword } from "./password-vault";
let database: DatabaseSync | undefined;
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt +
    ":" +
    scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")
  );
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function getDb() {
  if (database) return database;
  const path = resolve(
    /* turbopackIgnore: true */ process.env.DEMO_DB_PATH ||
      "data/vendor-demo.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(`
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS companies(code TEXT PRIMARY KEY, profile TEXT NOT NULL, review TEXT NOT NULL, enabled TEXT NOT NULL, review_note TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, company_code TEXT REFERENCES companies(code), role TEXT NOT NULL CHECK(role IN ('ADMIN','SUPPLIER_USER')), password_hash TEXT NOT NULL, must_change INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES users(username), expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, company_code TEXT NOT NULL REFERENCES companies(code), revision INTEGER NOT NULL, payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS orders_company ON orders(company_code);
 CREATE TABLE IF NOT EXISTS order_versions(order_id TEXT NOT NULL REFERENCES orders(id), version INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(order_id,version));
 CREATE TABLE IF NOT EXISTS modification_requests(id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), company_code TEXT NOT NULL REFERENCES companies(code), reason TEXT NOT NULL, status TEXT NOT NULL, previous_status TEXT NOT NULL, editable_until TEXT, created_at TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS one_open_request ON modification_requests(order_id) WHERE status IN ('PENDING','APPROVED');
 CREATE TABLE IF NOT EXISTS password_requests(username TEXT PRIMARY KEY REFERENCES users(username), status TEXT NOT NULL DEFAULT 'OPEN', created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reconciliations(id TEXT PRIMARY KEY, company_code TEXT NOT NULL REFERENCES companies(code), payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts(username TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
 `);
  db.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE");
  try {
    if (!db.prepare("SELECT version FROM migrations WHERE version=1").get()) {
      for (const [code, name, mustChange] of [
        ["DOL0001", "示範海洋物流", 1],
        ["SOL0001", "示範星海物流", 0],
      ] as const) {
        const { password, ...profile } = initialSuppliers[0];
        db.prepare(
          "INSERT INTO companies(code,profile,review,enabled) VALUES(?,?,?,?)",
        ).run(
          code,
          JSON.stringify({ ...profile, companyNameC: name }),
          "通過",
          "啟用",
        );
        db.prepare(
          "INSERT INTO users(username,company_code,role,password_hash,must_change) VALUES(?,?,?,?,?)",
        ).run(code, code, "SUPPLIER_USER", hashPassword(password), mustChange);
      }
      db.prepare(
        "INSERT INTO users(username,role,password_hash,must_change) VALUES(?,?,?,0)",
      ).run("ADMIN-DEMO", "ADMIN", hashPassword("Demo1234!"));
      for (const order of mockOrders) {
        const value = {
          ...order,
          companyId: "DOL0001",
          revision: 1,
          submittedAt:
            order.status === "DRAFT"
              ? undefined
              : new Date(
                  Date.now() - (order.id === "DEMO-005" ? 25 : 2) * 3600000,
                ).toISOString(),
        };
        db.prepare("INSERT INTO orders VALUES(?,?,?,?)").run(
          order.id,
          "DOL0001",
          1,
          JSON.stringify(value),
        );
        if (order.version)
          db.prepare("INSERT INTO order_versions VALUES(?,?,?,?)").run(
            order.id,
            order.version,
            JSON.stringify(value),
            new Date().toISOString(),
          );
      }
      for (const rec of mockReconciliations)
        db.prepare("INSERT INTO reconciliations VALUES(?,?,?)").run(
          rec.id,
          "DOL0001",
          JSON.stringify(rec),
        );
      db.prepare("INSERT INTO migrations VALUES(1,?)").run(
        new Date().toISOString(),
      );
    }
    if (!db.prepare("SELECT version FROM migrations WHERE version=2").get()) {
      db.exec(
        "ALTER TABLE users ADD COLUMN password_ciphertext TEXT; UPDATE users SET must_change=0;",
      );
      // Recover only a verified demo password; never overwrite legacy credentials.
      for (const row of db
        .prepare("SELECT username,password_hash FROM users")
        .all()) {
        if (verifyPassword("Demo1234!", String(row.password_hash)))
          db.prepare(
            "UPDATE users SET password_ciphertext=? WHERE username=?",
          ).run(
            encryptPassword("Demo1234!", String(row.username)),
            row.username,
          );
      }
      db.prepare("INSERT INTO migrations VALUES(2,?)").run(
        new Date().toISOString(),
      );
    }
    if (!db.prepare("SELECT version FROM migrations WHERE version=3").get()) {
      db.exec(`CREATE TABLE users_new(username TEXT PRIMARY KEY, company_code TEXT REFERENCES companies(code), role TEXT NOT NULL CHECK(role IN ('ADMIN','SUPPLIER_USER','GSD','ACCOUNTING')), password_hash TEXT NOT NULL, must_change INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, password_ciphertext TEXT);
      INSERT INTO users_new SELECT * FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE TABLE accounting_records(order_id TEXT PRIMARY KEY REFERENCES orders(id), company_code TEXT NOT NULL REFERENCES companies(code), period TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE monthly_statements(id TEXT PRIMARY KEY,company_code TEXT NOT NULL REFERENCES companies(code),period TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(company_code,period));`);
      for (const [username, role] of [
        ["GSD-DEMO", "GSD"],
        ["ACCOUNTING-DEMO", "ACCOUNTING"],
      ]) {
        db.prepare(
          "INSERT INTO users(username,role,password_hash,must_change,password_ciphertext) VALUES(?,?,?,0,?)",
        ).run(
          username,
          role,
          hashPassword("Demo1234!"),
          encryptPassword("Demo1234!", username),
        );
      }
      db.prepare("INSERT INTO migrations VALUES(3,?)").run(
        new Date().toISOString(),
      );
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Database foreign key validation failed");
    db.exec("COMMIT; PRAGMA foreign_keys=ON");
  } catch (e) {
    db.exec("ROLLBACK");
    db.close();
    throw e;
  }
  database = db;
  return db;
}
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function audit(actor: string, action: string, resource: string) {
  getDb()
    .prepare(
      "INSERT INTO audit_logs(actor,action,resource,created_at) VALUES(?,?,?,?)",
    )
    .run(actor, action, resource, new Date().toISOString());
}

export function closeDatabase() {
  database?.close();
  database = undefined;
}
