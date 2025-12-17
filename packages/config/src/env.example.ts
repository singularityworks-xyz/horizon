/**
 * Environment Variables Documentation
 *
 * Copy this to your .env.local file and fill in the values
 */

export const ENV_EXAMPLE = {
  // Database
  DATABASE_URL: "postgresql://username:password@localhost:5432/horizon",

  // Authentication (Better Auth)
  BETTER_AUTH_SECRET: "your-super-secret-key-change-in-production-at-least-32-chars",
  BETTER_AUTH_URL: "http://localhost:3000",

  // External Services (Optional - will be added in later phases)
  OPENAI_API_KEY: "sk-...",
  WORKOS_API_KEY: "...",
  WORKOS_CLIENT_ID: "...",

  // File Storage (Optional - will be added in later phases)
  CLOUDFLARE_R2_ACCESS_KEY_ID: "...",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "...",
  CLOUDFLARE_R2_ACCOUNT_ID: "...",

  // Application
  NODE_ENV: "development",

  // Feature Flags
  ENABLE_ANALYTICS: "false",
} as const;

