import { prisma } from './src/index';

const DEFAULT_TENANT_ID = 'default-tenant-001';

async function main() {
  console.log('Checking database seed data...');

  // 1. Check Default Tenant
  const tenant = await prisma.tenants.findUnique({
    where: { id: DEFAULT_TENANT_ID },
  });

  if (!tenant) {
    console.log('❌ Default Tenant NOT found. Creating...');
    await prisma.tenants.create({
      data: {
        id: DEFAULT_TENANT_ID,
        name: 'Default Tenant',
        slug: 'default-tenant',
        updatedAt: new Date(),
      },
    });
    console.log('✅ Default Tenant created.');
  } else {
    console.log('✅ Default Tenant exists.');
  }

  // 2. Check Roles
  const rolesToCheck = ['client', 'admin'];
  for (const roleName of rolesToCheck) {
    const role = await prisma.roles.findUnique({
      where: {
        tenantId_name: {
          tenantId: DEFAULT_TENANT_ID,
          name: roleName,
        },
      },
    });

    if (!role) {
      console.log(`❌ Role '${roleName}' NOT found for default tenant. Creating...`);
      await prisma.roles.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: DEFAULT_TENANT_ID,
          name: roleName,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Role '${roleName}' created.`);
    } else {
      console.log(`✅ Role '${roleName}' exists.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
