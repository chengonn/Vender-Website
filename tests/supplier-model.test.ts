import { it, expect } from "vitest";
import {
  nextCompanyCode,
  initialSuppliers,
  supplierSchema,
} from "@/features/suppliers/supplier-model";
it("前三英文字母加四位亂碼，保留前導零且避開碰撞", () => {
  expect(nextCompanyCode("GRAND OCEAN LOGISTICS", [], () => 4827)).toBe(
    "GRA4827",
  );
  expect(nextCompanyCode("  Grand Ocean", [], () => 7)).toBe("GRA0007");
  expect(
    nextCompanyCode(
      "GRAND",
      [{ ...initialSuppliers[0], code: "GRA0007" }],
      () => 7,
    ),
  ).toBe("GRA0008");
  expect(nextCompanyCode("GRAND", [])).toMatch(/^GRA\d{4}$/);
  expect(() => nextCompanyCode("AB", [])).toThrow("至少");
  expect(() =>
    nextCompanyCode(
      "GRAND",
      Array.from({ length: 10000 }, (_, i) => ({
        ...initialSuppliers[0],
        code: `GRA${String(i).padStart(4, "0")}`,
      })),
    ),
  ).toThrow("編碼已用盡");
});
it("GSD取代OP", () => {
  expect(
    supplierSchema.safeParse({ ...initialSuppliers[0], role: "GSD" }).success,
  ).toBe(true);
  expect(
    supplierSchema.safeParse({ ...initialSuppliers[0], role: "OP" }).success,
  ).toBe(false);
});
