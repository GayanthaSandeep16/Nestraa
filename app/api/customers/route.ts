import { NextResponse, type NextRequest } from "next/server";
import { countCustomers, createCustomer, listCustomers } from "@/lib/services/customers";
import { customerSchema } from "@/lib/validation/customers";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listCustomers(p), countCustomers));
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
