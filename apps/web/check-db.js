const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const tenants = await prisma.tenants.findMany();
    console.log('Tenants:', tenants);
    const roles = await prisma.roles.findMany();
    console.log('Roles:', roles);
  } catch (e) {
    console.error(e);
  }
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
