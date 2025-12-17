import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    databaseUrl: process.env.DATABASE_URL,
  },
})
