import { z } from "zod";

const optionalTextSchema = z
  .string()
  .trim()
  .max(100, "Teks maksimal 100 karakter")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const createProductSchema = z.strictObject({
  sku: z
    .string()
    .trim()
    .min(1, "SKU wajib diisi")
    .max(100, "SKU maksimal 100 karakter")
    .transform((value) => value.toUpperCase()),

  name: z
    .string()
    .trim()
    .min(1, "Nama produk wajib diisi")
    .max(200, "Nama produk maksimal 200 karakter"),

  category: optionalTextSchema,

  unit: z
    .string()
    .trim()
    .min(1, "Satuan produk wajib diisi")
    .max(50, "Satuan maksimal 50 karakter"),

  selling_price: z.coerce
    .number()
    .finite("Harga jual harus berupa angka")
    .min(0, "Harga jual tidak boleh negatif")
    .default(0),

  current_stock: z.coerce
    .number()
    .finite("Stok harus berupa angka")
    .min(0, "Stok tidak boleh negatif")
    .default(0),

  minimum_stock: z.coerce
    .number()
    .finite("Minimum stok harus berupa angka")
    .min(0, "Minimum stok tidak boleh negatif")
    .default(0),

  safety_stock: z.coerce
    .number()
    .finite("Safety stock harus berupa angka")
    .min(0, "Safety stock tidak boleh negatif")
    .default(0),

  lead_time_days: z.coerce
    .number()
    .int("Lead time harus berupa bilangan bulat")
    .min(0, "Lead time tidak boleh negatif")
    .default(0),

  is_active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diperbarui",
  });

export const productQuerySchema = z.strictObject({
  search: z.string().trim().max(200).optional(),

  category: z.string().trim().max(100).optional(),

  is_active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1, "Page minimal 1")
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit minimal 1")
    .max(100, "Limit maksimal 100")
    .default(20),
});

export const productIdSchema = z.uuid("Product ID harus berupa UUID yang valid");

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;