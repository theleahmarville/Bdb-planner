export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Anthropic API key for Zion AI */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
