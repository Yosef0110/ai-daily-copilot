import { z } from "zod";

const optionalTextSchema = z
  .string()
  .trim()
  .max(100, "Teks maksimal 100 karakter")
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const skuSchema = z
  .string()
  .trim()
  .min(1, "SKU wajib diisi")
  .max(100, "SKU maksimal 100 karakter")
  .transform((value) => value.toUpperCase());

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama produk wajib diisi")
  .max(200, "Nama produk maksimal 200 karakter");

const unitSchema = z
  .string()
  .trim()
  .min(1, "Satuan produk wajib diisi")
  .max(50, "Satuan maksimal 50 karakter");

const nonNegativeNumberSchema = z.coerce
  .number()
  .finite("Nilai harus berupa angka")
  .min(0, "Nilai tidak boleh negatif");

const nonNegativeIntegerSchema = z.coerce
  .number()
  .int("Nilai harus berupa bilangan bulat")
  .min(0, "Nilai tidak boleh negatif");

export const createProductSchema = z.strictObject({
  sku: skuSchema,
  name: nameSchema,
  category: optionalTextSchema,
  unit: unitSchema,
  selling_price: nonNegativeNumberSchema.default(0),
  current_stock: nonNegativeNumberSchema.default(0),
  minimum_stock: nonNegativeNumberSchema.default(0),
  safety_stock: nonNegativeNumberSchema.default(0),
  lead_time_days: nonNegativeIntegerSchema.default(0),
  is_active: z.boolean().default(true),
});

export const updateProductSchema = z
  .strictObject({
    sku: skuSchema.optional(),
    name: nameSchema.optional(),
    category: optionalTextSchema,
    unit: unitSchema.optional(),
    selling_price: nonNegativeNumberSchema.optional(),
    minimum_stock: nonNegativeNumberSchema.optional(),
    safety_stock: nonNegativeNumberSchema.optional(),
    lead_time_days: nonNegativeIntegerSchema.optional(),
    is_active: z.boolean().optional(),
  })
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

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productIdSchema = z
  .string()
  .uuid("Product ID harus berupa UUID yang valid");

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;