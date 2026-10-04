import { beforeAll, afterAll, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleApi } from "@/server/api";
import { getDb, closeDatabase } from "@/server/database";
import { blankOrder } from "@/data/mock-orders";
const origin = "http://127.0.0.1:3100";
function client() {
  let cookie = "";
  return {
    async call(path: string, body?: unknown) {
      const r = await handleApi(
        new Request(origin + "/api/v1/" + path, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie")!.split(";")[0];
      return { status: r.status, ...(await r.json()) };
    },
  };
}
const vendor = client(),
  gsd = client(),
  accounting = client(),
  admin = client(),
  other = client();
let id = "",
  revision = 0;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "accounting-demo-"));
  process.env.DEMO_DB_PATH = join(dir, "test.sqlite");
  process.env.DEMO_VAULT_KEY_PATH = join(dir, "key");
  for (const [c, username] of [
    [vendor, "DOL0001"],
    [other, "SOL0001"],
    [gsd, "GSD-DEMO"],
    [accounting, "ACCOUNTING-DEMO"],
    [admin, "ADMIN-DEMO"],
  ] as const)
    expect(
      (await c.call("auth/login", { username, password: "Demo1234!" })).status,
    ).toBe(200);
});
afterAll(() => closeDatabase());
async function order() {
  return (await vendor.call("state")).data.orders.find(
    (o: { id: string }) => o.id === id,
  );
}
const lines = [
  { currency: "TWD", claimed: "100.10", approved: "99.99", reason: "" },
  { currency: "USD", claimed: "0.10", approved: "0.10", reason: "" },
];
async function save(recRevision = 0, period = "2026-09", reason = "") {
  const o = await order();
  return accounting.call("accounting/save", {
    orderId: id,
    orderRevision: o.revision,
    revision: recRevision,
    period,
    lines: lines.map((l) => ({ ...l, reason })),
    note: "Demo",
  });
}
it("migration3提供正確角色並保留外鍵", async () => {
  expect((await gsd.call("state")).data.user.role).toBe("GSD");
  expect((await accounting.call("state")).data.user.role).toBe("ACCOUNTING");
  expect(getDb().prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect((await gsd.call("state")).data.suppliers).toEqual([]);
  expect(
    (
      await accounting.call("suppliers/DOL0001/password/reveal", {
        adminPassword: "Demo1234!",
      })
    ).status,
  ).toBe(403);
});
it("Vendor提交，Admin與Accounting不能代替GSD審核", async () => {
  const r = await vendor.call("orders/save", {
    values: {
      ...blankOrder,
      customerName: "流程測試",
      fileNumber: "FLOW-01",
      charges: lines.map((l) => ({
        name: "測試費用",
        quantity: "1",
        unit: "票",
        unitPrice: l.claimed,
        currency: l.currency,
        taxType: "TBD",
        note: "",
      })),
    },
    attachments: ["demo-document.pdf"],
    submit: true,
  });
  expect(r.status).toBe(200);
  id = r.data.id;
  revision = r.data.revision;
  for (const c of [vendor, admin, accounting])
    expect(
      (await c.call(`orders/${id}/review`, { approved: true, revision }))
        .status,
    ).toBe(403);
  expect((await save()).status).toBe(409);
});
it("GSD要求更正必填原因，Vendor重送新版本", async () => {
  expect(
    (
      await gsd.call(`orders/${id}/review`, {
        approved: false,
        correction: true,
        reason: "",
        revision,
      })
    ).status,
  ).toBe(422);
  const r = await gsd.call(`orders/${id}/review`, {
    approved: false,
    correction: true,
    reason: "請補文件",
    revision,
  });
  expect(r.data.status).toBe("CORRECTION_REQUIRED");
  const o = await order();
  const res = await vendor.call("orders/save", {
    values: o,
    attachments: ["corrected-demo.pdf"],
    submit: true,
    id,
    revision: o.revision,
  });
  expect(res.data.version).toBe(2);
  revision = res.data.revision;
  const approved = await gsd.call(`orders/${id}/review`, {
    approved: true,
    reason: "已核對",
    revision,
  });
  expect(approved.data.approvedVersion).toBe(2);
  revision = approved.data.revision;
});
it("只有Accounting可以保存對帳，拒絕漏幣別及非精確金額", async () => {
  for (const c of [admin, gsd, vendor])
    expect((await c.call("accounting/save", {})).status).toBe(403);
  const input = {
    orderId: id,
    orderRevision: revision,
    revision: 0,
    period: "2026-09",
    lines: [lines[0]],
    note: "",
  };
  expect((await accounting.call("accounting/save", input)).status).toBe(422);
  expect(
    (
      await accounting.call("accounting/save", {
        ...input,
        lines: lines.map((l) => ({ ...l, approved: "0.001" })),
      })
    ).status,
  ).toBe(422);
  expect((await save()).data.status).toBe("DISPUTED");
  expect((await save()).status).toBe(409);
});
it("未解差異不能確認或結帳，更正原因後才能確認", async () => {
  expect(
    (
      await accounting.call("accounting/confirm", {
        orderId: id,
        revision: 1,
        orderRevision: revision,
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await accounting.call("accounting/close", {
        companyId: "DOL0001",
        period: "2026-09",
        expected: [{ orderId: id, revision: 1 }],
      })
    ).status,
  ).toBe(409);
  const r = await save(1, "2026-09", "雙方核對後更正文件費");
  expect(r.status).toBe(200);
  expect(
    (
      await accounting.call("accounting/confirm", {
        orderId: id,
        revision: 2,
        orderRevision: revision,
      })
    ).data.status,
  ).toBe("RECONCILED");
  expect((await order()).status).toBe("RECONCILED");
  expect((await other.call("state")).data.accountingRecords).toEqual([]);
});
it("結帳檢查清單版本，按幣別產生精確合計與不可變快照", async () => {
  expect(
    (
      await accounting.call("accounting/close", {
        companyId: "DOL0001",
        period: "2026-09",
        expected: [{ orderId: id, revision: 2 }],
      })
    ).status,
  ).toBe(409);
  const r = await accounting.call("accounting/close", {
    companyId: "DOL0001",
    period: "2026-09",
    expected: [{ orderId: id, revision: 3 }],
  });
  expect(r.status).toBe(201);
  expect(r.data.totals).toEqual([
    { currency: "TWD", amount: "99.99" },
    { currency: "USD", amount: "0.10" },
  ]);
  expect(r.data.records[0].orderVersion).toBe(2);
  expect((await order()).status).toBe("MONTH_CLOSED");
  expect((await other.call("state")).data.monthlyStatements).toEqual([]);
  expect((await vendor.call("state")).data.monthlyStatements).toHaveLength(1);
});
it("阻止重複結帳、結帳後修改及越權結帳", async () => {
  const body = {
    companyId: "DOL0001",
    period: "2026-09",
    expected: [{ orderId: id, revision: 4 }],
  };
  for (const c of [admin, gsd, vendor])
    expect((await c.call("accounting/close", body)).status).toBe(403);
  expect((await accounting.call("accounting/close", body)).status).toBe(409);
  expect((await save(4)).status).toBe(409);
  const o = await order();
  expect(
    (
      await vendor.call(`orders/${id}/change-request`, {
        revision: o.revision,
        reason: "改金額",
      })
    ).status,
  ).toBe(409);
  closeDatabase();
  expect((await accounting.call("state")).data.monthlyStatements).toHaveLength(
    1,
  );
  expect(getDb().prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("舊鎖定帳單需要GSD重新核准", async () => {
  const o = (await gsd.call("state")).data.orders.find(
    (r: { id: string }) => r.id === "DEMO-004",
  );
  expect(
    (
      await gsd.call("orders/DEMO-004/review", {
        revision: o.revision,
        approved: true,
      })
    ).data.approvedVersion,
  ).toBe(o.version);
});

it("跨帳單同幣別精確加總，不接受重複結帳項目", async () => {
  const expected: { orderId: string; revision: number }[] = [];
  for (const price of ["0.10", "0.20"]) {
    const create = await vendor.call("orders/save", {
      values: {
        ...blankOrder,
        customerName: "加總測試",
        fileNumber: "SUM-" + price,
        charges: [
          {
            name: "Demo",
            quantity: "1",
            unit: "票",
            unitPrice: price,
            currency: "TWD",
            taxType: "TBD",
            note: "",
          },
        ],
      },
      attachments: [],
      submit: true,
    });
    const o = create.data;
    const approved = await gsd.call(`orders/${o.id}/review`, {
      approved: true,
      revision: o.revision,
    });
    const rec = await accounting.call("accounting/save", {
      orderId: o.id,
      orderRevision: approved.data.revision,
      revision: 0,
      period: "2026-10",
      lines: [{ currency: "TWD", claimed: price, approved: price, reason: "" }],
      note: "",
    });
    expect(rec.status).toBe(200);
    const confirmed = await accounting.call("accounting/confirm", {
      orderId: o.id,
      orderRevision: approved.data.revision,
      revision: rec.data.revision,
    });
    expected.push({ orderId: o.id, revision: confirmed.data.revision });
  }
  expect(
    (
      await accounting.call("accounting/close", {
        companyId: "DOL0001",
        period: "2026-10",
        expected: [expected[0], expected[0]],
      })
    ).status,
  ).toBe(409);
  const result = await accounting.call("accounting/close", {
    companyId: "DOL0001",
    period: "2026-10",
    expected,
  });
  expect(result.status).toBe(201);
  expect(result.data.totals).toEqual([{ currency: "TWD", amount: "0.30" }]);
});
