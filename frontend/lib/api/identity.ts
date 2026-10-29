import { z } from "zod";

import type { AuthenticatedApiClient } from "@/lib/api/client";

const identityContextSchema = z.object({
  userId: z.string().min(1),
  membershipId: z.string().min(1),
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export type IdentityContext = z.infer<typeof identityContextSchema>;

export async function getCurrentIdentity(
  client: AuthenticatedApiClient,
): Promise<IdentityContext> {
  const response = await client.request<unknown>("/api/v1/identity/me");
  const parsed = identityContextSchema.safeParse(response);

  if (!parsed.success) {
    throw new Error("Identity response did not match the expected contract.");
  }

  return parsed.data;
}
