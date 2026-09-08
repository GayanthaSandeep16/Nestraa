import { prisma } from "@/lib/db/prisma";

const include = {
  invoice: { include: { customer: true } },
  deliverer: true,
} as const;

export function listDeliveryNotes() {
  return prisma.deliveryNote.findMany({ include, orderBy: { createdAt: "desc" } });
}

export interface DeliveryNoteInput {
  invoiceId: string;
  notes?: string | null;
}

function generateDeliveryNo() {
  return `DN-${Date.now()}`;
}

// A delivery note is a printable dispatch record. Stock already left the
// warehouse when the invoice was created, so this posts no inventory movement.
export function createDeliveryNote(data: DeliveryNoteInput, deliveredBy?: string | null) {
  return prisma.deliveryNote.create({
    data: {
      deliveryNo: generateDeliveryNo(),
      invoiceId: data.invoiceId,
      notes: data.notes,
      deliveredAt: new Date(),
      deliveredBy,
    },
    include,
  });
}
