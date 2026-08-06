import { prisma } from "@/lib/db/prisma";

export function listProcessDefinitions() {
  return prisma.productionProcessDefinition.findMany({
    include: { inputMaterial: true, outputMaterial: true },
    orderBy: { name: "asc" },
  });
}

export function getProcessDefinition(id: string) {
  return prisma.productionProcessDefinition.findUnique({
    where: { id },
    include: { inputMaterial: true, outputMaterial: true },
  });
}

export interface ProcessDefinitionInput {
  name: string;
  inputMaterialId?: string | null;
  outputMaterialId?: string | null;
  expectedYieldPct?: number | null;
  description?: string | null;
}

export function createProcessDefinition(data: ProcessDefinitionInput) {
  return prisma.productionProcessDefinition.create({ data });
}

export function updateProcessDefinition(id: string, data: Partial<ProcessDefinitionInput>) {
  return prisma.productionProcessDefinition.update({ where: { id }, data });
}

export function deleteProcessDefinition(id: string) {
  return prisma.productionProcessDefinition.delete({ where: { id } });
}
