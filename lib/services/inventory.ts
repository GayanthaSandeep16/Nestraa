import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

interface CurrentStockRow {
  material_id: string;
  warehouse_id: string | null;
  quantity_on_hand: Prisma.Decimal;
}

interface LowStockRow {
  id: string;
  name: string;
  reorder_level: Prisma.Decimal;
  on_hand: Prisma.Decimal;
}

interface ExpiringBatchRow {
  batch_no: string;
  material_id: string;
  quantity: Prisma.Decimal;
  expiry_date: Date;
}

export async function getCurrentStock(filters?: { materialId?: string; warehouseId?: string }) {
  const rows = await prisma.$queryRaw<CurrentStockRow[]>`
    SELECT material_id, warehouse_id, quantity_on_hand FROM v_current_stock
    WHERE (${filters?.materialId ?? null}::uuid IS NULL OR material_id = ${filters?.materialId ?? null}::uuid)
      AND (${filters?.warehouseId ?? null}::uuid IS NULL OR warehouse_id = ${filters?.warehouseId ?? null}::uuid)
  `;

  const materialIds = [...new Set(rows.map((row) => row.material_id))];
  // v_current_stock is warehouse stock only, but guard against a NULL
  // warehouse_id leaking in (inventory_movements.warehouse_id is nullable
  // since the consignment module) so Prisma never gets `id IN (uuid, NULL)`.
  const warehouseIds = [...new Set(rows.map((row) => row.warehouse_id).filter((id): id is string => id !== null))];

  const [materials, warehouses] = await Promise.all([
    prisma.material.findMany({ where: { id: { in: materialIds } }, include: { baseUom: true } }),
    prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } }),
  ]);

  const materialById = new Map(materials.map((material) => [material.id, material]));
  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  return rows
    .filter((row) => row.warehouse_id !== null)
    .map((row) => ({
      material: materialById.get(row.material_id) ?? null,
      warehouse: row.warehouse_id ? warehouseById.get(row.warehouse_id) ?? null : null,
      quantityOnHand: row.quantity_on_hand,
    }));
}

export async function getLowStock() {
  const rows = await prisma.$queryRaw<LowStockRow[]>`SELECT id, name, reorder_level, on_hand FROM v_low_stock`;
  return rows.map((row) => ({
    materialId: row.id,
    name: row.name,
    reorderLevel: row.reorder_level,
    onHand: row.on_hand,
  }));
}

export async function getExpiringBatches() {
  const rows = await prisma.$queryRaw<ExpiringBatchRow[]>`
    SELECT batch_no, material_id, quantity, expiry_date FROM v_expiring_batches ORDER BY expiry_date ASC
  `;

  const materialIds = [...new Set(rows.map((row) => row.material_id))];
  const materials = await prisma.material.findMany({ where: { id: { in: materialIds } }, include: { baseUom: true } });
  const materialById = new Map(materials.map((material) => [material.id, material]));

  return rows.map((row) => ({
    batchNo: row.batch_no,
    material: materialById.get(row.material_id) ?? null,
    quantity: row.quantity,
    expiryDate: row.expiry_date,
  }));
}

export interface MovementFilters {
  materialId?: string;
  warehouseId?: string;
  direction?: "in" | "out" | "adjustment";
  source?: string;
}

function movementWhere(filters?: MovementFilters): Prisma.InventoryMovementWhereInput {
  return {
    materialId: filters?.materialId,
    warehouseId: filters?.warehouseId,
    direction: filters?.direction,
    source: filters?.source as Prisma.InventoryMovementWhereInput["source"],
  };
}

export function listMovements(filters?: MovementFilters, opts?: { skip?: number; take?: number }) {
  return prisma.inventoryMovement.findMany({
    where: movementWhere(filters),
    include: {
      material: true,
      warehouse: true,
      uom: true,
      batch: true,
    },
    orderBy: { createdAt: "desc" },
    ...opts,
  });
}

export function countMovements(filters?: MovementFilters) {
  return prisma.inventoryMovement.count({ where: movementWhere(filters) });
}

export async function getAvailableBatches(materialId: string, warehouseId?: string) {
  const batches = await prisma.batch.findMany({
    where: { materialId, warehouseId, deletedAt: null },
    include: { uom: true, warehouse: true },
    orderBy: { createdAt: "asc" },
  });

  const consumed = await prisma.inventoryMovement.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batches.map((batch) => batch.id) }, direction: "out" },
    _sum: { quantity: true },
  });

  const consumedByBatch = new Map(consumed.map((row) => [row.batchId, row._sum.quantity ?? new Prisma.Decimal(0)]));

  return batches
    .map((batch) => ({
      ...batch,
      remainingQuantity: batch.quantity.sub(consumedByBatch.get(batch.id) ?? new Prisma.Decimal(0)),
    }))
    .filter((batch) => batch.remainingQuantity.gt(0));
}

interface LineageRow {
  batch_id: string;
  batch_no: string;
  depth: number;
  direction: "input" | "output";
  quantity: Prisma.Decimal;
}

export async function getBatchLineage(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { material: true, warehouse: true, uom: true },
  });

  if (!batch) return null;

  const rows = await prisma.$queryRaw<LineageRow[]>`
    WITH RECURSIVE
    inputs AS (
      SELECT bi.input_batch_id AS batch_id, b.batch_no, 1 AS depth, bi.quantity_consumed AS quantity
      FROM batch_inputs bi
      JOIN batches b ON b.id = bi.input_batch_id
      WHERE bi.output_batch_id = ${batchId}::uuid
      UNION ALL
      SELECT bi.input_batch_id, b.batch_no, inputs.depth + 1, bi.quantity_consumed
      FROM batch_inputs bi
      JOIN batches b ON b.id = bi.input_batch_id
      JOIN inputs ON inputs.batch_id = bi.output_batch_id
    ),
    outputs AS (
      SELECT bi.output_batch_id AS batch_id, b.batch_no, 1 AS depth, bi.quantity_consumed AS quantity
      FROM batch_inputs bi
      JOIN batches b ON b.id = bi.output_batch_id
      WHERE bi.input_batch_id = ${batchId}::uuid
      UNION ALL
      SELECT bi.output_batch_id, b.batch_no, outputs.depth + 1, bi.quantity_consumed
      FROM batch_inputs bi
      JOIN batches b ON b.id = bi.output_batch_id
      JOIN outputs ON outputs.batch_id = bi.input_batch_id
    )
    SELECT batch_id, batch_no, depth, 'input'::text AS direction, quantity FROM inputs
    UNION ALL
    SELECT batch_id, batch_no, depth, 'output'::text AS direction, quantity FROM outputs
  `;

  return {
    batch,
    lineage: rows.map((row) => ({
      batchId: row.batch_id,
      batchNo: row.batch_no,
      depth: row.depth,
      direction: row.direction,
      quantity: row.quantity,
    })),
  };
}
