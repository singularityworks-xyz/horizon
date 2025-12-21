import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create connection pool and Prisma client with adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fixed IDs for seeding (consistent across environments)
const DEFAULT_TENANT_ID = 'default-tenant-001';
const CLIENT_ROLE_ID = 'role-client-001';
const ADMIN_ROLE_ID = 'role-admin-001';

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default tenant
  const tenant = await prisma.tenants.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Default Tenant',
      slug: 'default',
      metadata: {},
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // Create client role for the tenant
  const clientRole = await prisma.roles.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'client' } },
    update: {},
    create: {
      id: CLIENT_ROLE_ID,
      tenantId: tenant.id,
      name: 'client',
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Role created: ${clientRole.name} (${clientRole.id})`);

  // Create admin role for the tenant
  const adminRole = await prisma.roles.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'admin' } },
    update: {},
    create: {
      id: ADMIN_ROLE_ID,
      tenantId: tenant.id,
      name: 'admin',
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Role created: ${adminRole.name} (${adminRole.id})`);

  console.log('🎉 Database seed completed!');
  console.log('');
  console.log('Default Tenant ID:', tenant.id);
  console.log('Client Role ID:', clientRole.id);
  console.log('Admin Role ID:', adminRole.id);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
