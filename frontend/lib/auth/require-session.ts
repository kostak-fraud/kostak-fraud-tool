import { redirect } from "next/navigation";

import { loginPathFor } from "@/lib/auth/return-to";
import { PublicConfigurationError } from "@/lib/config/public-env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireVerifiedSession(returnTo: string) {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    if (error instanceof PublicConfigurationError) {
      redirect(`${loginPathFor(returnTo)}&configuration=missing`);
    }
    throw error;
  }

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    redirect(loginPathFor(returnTo));
  }

  return data.claims;
}
