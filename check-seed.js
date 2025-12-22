const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log('🔍 Checking seed data...\n');

  const projects = await prisma.projects.findMany({
    where: { tenantId: 'default-tenant-001' },
    select: { id: true, name: true, status: true },
  });
  console.log('📁 Projects found:', projects.length);
  projects.forEach((p) => console.log('  -', p.name, '(' + p.status + ')'));

  const assets = await prisma.assets.count({
    where: { tenantId: 'default-tenant-001' },
  });
  console.log('📎 Assets found:', assets);

  const submissions = await prisma.questionnaire_submissions.count({
    where: { tenantId: 'default-tenant-001' },
  });
  console.log('📝 Questionnaire submissions found:', submissions);

  const workflows = await prisma.workflows.count({
    where: { tenantId: 'default-tenant-001' },
  });
  console.log('⚙️ Workflows found:', workflows);

  const tasks = await prisma.tasks.count({
    where: {
      phases: {
        workflow: {
          tenantId: 'default-tenant-001',
        },
      },
    },
  });
  console.log('✅ Tasks found:', tasks);

  const snapshots = await prisma.workflow_snapshots.count({
    where: { tenantId: 'default-tenant-001' },
  });
  console.log('📊 Workflow snapshots found:', snapshots);

  console.log('\n✅ Seed data verification complete!');
  await prisma.$disconnect();
  await pool.end();
}

check().catch(console.error);
