import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentAppUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.appUser.findUnique({
    where: { id: user.id },
    include: { role: true },
  });
}
