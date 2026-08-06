import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentAppUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  return prisma.appUser.findUnique({ where: { id: session.user.id } });
}
