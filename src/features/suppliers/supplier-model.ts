import { z } from "zod";
export const supplierFields = {
  companyNameC: "公司名稱(C)",
  companyNameE: "公司名稱(E)",
  country: "國家代碼",
  addressC: "地址(C)",
  addressE: "地址(E)",
  contact: "聯繫人",
  phone: "電話",
  email: "信箱",
  accountName: "Account Name",
  bankName: "Bank Name",
  bankAddress: "Bank Address",
  accountNumber: "Account Number",
  swiftCode: "Swift Code",
  billingContact: "帳務聯絡人",
  billingPhone: "帳務電話",
  billingEmail: "帳務信箱",
  taxId: "稅籍編號",
  note: "備註",
} as const;
const optionalEmail = z.union([z.literal(""), z.email("請輸入有效信箱")]);
export const supplierSchema = z.object({
  companyNameC: z.string().trim().min(1, "請填寫中文公司名稱"),
  companyNameE: z
    .string()
    .trim()
    .regex(/(?:[a-zA-Z][^a-zA-Z]*){3}/, "公司英文名稱至少需三個英文字母"),
  country: z.string().regex(/^[A-Z]{2}$/, "請使用兩碼大寫國家代碼，例如 TW"),
  addressC: z.string(),
  addressE: z.string(),
  contact: z.string(),
  phone: z.string(),
  email: optionalEmail,
  accountName: z.string(),
  bankName: z.string(),
  bankAddress: z.string(),
  accountNumber: z.string(),
  swiftCode: z.string(),
  billingContact: z.string(),
  billingPhone: z.string(),
  billingEmail: optionalEmail,
  taxId: z.string(),
  note: z.string(),
  password: z.string().min(8, "示範密碼至少 8 碼"),
  role: z.enum(["Vendor", "Admin", "Accounting", "CS", "GSD"]),
  enabled: z.enum(["啟用", "關閉"]),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
export type Supplier = SupplierInput & {
  code: string;
  review: "待審核" | "通過" | "退回";
  reviewNote: string;
  mustChangePassword: boolean;
};
export const blankSupplier: SupplierInput = {
  ...Object.fromEntries(Object.keys(supplierFields).map((k) => [k, ""])),
  role: "Vendor",
  enabled: "啟用",
  password: "",
} as SupplierInput;
export function companyPrefix(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}
export function nextCompanyCode(
  name: string,
  suppliers: Supplier[],
  pick: (max: number) => number = (max) => {
    const values = new Uint32Array(1);
    const limit = Math.floor(4294967296 / max) * max;
    do {
      globalThis.crypto.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % max;
  },
) {
  const prefix = companyPrefix(name);
  if (prefix.length !== 3) throw new Error("公司英文名稱至少需三個英文字母");
  const used = new Set(suppliers.map((s) => s.code));
  const available = Array.from(
    { length: 10000 },
    (_, i) => prefix + String(i).padStart(4, "0"),
  ).filter((code) => !used.has(code));
  if (!available.length) throw new Error("此字首編碼已用盡，請洽管理者");
  return available[pick(available.length)];
}
export const initialSuppliers: Supplier[] = [
  {
    ...blankSupplier,
    companyNameC: "示範海洋物流",
    companyNameE: "Demo Ocean Logistics",
    country: "TW",
    email: "vendor@example.invalid",
    password: "Demo1234!",
    code: "DOL0001",
    review: "通過",
    reviewNote: "預建假資料",
    mustChangePassword: false,
  },
];
