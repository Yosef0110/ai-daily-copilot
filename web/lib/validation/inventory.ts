import { z } from "zod";

export const inventoryQuerySchema = z.strictObject({
  search: z.string().trim().max(200).optional(),

  status: z
    .enum(["safe", "low", "out"])
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export type InventoryQueryInput = z.infer<
  typeof inventoryQuerySchema
>;

export const inventoryAdjustmentSchema = z.strictObject({
  product_id: z
    .string()
    .uuid("Product ID harus berupa UUID yang valid"),

  adjustment_type: z.enum([
    "damaged",
    "lost",
    "expired",
    "stock_opname",
    "manual_correction",
  ]),

  quantity: z.coerce
    .number()
    .finite("Quantity harus berupa angka")
    .min(0, "Quantity tidak boleh negatif"),

  reason: z
    .string()
    .trim()
    .min(1, "Alasan adjustment wajib diisi")
    .max(200, "Alasan maksimal 200 karakter"),

  notes: z
    .string()
    .trim()
    .max(1000, "Catatan maksimal 1000 karakter")
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type InventoryAdjustmentInput = z.infer<
  typeof inventoryAdjustmentSchema
>;

export const inventoryHistoryQuerySchema = z.strictObject({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export const inventoryProductIdSchema = z
  .string()
  .uuid("Product ID harus berupa UUID yang valid");

export type InventoryHistoryQueryInput = z.infer<
  typeof inventoryHistoryQuerySchema
>;