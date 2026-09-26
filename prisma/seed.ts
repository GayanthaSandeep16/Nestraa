/**
 * Dummy/demo dataset for manual test rounds through the implemented modules:
 * Suppliers & Materials, Product Catalog & BOM, Procurement & GRN,
 * Inventory Ledger & Traceability, Production & Blend Orders, Packaging Orders.
 *
 * Run with: yarn db:seed
 *
 * Builds one full traceable chain (raw material -> GRN batch -> production
 * batch -> blend batch -> packaging/finished-goods batch) plus a few
 * uncompleted draft orders so the completion/cancel flows can be exercised
 * by hand in the UI. Additive only — does not touch or delete existing rows.
 */

import { prisma } from "../lib/db/prisma";
import { createGrn } from "../lib/services/grns";
import {
  createProductionOrder,
  completeProductionOrder,
} from "../lib/services/production-orders";
import { createBlendOrder, completeBlendOrder } from "../lib/services/blend-orders";
import {
  createPackagingOrder,
  completePackagingOrder,
} from "../lib/services/packaging-orders";
import { createPurchaseOrder, updatePurchaseOrderStatus } from "../lib/services/purchase-orders";

async function getUomId(code: string) {
  const uom = await prisma.unitOfMeasure.findUniqueOrThrow({ where: { code } });
  return uom.id;
}

async function upsertCategory(name: string) {
  return prisma.category.upsert({ where: { name }, update: {}, create: { name } });
}

async function findOrCreateWarehouse(name: string, location?: string) {
  const existing = await prisma.warehouse.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.warehouse.create({ data: { name, location } });
}

async function findOrCreateSupplier(name: string, data: Record<string, string>) {
  const existing = await prisma.supplier.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.supplier.create({ data: { name, ...data } });
}

async function upsertMaterial(data: {
  sku: string;
  name: string;
  materialType: "raw" | "processed" | "finished_good";
  categoryId: string;
  baseUomId: string;
  reorderLevel?: number;
  reorderQty?: number;
  shelfLifeDays?: number;
}) {
  return prisma.material.upsert({
    where: { sku: data.sku },
    update: {},
    create: data,
  });
}

async function findOrCreatePackageSize(name: string, netWeight: number, uomId: string) {
  const existing = await prisma.packageSize.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.packageSize.create({ data: { name, netWeight, uomId } });
}

async function findOrCreateProcessDefinition(data: {
  name: string;
  inputMaterialId: string;
  outputMaterialId: string;
  expectedYieldPct: number;
  description: string;
}) {
  const existing = await prisma.productionProcessDefinition.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.productionProcessDefinition.create({ data });
}

async function main() {
  console.log("Seeding demo dataset...");

  const kg = await getUomId("kg");
  const pcs = await getUomId("pcs");

  // Idempotency guard: if the demo pipeline's finished product already exists
  // and has a completed packaging batch, assume seeding already ran.
  const alreadySeeded = await prisma.material.findUnique({ where: { sku: "FG-CURRY-250" } });
  if (alreadySeeded) {
    const done = await prisma.packagingOrder.findFirst({
      where: { finishedProductId: alreadySeeded.id, status: "completed" },
    });
    if (done) {
      console.log("Demo dataset already present (FG-CURRY-250 has a completed packaging order). Skipping.");
      return;
    }
  }

  // --- Master data -----------------------------------------------------
  const catWhole = await upsertCategory("Whole Spices");
  const catGround = await upsertCategory("Ground Spices");
  const catBlend = await upsertCategory("Spice Blends");
  const catFinished = await upsertCategory("Finished Goods");

  const mainWarehouse = await findOrCreateWarehouse("Main Warehouse", "Colombo Factory");

  const supplier = await findOrCreateSupplier("Ceylon Spice Traders", {
    contactPerson: "Nimal Perera",
    phone: "+94 77 123 4567",
    email: "sales@ceylonspicetraders.lk",
    address: "112 Galle Road, Colombo 03",
    paymentTerms: "Net 30",
  });

  const rawChili = await upsertMaterial({
    sku: "RAW-CHIL-001",
    name: "Raw Chili (Dried)",
    materialType: "raw",
    categoryId: catWhole.id,
    baseUomId: kg,
    reorderLevel: 20,
    reorderQty: 100,
    shelfLifeDays: 365,
  });
  const rawTurmeric = await upsertMaterial({
    sku: "RAW-TUR-001",
    name: "Raw Turmeric (Dried Fingers)",
    materialType: "raw",
    categoryId: catWhole.id,
    baseUomId: kg,
    reorderLevel: 20,
    reorderQty: 100,
    shelfLifeDays: 365,
  });
  const rawCoriander = await upsertMaterial({
    sku: "RAW-COR-001",
    name: "Raw Coriander Seeds",
    materialType: "raw",
    categoryId: catWhole.id,
    baseUomId: kg,
    reorderLevel: 20,
    reorderQty: 100,
    shelfLifeDays: 365,
  });
  const rawCinnamon = await upsertMaterial({
    sku: "RAW-CIN-002",
    name: "Cinnamon Quills (Raw)",
    materialType: "raw",
    categoryId: catWhole.id,
    baseUomId: kg,
    reorderLevel: 10,
    reorderQty: 50,
    shelfLifeDays: 540,
  });

  const groundChili = await upsertMaterial({
    sku: "PROC-CHIL-001",
    name: "Ground Chili Powder",
    materialType: "processed",
    categoryId: catGround.id,
    baseUomId: kg,
    reorderLevel: 15,
    reorderQty: 80,
    shelfLifeDays: 270,
  });
  const groundTurmeric = await upsertMaterial({
    sku: "PROC-TUR-001",
    name: "Ground Turmeric Powder",
    materialType: "processed",
    categoryId: catGround.id,
    baseUomId: kg,
    reorderLevel: 15,
    reorderQty: 80,
    shelfLifeDays: 270,
  });
  const groundCoriander = await upsertMaterial({
    sku: "PROC-COR-001",
    name: "Ground Coriander Powder",
    materialType: "processed",
    categoryId: catGround.id,
    baseUomId: kg,
    // set close to expected remaining stock so v_low_stock has a hit to show in the UI
    reorderLevel: 60,
    reorderQty: 80,
    shelfLifeDays: 270,
  });

  const groundCinnamon = await upsertMaterial({
    sku: "PROC-CIN-001",
    name: "Ground Cinnamon Powder",
    materialType: "processed",
    categoryId: catGround.id,
    baseUomId: kg,
    reorderLevel: 10,
    reorderQty: 40,
    shelfLifeDays: 270,
  });

  const curryBlend = await upsertMaterial({
    sku: "PROC-CURRY-001",
    name: "Curry Powder Blend",
    materialType: "processed",
    categoryId: catBlend.id,
    baseUomId: kg,
    reorderLevel: 10,
    reorderQty: 50,
    shelfLifeDays: 180,
  });

  const curry250 = await upsertMaterial({
    sku: "FG-CURRY-250",
    name: "Curry Powder 250g Pack",
    materialType: "finished_good",
    categoryId: catFinished.id,
    baseUomId: pcs,
    reorderLevel: 50,
    reorderQty: 200,
    shelfLifeDays: 180,
  });
  const curry500 = await upsertMaterial({
    sku: "FG-CURRY-500",
    name: "Curry Powder 500g Pack",
    materialType: "finished_good",
    categoryId: catFinished.id,
    baseUomId: pcs,
    reorderLevel: 30,
    reorderQty: 100,
    shelfLifeDays: 180,
  });

  const size250 = await findOrCreatePackageSize("250g Pouch", 0.25, kg);
  await findOrCreatePackageSize("500g Pouch", 0.5, kg);

  const chiliGrinding = await findOrCreateProcessDefinition({
    name: "Chili Grinding",
    inputMaterialId: rawChili.id,
    outputMaterialId: groundChili.id,
    expectedYieldPct: 90,
    description: "Dry-grind raw chili pods into powder",
  });
  const turmericGrinding = await findOrCreateProcessDefinition({
    name: "Turmeric Grinding",
    inputMaterialId: rawTurmeric.id,
    outputMaterialId: groundTurmeric.id,
    expectedYieldPct: 92,
    description: "Dry-grind raw turmeric fingers into powder",
  });
  const corianderGrinding = await findOrCreateProcessDefinition({
    name: "Coriander Grinding",
    inputMaterialId: rawCoriander.id,
    outputMaterialId: groundCoriander.id,
    expectedYieldPct: 88,
    description: "Dry-grind raw coriander seeds into powder",
  });
  const cinnamonGrinding = await findOrCreateProcessDefinition({
    name: "Cinnamon Grinding",
    inputMaterialId: rawCinnamon.id,
    outputMaterialId: groundCinnamon.id,
    expectedYieldPct: 85,
    description: "Grind cinnamon quills into powder",
  });

  let curryRecipe = await prisma.recipe.findFirst({ where: { name: "Curry Powder Blend v1" } });
  if (!curryRecipe) {
    curryRecipe = await prisma.recipe.create({
      data: {
        name: "Curry Powder Blend v1",
        outputMaterialId: curryBlend.id,
        version: 1,
        ingredients: {
          create: [
            { materialId: groundChili.id, percentage: 30, uomId: kg },
            { materialId: groundTurmeric.id, percentage: 40, uomId: kg },
            { materialId: groundCoriander.id, percentage: 30, uomId: kg },
          ],
        },
      },
    });
  }

  console.log("Master data ready. Building procurement -> production -> blend -> packaging chain...");

  // --- Procurement: PO + GRN --------------------------------------------
  const po = await createPurchaseOrder({
    supplierId: supplier.id,
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    items: [
      { materialId: rawChili.id, quantity: 100, unitPrice: 850, uomId: kg },
      { materialId: rawTurmeric.id, quantity: 100, unitPrice: 620, uomId: kg },
      { materialId: rawCoriander.id, quantity: 100, unitPrice: 540, uomId: kg },
      { materialId: rawCinnamon.id, quantity: 50, unitPrice: 1450, uomId: kg },
    ],
  });
  await updatePurchaseOrderStatus(po.id, "sent");

  const soon = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // within the 30-day expiring window
  const later = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);

  const grn = await createGrn({
    poId: po.id,
    supplierId: supplier.id,
    warehouseId: mainWarehouse.id,
    notes: "Demo GRN — full receipt of PO",
    items: [
      {
        poItemId: po.items.find((i) => i.materialId === rawChili.id)!.id,
        materialId: rawChili.id,
        quantity: 100,
        unitCost: 850,
        uomId: kg,
        qcResult: "pass",
        manufactureDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expiryDate: later,
      },
      {
        poItemId: po.items.find((i) => i.materialId === rawTurmeric.id)!.id,
        materialId: rawTurmeric.id,
        quantity: 100,
        unitCost: 620,
        uomId: kg,
        qcResult: "pass",
        manufactureDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expiryDate: later,
      },
      {
        poItemId: po.items.find((i) => i.materialId === rawCoriander.id)!.id,
        materialId: rawCoriander.id,
        quantity: 100,
        unitCost: 540,
        uomId: kg,
        qcResult: "pass",
        // deliberately close to expiry so v_expiring_batches has something to show
        manufactureDate: new Date(Date.now() - 340 * 24 * 60 * 60 * 1000),
        expiryDate: soon,
      },
      {
        poItemId: po.items.find((i) => i.materialId === rawCinnamon.id)!.id,
        materialId: rawCinnamon.id,
        quantity: 50,
        unitCost: 1450,
        uomId: kg,
        qcResult: "pass",
        manufactureDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expiryDate: later,
      },
    ],
  });

  const batchByMaterial = new Map(grn.items.map((item) => [item.materialId, item.batchId!]));

  // --- Production Orders --------------------------------------------------
  // Three completed (feed the blend), one left as a draft for manual completion testing.
  const chiliOrder = await createProductionOrder({ processId: chiliGrinding.id, plannedQuantity: 100 });
  await completeProductionOrder(chiliOrder.id, {
    inputs: [{ batchId: batchByMaterial.get(rawChili.id)!, quantity: 100, uomId: kg }],
    output: { quantity: 90, uomId: kg, warehouseId: mainWarehouse.id, qcResult: "pass" },
  });

  const turmericOrder = await createProductionOrder({ processId: turmericGrinding.id, plannedQuantity: 100 });
  await completeProductionOrder(turmericOrder.id, {
    inputs: [{ batchId: batchByMaterial.get(rawTurmeric.id)!, quantity: 100, uomId: kg }],
    output: { quantity: 92, uomId: kg, warehouseId: mainWarehouse.id, qcResult: "pass" },
  });

  const corianderOrder = await createProductionOrder({ processId: corianderGrinding.id, plannedQuantity: 100 });
  await completeProductionOrder(corianderOrder.id, {
    inputs: [{ batchId: batchByMaterial.get(rawCoriander.id)!, quantity: 100, uomId: kg }],
    output: { quantity: 88, uomId: kg, warehouseId: mainWarehouse.id, qcResult: "pass" },
  });

  // Left in "draft" on purpose — lets you exercise the Production Orders
  // completion form by hand against the raw cinnamon batch.
  await createProductionOrder({ processId: cinnamonGrinding.id, plannedQuantity: 50 });

  const groundChiliBatch = await prisma.batch.findFirstOrThrow({
    where: { materialId: groundChili.id, batchType: "production" },
    orderBy: { createdAt: "desc" },
  });
  const groundTurmericBatch = await prisma.batch.findFirstOrThrow({
    where: { materialId: groundTurmeric.id, batchType: "production" },
    orderBy: { createdAt: "desc" },
  });
  const groundCorianderBatch = await prisma.batch.findFirstOrThrow({
    where: { materialId: groundCoriander.id, batchType: "production" },
    orderBy: { createdAt: "desc" },
  });

  // --- Blend Orders ---------------------------------------------------
  // One completed (feeds packaging), one left draft for manual completion testing.
  const blendOrder = await createBlendOrder({ recipeId: curryRecipe.id, plannedQuantity: 100 });
  await completeBlendOrder(blendOrder.id, {
    inputs: [
      { materialId: groundChili.id, batchId: groundChiliBatch.id, quantity: 30, uomId: kg },
      { materialId: groundTurmeric.id, batchId: groundTurmericBatch.id, quantity: 40, uomId: kg },
      { materialId: groundCoriander.id, batchId: groundCorianderBatch.id, quantity: 30, uomId: kg },
    ],
    output: { quantity: 98, uomId: kg, warehouseId: mainWarehouse.id, qcResult: "pass" },
  });

  await createBlendOrder({ recipeId: curryRecipe.id, plannedQuantity: 50 });

  const blendBatch = await prisma.batch.findFirstOrThrow({
    where: { materialId: curryBlend.id, batchType: "blend" },
    orderBy: { createdAt: "desc" },
  });

  // --- Packaging Orders -------------------------------------------------
  // One completed, one left draft for manual completion testing.
  const packagingOrder = await createPackagingOrder({
    processedMaterialId: curryBlend.id,
    finishedProductId: curry250.id,
    packageSizeId: size250.id,
    plannedQuantity: 98,
  });
  await completePackagingOrder(packagingOrder.id, {
    inputs: [{ batchId: blendBatch.id, quantity: 25, uomId: kg }],
    output: { quantity: 100, uomId: pcs, warehouseId: mainWarehouse.id, qcResult: "pass" },
    barcode: "8901234500017",
  });

  await createPackagingOrder({
    processedMaterialId: curryBlend.id,
    finishedProductId: curry500.id,
    packageSizeId: (await prisma.packageSize.findFirstOrThrow({ where: { name: "500g Pouch" } })).id,
    plannedQuantity: 30,
  });

  console.log("Demo dataset seeded successfully.");
  console.log(`- Purchase Order ${po.poNo} (received) + GRN ${grn.grnNo}`);
  console.log("- 3 Production Orders completed, 1 left as draft (Cinnamon Grinding)");
  console.log("- 1 Blend Order completed, 1 left as draft");
  console.log("- 1 Packaging Order completed (250g), 1 left as draft (500g)");
  console.log("- Raw coriander batch expiring in ~20 days (Inventory > Expiring Batches)");
  console.log("- Ground Coriander Powder reorder level set to trip Low Stock after the blend consumption");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
