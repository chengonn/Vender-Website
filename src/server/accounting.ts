import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getDb, transaction, audit } from "./database";
import { accountingSchema, cents, amount } from "@/schemas/accounting-schema";
import type { AccountingRecord, MonthlyStatement } from "@/types/accounting";
import type { DemoRole, Order } from "@/types/order";
type Principal = {
  username: string;
  role: DemoRole;
  company_code: string | null;
};
const reply = (data: unknown, status = 200) =>
  Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
class AccountingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function reject(status: number, message: string): never {
  throw new AccountingError(status, message);
}
export function accountingState(user: Principal) {
  const db = getDb(),
    args = user.role === "SUPPLIER_USER" ? [user.company_code!] : [];
  return {
    accountingRecords: db
      .prepare(
        "SELECT payload FROM accounting_records" +
          (args.length ? " WHERE company_code=?" : ""),
      )
      .all(...args)
      .map((r) => JSON.parse(String(r.payload))),
    monthlyStatements: db
      .prepare(
        "SELECT payload FROM monthly_statements" +
          (args.length ? " WHERE company_code=?" : ""),
      )
      .all(...args)
      .map((r) => JSON.parse(String(r.payload))),
  };
}
export async function handleAccounting(
  req: Request,
  path: string,
  body: unknown,
  user: Principal,
): Promise<Response | undefined> {
  if (!path.startsWith("accounting/")) return;
  try {
    if (user.role !== "ACCOUNTING") reject(403, "需要 Accounting 權限");
    if (req.method !== "POST") reject(405, "請使用 POST");
    const db = getDb();
    if (path === "accounting/save") {
      const input = accountingSchema
        .extend({
          orderId: z.string(),
          orderRevision: z.number().int(),
          revision: z.number().int().min(0),
        })
        .parse(body);
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM orders WHERE id=?")
          .get(input.orderId);
        if (!row) reject(404, "找不到帳單");
        const order = JSON.parse(String(row.payload)) as Order;
        if (order.revision !== input.orderRevision)
          reject(409, "帳單已更新，請重新整理");
        if (
          order.status !== "LOCKED" ||
          order.approvedVersion !== order.version
        )
          reject(409, "必須先由 GSD 核准目前版本");
        const previousRow = db
          .prepare("SELECT payload FROM accounting_records WHERE order_id=?")
          .get(order.id);
        const previous = previousRow
          ? (JSON.parse(String(previousRow.payload)) as AccountingRecord)
          : undefined;
        if ((previous?.revision || 0) !== input.revision)
          reject(409, "對帳資料已更新，請重新整理");
        if (previous && ["RECONCILED", "CLOSED"].includes(previous.status))
          reject(409, "已確認或結帳的對帳資料不可修改");
        if (
          db
            .prepare(
              "SELECT id FROM monthly_statements WHERE company_code=? AND period=?",
            )
            .get(order.companyId, input.period)
        )
          reject(409, "此供應商月份已結帳");
        const expected = [
          ...new Set(order.charges.map((c) => c.currency)),
        ].sort();
        const actual = input.lines.map((l) => l.currency).sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          reject(422, "請按帳單幣別各填一筆，不可重複或遺漏");
        const value: AccountingRecord = {
          orderId: order.id,
          companyId: order.companyId,
          period: input.period,
          status: "DRAFT",
          revision: (previous?.revision || 0) + 1,
          orderVersion: order.version,
          lines: input.lines,
          note: input.note,
          updatedBy: user.username,
          updatedAt: new Date().toISOString(),
        };
        const unresolved = value.lines.some(
          (l) => cents(l.claimed) !== cents(l.approved) && !l.reason.trim(),
        );
        if (unresolved) value.status = "DISPUTED";
        db.prepare(
          "INSERT INTO accounting_records VALUES(?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET period=excluded.period,status=excluded.status,revision=excluded.revision,payload=excluded.payload",
        ).run(
          order.id,
          order.companyId,
          value.period,
          value.status,
          value.revision,
          JSON.stringify(value),
        );
        audit(user.username, "ACCOUNTING_SAVED", order.id);
        return reply(value);
      });
    }
    if (path === "accounting/confirm") {
      const input = z
        .object({
          orderId: z.string(),
          revision: z.number().int(),
          orderRevision: z.number().int(),
        })
        .parse(body);
      return transaction(() => {
        const row = db
          .prepare("SELECT payload FROM accounting_records WHERE order_id=?")
          .get(input.orderId);
        if (!row) reject(404, "請先儲存對帳資料");
        const value = JSON.parse(String(row.payload)) as AccountingRecord;
        const order = JSON.parse(
          String(
            db
              .prepare("SELECT payload FROM orders WHERE id=?")
              .get(input.orderId)?.payload,
          ),
        ) as Order;
        if (
          value.revision !== input.revision ||
          order.revision !== input.orderRevision
        )
          reject(409, "資料已更新，請重新整理");
        if (
          !["DRAFT", "DISPUTED"].includes(value.status) ||
          order.status !== "LOCKED" ||
          order.approvedVersion !== order.version ||
          value.orderVersion !== order.version
        )
          reject(409, "對帳版本或狀態不符，需重新對帳");
        if (
          value.lines.some(
            (l) => cents(l.claimed) !== cents(l.approved) && !l.reason.trim(),
          )
        )
          reject(422, "有金額差異時須記錄處理原因");
        if (
          db
            .prepare(
              "SELECT id FROM monthly_statements WHERE company_code=? AND period=?",
            )
            .get(value.companyId, value.period)
        )
          reject(409, "此月份已結帳");
        value.status = "RECONCILED";
        value.revision++;
        value.updatedBy = user.username;
        value.updatedAt = new Date().toISOString();
        order.status = "RECONCILED";
        order.revision = (order.revision || 0) + 1;
        order.updatedAt = value.updatedAt;
        order.history.push(user.username + "：完成對帳");
        db.prepare(
          "UPDATE accounting_records SET status=?,revision=?,payload=? WHERE order_id=?",
        ).run(
          value.status,
          value.revision,
          JSON.stringify(value),
          value.orderId,
        );
        db.prepare("UPDATE orders SET revision=?,payload=? WHERE id=?").run(
          order.revision,
          JSON.stringify(order),
          order.id,
        );
        audit(user.username, "ACCOUNTING_CONFIRMED", order.id);
        return reply(value);
      });
    }
    if (path === "accounting/close") {
      const input = z
        .object({
          companyId: z.string(),
          period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
          expected: z
            .array(
              z.object({ orderId: z.string(), revision: z.number().int() }),
            )
            .min(1),
        })
        .parse(body);
      return transaction(() => {
        if (
          db
            .prepare(
              "SELECT id FROM monthly_statements WHERE company_code=? AND period=?",
            )
            .get(input.companyId, input.period)
        )
          reject(409, "此月份已結帳，不可重複結帳");
        const rows = db
          .prepare(
            "SELECT payload FROM accounting_records WHERE company_code=? AND period=?",
          )
          .all(input.companyId, input.period);
        const records = rows.map(
          (r) => JSON.parse(String(r.payload)) as AccountingRecord,
        );
        if (!records.length || records.some((r) => r.status !== "RECONCILED"))
          reject(409, "該月份尚有未完成對帳資料或沒有可結帳資料");
        const signature = (values: { orderId: string; revision: number }[]) =>
          JSON.stringify(
            values
              .map((r) => [r.orderId, r.revision])
              .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
          );
        if (signature(records) !== signature(input.expected))
          reject(409, "結帳清單已更新，請重新檢視");
        const company = db
          .prepare("SELECT profile FROM companies WHERE code=?")
          .get(input.companyId);
        const id = "MONTH-" + randomUUID(),
          now = new Date().toISOString(),
          totals = new Map<string, bigint>();
        for (const record of records) {
          const order = JSON.parse(
            String(
              db
                .prepare("SELECT payload FROM orders WHERE id=?")
                .get(record.orderId)?.payload,
            ),
          ) as Order;
          if (
            order.status !== "RECONCILED" ||
            record.orderVersion !== order.version
          )
            reject(409, "帳單版本或狀態已改變");
          for (const line of record.lines)
            totals.set(
              line.currency,
              (totals.get(line.currency) || 0n) + cents(line.approved),
            );
          record.status = "CLOSED";
          record.revision++;
          record.statementId = id;
          record.updatedAt = now;
          record.updatedBy = user.username;
          order.status = "MONTH_CLOSED";
          order.revision = (order.revision || 0) + 1;
          order.updatedAt = now;
          order.history.push(
            user.username + "：月結 " + input.period + " " + id,
          );
          db.prepare(
            "UPDATE accounting_records SET status=?,revision=?,payload=? WHERE order_id=?",
          ).run(
            record.status,
            record.revision,
            JSON.stringify(record),
            record.orderId,
          );
          db.prepare("UPDATE orders SET revision=?,payload=? WHERE id=?").run(
            order.revision,
            JSON.stringify(order),
            order.id,
          );
        }
        const value: MonthlyStatement = {
          id,
          companyId: input.companyId,
          companyName: JSON.parse(String(company?.profile)).companyNameC,
          period: input.period,
          records,
          totals: [...totals].map(([currency, total]) => ({
            currency,
            amount: amount(total),
          })),
          closedBy: user.username,
          closedAt: now,
        };
        db.prepare("INSERT INTO monthly_statements VALUES(?,?,?,?)").run(
          id,
          value.companyId,
          value.period,
          JSON.stringify(value),
        );
        audit(user.username, "MONTH_CLOSED", id);
        return reply(value, 201);
      });
    }
    reject(404, "找不到帳務 API");
  } catch (e) {
    if (e instanceof AccountingError)
      return Response.json(
        { error: e.message },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    throw e;
  }
}
