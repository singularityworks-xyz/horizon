import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

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
const DEMO_CLIENT_ID = 'client-demo-001';
const DEMO_USER_ID = 'user-admin-demo-001';
const TEMPLATE_ID = 'template-demo-001';
const PROJECT_1_ID = 'project-website-redesign-001';
const PROJECT_2_ID = 'project-mobile-app-001';
const WORKFLOW_1_ID = 'workflow-website-001';

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

  // Create demo client
  const client = await prisma.clients.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'client@demo.com' },
    },
    update: {},
    create: {
      id: DEMO_CLIENT_ID,
      tenantId: tenant.id,
      name: 'Demo Client Corp',
      email: 'client@demo.com',
      company: 'Demo Corporation',
    },
  });
  console.log(`✅ Demo client created: ${client.name} (${client.id})`);

  // Create demo admin user
  const adminUser = await prisma.users.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      id: DEMO_USER_ID,
      tenantId: tenant.id,
      userRoles: {
        connect: { id: adminRole.id },
      },
      email: 'admin@demo.com',
      firstName: 'Demo',
      lastName: 'Admin',
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Demo admin user created: ${adminUser.email} (${adminUser.id})`);

  // Create demo client user
  const clientUser = await prisma.users.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'client@demo.com' },
    },
    update: {},
    create: {
      id: 'user-client-demo-001',
      tenantId: tenant.id,
      userRoles: {
        connect: { id: clientRole.id },
      },
      email: 'client@demo.com',
      firstName: 'Demo',
      lastName: 'Client',
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Demo client user created: ${clientUser.email} (${clientUser.id})`);

  // Create questionnaire template
  const template = await prisma.questionnaire_templates.upsert({
    where: {
      tenantId_name_version: {
        tenantId: tenant.id,
        name: 'demo-project-template',
        version: 1,
      },
    },
    update: {},
    create: {
      id: TEMPLATE_ID,
      tenantId: tenant.id,
      name: 'demo-project-template',
      description: 'Demo questionnaire template for project intake',
      version: 1,
      isActive: true,
    },
  });
  console.log(`✅ Questionnaire template created: ${template.name} (${template.id})`);

  // Create sample questions
  const question1 = await prisma.questions.upsert({
    where: { templateId_order: { templateId: template.id, order: 1 } },
    update: {},
    create: {
      templateId: template.id,
      type: 'TEXT',
      title: 'What is your project name?',
      description: 'Brief project name',
      order: 1,
      required: true,
    },
  });

  const question2 = await prisma.questions.upsert({
    where: { templateId_order: { templateId: template.id, order: 2 } },
    update: {},
    create: {
      templateId: template.id,
      type: 'TEXTAREA',
      title: 'Project description',
      description: 'Detailed project description',
      order: 2,
      required: true,
    },
  });

  const question3 = await prisma.questions.upsert({
    where: { templateId_order: { templateId: template.id, order: 3 } },
    update: {},
    create: {
      templateId: template.id,
      type: 'NUMBER',
      title: 'Project budget (USD)',
      description: 'Estimated project budget',
      order: 3,
      required: false,
    },
  });

  console.log(`✅ Created ${3} sample questions for template`);

  // Create demo projects
  const project1 = await prisma.projects.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Website Redesign' } },
    update: {},
    create: {
      id: PROJECT_1_ID,
      tenantId: tenant.id,
      clientId: client.id,
      name: 'Website Redesign',
      description:
        'Complete redesign of corporate website with modern UI/UX, improved performance, and mobile responsiveness.',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Project created: ${project1.name} (${project1.id})`);

  const project2 = await prisma.projects.upsert({
    where: {
      tenantId_name: { tenantId: tenant.id, name: 'Mobile App Development' },
    },
    update: {},
    create: {
      id: PROJECT_2_ID,
      tenantId: tenant.id,
      clientId: client.id,
      name: 'Mobile App Development',
      description:
        'Native mobile application for iOS and Android platforms with user authentication and data synchronization.',
      status: 'DRAFT',
    },
  });
  console.log(`✅ Project created: ${project2.name} (${project2.id})`);

  // Create questionnaire submission for project 1 (completed)
  const submission1 = await prisma.questionnaire_submissions.upsert({
    where: {
      tenantId_projectId_templateId: {
        tenantId: tenant.id,
        projectId: project1.id,
        templateId: template.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: project1.id,
      templateId: template.id,
      status: 'SUBMITTED',
      submittedAt: new Date('2024-01-15T10:30:00Z'),
    },
  });
  console.log(`✅ Questionnaire submission created for project 1`);

  // Create answers for submission 1
  await prisma.answers.upsert({
    where: {
      submissionId_questionId: {
        submissionId: submission1.id,
        questionId: question1.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      submissionId: submission1.id,
      questionId: question1.id,
      projectId: project1.id,
      value: 'Website Redesign Project',
      submittedAt: new Date('2024-01-15T10:30:00Z'),
    },
  });

  await prisma.answers.upsert({
    where: {
      submissionId_questionId: {
        submissionId: submission1.id,
        questionId: question2.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      submissionId: submission1.id,
      questionId: question2.id,
      projectId: project1.id,
      value:
        'Complete overhaul of our corporate website with modern design principles, improved user experience, and enhanced performance. The project includes responsive design, accessibility improvements, and integration with our CRM system.',
      submittedAt: new Date('2024-01-15T10:30:00Z'),
    },
  });

  await prisma.answers.upsert({
    where: {
      submissionId_questionId: {
        submissionId: submission1.id,
        questionId: question3.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      submissionId: submission1.id,
      questionId: question3.id,
      projectId: project1.id,
      value: 50000,
      submittedAt: new Date('2024-01-15T10:30:00Z'),
    },
  });
  console.log(`✅ Created answers for project 1 questionnaire (100% complete)`);

  // Create assets for project 1
  const asset1 = await prisma.assets.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      uploaderId: adminUser.id,
      name: 'Current Website Screenshot',
      fileName: 'current-website.png',
      mimeType: 'image/png',
      size: 2048000,
      checksum: 'demo-checksum-current-website',
      storageKey: 'demo/current-website.png',
      accessLevel: 'TENANT',
      url: 'https://via.placeholder.com/800x600/4f46e5/ffffff?text=Current+Website',
    },
  });

  const asset2 = await prisma.assets.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      uploaderId: adminUser.id,
      name: 'Wireframes & Mockups',
      fileName: 'wireframes.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      checksum: 'demo-checksum-wireframes',
      storageKey: 'demo/wireframes.pdf',
      accessLevel: 'TENANT',
      url: 'https://via.placeholder.com/300x400/dc2626/ffffff?text=Wireframes+PDF',
    },
  });

  const asset3 = await prisma.assets.create({
    data: {
      tenantId: tenant.id,
      projectId: project1.id,
      uploaderId: adminUser.id,
      name: 'Brand Guidelines',
      fileName: 'brand-guidelines.pdf',
      mimeType: 'application/pdf',
      size: 512000,
      checksum: 'demo-checksum-brand',
      storageKey: 'demo/brand-guidelines.pdf',
      accessLevel: 'TENANT',
      url: 'https://via.placeholder.com/300x400/059669/ffffff?text=Brand+Guidelines',
    },
  });
  console.log(`✅ Created ${3} assets for project 1`);

  // Create workflow for project 1
  const workflow = await prisma.workflows.upsert({
    where: {
      tenantId_projectId: { tenantId: tenant.id, projectId: project1.id },
    },
    update: {},
    create: {
      id: WORKFLOW_1_ID,
      tenantId: tenant.id,
      projectId: project1.id,
      name: 'Website Redesign Workflow',
      description:
        'Complete website redesign project workflow with discovery, design, and development phases',
      status: 'ACTIVE',
      aiApprovedAt: new Date('2024-01-16T09:00:00Z'),
      aiApprovedById: adminUser.id,
    },
  });
  console.log(`✅ Workflow created for project 1`);

  // Create phases
  const discoveryPhase = await prisma.phases.create({
    data: {
      workflowId: workflow.id,
      name: 'Discovery & Research',
      intent: 'DISCOVERY',
      description:
        'Research and planning phase including stakeholder interviews and competitive analysis',
      order: 1,
      status: 'COMPLETED',
    },
  });

  const designPhase = await prisma.phases.create({
    data: {
      workflowId: workflow.id,
      name: 'Design & UX',
      intent: 'DESIGN',
      description: 'UI/UX design phase including wireframes, mockups, and design system creation',
      order: 2,
      status: 'IN_PROGRESS',
    },
  });

  const developmentPhase = await prisma.phases.create({
    data: {
      workflowId: workflow.id,
      name: 'Development',
      intent: 'BUILD',
      description: 'Frontend and backend development with testing and quality assurance',
      order: 3,
      status: 'PENDING',
    },
  });
  console.log(`✅ Created ${3} phases for workflow`);

  // Create tasks
  const tasks = [
    // Discovery phase tasks (all completed)
    {
      phaseId: discoveryPhase.id,
      title: 'Stakeholder Interviews',
      order: 1,
      status: 'COMPLETED',
      priority: 'HIGH',
      estimatedDurationDays: 3,
      isMilestone: false,
    },
    {
      phaseId: discoveryPhase.id,
      title: 'Competitive Analysis',
      order: 2,
      status: 'COMPLETED',
      priority: 'MEDIUM',
      estimatedDurationDays: 5,
      isMilestone: false,
    },
    {
      phaseId: discoveryPhase.id,
      title: 'User Research & Personas',
      order: 3,
      status: 'COMPLETED',
      priority: 'MEDIUM',
      estimatedDurationDays: 4,
      isMilestone: false,
    },
    {
      phaseId: discoveryPhase.id,
      title: 'Requirements Gathering',
      order: 4,
      status: 'COMPLETED',
      priority: 'HIGH',
      estimatedDurationDays: 5,
      isMilestone: true,
    },

    // Design phase tasks (partially complete)
    {
      phaseId: designPhase.id,
      title: 'Information Architecture',
      order: 1,
      status: 'COMPLETED',
      priority: 'HIGH',
      estimatedDurationDays: 3,
      isMilestone: false,
    },
    {
      phaseId: designPhase.id,
      title: 'Wireframes',
      order: 2,
      status: 'COMPLETED',
      priority: 'HIGH',
      estimatedDurationDays: 7,
      isMilestone: true,
    },
    {
      phaseId: designPhase.id,
      title: 'Design System & Components',
      order: 3,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      estimatedDurationDays: 10,
      isMilestone: false,
    },
    {
      phaseId: designPhase.id,
      title: 'High-fidelity Mockups',
      order: 4,
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationDays: 14,
      isMilestone: true,
    },
    {
      phaseId: designPhase.id,
      title: 'Design Review & Feedback',
      order: 5,
      status: 'PENDING',
      priority: 'MEDIUM',
      estimatedDurationDays: 3,
      isMilestone: false,
    },

    // Development phase tasks (not started)
    {
      phaseId: developmentPhase.id,
      title: 'Frontend Development',
      order: 1,
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationDays: 21,
      isMilestone: false,
    },
    {
      phaseId: developmentPhase.id,
      title: 'Backend API Development',
      order: 2,
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationDays: 18,
      isMilestone: false,
    },
    {
      phaseId: developmentPhase.id,
      title: 'Database Design & Setup',
      order: 3,
      status: 'PENDING',
      priority: 'MEDIUM',
      estimatedDurationDays: 7,
      isMilestone: true,
    },
    {
      phaseId: developmentPhase.id,
      title: 'Testing & QA',
      order: 4,
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationDays: 10,
      isMilestone: false,
    },
    {
      phaseId: developmentPhase.id,
      title: 'Deployment & Launch',
      order: 5,
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationDays: 5,
      isMilestone: true,
    },
  ];

  await prisma.tasks.createMany({
    data: tasks,
  });
  console.log(`✅ Created ${tasks.length} tasks for workflow`);

  // Create workflow snapshot
  const snapshot = await prisma.workflow_snapshots.upsert({
    where: {
      tenantId_projectId_isCurrent: {
        tenantId: tenant.id,
        projectId: project1.id,
        isCurrent: true,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: project1.id,
      workflowId: workflow.id,
      version: 1,
      isCurrent: true,
      createdById: adminUser.id,
    },
  });

  // Create snapshot progress
  await prisma.workflow_snapshot_progress.create({
    data: {
      snapshotId: snapshot.id,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      perPhase: {
        'Discovery & Research': { total: 4, completed: 4 },
        'Design & UX': { total: 5, completed: 2 },
        Development: { total: 5, completed: 0 },
      },
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created workflow snapshot with progress tracking`);

  console.log('🎉 Database seed completed!');
  console.log('');
  console.log('=== SEED DATA SUMMARY ===');
  console.log('Default Tenant ID:', tenant.id);
  console.log('Client Role ID:', clientRole.id);
  console.log('Admin Role ID:', adminRole.id);
  console.log('');
  console.log('Demo Data:');
  console.log('- Client:', client.name, `(${client.id})`);
  console.log('- Admin User:', adminUser.email, `(${adminUser.id})`);
  console.log('- Projects: 2 (Website Redesign, Mobile App Development)');
  console.log('- Questionnaire Template: 1 (with 3 questions)');
  console.log('- Questionnaire Submissions: 1 (completed for Website Redesign)');
  console.log('- Assets: 3 (for Website Redesign project)');
  console.log('- Workflow: 1 (with 3 phases, 14 tasks, 60% complete)');
  console.log('');
  console.log('You can now test the client dashboard at /dashboard');
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
