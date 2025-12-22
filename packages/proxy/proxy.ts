import { prisma } from '@horizon/db';
import { auth } from '@horizon/web/lib/auth'; // Import from the web app
import cookieParser from 'cookie-parser';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PROXY_PORT || 3000;
const WEB_APP_PORT = process.env.WEB_APP_PORT || 3001; // Next.js app will run on 3001

// Middleware
app.use(cookieParser());
app.use(express.json());

// Authentication middleware
const authenticateRequest = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    // Extract session from cookies
    const sessionCookie = req.cookies['better-auth.session_token'];

    if (!sessionCookie) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate session with Better Auth
    const session = await auth.api.getSession({
      headers: {
        ...req.headers,
        cookie: req.headers.cookie || '',
      },
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user role from database
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Inject user context into headers
    req.headers['x-user-id'] = session.user.id;
    req.headers['x-user-role'] = user.role;
    req.headers['x-tenant-id'] = user.tenantId || '';

    // Set a role cookie for client-side role detection
    res.cookie('user-role', user.role, {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Route protection middleware
const requireRole = (allowedRoles: ('CLIENT' | 'ADMIN')[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;

    if (!userRole || !allowedRoles.includes(userRole as any)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Required roles: ${allowedRoles.join(', ')}, your role: ${userRole}`,
      });
    }

    next();
  };
};

// Public routes (no auth required)
const publicRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/api/auth', // Better Auth API routes
];

// Admin-only routes
const adminRoutes = ['/api/admin', '/admin', '/manage-clients', '/review-workflows'];

// Client routes (both admin and client can access)
const clientRoutes = ['/dashboard/client', '/dashboard/projects', '/api/client'];

// Apply authentication to protected routes
app.use((req, res, next) => {
  const isPublicRoute = publicRoutes.some((route) => req.path.startsWith(route));

  if (isPublicRoute) {
    return next();
  }

  return authenticateRequest(req, res, next);
});

// Apply role-based access control
app.use((req, res, next) => {
  // Check admin routes
  if (adminRoutes.some((route) => req.path.startsWith(route))) {
    return requireRole(['ADMIN'])(req, res, next);
  }

  // Check client routes (allow both admin and client)
  if (clientRoutes.some((route) => req.path.startsWith(route))) {
    return requireRole(['ADMIN', 'CLIENT'])(req, res, next);
  }

  // Allow all other routes
  next();
});

// Proxy all requests to the Next.js app
app.use(
  '/',
  createProxyMiddleware({
    target: `http://localhost:${WEB_APP_PORT}`,
    changeOrigin: true,
    ws: true, // Support WebSocket connections
    onProxyReq: (proxyReq, req) => {
      // Forward all headers including our injected auth headers
      Object.keys(req.headers).forEach((key) => {
        const value = req.headers[key];
        if (value) {
          proxyReq.setHeader(key, value);
        }
      });
    },
  })
);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Proxy error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📱 Web app available at http://localhost:${WEB_APP_PORT}`);
  console.log(`🔐 Authentication and RBAC enabled`);
});
