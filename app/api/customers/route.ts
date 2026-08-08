import { NextResponse, type NextRequest } from "next/server";
import { createCustomer, listCustomers } from "@/lib/services/customers";
import { customerSchema } from "@/lib/validation/customers";

export async function GET() {
  const customers = await listCustomers();
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await createCustomer(parsed.data);
  return NextResponse.json(customer, { status: 201 });
}
