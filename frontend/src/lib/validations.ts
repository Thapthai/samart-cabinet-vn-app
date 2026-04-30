import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('กรุณาใส่อีเมลที่ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('กรุณาใส่อีเมลที่ถูกต้อง'),
  password: z.string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
    .regex(/[^a-zA-Z0-9]/, 'รหัสผ่านต้องมีอักษรพิเศษอย่างน้อย 1 ตัว'),
});

export const itemSchema = z.object({
  itemcode: z.string().min(1, 'รหัสสินค้าต้องไม่ว่าง').max(25, 'รหัสสินค้าต้องไม่เกิน 25 ตัวอักษร'),
  itemname: z.string().min(2, 'ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร').max(255, 'ชื่อสินค้าต้องไม่เกิน 255 ตัวอักษร'),
  Barcode: z.string().max(50).optional(),
  Description: z.string().optional(),
  CostPrice: z.number().min(0, 'ราคาทุนต้องไม่น้อยกว่า 0').optional(),
  SalePrice: z.number().min(0).optional(),
  UsagePrice: z.number().min(0).optional(),
  stock_balance: z.number().int().min(0).optional(),
  stock_min: z.number().int().min(0).optional(),
  stock_max: z.number().int().min(0).optional(),
  item_status: z.number().int().optional(),
  warehouseID: z.number().int().optional(),
  /** ไม่บังคับ — เลือกจาก SearchableSelect (ค่าเป็นตัวเลขหรือ undefined) */
  UnitID: z.number().int().positive().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'ชื่อหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร').max(100, 'ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร'),
  description: z.string().max(500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร').optional(),
  slug: z.string().optional(),
  is_active: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
