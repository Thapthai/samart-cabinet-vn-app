import { Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemMinMaxDto } from './dto/update-item-minmax.dto';
import { ItemStockDto } from './dto/item-stock.dto';

/** ค่า DB สำหรับพิมพ์สติกเกอร์ / legacy — ใส่เมื่อสร้าง Item ใหม่ถ้าไม่ส่งมาจาก client */
const ITEM_CREATE_STICKER_DEFAULTS: Record<string, string | number> = {
  Alternatename: '',
  Barcode: '',
  IsSet: '0',
  IsReuse: '1',
  IsNormal: '1',
  itemtypeID: 74,
};

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  async createItem(createItemDto: CreateItemDto) {
    try {
      // Remove undefined/null values from the DTO
      const cleanData = Object.fromEntries(
        Object.entries(createItemDto).filter(
          ([_, value]) => value !== undefined && value !== null,
        ),
      ) as any;

      // Add timestamp if not provided
      if (!cleanData.CreateDate) {
        cleanData.CreateDate = new Date();
      }
      if (!cleanData.ModiflyDate) {
        cleanData.ModiflyDate = new Date();
      }

      // itemcode2 ใช้รหัสเดียวกับ itemcode ตอนสร้างรายการ (คอลัมน์ DB VarChar(20))
      if (cleanData.itemcode != null && String(cleanData.itemcode).trim() !== '') {
        cleanData.itemcode2 = String(cleanData.itemcode).trim().slice(0, 20);
      }

      for (const [key, defaultVal] of Object.entries(ITEM_CREATE_STICKER_DEFAULTS)) {
        if (!(key in cleanData)) {
          cleanData[key] = defaultVal;
        }
      }

      const item = await this.prisma.item.create({
        data: cleanData,
      });

      return {
        success: true,
        message: 'Item created successfully',
        data: item,
      };
    } catch (error) {
      console.error('❌ Create error:', error.message);
      return {
        success: false,
        message: 'Failed to create item',
        error: error.message,
      };
    }
  }

  async findAllItems(
    page: number,
    limit: number,
    keyword?: string,
    sort_by: string = 'itemcode',
    sort_order: string = 'asc',
    cabinet_id?: number,
    department_id?: number,
    status?: string,
    staffListOptions?: {
      restrictedStockIds?: number[];
      usageDepartmentIds?: string[] | null;
    },
  ) {
    try {
      const emptyPage = () => ({
        success: true,
        data: [] as any[],
        total: 0,
        page,
        limit,
        lastPage: 0,
      });

      const where: any = {};
      const skip = (page - 1) * limit;
      if (keyword) {
        where.OR = [
          { itemname: { contains: keyword } },
          { itemcode: { contains: keyword } },
          { itemcode2: { contains: keyword } },
          { itemcode3: { contains: keyword } },
          { Barcode: { contains: keyword } },
        ];
      }

      // Build orderBy object - Prisma needs proper type
      const validSortFields = [
        'itemcode',
        'itemname',
        'CostPrice',
        'SalePrice',
        'CreateDate',
      ];
      const validSortOrders = ['asc', 'desc'];

      const field = validSortFields.includes(sort_by) ? sort_by : 'itemcode';
      const order = validSortOrders.includes(sort_order)
        ? (sort_order as 'asc' | 'desc')
        : ('desc' as 'asc' | 'desc');

      const orderBy: any = {};
      orderBy[field] = order;

      // Build itemStocks where clause (count_itemstock คำนวณจาก IsStock = 1 ในขั้นตอน map)
      const itemStocksWhere: any = {
        RfidCode: {
          not: '',
        },
      };

      // Filter by cabinet_id if provided (เก็บ cabinetStockId สำหรับอ้างอิงจำนวนชุดรุดต่อตู้)
      let cabinetStockId: number | null = null;
      // department id สำหรับกรอง qty_in_use (จาก MedicalSupplyUsage.department_id)
      let deptCodesForUsage: string[] | null = null;

      if (cabinet_id) {
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: {
            stock_id: true,
            cabinetDepartments: {
              where: { status: 'ACTIVE' },
              select: { department_id: true },
            },
          },
        });
        if (cabinet?.stock_id) {
          cabinetStockId = cabinet.stock_id;
          itemStocksWhere.StockID = cabinet.stock_id;
        }
        // รวบรวม department_id จาก cabinetDepartments ของตู้นี้
        if (cabinet?.cabinetDepartments?.length) {
          deptCodesForUsage = cabinet.cabinetDepartments
            .map((cd) => String(cd.department_id))
            .filter(Boolean);
        }
      } else if (staffListOptions?.restrictedStockIds?.length) {
        itemStocksWhere.StockID = { in: staffListOptions.restrictedStockIds };
        if (staffListOptions.usageDepartmentIds?.length) {
          deptCodesForUsage = staffListOptions.usageDepartmentIds;
        } else if (department_id) {
          deptCodesForUsage = [String(department_id)];
        }
      } else if (department_id) {
        deptCodesForUsage = [String(department_id)];
      }

      // Get all items matching the filter criteria (including keyword search)
      const allItemsQuery = await this.prisma.item.findMany({
        where: {
          ...where,
          item_status: 0, // Only active items
        },
        select: {
          itemcode: true,
          itemname: true,
          UnitID: true,
          SubUnitID: true,
          SubUnitQty: true,
          CostPrice: true,
          SalePrice: true,
          CreateDate: true,
          stock_max: true,
          stock_min: true,
          item_status: true,
          unit: { select: { ID: true, UnitName: true } },
          subUnit: { select: { ID: true, UnitName: true } },
          itemStocks: {
            where: itemStocksWhere,
            select: {
              RowID: true,
              StockID: true,
              Qty: true,
              RfidCode: true,
              ExpireDate: true,
              IsStock: true,
              cabinet: {
                select: {
                  id: true,
                  cabinet_name: true,
                  cabinet_code: true,
                  stock_id: true,
                  cabinetDepartments: {
                    where: {
                      department_id: department_id,
                      status: status,
                    },
                    select: {
                      id: true,
                      department_id: true,
                      status: true,
                      department: {
                        select: {
                          ID: true,
                          DepName: true,
                          DepName2: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Filter items that have itemStocks matching the criteria
      const filteredItems = allItemsQuery.filter((item: any) => {
        // Must have at least one itemStock
        if (!item.itemStocks || item.itemStocks.length === 0) {
          return false;
        }

        // If department_id is provided, check if at least one itemStock has cabinet with that department
        if (department_id) {
          return item.itemStocks.some((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        return true;
      });

      // จำนวนอุปกรณ์ที่ถูกใช้งานในปัจจุบัน (จาก supply_usage_items: qty - qty_used_with_patient - qty_returned_to_cabinet)
      // นับเฉพาะรายการที่ไม่เป็น Discontinue และกรองตาม department_id ของ MedicalSupplyUsage
      const itemCodes = filteredItems.map((i: any) => i.itemcode).filter(Boolean);
      const qtyInUseMap = new Map<string, number>();
      if (itemCodes.length > 0) {
        // สร้าง condition สำหรับ department_id (JOIN กับ MedicalSupplyUsage)
        const deptInts =
          deptCodesForUsage?.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n)) ?? [];
        const deptCondition =
          deptInts.length > 0
            ? Prisma.sql`AND msu.department_id IN (${Prisma.join(deptInts.map((id) => Prisma.sql`${id}`))})`
            : Prisma.empty;
        const qtyInUseRows = await this.prisma.$queryRaw<
          { order_item_code: string; qty_in_use: bigint }[]
        >`SELECT
            sui.order_item_code,
            SUM(COALESCE(sui.qty, 0) - COALESCE(sui.qty_used_with_patient, 0) - COALESCE(sui.qty_returned_to_cabinet, 0)) AS qty_in_use
          FROM app_supply_usage_items sui
          INNER JOIN app_medical_supply_usages msu
            ON sui.medical_supply_usage_id = msu.id
          WHERE sui.order_item_code IN (${Prisma.join(itemCodes.map((c) => Prisma.sql`${c}`))})
            AND sui.order_item_code IS NOT NULL
            AND sui.order_item_code != ''
            AND DATE(sui.created_at) = CURDATE()
            AND sui.order_item_status != 'Discontinue'
            ${deptCondition}
          GROUP BY sui.order_item_code
        `;
        qtyInUseRows.forEach((row) => {
          const val = Number(row.qty_in_use ?? 0);
          if (val > 0) qtyInUseMap.set(row.order_item_code, val);
        });
      }

      // จำนวนที่แจ้งชำรุด (อ้างอิงตู้/stock_id) — เฉพาะ return_reason = DAMAGED เฉพาะวันนี้ (คอลัมน์ "ชำรุด" ไม่รวมปนเปื้อน)
      const damagedReturnMap = new Map<string, number>();
      if (itemCodes.length > 0) {
        if (cabinetStockId != null) {
          const damagedRows = await this.prisma.$queryRaw<
            { item_code: string; total_returned: bigint }[]
          >` SELECT
              srr.item_code,
              SUM(COALESCE(srr.qty_returned, 0)) AS total_returned
            FROM app_supply_item_return_records srr
            WHERE srr.item_code IN (${Prisma.join(itemCodes.map((c) => Prisma.sql`${c}`))})
              AND srr.item_code IS NOT NULL
              AND srr.item_code != ''
              AND DATE(srr.return_datetime) = CURDATE()
              AND (srr.stock_id = ${cabinetStockId})
            GROUP BY srr.item_code
          `;

          damagedRows.forEach((row) => {
            const val = Number(row.total_returned ?? 0);
            if (val > 0) damagedReturnMap.set(row.item_code, val);
          });
        } else {
          const damagedRows = await this.prisma.$queryRaw<
            { item_code: string; stock_id: number; total_returned: bigint }[]
          >` SELECT
              srr.item_code,
              srr.stock_id,
              SUM(COALESCE(srr.qty_returned, 0)) AS total_returned
            FROM app_supply_item_return_records srr
            WHERE srr.item_code IN (${Prisma.join(itemCodes.map((c) => Prisma.sql`${c}`))})
              AND srr.item_code IS NOT NULL
              AND srr.item_code != ''
              AND DATE(srr.return_datetime) = CURDATE()
              AND srr.stock_id IS NOT NULL
            GROUP BY srr.item_code, srr.stock_id
          `;

          damagedRows.forEach((row) => {
            const val = Number(row.total_returned ?? 0);
            if (val > 0) {
              const key = `${row.item_code}:${row.stock_id}`;
              damagedReturnMap.set(key, val);
            }
          });
        }
      }

      // Override min/max ต่อตู้: โหลด CabinetItemSetting เมื่อมี cabinet_id
      const overrideMap = new Map<string, { stock_min?: number | null; stock_max?: number | null }>();
      if (cabinet_id != null && itemCodes.length > 0) {
        const overrides = await this.prisma.cabinetItemSetting.findMany({
          where: {
            cabinet_id,
            item_code: { in: itemCodes },
          },
          select: { item_code: true, stock_min: true, stock_max: true },
        });
        overrides.forEach((o) => {
          overrideMap.set(o.item_code, { stock_min: o.stock_min, stock_max: o.stock_max });
        });
      }

      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);

      const itemsWithMeta = filteredItems.map((item: any) => {
        // จำกัด itemStocks ตาม department ถ้ามีระบุ
        let matchingItemStocks = item.itemStocks;
        if (department_id) {
          matchingItemStocks = item.itemStocks.filter((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0,
          );
        }

        // count_itemstock = จำนวนที่ IsStock = true/1 (schema เป็น Boolean, DB อาจเป็น 0/1)
        const countItemStock = matchingItemStocks.filter(
          (s: any) => s.IsStock === true || s.IsStock === 1,
        ).length;

        // วิเคราะห์วันหมดอายุ และสถานะหมดอายุ/ใกล้หมดอายุ
        let earliestExpireDate: Date | null = null;
        let hasExpired = false;
        let hasNearExpire = false;

        matchingItemStocks.forEach((stock: any) => {
          if (!stock.ExpireDate) return;
          const exp = new Date(stock.ExpireDate);

          if (!earliestExpireDate || exp.getTime() < (earliestExpireDate as Date).getTime()) {
            earliestExpireDate = exp;
          }

          if (exp < now) {
            hasExpired = true;
          } else if (exp >= now && exp <= in7Days) {
            hasNearExpire = true;
          }
        });

        // ดึง min/max จาก CabinetItemSetting เท่านั้น (ไม่ใช้ Item)
        const override = overrideMap.get(item.itemcode);
        const effectiveStockMin = override?.stock_min ?? null;
        const effectiveStockMax = override?.stock_max ?? 0;
        const stockMin = effectiveStockMin ?? 0;
        const isLowStock = stockMin > 0 && countItemStock < stockMin;

        // จำนวนที่แจ้งชำรุด (อ้างอิงตู้/stock_id) — กรองตู้แล้วใช้ของตู้นั้น; ไม่กรองตู้แล้วใช้ของตู้แรกเท่านั้น (ไม่ sum หลายตู้เพราะจะทำให้ค่าเพี้ยน เช่น 10 ตู้ × 6 = 60)
        let damagedQty: number;
        if (cabinetStockId != null) {
          damagedQty = damagedReturnMap.get(item.itemcode) ?? 0;
        } else {
          const firstStock = matchingItemStocks[0];
          damagedQty = firstStock
            ? (damagedReturnMap.get(`${item.itemcode}:${firstStock.StockID}`) ?? 0)
            : 0;
        }


        const qtyInUse = qtyInUseMap.get(item.itemcode) ?? 0;

        // จำนวนที่ต้องเติม = MAX − จำนวนในตู้ (MAX จาก CabinetItemSetting ต่อตู้, จำนวนในตู้ = IsStock ในตู้)
        const maxForRefill = effectiveStockMax ?? 0;
        let refillQty = maxForRefill - countItemStock;
        if (refillQty < 0) {
          refillQty = 0;
        }

        const itemWithCount = {
          ...item,
          stock_min: effectiveStockMin,
          stock_max: effectiveStockMax,
          itemStocks: matchingItemStocks,
          count_itemstock: countItemStock,
          qty_in_use: qtyInUse,
          damaged_qty: damagedQty,
          refill_qty: refillQty,
        };

        return {
          item: itemWithCount,
          hasExpired,
          hasNearExpire,
          isLowStock,
          earliestExpireDate,
        };
      });

      const sortedItems = itemsWithMeta
        .sort((a, b) => {
          // 1) มี stock หมดอายุก่อน
          if (a.hasExpired !== b.hasExpired) {
            return a.hasExpired ? -1 : 1;
          }

          // 2) ถัดมา stock ใกล้หมดอายุ (ภายใน 7 วัน)
          if (a.hasNearExpire !== b.hasNearExpire) {
            return a.hasNearExpire ? -1 : 1;
          }

          // 3) ถัดมาคือ stock ที่จำนวนชิ้นต่ำกว่า MIN
          if (a.isLowStock !== b.isLowStock) {
            return a.isLowStock ? -1 : 1;
          }

          // 4) ถ้ามีวันหมดอายุทั้งคู่ ให้เรียงจากหมดอายุเร็วไปช้า
          if (a.earliestExpireDate && b.earliestExpireDate) {
            const aTime = (a.earliestExpireDate as Date).getTime();
            const bTime = (b.earliestExpireDate as Date).getTime();
            return aTime - bTime;
          }

          // 5) fallback: เรียงตาม itemcode (A-Z)
          const codeA = a.item.itemcode || '';
          const codeB = b.item.itemcode || '';
          return codeA.localeCompare(codeB);
        })
        .map((x) => x.item);

      // Apply pagination after sorting
      const total = sortedItems.length;
      const paginatedItems = sortedItems.slice(skip, skip + limit);

      return {
        success: true,
        data: paginatedItems,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch items',
        error: error.message,
      };
    }
  }

  /**
   * รายการ Item จากตาราง master โดยตรง (แบ่งหน้า, ค้นหา)
   * ไม่กรองเฉพาะรายการที่มี RFID ในตู้ — ใช้สำหรับหน้า Item Management
   */
  async findAllItemsMaster(
    page: number,
    limit: number,
    keyword?: string,
    sort_by: string = 'itemcode',
    sort_order: string = 'asc',
    item_status_filter?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const take = Math.min(Math.max(limit, 1), 100);
      const where: Prisma.ItemWhereInput = {};

      const kw = keyword?.trim();
      if (kw) {
        where.OR = [
          { itemname: { contains: kw } },
          { itemcode: { contains: kw } },
          { Barcode: { contains: kw } },
        ];
      }

      const f = (item_status_filter ?? '').trim().toLowerCase();
      if (f === 'active' || f === '0') {
        where.item_status = 0;
      } else if (f === 'inactive' || f === '1') {
        where.NOT = { item_status: 0 };
      }

      const validSortFields = ['itemcode', 'itemname', 'CreateDate', 'CostPrice'];
      const field = validSortFields.includes(sort_by) ? sort_by : 'itemcode';
      const order: 'asc' | 'desc' = sort_order === 'desc' ? 'desc' : 'asc';

      const [total, data] = await Promise.all([
        this.prisma.item.count({ where }),
        this.prisma.item.findMany({
          where,
          skip,
          take,
          orderBy: { [field]: order },
          select: {
            itemcode: true,
            itemname: true,
            Barcode: true,
            UnitID: true,
            SubUnitID: true,
            SubUnitQty: true,
            item_status: true,
            CreateDate: true,
            CostPrice: true,
            SalePrice: true,
            Minimum: true,
            Maximum: true,
            IsStock: true,
            Note: true,
            unit: { select: { ID: true, UnitName: true } },
            subUnit: { select: { ID: true, UnitName: true } },
          },
        }),
      ]);

      return {
        success: true,
        data,
        total,
        page,
        limit: take,
        lastPage: Math.max(1, Math.ceil(total / take)),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch master items',
        error: (error as Error).message,
      };
    }
  }

  async getItemsStats(cabinet_id?: number, department_id?: number) {
    try {
      // Build itemStocks where clause
      const itemStocksWhere: any = {
        RfidCode: {
          not: '',
        },
        IsStock: true,
      };

      // Filter by cabinet_id if provided
      if (cabinet_id) {
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: { stock_id: true },
        });
        if (cabinet?.stock_id) {
          itemStocksWhere.StockID = cabinet.stock_id;
        }
      }

      // ชนิดอุปกรณ์ทั้งหมด (จากตาราง Item)
      const totalItemTypes = await this.prisma.item.count();

      // Get all items with itemStocks (รวม ExpireDate สำหรับนับใกล้หมดอายุ) — ไม่กรอง item_status เพื่อนับชนิดที่มีในสต็อกได้ครบ
      const allItemsQuery = await this.prisma.item.findMany({
        where: {},
        select: {
          itemcode: true,
          itemname: true,
          item_status: true,
          stock_min: true,
          itemStocks: {
            where: itemStocksWhere,
            select: {
              RowID: true,
              StockID: true,
              ExpireDate: true,
              ItemCode: true,
              RfidCode: true,
              cabinet: {
                select: {
                  id: true,
                  cabinet_name: true,
                  cabinet_code: true,
                  cabinetDepartments: {
                    where: department_id ? {
                      department_id: department_id,
                      status: 'ACTIVE',
                    } : { status: 'ACTIVE' },
                    select: {
                      id: true,
                      department_id: true,
                      status: true,
                      department: {
                        select: { DepName: true },
                      },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });


      // Filter items that have itemStocks matching the criteria
      const filteredItems = allItemsQuery.filter((item: any) => {
        if (!item.itemStocks || item.itemStocks.length === 0) {
          return false;
        }

        // If department_id is provided, check if at least one itemStock has cabinet with that department
        if (department_id) {
          return item.itemStocks.some((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        return true;
      });

      // Calculate stats และรวบรวม itemStocks ที่ match สำหรับนับหมดอายุ
      let totalItems = 0;
      let activeItems = 0;
      let inactiveItems = 0;
      let lowStockItems = 0;
      const allMatchingStocks: Array<{ RowID: number; ItemCode: string | null; itemname: string | null; ExpireDate: Date | null; RfidCode: string | null; cabinet_name?: string; cabinet_code?: string; department_name?: string }> = [];

      filteredItems.forEach((item: any) => {
        // Count itemStocks (only matching ones if department_id provided)
        let matchingItemStocks = item.itemStocks;
        if (department_id) {
          matchingItemStocks = item.itemStocks.filter((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        const countItemStock = matchingItemStocks.length;
        const stockMin = item.stock_min ?? 0;
        const isLowStock = stockMin > 0 && countItemStock < stockMin;

        totalItems++;
        if (item.item_status === 0) {
          activeItems++;
        } else {
          inactiveItems++;
        }
        if (isLowStock) {
          lowStockItems++;
        }

        // รวบรวม itemStocks สำหรับรายการวันหมดอายุ
        matchingItemStocks.forEach((stock: any) => {
          allMatchingStocks.push({
            RowID: stock.RowID,
            ItemCode: stock.ItemCode ?? item.itemcode,
            itemname: item.itemname ?? null,
            ExpireDate: stock.ExpireDate ?? null,
            RfidCode: stock.RfidCode ?? null,
            cabinet_name: stock.cabinet?.cabinet_name ?? undefined,
            cabinet_code: stock.cabinet?.cabinet_code ?? undefined,
            department_name: stock.cabinet?.cabinetDepartments?.[0]?.department?.DepName ?? undefined,
          });
        });
      });

      // นับ: หมดอายุแล้ว | ใกล้หมดอายุ 1-7 วัน (ถ้าหมดอายุไม่นับ)
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);

      let expiredCount = 0;
      let nearExpire7Days = 0;
      allMatchingStocks.forEach((s) => {
        if (!s.ExpireDate) return;
        const exp = new Date(s.ExpireDate);
        if (exp < now) expiredCount++;
        else if (exp <= in7Days) nearExpire7Days++;
      });

      // รายการ item_stock ที่มีวันหมดอายุทั้งหมด — เรียง: หมดอายุก่อน -> ใกล้หมดอายุ ตามวันหมดอายุ (เร็วไปช้า)
      const nowTime = now.getTime();
      const itemsWithExpiry = allMatchingStocks
        .filter((s) => s.ExpireDate != null)
        .map((s) => ({
          RowID: s.RowID,
          ItemCode: s.ItemCode,
          itemname: s.itemname,
          ExpireDate: s.ExpireDate,
          วันหมดอายุ: s.ExpireDate ? new Date(s.ExpireDate).toISOString().split('T')[0] : null,
          RfidCode: s.RfidCode,
          cabinet_name: s.cabinet_name,
          cabinet_code: s.cabinet_code,
          department_name: s.department_name,
        }))
        .sort((a, b) => {
          if (!a.ExpireDate || !b.ExpireDate) return 0;
          const aT = new Date(a.ExpireDate).getTime();
          const bT = new Date(b.ExpireDate).getTime();
          const aExpired = aT < nowTime;
          const bExpired = bT < nowTime;
          if (aExpired && !bExpired) return -1;
          if (!aExpired && bExpired) return 1;
          return aT - bT;
        });

      return {
        success: true,
        data: {
          details: {
            total_item_types: totalItemTypes,
            item_types_with_stock: filteredItems.length,
            total_items: totalItems,
            active_items: activeItems,
            inactive_items: inactiveItems,
            low_stock_items: lowStockItems,
          },
          item_stock: {
            expire: {
              expired_count: expiredCount,
              near_expire_7_days: nearExpire7Days,
            },
            items_with_expiry: itemsWithExpiry,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch items stats',
        error: error.message,
      };
    }
  }

  async findOneItem(itemcode: string) {
    try {
      const item = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item',
        error: error.message,
      };
    }
  }

  async updateItem(itemcode: string, updateItemDto: UpdateItemDto) {
    try {
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      // Keep null to clear nullable FK/columns (e.g. SubUnitID)
      const cleanData = Object.fromEntries(
        Object.entries(updateItemDto).filter(([_, value]) => value !== undefined),
      ) as any;

      // ถ้ายังไม่มี itemcode2 ใน DB และผู้ใช้ไม่ส่งมาใน DTO — เติมจาก itemcode (คอลัมน์ VarChar(20))
      const hasExistingCode2 =
        existingItem.itemcode2 != null && String(existingItem.itemcode2).trim() !== '';
      if (cleanData.itemcode2 === undefined && !hasExistingCode2) {
        cleanData.itemcode2 = String(itemcode).trim().slice(0, 20);
      }

      const item = await this.prisma.item.update({
        where: { itemcode },
        data: cleanData,
      });

      return {
        success: true,
        message: 'Item updated successfully',
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update item',
        error: error.message,
      };
    }
  }

  async removeItem(itemcode: string) {
    try {
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      await this.prisma.item.delete({
        where: { itemcode },
      });

      return {
        success: true,
        message: 'Item deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete item',
        error: error.message,
      };
    }
  }

  async findItemsByUser(user_id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const items = await this.prisma.item.findMany({
        where: { item_status: 0 },
        orderBy: { CreateDate: 'desc' },
      });

      return {
        success: true,
        data: items,
        count: items.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user items',
        error: error.message,
      };
    }
  }

  async updateItemMinMax(
    itemcode: string,
    updateMinMaxDto: UpdateItemMinMaxDto,
  ) {
    try {
      // Check if item exists
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      // Validate: stock_max should be >= stock_min
      if (
        updateMinMaxDto.stock_max !== undefined &&
        updateMinMaxDto.stock_min !== undefined
      ) {
        if (updateMinMaxDto.stock_max < updateMinMaxDto.stock_min) {
          return {
            success: false,
            message: 'Stock Max must be greater than or equal to Stock Min',
          };
        }
      }

      // อัปเดตเฉพาะ CabinetItemSetting เท่านั้น (ต้องส่ง cabinet_id)
      const cabinetId = updateMinMaxDto.cabinet_id;
      if (cabinetId == null) {
        return {
          success: false,
          message: 'cabinet_id is required to update min/max',
        };
      }

      const overrideData: { stock_min?: number; stock_max?: number } = {};
      if (updateMinMaxDto.stock_min !== undefined) overrideData.stock_min = updateMinMaxDto.stock_min;
      if (updateMinMaxDto.stock_max !== undefined) overrideData.stock_max = updateMinMaxDto.stock_max;

      const row = await this.prisma.cabinetItemSetting.upsert({
        where: {
          cabinet_id_item_code: { cabinet_id: cabinetId, item_code: itemcode },
        },
        create: {
          cabinet_id: cabinetId,
          item_code: itemcode,
          stock_min: overrideData.stock_min ?? null,
          stock_max: overrideData.stock_max ?? null,
        },
        update: {
          ...(overrideData.stock_min !== undefined && { stock_min: overrideData.stock_min }),
          ...(overrideData.stock_max !== undefined && { stock_max: overrideData.stock_max }),
        },
      });

      return {
        success: true,
        message: 'Item min/max updated successfully (per cabinet)',
        data: {
          itemcode,
          stock_min: row.stock_min,
          stock_max: row.stock_max,
        },
      };
    } catch (error) {
      console.error('❌ Update min/max error:', error.message);
      return {
        success: false,
        message: 'Failed to update item min/max',
        error: error.message,
      };
    }
  }


  // ====================================== Item Stock API ======================================
  async findAllItemStock(
    page: number = 1,
    limit: number = 10,
    keyword?: string,
    sort_by: string = 'ItemCode',
    sort_order: string = 'asc',
  ) {
    try {
      const where: any = {};
      const skip = (page - 1) * limit;

      // Search in item relation (itemcode and itemname)
      if (keyword) {
        where.item = {
          OR: [
            { itemcode: { contains: keyword } },
            { itemname: { contains: keyword } },
          ],
        };
      }

      // Count total matching records
      const total = await this.prisma.itemStock.count({
        where,
      });

      // Get paginated data
      const itemStocks = await this.prisma.itemStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sort_by]: sort_order === 'asc' ? 'asc' : 'desc',
        },
        include: {
          item: {
            select: {
              itemcode: true,
              itemname: true,
            },
          },
        },
      });

      return {
        success: true,
        data: itemStocks,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item stocks',
        error: error.message,
      };
    }
  }

  /**
   * รายการ ItemSlotInCabinetDetail ที่ IsBorrow = true
   * DepID → department.ID (แผนกที่ยืม)
   * StockID → app_cabinets.stock_id → app_cabinet_departments → department(s) (Division ที่ตั้งตู้ / ที่อยู่)
   */
  async findBorrowItemStocks(params: {
    page?: number;
    limit?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: number;
    cabinetId?: number;
    borrowDepartmentId?: number;
  }) {
    try {
      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(100, Math.max(1, params.limit ?? 20));
      const skip = (page - 1) * limit;
      const keyword = params.keyword?.trim();

      const where: Prisma.ItemSlotInCabinetDetailWhereInput = {
        IsBorrow: true,
      };
      if (keyword) {
        where.AND = [
          {
            OR: [
              { itemcode: { contains: keyword } },
              { HnCode: { contains: keyword } },
              {
                item: {
                  OR: [
                    { itemcode: { contains: keyword } },
                    { itemname: { contains: keyword } },
                  ],
                },
              },
            ],
          },
        ];
      }
      if (params.borrowDepartmentId != null) {
        where.DepID = params.borrowDepartmentId;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (
        (params.startDate && dateRegex.test(params.startDate)) ||
        (params.endDate && dateRegex.test(params.endDate))
      ) {
        const dateRange: Prisma.DateTimeFilter = {};
        if (params.startDate && dateRegex.test(params.startDate)) {
          dateRange.gte = new Date(`${params.startDate}T00:00:00.000Z`);
        }
        if (params.endDate && dateRegex.test(params.endDate)) {
          dateRange.lte = new Date(`${params.endDate}T23:59:59.999Z`);
        }
        where.ModifyDate = dateRange;
      }

      const mergeStockIds = (
        current: number[] | null,
        incoming: number[],
      ): number[] => {
        if (current == null) return [...new Set(incoming)];
        const inSet = new Set(incoming);
        return current.filter((id) => inSet.has(id));
      };

      let allowedStockIds: number[] | null = null;
      if (params.cabinetId != null) {
        const cab = await this.prisma.cabinet.findUnique({
          where: { id: params.cabinetId },
          select: { stock_id: true },
        });
        const one = cab?.stock_id != null ? [cab.stock_id] : [];
        allowedStockIds = mergeStockIds(allowedStockIds, one);
      }
      if (params.departmentId != null) {
        const links = await this.prisma.cabinetDepartment.findMany({
          where: {
            department_id: params.departmentId,
            status: 'ACTIVE',
            cabinet_id: { not: null },
          },
          select: { cabinet_id: true },
        });
        const cabinetIds = links
          .map((l) => l.cabinet_id)
          .filter((id): id is number => id != null);
        const cabinetsByDept =
          cabinetIds.length > 0
            ? await this.prisma.cabinet.findMany({
                where: { id: { in: cabinetIds }, stock_id: { not: null } },
                select: { stock_id: true },
              })
            : [];
        const stockIdsByDept = cabinetsByDept
          .map((c) => c.stock_id)
          .filter((id): id is number => id != null);
        allowedStockIds = mergeStockIds(allowedStockIds, stockIdsByDept);
      }
      if (allowedStockIds != null && allowedStockIds.length === 0) {
        return {
          success: true,
          data: [],
          total: 0,
          page,
          limit,
          lastPage: 1,
        };
      }
      if (allowedStockIds != null) {
        where.StockID = { in: allowedStockIds };
      }

      const [total, rows] = await Promise.all([
        this.prisma.itemSlotInCabinetDetail.count({ where }),
        this.prisma.itemSlotInCabinetDetail.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            item: { select: { itemcode: true, itemname: true } },
            borrowDepartment: {
              select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
            },
          },
        }),
      ]);

      const stockIds = [...new Set(rows.map((r) => r.StockID))];
      const cabinets =
        stockIds.length > 0
          ? await this.prisma.cabinet.findMany({
              where: { stock_id: { in: stockIds } },
              select: { id: true, stock_id: true, cabinet_name: true, cabinet_code: true },
            })
          : [];
      const stockIdToCabinet = new Map(
        cabinets.filter((c) => c.stock_id != null).map((c) => [c.stock_id as number, c]),
      );

      const cabinetIds = cabinets.map((c) => c.id);
      const cdLinks =
        cabinetIds.length > 0
          ? await this.prisma.cabinetDepartment.findMany({
              where: {
                cabinet_id: { in: cabinetIds },
                status: 'ACTIVE',
                department_id: { not: null },
              },
              include: {
                department: {
                  select: { ID: true, DepName: true, DepName2: true, RefDepID: true },
                },
              },
            })
          : [];

      type DivRow = {
        ID: number;
        DepName?: string | null;
        DepName2?: string | null;
        RefDepID?: string | null;
      };
      const divisionsByCabinetId = new Map<number, DivRow[]>();
      for (const link of cdLinks) {
        if (link.cabinet_id == null || link.department == null) continue;
        const d = link.department;
        const arr = divisionsByCabinetId.get(link.cabinet_id) ?? [];
        if (!arr.some((x) => x.ID === d.ID)) {
          arr.push({
            ID: d.ID,
            DepName: d.DepName,
            DepName2: d.DepName2,
            RefDepID: d.RefDepID,
          });
        }
        divisionsByCabinetId.set(link.cabinet_id, arr);
      }

      const data = rows.map((d) => {
        const cab = stockIdToCabinet.get(d.StockID);
        const cabinetDivisions = cab ? divisionsByCabinetId.get(cab.id) ?? [] : [];
        const bd = d.borrowDepartment;
        return {
          rowId: d.id,
          sel: d.Sel,
          itemCode: d.itemcode,
          itemName: d.item?.itemname ?? null,
          hnCode: d.HnCode,
          qty: d.Qty,
          depId: d.DepID ?? null,
          /** แผนกที่ยืม (จาก DepID) */
          borrowDepartment: bd
            ? {
                ID: bd.ID,
                DepName: bd.DepName,
                DepName2: bd.DepName2,
                RefDepID: bd.RefDepID,
              }
            : null,
          stockId: d.StockID,
          slotNo: d.SlotNo,
          sensor: d.Sensor,
          sign: d.Sign,
          userId: d.UserID,
          isDeproom: d.IsDeproom,
          modifyDate: d.ModifyDate?.toISOString?.() ?? null,
          cabinet: cab
            ? {
                id: cab.id,
                cabinet_name: cab.cabinet_name,
                cabinet_code: cab.cabinet_code,
              }
            : null,
          /** Division ที่ตั้งตู้ (StockID → ตู้ → แผนกที่ผูกตู้) */
          cabinetDivisions,
        };
      });

      return {
        success: true,
        data,
        total,
        page,
        limit,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (error) {
      return {
        success: false,
        message: 'ดึงรายการยืมไม่สำเร็จ',
        error: (error as Error)?.message ?? String(error),
        data: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        lastPage: 1,
      };
    }
  }

  // ====================================== Item Stock IN Cabinet API ======================================

  async findAllItemStockInCabinet(
    page: number = 1,
    limit: number = 10,
    keyword?: string,
    cabinet_id?: number,
  ) {
    try {
      const where: any = {};
      const skip = (page - 1) * limit;

      // แสดงทั้งหมด (ทั้งที่อยู่ในตู้และถูกเบิก)
      // where.IsStock = true; // ลบออกเพื่อแสดงทั้งหมด

      if (cabinet_id) {
        // Get stock_id from cabinet table
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: { stock_id: true },
        });
        if (cabinet?.stock_id) {
          where.StockID = cabinet.stock_id;
        }
      }

      if (keyword) {
        where.item = {
          OR: [
            { itemcode: { contains: keyword } },
            { itemname: { contains: keyword } },
          ],
        };
      }
      const total = await this.prisma.itemStock.count({
        where,
      });

      const itemStocks = await this.prisma.itemStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          LastCabinetModify: 'desc',
        },
        select: {
          StockID: true,
          RfidCode: true,
          LastCabinetModify: true,
          Qty: true,
          ItemCode: true,
          IsStock: true,
          CabinetUserID: true,
          CreateDate: true,
          ReturnDate: true,
          InsertDate: true,
          cabinet: {
            select: {
              cabinet_name: true,
              cabinet_code: true,
            },
          },
          item: {
            select: {
              itemcode: true,
              itemname: true,
            },
          },
        },
      });

      // สรุปจำนวนอุปกรณ์แต่ละชนิดในตู้ (A กี่ชิ้น, B กี่ชิ้น, ...)
      const itemCountsRaw = await this.prisma.itemStock.groupBy({
        by: ['ItemCode'],
        where,
        _sum: { Qty: true },
        _count: { RowID: true },
      });
      const itemCodes = itemCountsRaw.map((x) => x.ItemCode).filter(Boolean) as string[];
      const itemsInfo =
        itemCodes.length > 0
          ? await this.prisma.item.findMany({
            where: { itemcode: { in: itemCodes } },
            select: { itemcode: true, itemname: true },
          })
          : [];
      const itemNameMap = Object.fromEntries(itemsInfo.map((i) => [i.itemcode, i.itemname ?? i.itemcode]));
      const item_counts = itemCountsRaw.map((row) => ({
        itemcode: row.ItemCode,
        itemname: itemNameMap[row.ItemCode ?? ''] ?? row.ItemCode ?? '-',
        total_qty: row._sum.Qty ?? 0,
        count_rows: row._count.RowID,
      }));

      return {
        success: true,
        data: itemStocks,
        item_counts,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item stocks in cabinet',
        error: error.message,
      };
    }
  }


  // ====================================== Item Stock Return API ======================================
  /**
   * สรุปตาม ItemCode: ถอนวันนี้ - ใช้วันนี้ - คืนวันนี้ = max_available_qty
   * ใช้ item_code จาก supply_item_return_records (อ้างอิงตามรหัสสินค้า)
   */
  async findAllItemStockWillReturn(filters?: {
    department_id?: number;
    cabinet_id?: number;
    sub_department_id?: number;
    item_code?: string;
    start_date?: string;
    end_date?: string;
  }) {
    try {
      let subDeptId: number | null = null;
      if (filters?.sub_department_id != null) {
        const n = Number(filters.sub_department_id);
        if (Number.isInteger(n) && n >= 1) subDeptId = n;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      let dateCondition = 'DATE(ist.LastCabinetModify) = DATE(NOW())';
      if (filters?.start_date && filters?.end_date && dateRegex.test(filters.start_date) && dateRegex.test(filters.end_date)) {
        dateCondition = `DATE(ist.LastCabinetModify) BETWEEN '${filters.start_date}' AND '${filters.end_date}'`;
      } else if (filters?.start_date && dateRegex.test(filters.start_date)) {
        dateCondition = `DATE(ist.LastCabinetModify) >= '${filters.start_date}'`;
      } else if (filters?.end_date && dateRegex.test(filters.end_date)) {
        dateCondition = `DATE(ist.LastCabinetModify) <= '${filters.end_date}'`;
      }

      const usageSubDeptCond =
        subDeptId != null ? `AND msu.sub_department_id = ${subDeptId}` : '';
      type Row = {
        ItemCode: string;
        StockID: number;
        cabinet_id: number | null;
        cabinet_name: string | null;
        cabinet_code: string | null;
        department_id: number | null;
        department_name: string | null;
        itemname: string | null;
        withdraw_qty: number;
        used_qty: number;
        return_qty: number;
        max_available_qty: number;
      };
      const result = await this.prisma.$queryRawUnsafe<Row[]>(`
    SELECT *
        FROM (
            SELECT
                w.ItemCode,
                w.StockID,
                c.id AS cabinet_id,
                c.cabinet_name,
                c.cabinet_code,
                cd.department_id,
                dept.DepName AS department_name,
                i.itemname,
                w.withdraw_qty,
                COALESCE(u.used_qty, 0) AS used_qty,
                COALESCE(r.return_qty, 0) AS return_qty,
                (w.withdraw_qty
                    - COALESCE(u.used_qty, 0)
                    - COALESCE(r.return_qty, 0)) AS max_available_qty
            FROM (
                SELECT
                    ist.ItemCode,
                    COUNT(*) AS withdraw_qty,
                    ist.StockID
                FROM itemstock ist
                WHERE ist.IsStock = 0
                  AND COALESCE(ist.DeptID, 0) = 0
                  AND ${dateCondition}
                GROUP BY ist.StockID,
                ist.ItemCode
            ) w
            LEFT JOIN app_cabinets c ON c.stock_id = w.StockID
            LEFT JOIN (
                SELECT cabinet_id, MIN(department_id) AS department_id
                FROM app_cabinet_departments
                WHERE status = 'ACTIVE'
                GROUP BY cabinet_id
            ) cd ON cd.cabinet_id = c.id
            LEFT JOIN department dept ON dept.ID = cd.department_id
            LEFT JOIN (
                SELECT
                    sui.order_item_code AS ItemCode,
                    msu.department_id,
                    SUM(sui.qty) AS used_qty
                FROM app_supply_usage_items sui
                INNER JOIN app_medical_supply_usages msu ON msu.id = sui.medical_supply_usage_id
                WHERE DATE(sui.created_at) = DATE(NOW())
                  AND (sui.order_item_status IS NULL OR sui.order_item_status != 'Discontinue')
                  ${usageSubDeptCond}
                GROUP BY sui.order_item_code, msu.department_id
            ) u ON u.ItemCode = w.ItemCode AND u.department_id = cd.department_id
            LEFT JOIN (
                SELECT
                    srr.item_code AS ItemCode,
                    srr.stock_id AS StockID,
                    SUM(srr.qty_returned) AS return_qty
                FROM app_supply_item_return_records srr
                WHERE DATE(srr.return_datetime) = DATE(NOW())
                GROUP BY srr.item_code, srr.stock_id
            ) r ON r.ItemCode = w.ItemCode AND r.StockID = w.StockID
            LEFT JOIN item i ON i.itemcode = w.ItemCode
        ) x
        WHERE x.max_available_qty > 0
        ORDER BY x.ItemCode;
      `);

      // แปลง BigInt เป็น Number เพื่อให้ serialize ผ่าน TCP ได้ (JSON.stringify ไม่รองรับ BigInt)
      let data = result.map((row) => ({
        ItemCode: row.ItemCode,
        StockID: Number(row.StockID),
        cabinet_id: row.cabinet_id != null ? Number(row.cabinet_id) : null,
        cabinet_name: row.cabinet_name ?? null,
        cabinet_code: row.cabinet_code ?? null,
        department_id: row.department_id != null ? Number(row.department_id) : null,
        department_name: row.department_name ?? null,
        itemname: row.itemname,
        withdraw_qty: Number(row.withdraw_qty),
        used_qty: Number(row.used_qty),
        return_qty: Number(row.return_qty),
        max_available_qty: Number(row.max_available_qty),
      }));

      if (filters) {
        if (filters.department_id != null) {
          data = data.filter((r) => r.department_id === filters!.department_id);
        }
        if (filters.cabinet_id != null) {
          data = data.filter((r) => r.cabinet_id === filters!.cabinet_id);
        }
        if (filters.item_code != null && String(filters.item_code).trim() !== '') {
          const code = String(filters.item_code).trim().toLowerCase();
          data = data.filter(
            (r) =>
              (r.ItemCode ?? '').toLowerCase().includes(code) ||
              (r.itemname ?? '').toLowerCase().includes(code),
          );
        }
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch itemstock will return count',
        error: (error as any)?.message ?? String(error),
      };
    }
  }

  /** RFID เฮกซ์ 24 ตัว (12 bytes) แบบ EPC เช่น E28068940000502DDB1720EC — ตรวจซ้ำใน itemstock.RfidCode */
  private async generateUniqueRfid24(): Promise<string> {
    for (let attempt = 0; attempt < 80; attempt++) {
      const rfid = randomBytes(12).toString('hex').toUpperCase();
      const exists = await this.prisma.itemStock.findFirst({
        where: { RfidCode: rfid },
        select: { RowID: true },
      });
      if (!exists) return rfid;
    }
    throw new Error('ไม่สามารถสร้าง RFID ไม่ซ้ำได้');
  }

  /** วันหมดอายุจาก YYYY-MM-DD — local noon เพื่อเลี่ยง UTC เลื่อนวัน */
  private parsePrintExpireDateYmd(raw?: string): Date | null {
    if (raw == null || typeof raw !== 'string') return null;
    const s = raw.trim();
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  /** เลขที่เอกสาร Insert RFID — VarChar(20) ตาม legacy InsertRfidDocNo */
  private generateInsertRfidDocNo(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const x = randomInt(10000, 99999);
    return `RF${x}${ts}`.slice(0, 20);
  }

  /**
   * สร้างแถว itemstock ก่อนพิมพ์สติกเกอร์ — แต่ละแผ่น = 1 RFID เฮกซ์ 24 ตัว (สุ่ม)
   * ฟิลด์สอดคล้อง INSERT legacy: IsStatus=5, PackDate, UsageCode(≈Barcode), ProductSerial(≈itemcode2),
   * lotNo, RemarkExpress, IsDeproom, departmentroomId, InsertRfidDocNo + StockID/DeptID/Qty
   */
  async createItemStocksForPrint(
    lines: Array<{
      itemcode: string;
      cabinet_id: number;
      department_id: number;
      copies: number;
      expire_date?: string;
    }>,
  ) {
    try {
      const totalCopies = lines.reduce((s, l) => s + l.copies, 0);
      if (totalCopies > 2000) {
        return {
          success: false,
          message: 'จำนวนแผ่นรวมเกิน 2000',
        };
      }

      const insertRfidDocNo = this.generateInsertRfidDocNo();
      const packDate = new Date();
      /** lot ร่วมสำหรับชุดพิมพ์ครั้งนี้ — legacy ใช้ LotNo */
      const lotNoBatch = `P-${insertRfidDocNo}`.slice(0, 50);

      const created: Array<{ RowID: number; ItemCode: string | null; RfidCode: string | null }> = [];

      for (const line of lines) {
        const itemCodeKey =
          typeof line.itemcode === 'string' ? line.itemcode.trim() : '';
        if (!itemCodeKey) {
          return {
            success: false,
            message: 'itemcode ต้องไม่ว่าง',
          };
        }

        const cab = await this.prisma.cabinet.findUnique({
          where: { id: line.cabinet_id },
          select: { id: true, stock_id: true },
        });
        if (!cab?.stock_id) {
          return {
            success: false,
            message: `ไม่พบตู้หรือไม่มี stock_id (cabinet_id=${line.cabinet_id})`,
          };
        }

        const link = await this.prisma.cabinetDepartment.findFirst({
          where: {
            cabinet_id: line.cabinet_id,
            department_id: line.department_id,
            status: 'ACTIVE',
          },
        });
        if (!link) {
          return {
            success: false,
            message: `Division ไม่ได้ผูกกับตู้นี้ (department_id=${line.department_id}, cabinet_id=${line.cabinet_id})`,
          };
        }

        const item = await this.prisma.item.findUnique({
          where: { itemcode: itemCodeKey },
          select: { itemcode: true, Barcode: true, itemcode2: true },
        });

        if (!item) {
          return {
            success: false,
            message: `ไม่พบ Item ${itemCodeKey}`,
          };
        }

        /** UsageCode ใน legacy = QrCode — ใช้ Barcode แล้ว fallback itemcode */
        const usageCode = (item.Barcode?.trim() || item.itemcode || '').slice(0, 20);
        /** ProductSerial = ItemCode2 */
        const productSerial = (item.itemcode2?.trim() || '').slice(0, 25);
        const expireAt = this.parsePrintExpireDateYmd(line.expire_date);

        for (let _n = 0; _n < line.copies; _n++) {
          const rfid = await this.generateUniqueRfid24();
          const row = await this.prisma.itemStock.create({
            data: {
              CreateDate: packDate,
              ItemCode: itemCodeKey.slice(0, 20),
              UsageCode: usageCode || null,
              RfidCode: rfid,
              IsStatus: 5,
              PackDate: packDate,
              ExpireDate: expireAt,
              Qty: 1,
              RemarkExpress: '',
              ProductSerial: productSerial || null,
              lotNo: lotNoBatch || null,
              expDate: expireAt,
              IsDeproom: '0',
              departmentroomId: line.department_id,
              InsertRfidDocNo: insertRfidDocNo,
              StockID: cab.stock_id,
              IsStock: true,
              DeptID: line.department_id,
              HNCode: 0,
            },
          });
          created.push({
            RowID: row.RowID,
            ItemCode: row.ItemCode,
            RfidCode: row.RfidCode,
          });
        }
      }

      return {
        success: true,
        message: `บันทึก item stock ${created.length} รายการ (RFID เฮกซ์ 24 ตัว)`,
        data: {
          count: created.length,
          insertRfidDocNo,
          rows: created,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'สร้าง item stock ไม่สำเร็จ',
        error: (error as Error)?.message ?? String(error),
      };
    }
  }

  /** สร้าง itemstock โดยรับ stock_id แล้ว map ไป cabinet_id + department_id (ACTIVE ตัวแรก), หรือ stock_id=0 */
  async createItemStocksForPrintByStock(
    lines: Array<{
      itemcode: string;
      stock_id: number;
      copies: number;
      expire_date?: string;
    }>,
  ) {
    try {
      const totalCopies = lines.reduce((s, l) => s + l.copies, 0);
      if (totalCopies > 2000) {
        return {
          success: false,
          message: 'จำนวนแผ่นรวมเกิน 2000',
        };
      }

      const insertRfidDocNo = this.generateInsertRfidDocNo();
      const packDate = new Date();
      const lotNoBatch = `P-${insertRfidDocNo}`.slice(0, 50);

      const created: Array<{ RowID: number; ItemCode: string | null; RfidCode: string | null }> = [];

      for (const line of lines) {
        const stockId = Number(line.stock_id);
        if (!Number.isFinite(stockId) || stockId < 0) {
          return {
            success: false,
            message: `stock_id ไม่ถูกต้อง (${line.stock_id})`,
          };
        }

        let finalStockId = 0;
        let finalDeptId = 0;

        if (stockId > 0) {
          const cabinet = await this.prisma.cabinet.findUnique({
            where: { stock_id: Math.floor(stockId) },
            select: { id: true, stock_id: true },
          });
          if (!cabinet?.id || !cabinet.stock_id) {
            return {
              success: false,
              message: `ไม่พบตู้จาก stock_id=${stockId}`,
            };
          }

          const activeDept = await this.prisma.cabinetDepartment.findFirst({
            where: {
              cabinet_id: cabinet.id,
              status: 'ACTIVE',
              department_id: { not: null },
            },
            orderBy: { id: 'asc' },
            select: { department_id: true },
          });
          if (!activeDept?.department_id) {
            return {
              success: false,
              message: `ไม่พบ Division (ACTIVE) ของตู้ stock_id=${stockId}`,
            };
          }

          finalStockId = cabinet.stock_id;
          finalDeptId = activeDept.department_id;
        }

        const itemCodeKey =
          typeof line.itemcode === 'string' ? line.itemcode.trim() : '';
        if (!itemCodeKey) {
          return {
            success: false,
            message: 'itemcode ต้องไม่ว่าง',
          };
        }

        const item = await this.prisma.item.findUnique({
          where: { itemcode: itemCodeKey },
          select: { itemcode: true, Barcode: true, itemcode2: true },
        });
        if (!item) {
          return {
            success: false,
            message: `ไม่พบ Item ${itemCodeKey}`,
          };
        }

        const usageCode = (item.Barcode?.trim() || item.itemcode || '').slice(0, 20);
        const productSerial = (item.itemcode2?.trim() || '').slice(0, 25);
        const expireAt = this.parsePrintExpireDateYmd(line.expire_date);

        for (let _n = 0; _n < line.copies; _n++) {
          const rfid = await this.generateUniqueRfid24();
          const row = await this.prisma.itemStock.create({
            data: {
              CreateDate: packDate,
              ItemCode: itemCodeKey.slice(0, 20),
              UsageCode: usageCode || null,
              RfidCode: rfid,
              IsStatus: 5,
              PackDate: packDate,
              ExpireDate: expireAt,
              Qty: 1,
              RemarkExpress: '',
              ProductSerial: productSerial || null,
              lotNo: lotNoBatch || null,
              expDate: expireAt,
              IsDeproom: '0',
              departmentroomId: finalDeptId,
              InsertRfidDocNo: insertRfidDocNo,
              StockID: finalStockId,
              IsStock: true,
              DeptID: finalDeptId,
              HNCode: 0,
            },
          });
          created.push({
            RowID: row.RowID,
            ItemCode: row.ItemCode,
            RfidCode: row.RfidCode,
          });
        }
      }

      return {
        success: true,
        message: `บันทึก item stock ${created.length} รายการ (RFID เฮกซ์ 24 ตัว)`,
        data: {
          count: created.length,
          insertRfidDocNo,
          rows: created,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'สร้าง item stock (by stock_id) ไม่สำเร็จ',
        error: (error as Error)?.message ?? String(error),
      };
    }
  }

  /** ลบแถว itemstock ที่สร้างจาก flow พิมพ์ฉลาก (IsStatus=5) */
  async deleteItemStocksForPrint(rowIds: number[]) {
    try {
      const uniqueRowIds = [...new Set((rowIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))];
      if (uniqueRowIds.length === 0) {
        return { success: false, message: 'rowIds ต้องมีอย่างน้อย 1 รายการ' };
      }

      const result = await this.prisma.itemStock.deleteMany({
        where: {
          RowID: { in: uniqueRowIds },
          IsStatus: 5,
        },
      });

      return {
        success: true,
        message: `ลบ itemstock สำเร็จ ${result.count} รายการ`,
        data: { count: result.count },
      };
    } catch (error) {
      return {
        success: false,
        message: 'ลบ itemstock ไม่สำเร็จ',
        error: (error as Error)?.message ?? String(error),
      };
    }
  }
}
