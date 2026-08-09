import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { canAccessModule, type ModuleKey } from "@/lib/auth/roles";

export class AuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resolves the current app user and checks module access, throwing AuthError otherwise. */
export async function requireModuleAccess(moduleKey: ModuleKey) {
  const user = await getCurrentAppUser();
  if (!user) throw new AuthError(401, "Not authenticated");
  if (!user.isActive) throw new AuthError(403, "Your account is inactive");
  if (!canAccessModule(user.role?.name, moduleKey)) {
    throw new AuthError(403, "You do not have access to this module");
  }
  return user;
}

/** Wraps an API route handler with a module access check, preserving its signature. */
export function withModuleAccess<Args extends unknown[]>(
  moduleKey: ModuleKey,
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args) => {
    try {
      await requireModuleAccess(moduleKey);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    return handler(...args);
  };
}
