import { handleAccounting, accountingState } from "./accounting";
import { encryptPassword, decryptPassword } from "./password-vault";
import { randomBytes, randomUUID, randomInt } from "node:crypto";
import { z } from "zod";
import {
  getDb,
  hashPassword,
  verifyPassword,
  tokenHash,
  transaction,
  audit,
} from "./database";
import {
  supplierSchema,
  nextCompanyCode,
  type Supplier,
} from "@/features/suppliers/supplier-model";
import { orderSchema } from "@/schemas/order-schema";
import type { Order } from "@/types/order";
type User = {
  username: string;
  company_code: string | null;
  role: "ADMIN" | "SUPPLIER_USER" | "GSD" | "ACCOUNTING";
  password_hash: string;
  must_change: number;
  enabled: number;
};
type StoredOrder = Order & { revision: number; editableUntil?: string };
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(
    { data },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
const cookie = (token: string, age = 28800) =>
  `vendor_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`;
function sessionToken(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("vendor_session="))
      ?.slice(15) || ""
  );
}
function principal(req: Request): User {
  const row = getDb()
    .prepare(
      "SELECT u.* FROM sessions s JOIN users u ON u.username=s.username WHERE s.token_hash=? AND s.expires>?",
    )
    .get(tokenHash(sessionToken(req)), Date.now()) as User | undefined;
  if (!row || !row.enabled) fail(401, "請先登入");
  if (row.company_code) {
    const c = getDb()
      .prepare("SELECT review,enabled FROM companies WHERE code=?")
      .get(row.company_code);
    if (c?.review !== "通過" || c?.enabled !== "啟用")
      fail(403, "帳號尚未通過審核或已關閉");
  }
  return row;
}
function admin(user: User) {
  if (user.role !== "ADMIN") fail(403, "需要 Admin 權限");
}
function readOrder(id: string, user: User) {
  const row = getDb().prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (
    !row ||
    (user.role === "SUPPLIER_USER" && row.company_code !== user.company_code)
  )
    fail(404, "找不到訂單");
  return JSON.parse(String(row.payload)) as StoredOrder;
}
function writeOrder(order: StoredOrder, user: User) {
  order.revision++;
  order.updatedAt = new Date().toISOString();
  getDb()
    .prepare("UPDATE orders SET revision=?,payload=? WHERE id=?")
    .run(order.revision, JSON.stringify(order), order.id);
  audit(user.username, "ORDER_UPDATE", order.id);
  return order;
}
function version(order: StoredOrder) {
  getDb()
    .prepare("INSERT INTO order_versions VALUES(?,?,?,?)")
    .run(
      order.id,
      order.version,
      JSON.stringify(order),
      new Date().toISOString(),
    );
}
function suppliers() {
  return getDb()
    .prepare(
      "SELECT c.*,u.must_change FROM companies c JOIN users u ON u.company_code=c.code ORDER BY c.code",
    )
    .all()
    .map((row) => ({
      ...JSON.parse(String(row.profile)),
      code: row.code,
      review: row.review,
      enabled: row.enabled,
      reviewNote: row.review_note,
      mustChangePassword: false,
      password: "",
    }));
}
function expireEdits() {
  const db = getDb();
  transaction(() => {
    for (const r of db
      .prepare(
        "SELECT * FROM modification_requests WHERE status='APPROVED' AND editable_until<=?",
      )
      .all(new Date().toISOString())) {
      const row = db
        .prepare("SELECT payload FROM orders WHERE id=?")
        .get(r.order_id);
      if (row) {
        const current = JSON.parse(String(row.payload)) as StoredOrder;
        if (current.status === "EDITABLE") {
          const last = db
            .prepare(
              "SELECT payload FROM order_versions WHERE order_id=? ORDER BY version DESC LIMIT 1",
            )
            .get(r.order_id);
          const restored = {
            ...(last ? JSON.parse(String(last.payload)) : current),
            status: "LOCKED",
            editableUntil: undefined,
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
            history: [...current.history, "修改期限已過，恢復最後送出版"],
          };
          db.prepare("UPDATE orders SET revision=?,payload=? WHERE id=?").run(
            restored.revision,
            JSON.stringify(restored),
            r.order_id,
          );
        }
      }
      db.prepare(
        "UPDATE modification_requests SET status='EXPIRED' WHERE id=?",
      ).run(r.id);
      audit("SYSTEM", "EDIT_WINDOW_EXPIRED", String(r.order_id));
    }
  });
}
const password = z.string().min(8, "密碼至少 8 碼").max(128);
export async function handleApi(req: Request) {
  try {
    const url = new URL(req.url),
      path = url.pathname.replace(/^\/api\/v1\//, "");
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
      fail(403, "此 Demo 僅供本機使用");
    const requestHost = new URL(
      `${url.protocol}//${req.headers.get("host") || url.host}`,
    );
    if (!["127.0.0.1", "localhost", "[::1]"].includes(requestHost.hostname))
      fail(403, "此 Demo 僅供本機使用");
    if (req.method !== "GET") {
      if (
        req.headers.get("origin") !==
        `${url.protocol}//${req.headers.get("host") || url.host}`
      )
        fail(403, "來源驗證失敗，POST 請附同源 Origin");
      if (!req.headers.get("content-type")?.includes("application/json"))
        fail(415, "請使用 application/json");
    }
    const db = getDb();
    if (req.method === "GET" && path === "health")
      return json({ status: "ok", database: "sqlite", mode: "local-demo" });
    let body: unknown = {};
    if (req.method !== "GET") {
      const text = await req.text();
      if (text.length > 200000) fail(413, "內容過大");
      try {
        body = JSON.parse(text);
      } catch {
        fail(400, "JSON 格式錯誤");
      }
    }
    if (path === "auth/login" && req.method === "POST") {
      const input = z
        .object({
          username: z.string().trim().min(1).max(100),
          password: z.string().max(128),
        })
        .parse(body);
      const attempt = db
        .prepare("SELECT * FROM login_attempts WHERE username=?")
        .get(input.username);
      if (
        attempt &&
        Number(attempt.reset_at) > Date.now() &&
        Number(attempt.count) >= 10
      )
        fail(429, "登入嘗試過多，請 15 分鐘後再試");
      const user = db
        .prepare("SELECT * FROM users WHERE username=?")
        .get(input.username) as User | undefined;
      if (!user || !verifyPassword(input.password, user.password_hash)) {
        db.prepare(
          "INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET count=CASE WHEN reset_at>? THEN count+1 ELSE 1 END,reset_at=CASE WHEN reset_at>? THEN reset_at ELSE excluded.reset_at END",
        ).run(input.username, Date.now() + 900000, Date.now(), Date.now());
        fail(401, "帳號或密碼不正確");
      }
      if (!user.enabled) fail(403, "帳號已關閉");
      if (user.company_code) {
        const c = db
          .prepare("SELECT * FROM companies WHERE code=?")
          .get(user.company_code);
        if (c?.review !== "通過" || c.enabled !== "啟用")
          fail(403, "此帳號尚未通過建檔審核或已關閉");
      }
      const token = randomBytes(32).toString("hex");
      transaction(() => {
        db.prepare("DELETE FROM sessions WHERE expires<? OR token_hash=?").run(
          Date.now(),
          tokenHash(sessionToken(req)),
        );
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          tokenHash(token),
          user.username,
          Date.now() + 28800000,
        );
        db.prepare("DELETE FROM login_attempts WHERE username=?").run(
          user.username,
        );
        audit(user.username, "LOGIN", user.username);
      });
      return json(
        {
          username: user.username,
          role: user.role,
          mustChangePassword: false,
        },
        200,
        { "Set-Cookie": cookie(token) },
      );
    }
    if (path === "auth/logout" && req.method === "POST") {
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
        tokenHash(sessionToken(req)),
      );
      return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
    }
    if (["auth/password-help", "auth/change-password"].includes(path))
      fail(410, "帳密由公司管理；忘記密碼或人員異動請聯絡公司");
    const user = principal(req);
    expireEdits();
    if (path === "state" && req.method === "GET") {
      const orders = db
        .prepare(
          user.role !== "SUPPLIER_USER"
            ? "SELECT payload FROM orders ORDER BY rowid DESC"
            : "SELECT payload FROM orders WHERE company_code=? ORDER BY rowid DESC",
        )
        .all(...(user.role !== "SUPPLIER_USER" ? [] : [user.company_code!]))
        .map((r) => JSON.parse(String(r.payload)));
      const recs = db
        .prepare(
          user.role !== "SUPPLIER_USER"
            ? "SELECT payload FROM reconciliations"
            : "SELECT payload FROM reconciliations WHERE company_code=?",
        )
        .all(...(user.role !== "SUPPLIER_USER" ? [] : [user.company_code!]))
        .map((r) => JSON.parse(String(r.payload)));
      return json({
        user: {
          username: user.username,
          role: user.role,
          companyId: user.company_code,
        },
        ...accountingState(user),
        orders,
        reconciliations: recs,
        suppliers: user.role === "ADMIN" ? suppliers() : [],
        passwordRequests: [],
      });
    }
    const accountingResponse = await handleAccounting(req, path, body, user);
    if (accountingResponse) return accountingResponse;
    if (path === "suppliers" && req.method === "POST") {
      admin(user);
      const input = supplierSchema.parse(body);
      password.parse(input.password);
      if (input.role !== "Vendor")
        fail(422, "Demo 建檔僅開放 Vendor，內部角色不由供應商表單建立");
      return transaction(() => {
        const code = nextCompanyCode(
          input.companyNameE,
          suppliers() as Supplier[],
          randomInt,
        );
        const { password: plain, ...profile } = input;
        db.prepare(
          "INSERT INTO companies(code,profile,review,enabled) VALUES(?,?,?,?)",
        ).run(code, JSON.stringify(profile), "待審核", input.enabled);
        db.prepare(
          "INSERT INTO users(username,company_code,role,password_hash,must_change,password_ciphertext) VALUES(?,?,?,?,0,?)",
        ).run(
          code,
          code,
          "SUPPLIER_USER",
          hashPassword(plain),
          encryptPassword(plain, code),
        );
        audit(user.username, "SUPPLIER_CREATED", code);
        return json({ code }, 201);
      });
    }
    const credentialPath = path.match(
      /^suppliers\/([^/]+)\/password\/(reveal|set)$/,
    );
    if (credentialPath && req.method === "POST") {
      admin(user);
      const [, code, action] = credentialPath;
      const input = z
        .object({
          adminPassword: z.string().max(128),
          newPassword: password.optional(),
        })
        .parse(body);
      const attemptKey = "reauth:" + user.username;
      const attempt = db
        .prepare("SELECT * FROM login_attempts WHERE username=?")
        .get(attemptKey);
      if (
        attempt &&
        Number(attempt.reset_at) > Date.now() &&
        Number(attempt.count) >= 5
      )
        fail(429, "驗證嘗試過多，請 15 分鐘後再試");
      if (!verifyPassword(input.adminPassword, user.password_hash)) {
        db.prepare(
          "INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET count=CASE WHEN reset_at>? THEN count+1 ELSE 1 END,reset_at=CASE WHEN reset_at>? THEN reset_at ELSE excluded.reset_at END",
        ).run(attemptKey, Date.now() + 900000, Date.now(), Date.now());
        audit(user.username, "PASSWORD_ACCESS_DENIED", code);
        fail(403, "Admin 密碼不正確");
      }
      db.prepare("DELETE FROM login_attempts WHERE username=?").run(attemptKey);
      const target = db
        .prepare(
          "SELECT * FROM users WHERE company_code=? AND role='SUPPLIER_USER'",
        )
        .get(code);
      if (!target) fail(404, "找不到供應商帳號");
      if (action === "reveal") {
        if (!target.password_ciphertext)
          fail(409, "舊帳號僅有密碼雜湊，無法還原；請由公司重新設定密碼");
        const plain = decryptPassword(
          String(target.password_ciphertext),
          String(target.username),
        );
        audit(user.username, "PASSWORD_REVEALED", String(target.username));
        return json({ password: plain });
      }
      const next = password.parse(input.newPassword);
      return transaction(() => {
        db.prepare(
          "UPDATE users SET password_hash=?,password_ciphertext=?,must_change=0 WHERE username=?",
        ).run(
          hashPassword(next),
          encryptPassword(next, String(target.username)),
          target.username,
        );
        db.prepare("DELETE FROM sessions WHERE username=?").run(
          target.username,
        );
        audit(user.username, "PASSWORD_SET_BY_ADMIN", String(target.username));
        return json({ ok: true });
      });
    }
    const supplierPath = path.match(/^suppliers\/([^/]+)\/(review|status)$/);
    if (supplierPath && req.method === "POST") {
      admin(user);
      const [, code, action] = supplierPath;
      return transaction(() => {
        const c = db.prepare("SELECT * FROM companies WHERE code=?").get(code);
        if (!c) fail(404, "找不到供應商");
        if (action === "review") {
          const { approved, note } = z
            .object({ approved: z.boolean(), note: z.string().max(2000) })
            .parse(body);
          if (c.review !== "待審核") fail(409, "此建檔已完成審核");
          if (!approved && !note.trim()) fail(422, "退回時請填寫原因");
          db.prepare(
            "UPDATE companies SET review=?,review_note=? WHERE code=?",
          ).run(approved ? "通過" : "退回", note, code);
        } else {
          const { enabled } = z
            .object({ enabled: z.enum(["啟用", "關閉"]) })
            .parse(body);
          db.prepare("UPDATE companies SET enabled=? WHERE code=?").run(
            enabled,
            code,
          );
          if (enabled === "關閉")
            db.prepare(
              "DELETE FROM sessions WHERE username IN (SELECT username FROM users WHERE company_code=?)",
            ).run(code);
        }
        audit(user.username, "SUPPLIER_" + action.toUpperCase(), code);
        return json({ ok: true });
      });
    }
    if (path === "orders/save" && req.method === "POST") {
      const input = z
        .object({
          values: orderSchema,
          attachments: z.array(z.string().max(255)).max(20),
          id: z.string().optional(),
          submit: z.boolean(),
          revision: z.number().int().optional(),
        })
        .parse(body);
      if (user.role !== "SUPPLIER_USER") fail(403, "Demo 訂單由供應商建立");
      return transaction(() => {
        let previous: StoredOrder | undefined;
        if (input.id) {
          previous = readOrder(input.id, user);
          if (previous.revision !== input.revision)
            fail(409, "資料已更新，請重新整理");
          if (
            !["DRAFT", "REJECTED", "CORRECTION_REQUIRED", "EDITABLE"].includes(
              previous.status,
            )
          )
            fail(409, "訂單已鎖定");
          if (
            previous.status === "EDITABLE" &&
            (!Number.isFinite(Date.parse(previous.editableUntil || "")) ||
              Date.parse(previous.editableUntil || "") <= Date.now())
          )
            fail(422, "編輯期限已過");
        }
        if (
          input.submit &&
          (!input.values.customerName.trim() ||
            !input.values.fileNumber.trim() ||
            input.values.charges.length === 0)
        )
          fail(422, "Demo 送出需客戶名稱、File No. 與至少一筆費用");
        const company = db
          .prepare("SELECT profile FROM companies WHERE code=?")
          .get(user.company_code!);
        const supplierName = JSON.parse(String(company?.profile)).companyNameC;
        const order: StoredOrder = {
          ...input.values,
          supplierName,
          id: previous?.id || `ORD-${randomUUID()}`,
          companyId: user.company_code!,
          status: input.submit
            ? previous?.version
              ? "RESUBMITTED"
              : "SUBMITTED"
            : previous?.status || "DRAFT",
          version: (previous?.version || 0) + (input.submit ? 1 : 0),
          revision: previous?.revision || 0,
          displayAmount: "未計算（Demo）",
          updatedAt: new Date().toISOString(),
          attachments: input.attachments,
          history: [
            ...(previous?.history || []),
            input.submit ? "API 送出並鎖定" : "API 儲存草稿",
          ],
          submittedAt:
            previous?.submittedAt ||
            (input.submit ? new Date().toISOString() : undefined),
          editableUntil: input.submit ? undefined : previous?.editableUntil,
        };
        if (!previous)
          db.prepare("INSERT INTO orders VALUES(?,?,?,?)").run(
            order.id,
            user.company_code!,
            0,
            JSON.stringify(order),
          );
        writeOrder(order, user);
        if (input.submit) {
          version(order);
          db.prepare(
            "UPDATE modification_requests SET status='COMPLETED' WHERE order_id=? AND status='APPROVED'",
          ).run(order.id);
        }
        return json(order);
      });
    }
    const orderPath = path.match(
      /^orders\/([^/]+)\/(change-request|review|decide-change)$/,
    );
    if (orderPath && req.method === "POST") {
      const [, id, action] = orderPath;
      const input = z
        .object({
          reason: z.string().max(2000).optional(),
          approved: z.boolean().optional(),
          correction: z.boolean().optional(),
          revision: z.number().int(),
        })
        .parse(body);
      return transaction(() => {
        const order = readOrder(id, user);
        if (order.revision !== input.revision)
          fail(409, "資料已更新，請重新整理");
        if (action === "change-request") {
          if (user.role !== "SUPPLIER_USER") fail(403, "修改申請由供應商提出");
          if (
            !["SUBMITTED", "UNDER_REVIEW", "LOCKED", "RESUBMITTED"].includes(
              order.status,
            )
          )
            fail(409, "此狀態不能提出修改申請");
          const elapsed = Date.now() - Date.parse(order.submittedAt || "");
          if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 86400000)
            fail(422, "已超過送出後 24 小時");
          if (!input.reason?.trim()) fail(422, "請填寫修改原因");
          db.prepare(
            "INSERT INTO modification_requests(order_id,company_code,reason,status,previous_status,created_at) VALUES(?,?,?,'PENDING',?,?)",
          ).run(
            id,
            order.companyId,
            input.reason,
            order.status,
            new Date().toISOString(),
          );
          order.status = "UNLOCK_REQUESTED";
          order.changeReason = input.reason;
        } else if (action === "decide-change") {
          if (user.role !== "GSD") fail(403, "需要 GSD 審核權限");
          const request = db
            .prepare(
              "SELECT * FROM modification_requests WHERE order_id=? AND status='PENDING'",
            )
            .get(id);
          if (!request || order.status !== "UNLOCK_REQUESTED")
            fail(409, "沒有待核准申請");
          if (typeof input.approved !== "boolean") fail(422, "請選擇審核結果");
          order.status = input.approved
            ? "EDITABLE"
            : (String(request.previous_status) as Order["status"]);
          order.editableUntil = input.approved
            ? new Date(Date.now() + 86400000).toISOString()
            : undefined;
          db.prepare(
            "UPDATE modification_requests SET status=?,editable_until=? WHERE id=?",
          ).run(
            input.approved ? "APPROVED" : "REJECTED",
            order.editableUntil || null,
            request.id,
          );
        } else {
          if (user.role !== "GSD") fail(403, "需要 GSD 審核權限");
          if (
            !["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(
              order.status,
            ) &&
            !(
              order.status === "LOCKED" &&
              order.approvedVersion !== order.version
            )
          )
            fail(409, "此狀態不能審核");
          if (typeof input.approved !== "boolean") fail(422, "請選擇審核結果");
          if (!input.approved && !input.reason?.trim())
            fail(422, "退回須填說明");
          if (input.approved && input.correction)
            fail(422, "不能同時核准與要求更正");
          order.status = input.approved
            ? "LOCKED"
            : input.correction
              ? "CORRECTION_REQUIRED"
              : "REJECTED";
          order.approvedVersion = input.approved ? order.version : undefined;
        }
        order.history.push(
          `${user.username}：${action} ${input.approved === undefined ? "" : input.approved ? "通過" : input.correction ? "要求更正" : "退回"} ${input.reason || ""}`,
        );
        return json(writeOrder(order, user));
      });
    }
    if (path.startsWith("reconciliations/") && req.method === "POST") {
      if (user.role !== "SUPPLIER_USER") fail(403, "供應商意見由 Vendor 提出");
      const id = path.slice("reconciliations/".length);
      const row = db
        .prepare("SELECT * FROM reconciliations WHERE id=?")
        .get(id);
      if (!row || row.company_code !== user.company_code)
        fail(404, "找不到對帳資料");
      const { response, reason } = z
        .object({
          response: z.enum(["AGREE", "DISPUTE"]),
          reason: z.string().max(2000),
        })
        .parse(body);
      if (response === "DISPUTE" && !reason.trim())
        fail(422, "提出差異時請填寫原因");
      const value = { ...JSON.parse(String(row.payload)), response, reason };
      transaction(() => {
        db.prepare("UPDATE reconciliations SET payload=? WHERE id=?").run(
          JSON.stringify(value),
          id,
        );
        audit(user.username, "RECONCILIATION_RESPONSE", id);
      });
      return json(value);
    }
    fail(404, "API 不存在");
  } catch (e) {
    if (e instanceof ApiError)
      return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
      return Response.json(
        { error: e.issues.map((i) => i.message).join("；") },
        { status: 422 },
      );
    console.error("Demo API error", e instanceof Error ? e.name : "Unknown");
    return Response.json({ error: "伺服器處理失敗" }, { status: 500 });
  }
}
