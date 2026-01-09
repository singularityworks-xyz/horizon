import { env } from "@horizon/env/server";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

import { Prisma, PrismaClient } from "../prisma/generated/client";

// Re-export types for use in actions
export type {
  ProjectStatus,
  ProjectType,
  QuestionnaireStatus,
  QuestionType,
} from "../prisma/generated/client";

// Re-export Prisma namespace (contains JsonNull, InputJsonValue, etc.)
export { Prisma };

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const adapter = new PrismaNeon({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
