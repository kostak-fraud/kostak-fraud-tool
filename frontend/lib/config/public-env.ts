export class PublicConfigurationError extends Error {
  readonly missingVariables: readonly string[];

  constructor(missingVariables: readonly string[]) {
    super(`Missing public configuration: ${missingVariables.join(", ")}`);
    this.name = "PublicConfigurationError";
    this.missingVariables = missingVariables;
  }
}

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function requirePublicValues(values: Record<string, string | undefined>) {
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new PublicConfigurationError(missingVariables);
  }

  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, value!.trim()]),
  ) as Record<keyof typeof values, string>;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const values = requirePublicValues({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return {
    url: values.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getApiBaseUrl(): string {
  const values = requirePublicValues({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  let parsed: URL;
  try {
    parsed = new URL(values.NEXT_PUBLIC_API_BASE_URL);
  } catch {
    throw new PublicConfigurationError(["NEXT_PUBLIC_API_BASE_URL"]);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new PublicConfigurationError(["NEXT_PUBLIC_API_BASE_URL"]);
  }

  return parsed.toString().replace(/\/$/, "");
}
