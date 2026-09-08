import { prisma } from "@/lib/db/prisma";

// Minimal append-only audit trail. Used so far only for document-print events
// (action "print"), where nothing mutates — hence no old/new values.
export function logAudit(params: {
  tableName: string;
  recordId: string;
  action: string;
  changedBy?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      changedBy: params.changedBy ?? null,
    },
  });
}
