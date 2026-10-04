import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.DEMO_URL || "http://127.0.0.1:3100";
let cookie = "";
async function call(path, body) {
  const r = await fetch(base + "/api/v1/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const c = r.headers.get("set-cookie");
  if (c) cookie = c.split(";")[0];
  return { status: r.status, ...(await r.json()) };
}
assert.equal((await call("health")).data.database, "sqlite");
assert.equal(
  (await call("auth/login", { username: "ADMIN-DEMO", password: "Demo1234!" }))
    .status,
  200,
);
const state = (await call("state")).data;
let company = state.suppliers.find(
  (s) => s.companyNameE === "HTTP Smoke Supplier",
);
if (!company) {
  const input = {
    ...state.suppliers[0],
    companyNameC: "HTTP串接測試公司",
    companyNameE: "HTTP Smoke Supplier",
    password: "Demo1234!",
    enabled: "啟用",
    role: "Vendor",
  };
  const created = await call("suppliers", input);
  assert.equal(created.status, 201);
  company = { code: created.data.code, review: "待審核" };
}
if (company.review === "待審核")
  assert.equal(
    (
      await call(`suppliers/${company.code}/review`, {
        approved: true,
        note: "本機HTTP驗證",
      })
    ).status,
    200,
  );
const persisted = (await call("state")).data.suppliers.find(
  (s) => s.code === company.code,
);
assert.equal(persisted.review, "通過");
assert.equal((await call("auth/logout", {})).status, 200);
assert.equal((await call("state")).status, 401);
const report = {
  checkedAt: new Date().toISOString(),
  base,
  health: "passed",
  postLogin: "passed",
  postSupplier: company.code,
  postReview: "passed",
  readBack: "passed",
  logout: "passed",
};
writeFileSync(
  "docs/api-http-check.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(report);
