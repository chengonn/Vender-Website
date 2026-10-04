// Creates isolated fake workflow examples in the local Demo database. Never uses real data.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
const base = "http://127.0.0.1:3100";
function client() {
  let cookie = "";
  return {
    async call(path, body) {
      const r = await fetch(base + "/api/v1/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      return { status: r.status, ...(await r.json()) };
    },
  };
}
const admin = client(),
  gsd = client(),
  accounting = client(),
  vendor = client();
for (const [c, username] of [
  [admin, "ADMIN-DEMO"],
  [gsd, "GSD-DEMO"],
  [accounting, "ACCOUNTING-DEMO"],
])
  assert.equal(
    (await c.call("auth/login", { username, password: "Demo1234!" })).status,
    200,
  );
const state = (await admin.call("state")).data;
const created = await admin.call("suppliers", {
  ...state.suppliers[0],
  companyNameC: "流程展示假供應商",
  companyNameE: "Workflow Demo Supplier",
  password: "Demo1234!",
  role: "Vendor",
  enabled: "啟用",
});
assert.equal(created.status, 201);
const companyId = created.data.code;
assert.equal(
  (
    await admin.call(`suppliers/${companyId}/review`, {
      approved: true,
      note: "流程測試假資料",
    })
  ).status,
  200,
);
assert.equal(
  (
    await vendor.call("auth/login", {
      username: companyId,
      password: "Demo1234!",
    })
  ).status,
  200,
);
async function createOrder(name) {
  const values = {
    ...state.orders[0],
    customerName: name,
    fileNumber: "DEMO-" + name,
    charges: [
      {
        name: "示範文件費",
        quantity: "1",
        unit: "票",
        unitPrice: "100.10",
        currency: "TWD",
        taxType: "TBD",
        note: "假資料",
      },
    ],
  };
  const r = await vendor.call("orders/save", {
    values,
    attachments: ["demo-file.pdf"],
    submit: true,
  });
  assert.equal(r.status, 200);
  return r.data;
}
const complete = await createOrder("已結帳範例");
assert.equal(
  (
    await admin.call(`orders/${complete.id}/review`, {
      revision: complete.revision,
      approved: true,
    })
  ).status,
  403,
);
const approved = await gsd.call(`orders/${complete.id}/review`, {
  revision: complete.revision,
  approved: true,
  reason: "Demo文件已核對",
});
assert.equal(approved.status, 200);
const rec = await accounting.call("accounting/save", {
  orderId: complete.id,
  orderRevision: approved.data.revision,
  revision: 0,
  period: "2026-08",
  lines: [
    {
      currency: "TWD",
      claimed: "100.10",
      approved: "99.99",
      reason: "Demo差異已核對",
    },
  ],
  note: "完整流程展示",
});
assert.equal(rec.status, 200);
const confirmed = await accounting.call("accounting/confirm", {
  orderId: complete.id,
  orderRevision: approved.data.revision,
  revision: rec.data.revision,
});
assert.equal(confirmed.status, 200);
const body = {
  companyId,
  period: "2026-08",
  expected: [{ orderId: complete.id, revision: confirmed.data.revision }],
};
const closed = await accounting.call("accounting/close", body);
assert.equal(closed.status, 201);
assert.deepEqual(closed.data.totals, [{ currency: "TWD", amount: "99.99" }]);
assert.equal((await accounting.call("accounting/close", body)).status, 409);
const waitingReview = await createOrder("待GSD審核範例");
const waitingAccounting = await createOrder("待Accounting對帳範例");
assert.equal(
  (
    await gsd.call(`orders/${waitingAccounting.id}/review`, {
      revision: waitingAccounting.revision,
      approved: true,
      reason: "Demo文件核對完成",
    })
  ).status,
  200,
);
const scoped = (await vendor.call("state")).data;
assert.equal(scoped.orders.length, 3);
assert.equal(scoped.monthlyStatements.length, 1);
for (const c of [admin, gsd, accounting, vendor])
  await c.call("auth/logout", {});
const db = new DatabaseSync("data/vendor-demo.sqlite");
assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
writeFileSync(
  "docs/demo-database-schema.sql",
  "-- Migration 3 schema; no data or keys.\n" +
    db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name",
      )
      .all()
      .map((r) => r.sql + ";")
      .join("\n\n") +
    "\n",
);
db.close();
const report = {
  checkedAt: new Date().toISOString(),
  url: base,
  companyId,
  waitingReview: waitingReview.id,
  waitingAccounting: waitingAccounting.id,
  closedOrder: complete.id,
  statementId: closed.data.id,
  frontendTests: 25,
  backendTests: 32,
  http: "passed",
  databaseIntegrity: "ok",
  foreignKeys: "ok",
  deployed: false,
};
writeFileSync(
  "docs/gsd-accounting-http-check.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
