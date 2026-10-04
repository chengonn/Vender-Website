import { z } from "zod";
export const money = z
  .string()
  .regex(
    /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/,
    "金額需為非負數，最多10位整數及2位小數",
  );
export const accountingSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "請選擇結帳月份"),
  lines: z
    .array(
      z.object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        claimed: money,
        approved: money,
        reason: z.string().max(2000),
      }),
    )
    .min(1)
    .max(30),
  note: z.string().max(2000),
});
export function cents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function amount(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
