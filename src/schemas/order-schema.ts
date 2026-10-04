import { z } from "zod";
// UI syntax only. Required business fields, decimal precision and tax rules are TBD.
const decimalText = z
  .string()
  .refine(
    (value) => value === "" || /^-?\d+(\.\d+)?$/.test(value),
    "請填寫有效數字",
  );
export const orderSchema = z.object({
  customerName: z.string(),
  supplierName: z.string(),
  invoiceDate: z.string(),
  fileNumber: z.string(),
  vesselName: z.string(),
  voyageNumber: z.string(),
  mblNumber: z.string(),
  hblNumber: z.string(),
  containerNumber: z.string(),
  containerQuantity: decimalText,
  containerType: z.string(),
  origin: z.string(),
  destination: z.string(),
  country: z.string(),
  note: z.string().max(1000, "備註最多 1000 字"),
  charges: z.array(
    z.object({
      name: z.string(),
      quantity: decimalText,
      unit: z.string(),
      unitPrice: decimalText,
      currency: z.string(),
      taxType: z.string(),
      note: z.string(),
    }),
  ),
});
export const changeRequestSchema = z.object({
  reason: z.string().trim().min(1, "請填寫修改原因"),
});
