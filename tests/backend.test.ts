import { encryptPassword, decryptPassword } from "@/server/password-vault";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleApi } from "@/server/api";
import { getDb, closeDatabase } from "@/server/database";
import { blankOrder } from "@/data/mock-orders";
import { initialSuppliers } from "@/features/suppliers/supplier-model";
const origin = "http://127.0.0.1:3100";
function client() {
  let cookie = "";
  return {
    async call(path: string, body?: unknown) {
      const response = await handleApi(
        new Request(`${origin}/api/v1/${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      const next = response.headers.get("set-cookie");
      if (next) cookie = next.split(";")[0];
      return { status: response.status, ...(await response.json()) };
    },
  };
}
const gsd = client();
const admin = client(),
  vendor = client(),
  other = client(),
  anonymous = client();
let createdCode = "",
  orderId = "";
beforeAll(() => {
  process.env.DEMO_VAULT_KEY_PATH = join(
    mkdtempSync(join(tmpdir(), "vendor-key-")),
    "vault.key",
  );
  process.env.DEMO_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "vendor-api-")),
    "test.sqlite",
  );
});
afterAll(() => closeDatabase());
describe("本機 API + 真實 SQLite", () => {
  it("健康檢查已連接 SQLite，未登入不可取資料", async () => {
    expect((await anonymous.call("health")).data.database).toBe("sqlite");
    expect((await anonymous.call("state")).status).toBe(401);
  });
  it("錯誤密碼與跨站 POST 拒絕", async () => {
    expect(
      (
        await anonymous.call("auth/login", {
          username: "ADMIN-DEMO",
          password: "bad",
        })
      ).status,
    ).toBe(401);
    const r = await handleApi(
      new Request(origin + "/api/v1/auth/login", {
        method: "POST",
        headers: {
          Origin: "http://evil.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(r.status).toBe(403);
  });
  it("Admin 登入，API 不回傳雜湊或現行密碼", async () => {
    expect(
      (
        await admin.call("auth/login", {
          username: "ADMIN-DEMO",
          password: "Demo1234!",
        })
      ).status,
    ).toBe(200);
    await gsd.call("auth/login", {
      username: "GSD-DEMO",
      password: "Demo1234!",
    });
    const state = await admin.call("state");
    expect(state.data.user.role).toBe("ADMIN");
    expect(JSON.stringify(state)).not.toContain("password_hash");
    expect(JSON.stringify(state)).not.toContain("Demo1234!");
  });
  it("公司提供的密碼直接登入，不要求自行更改", async () => {
    const result = await vendor.call("auth/login", {
      username: "DOL0001",
      password: "Demo1234!",
    });
    expect(result.data.mustChangePassword).toBe(false);
    expect((await vendor.call("state")).data.orders).toHaveLength(6);
    expect(
      (
        await vendor.call("auth/change-password", {
          oldPassword: "Demo1234!",
          newPassword: "Changed123!",
        })
      ).status,
    ).toBe(410);
  });
  it("另一供應商沒有其他公司訂單，也不能使用Admin建檔", async () => {
    await other.call("auth/login", {
      username: "SOL0001",
      password: "Demo1234!",
    });
    expect((await other.call("state")).data.orders).toEqual([]);
    expect((await other.call("suppliers", initialSuppliers[0])).status).toBe(
      403,
    );
    expect(
      (
        await other.call("orders/DEMO-002/change-request", {
          revision: 1,
          reason: "test",
        })
      ).status,
    ).toBe(404);
  });
  it("POST 建檔保存資料、分開雜湊，不能由表單升權", async () => {
    expect(
      (await admin.call("suppliers", { ...initialSuppliers[0], role: "Admin" }))
        .status,
    ).toBe(422);
    const r = await admin.call("suppliers", {
      ...initialSuppliers[0],
      companyNameE: "Test Vendor Demo",
      companyNameC: "測試供應商",
    });
    expect(r.status).toBe(201);
    createdCode = r.data.code;
    expect(createdCode).toMatch(/^TES[0-9]{4}$/);
    const row = getDb()
      .prepare("SELECT * FROM users WHERE username=?")
      .get(createdCode);
    expect(row?.password_hash).not.toBe("Demo1234!");
    expect(
      String(
        getDb()
          .prepare("SELECT profile FROM companies WHERE code=?")
          .get(createdCode)?.profile,
      ),
    ).not.toContain("Demo1234!");
  });
  it("待審帳號不能登入、退回必填、通過後才開放", async () => {
    expect(
      (
        await anonymous.call("auth/login", {
          username: createdCode,
          password: "Demo1234!",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin.call(`suppliers/${createdCode}/review`, {
          approved: false,
          note: "",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await admin.call(`suppliers/${createdCode}/review`, {
          approved: true,
          note: "已核對",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await admin.call(`suppliers/${createdCode}/review`, {
          approved: true,
          note: "重複",
        })
      ).status,
    ).toBe(409);
  });
  it("Session與公司狀態持久化，關閉立即阻擋既有Session", async () => {
    const c = client();
    await c.call("auth/login", {
      username: createdCode,
      password: "Demo1234!",
    });
    expect((await c.call("state")).status).toBe(200);
    await admin.call(`suppliers/${createdCode}/status`, { enabled: "關閉" });
    expect((await c.call("state")).status).toBe(401);
  });
  it("停用自助忘記密碼，沒有新增申請", async () => {
    expect(
      (await anonymous.call("auth/password-help", { username: "DOL0001" }))
        .status,
    ).toBe(410);
    expect((await admin.call("state")).data.passwordRequests).toEqual([]);
  });
  it("密碼查看限Admin、再次驗證且不進入state或稽核明文", async () => {
    const path = `suppliers/${createdCode}/password/reveal`;
    expect(
      (await anonymous.call(path, { adminPassword: "Demo1234!" })).status,
    ).toBe(401);
    expect(
      (await other.call(path, { adminPassword: "Demo1234!" })).status,
    ).toBe(403);
    expect((await admin.call(path, { adminPassword: "wrong" })).status).toBe(
      403,
    );
    expect(
      (await admin.call(path, { adminPassword: "Demo1234!" })).data.password,
    ).toBe("Demo1234!");
    const row = getDb()
      .prepare("SELECT * FROM users WHERE username=?")
      .get(createdCode)!;
    expect(String(row.password_ciphertext)).not.toContain("Demo1234!");
    expect(JSON.stringify((await admin.call("state")).data)).not.toContain(
      "Demo1234!",
    );
    expect(
      JSON.stringify(getDb().prepare("SELECT * FROM audit_logs").all()),
    ).not.toContain("Demo1234!");
  });
  it("公司重設密碼立即撤銷登入，舊密碼失效且新密碼可查看", async () => {
    const c = client();
    await admin.call(`suppliers/${createdCode}/status`, { enabled: "啟用" });
    await c.call("auth/login", {
      username: createdCode,
      password: "Demo1234!",
    });
    expect(
      (
        await other.call(`suppliers/${createdCode}/password/set`, {
          adminPassword: "Demo1234!",
          newPassword: "Company5678!",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await admin.call(`suppliers/${createdCode}/password/set`, {
          adminPassword: "Demo1234!",
          newPassword: "Company5678!",
        })
      ).status,
    ).toBe(200);
    expect((await c.call("state")).status).toBe(401);
    expect(
      (
        await c.call("auth/login", {
          username: createdCode,
          password: "Demo1234!",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await c.call("auth/login", {
          username: createdCode,
          password: "Company5678!",
        })
      ).data.mustChangePassword,
    ).toBe(false);
    closeDatabase();
    expect(
      (
        await admin.call(`suppliers/${createdCode}/password/reveal`, {
          adminPassword: "Demo1234!",
        })
      ).data.password,
    ).toBe("Company5678!");
  });
  it("舊雜湊不能假裝還原，管理員可重新設定", async () => {
    getDb()
      .prepare("UPDATE users SET password_ciphertext=NULL WHERE username=?")
      .run(createdCode);
    expect(
      (
        await admin.call(`suppliers/${createdCode}/password/reveal`, {
          adminPassword: "Demo1234!",
        })
      ).status,
    ).toBe(409);
  });
  it("POST草稿忽略偽造公司，重新讀取存在，revision防覆蓋", async () => {
    const values = {
      ...blankOrder,
      customerName: "測試客戶",
      fileNumber: "API-TEST",
    };
    const r = await vendor.call("orders/save", {
      values,
      attachments: [],
      submit: false,
      companyId: "SOL0001",
    });
    expect(r.status).toBe(200);
    orderId = r.data.id;
    expect(r.data.companyId).toBe("DOL0001");
    expect(
      (
        await vendor.call("orders/save", {
          values,
          attachments: [],
          submit: false,
          id: orderId,
          revision: 0,
        })
      ).status,
    ).toBe(409);
    const state = await vendor.call("state");
    expect(
      state.data.orders.some((o: { id: string }) => o.id === orderId),
    ).toBe(true);
  });
  it("送出建立不可變版本，锁定後不能直接儲存", async () => {
    const r = await vendor.call("orders/save", {
      values: {
        ...blankOrder,
        customerName: "測試客戶",
        fileNumber: "API-TEST",
      },
      attachments: [],
      submit: true,
      id: orderId,
      revision: 1,
    });
    expect(r.data.status).toBe("SUBMITTED");
    expect(
      getDb()
        .prepare("SELECT count(*) n FROM order_versions WHERE order_id=?")
        .get(orderId)?.n,
    ).toBe(1);
    expect(
      (
        await vendor.call("orders/save", {
          values: blankOrder,
          attachments: [],
          submit: false,
          id: orderId,
          revision: 2,
        })
      ).status,
    ).toBe(409);
  });
  it("剛好24小時或過期不能申請", async () => {
    expect(
      (
        await vendor.call("orders/DEMO-005/change-request", {
          revision: 1,
          reason: "過期",
        })
      ).status,
    ).toBe(422);
    const row = getDb()
      .prepare("SELECT payload FROM orders WHERE id=?")
      .get(orderId)!;
    const order = JSON.parse(String(row.payload));
    order.submittedAt = new Date(Date.now() - 86400000).toISOString();
    getDb()
      .prepare("UPDATE orders SET payload=? WHERE id=?")
      .run(JSON.stringify(order), orderId);
    expect(
      (
        await vendor.call(`orders/${orderId}/change-request`, {
          revision: 2,
          reason: "邊界",
        })
      ).status,
    ).toBe(422);
  });
  it("修改申請核准後可編輯並重送，舊版不變", async () => {
    expect(
      (
        await vendor.call("orders/DEMO-002/change-request", {
          revision: 1,
          reason: "補充內容",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await other.call("orders/DEMO-002/decide-change", {
          revision: 2,
          approved: true,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await gsd.call("orders/DEMO-002/decide-change", {
          revision: 2,
          approved: true,
        })
      ).data.status,
    ).toBe("EDITABLE");
    const latest = (await vendor.call("state")).data.orders.find(
      (o: { id: string }) => o.id === "DEMO-002",
    );
    expect(
      (
        await vendor.call("orders/save", {
          values: { ...latest, note: "新版內容" },
          attachments: [],
          id: latest.id,
          revision: 3,
          submit: true,
        })
      ).data.version,
    ).toBe(2);
    expect(
      String(
        getDb()
          .prepare(
            "SELECT payload FROM order_versions WHERE order_id='DEMO-002' AND version=1",
          )
          .get()?.payload,
      ),
    ).not.toContain("新版內容");
  });
  it("GSD帳單審核實際更新狀態", async () => {
    const r = await gsd.call("orders/DEMO-002/review", {
      revision: 4,
      approved: true,
      reason: "通過",
    });
    expect(r.data.status).toBe("LOCKED");
  });
  it("重啟資料庫仍保留新增資料與審核紀錄", async () => {
    closeDatabase();
    expect(
      (await admin.call("state")).data.suppliers.some(
        (s: { code: string }) => s.code === createdCode,
      ),
    ).toBe(true);
    expect(
      getDb().prepare("SELECT count(*) n FROM audit_logs").get()?.n,
    ).toBeGreaterThan(10);
  });
  it("登出後Session不可再使用", async () => {
    await vendor.call("auth/logout", {});
    expect((await vendor.call("state")).status).toBe(401);
  });
});

it("Next.js內部URL不同時仍依合法Host驗證Origin", async () => {
  const r = await handleApi(
    new Request("http://localhost:3100/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:3100",
        Origin: "http://127.0.0.1:3100",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  expect(r.status).toBe(200);
});
it("核准後逾期會恢復送出快照並拒絕工作稿覆寫", async () => {
  const c = client();
  await c.call("auth/login", { username: "DOL0001", password: "Demo1234!" });
  expect(
    (
      await c.call("orders/DEMO-004/change-request", {
        revision: 1,
        reason: "期限測試",
      })
    ).status,
  ).toBe(200);
  await gsd.call("orders/DEMO-004/decide-change", {
    revision: 2,
    approved: true,
  });
  const order = (await c.call("state")).data.orders.find(
    (o: { id: string }) => o.id === "DEMO-004",
  );
  await c.call("orders/save", {
    values: { ...order, note: "未送出工作稿" },
    attachments: [],
    id: order.id,
    revision: 3,
    submit: false,
  });
  getDb()
    .prepare(
      "UPDATE modification_requests SET editable_until=? WHERE order_id='DEMO-004' AND status='APPROVED'",
    )
    .run(new Date(Date.now() - 1000).toISOString());
  const restored = (await c.call("state")).data.orders.find(
    (o: { id: string }) => o.id === "DEMO-004",
  );
  expect(restored.status).toBe("LOCKED");
  expect(restored.note).not.toBe("未送出工作稿");
  expect(
    (
      await c.call("orders/save", {
        values: order,
        attachments: [],
        id: order.id,
        revision: restored.revision,
        submit: false,
      })
    ).status,
  ).toBe(409);
});

it("加密不可跨帳號交換或竄改", () => {
  const value = encryptPassword("VaultTest123!", "ABC4827");
  expect(decryptPassword(value, "ABC4827")).toBe("VaultTest123!");
  expect(() => decryptPassword(value, "XYZ4827")).toThrow();
  const parts = value.split(":");
  parts[3] = Buffer.from("tampered").toString("base64");
  expect(() => decryptPassword(parts.join(":"), "ABC4827")).toThrow();
});
it("Admin密碼驗證五次失敗後限流", async () => {
  for (let i = 0; i < 5; i++)
    expect(
      (
        await admin.call("suppliers/DOL0001/password/reveal", {
          adminPassword: "wrong",
        })
      ).status,
    ).toBe(403);
  expect(
    (
      await admin.call("suppliers/DOL0001/password/reveal", {
        adminPassword: "Demo1234!",
      })
    ).status,
  ).toBe(429);
});
