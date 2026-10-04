-- Migration 3 schema; no data or keys.
CREATE UNIQUE INDEX one_open_request ON modification_requests(order_id) WHERE status IN ('PENDING','APPROVED');

CREATE INDEX orders_company ON orders(company_code);

CREATE TABLE accounting_records(order_id TEXT PRIMARY KEY REFERENCES orders(id), company_code TEXT NOT NULL REFERENCES companies(code), period TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL);

CREATE TABLE audit_logs(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE companies(code TEXT PRIMARY KEY, profile TEXT NOT NULL, review TEXT NOT NULL, enabled TEXT NOT NULL, review_note TEXT NOT NULL DEFAULT '');

CREATE TABLE login_attempts(username TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);

CREATE TABLE migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);

CREATE TABLE modification_requests(id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), company_code TEXT NOT NULL REFERENCES companies(code), reason TEXT NOT NULL, status TEXT NOT NULL, previous_status TEXT NOT NULL, editable_until TEXT, created_at TEXT NOT NULL);

CREATE TABLE monthly_statements(id TEXT PRIMARY KEY,company_code TEXT NOT NULL REFERENCES companies(code),period TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(company_code,period));

CREATE TABLE order_versions(order_id TEXT NOT NULL REFERENCES orders(id), version INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(order_id,version));

CREATE TABLE orders(id TEXT PRIMARY KEY, company_code TEXT NOT NULL REFERENCES companies(code), revision INTEGER NOT NULL, payload TEXT NOT NULL);

CREATE TABLE password_requests(username TEXT PRIMARY KEY REFERENCES users(username), status TEXT NOT NULL DEFAULT 'OPEN', created_at TEXT NOT NULL);

CREATE TABLE reconciliations(id TEXT PRIMARY KEY, company_code TEXT NOT NULL REFERENCES companies(code), payload TEXT NOT NULL);

CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES users(username), expires INTEGER NOT NULL);

CREATE TABLE "users"(username TEXT PRIMARY KEY, company_code TEXT REFERENCES companies(code), role TEXT NOT NULL CHECK(role IN ('ADMIN','SUPPLIER_USER','GSD','ACCOUNTING')), password_hash TEXT NOT NULL, must_change INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, password_ciphertext TEXT);
