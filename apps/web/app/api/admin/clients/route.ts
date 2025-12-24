import { NextRequest, NextResponse } from 'next/server';
import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { auth } from '@/lib/auth';

// Default tenant ID (same as in auth/index.ts)
const DEFAULT_TENANT_ID = 'default-tenant-001';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await authServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { companyName, email, password } = body;

    // Validate required fields
    if (!companyName || !email || !password) {
      return NextResponse.json(
        { error: 'Company name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Use better-auth's internal API to create the user
    // This handles hashing (scrypt) and account creation correctly
    try {
      const newUser = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: companyName,
        },
      });

      if (!newUser) {
        throw new Error('Failed to create user through auth API');
      }

      // Explicitly set the role to CLIENT (already default, but good to ensure)
      await prisma.user.update({
        where: { id: newUser.user.id },
        data: { role: 'CLIENT' },
      });

      // Create or update the user in the 'users' table (for tenant-linked data)
      // The hook in lib/auth/index.ts might already do this, but we'll ensure it here
      await prisma.users.upsert({
        where: {
          tenantId_email: {
            tenantId: DEFAULT_TENANT_ID,
            email: email,
          },
        },
        update: {
          firstName: companyName,
          updatedAt: new Date(),
        },
        create: {
          id: newUser.user.id,
          tenantId: DEFAULT_TENANT_ID,
          email: email,
          firstName: companyName,
          role: 'CLIENT',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        id: newUser.user.id,
        email: newUser.user.email,
        name: newUser.user.name,
        createdAt: newUser.user.createdAt,
      });
    } catch (authError: any) {
      console.error('Auth API Error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Error creating user account' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/admin/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await authServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all clients
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
