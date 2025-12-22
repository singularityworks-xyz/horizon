import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: bun run promote-admin.ts <email>');
    process.exit(1);
  }

  console.log(`Searching for user with email: ${email}...`);

  // Find users with this email across all tenants
  const users = await prisma.users.findMany({
    where: { email },
  });

  if (users.length === 0) {
    console.error('No user found with this email.');
    process.exit(1);
  }

  console.log(`Found ${users.length} user record(s). Updating to ADMIN...`);

  for (const user of users) {
    await prisma.users.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });
    console.log(`User ${user.id} (Tenant: ${user.tenantId}) promoted to ADMIN.`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
