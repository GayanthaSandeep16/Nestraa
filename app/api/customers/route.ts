import { NextResponse, type NextRequest } from "next/server";
import { createCustomer, listCustomers } from "@/lib/services/customers";
import { customerSchema } from "@/lib/validation/customers";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const customers = await listCustomers();
  return NextResponse.json(customers);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await createCustomer(parsed.data);
  return NextResponse.json(customer, { status: 201 });
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
