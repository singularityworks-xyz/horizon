# Security Implementation Guide

## ✅ Critical Security Fixes Implemented

### 1. Session-Based Authentication (FIXED)

**Previous Issue**: Guards trusted `x-user-id`, `x-user-role`, `x-tenant-id` headers that could be forged by clients.

**New Implementation**: [lib/security/guards.ts](apps/web/lib/security/guards.ts)

- Validates session via Better Auth cookies (cannot be forged)
- Fetches user data from database using session.user.id
- Validates tenant access through database relationships
- Never trusts client headers for authentication

**Usage**:

```typescript
// Before (VULNERABLE):
const userId = headers.get('x-user-id'); // Can be forged!

// After (SECURE):
export const GET = guards.adminOnly(async (request, context, params) => {
  // context.userId is validated from session + database
  // context.tenantId is validated from database relationships
  // context.role is validated from database
});
```

### 2. Production Cookie Security (FIXED)

**File**: [lib/auth/index.ts](apps/web/lib/auth/index.ts)

**Changes**:

- `secure: true` in production (HTTPS only)
- `sameSite: 'strict'` in production (CSRF protection)
- `httpOnly: true` (XSS protection)
- Email verification enabled in production

### 3. Test Endpoint Security (FIXED)

**File**: [app/api/test-env/route.ts](apps/web/app/api/test-env/route.ts)

**Changes**:

- Added `guards.adminOnly` to both GET and POST endpoints
- No longer exposes environment variables to unauthenticated users

### 4. Rate Limiting (NEW)

**File**: [lib/middleware/rate-limit.ts](apps/web/lib/middleware/rate-limit.ts)

**Pre-configured rate limiters**:

- Sign-in: 5 attempts per 15 minutes
- Sign-up: 3 attempts per hour
- Password reset: 3 attempts per hour
- Email verification: 5 attempts per hour
- General API: 100 requests per minute

**Usage**:

```typescript
import { authRateLimiters } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = await authRateLimiters.signIn(request);
  if (rateLimitResponse) {
    return rateLimitResponse; // 429 Too Many Requests
  }

  // Continue with authentication...
}
```

### 5. Audit Logging (NEW)

**File**: [lib/audit/logger.ts](apps/web/lib/audit/logger.ts)

**Tracks all security events**:

- Login attempts (success/failure)
- Logout events
- Access denied
- Tenant access attempts
- Rate limit exceeded
- Account lockout
- Role changes
- Suspicious activity

**Usage**:

```typescript
import { auditLog } from '@/lib/audit/logger';

// Log successful login
await auditLog.loginSuccess(userId, tenantId, ipAddress, userAgent);

// Log failed login
await auditLog.loginFailure(email, reason, ipAddress, userAgent);

// Log access denied
await auditLog.accessDenied(userId, resource, reason, ipAddress);
```

### 6. Tenant Isolation (NEW)

**File**: [lib/db/tenant-scoped.ts](apps/web/lib/db/tenant-scoped.ts)

**Features**:

- Automatic tenant filtering for database queries
- Ownership verification helpers
- Prevents cross-tenant data leaks

**Usage**:

```typescript
import { assertTenantOwnership } from '@/lib/db/tenant-scoped';

// Verify a project belongs to the tenant before accessing it
await assertTenantOwnership('projects', projectId, tenantId);
```

### 7. Account Lockout Protection (NEW)

**File**: [lib/auth/account-lockout.ts](apps/web/lib/auth/account-lockout.ts)

**Features**:

- Locks account after 5 failed attempts
- Auto-unlock after 30 minutes
- Manual unlock via email verification
- Audit logging of lockout events

**Usage**:

```typescript
import {
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth/account-lockout';

// Before login attempt
const lockoutCheck = await checkAccountLockout(email);
if (!lockoutCheck.allowed) {
  return NextResponse.json({ error: lockoutCheck.error }, { status: 403 });
}

// After failed login
const { locked, remainingAttempts } = await recordFailedAttempt(email);

// After successful login
await clearFailedAttempts(email);
```

### 8. Session Validation Middleware (NEW)

**File**: [lib/middleware/session-validation.ts](apps/web/lib/middleware/session-validation.ts)

**Features**:

- Validates sessions on every request
- Handles session expiration
- Auto-refresh for expiring sessions
- Audit logging integration

**Usage**:

```typescript
import { withSessionValidation } from '@/lib/middleware/session-validation';

export const GET = withSessionValidation(async (request, session) => {
  // session is validated and typed
  return NextResponse.json({ userId: session.user.id });
});
```

---

## 🚨 Action Required

### 1. Rotate Secrets Immediately

The `BETTER_AUTH_SECRET` in your `.env` files has been committed to the repository and must be rotated:

```bash
# Generate new secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Update in**:

- Local development: `.env.local`
- Production deployment: Your hosting platform's environment variables
- CI/CD: Your CI/CD platform's secrets management

### 2. Remove Secrets from Git History

```bash
# Install BFG Repo-Cleaner or use git-filter-repo
# WARNING: This rewrites git history - coordinate with your team

# Option 1: Using BFG (recommended)
bfg --delete-files .env
bfg --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: Using git-filter-repo
git filter-repo --path .env --invert-paths
git filter-repo --path .env.local --invert-paths
```

### 3. Update .gitignore

✅ Already done - `.gitignore` properly excludes environment files

### 4. Enable Email Verification

Email verification is now configured to be required in production, but you need to implement the email sending:

**Update** [lib/auth/index.ts](apps/web/lib/auth/index.ts):

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: process.env.NODE_ENV === 'production',
  sendVerificationEmail: async ({ user, url }) => {
    // TODO: Implement email sending
    // Use Resend, SendGrid, AWS SES, or similar
    console.log(`Send verification email to ${user.email}: ${url}`);
  },
  sendResetPassword: async ({ user, url }) => {
    // TODO: Implement password reset email
    console.log(`Send password reset to ${user.email}: ${url}`);
  },
}
```

### 5. Configure Rate Limiting for Production

For production with multiple instances, replace the in-memory store with Redis:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Then update [lib/middleware/rate-limit.ts](apps/web/lib/middleware/rate-limit.ts) to use Redis.

### 6. Set Up Audit Log Storage

The audit logger currently logs to console. For production:

1. Add `audit_logs` table to Prisma schema
2. Implement database writes in `createAuditLog()`
3. Or integrate with external logging service (CloudWatch, Datadog, etc.)

---

## 📝 Testing Checklist

Before deploying to production, verify:

- [ ] Cannot authenticate by setting x-user-id, x-user-role headers manually
- [ ] Session cookies are httpOnly and secure in production
- [ ] Test endpoint requires admin authentication
- [ ] No .env files in git history
- [ ] New BETTER_AUTH_SECRET is set in all environments
- [ ] Rate limiting blocks brute force attempts
- [ ] Email verification is required for new accounts (production)
- [ ] Audit logs capture authentication events
- [ ] Tenant isolation prevents cross-tenant data access
- [ ] Account lockout triggers after 5 failed attempts
- [ ] Session validation happens on every authenticated request

---

## 🔒 Security Best Practices

### Defense in Depth

Multiple layers of security are now in place:

1. Session validation (Better Auth)
2. Tenant validation (Database)
3. Rate limiting (Per endpoint)
4. Account lockout (Per user)
5. Audit logging (All events)

### Never Trust Client Input

- All authentication data comes from server-side validation
- Headers are never used for authentication decisions
- Sessions are validated on every request

### Principle of Least Privilege

- Admin routes require explicit admin role
- Client routes allow both client and admin
- Tenant isolation prevents cross-tenant access

---

## 📚 Additional Security Enhancements

Consider implementing:

1. **Two-Factor Authentication (2FA)**: Add TOTP-based 2FA for admin accounts
2. **IP Whitelisting**: Restrict admin access to known IP ranges
3. **Security Headers**: Add Helmet.js for security headers
4. **Content Security Policy**: Prevent XSS attacks
5. **CORS Configuration**: Strict CORS for production
6. **SQL Injection Protection**: Prisma handles this, but always validate input
7. **XSS Protection**: Sanitize user inputs, especially in admin panel
8. **Dependency Audits**: Run `npm audit` regularly
9. **Penetration Testing**: Hire security professionals to test your system
10. **Bug Bounty Program**: Consider setting up once in production

---

## 🆘 Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all secrets** (BETTER_AUTH_SECRET, API keys)
2. **Check audit logs** for suspicious activity
3. **Force logout all sessions** via the test endpoint (development only)
4. **Review tenant access logs** for cross-tenant attempts
5. **Contact your security team or consultant**

---

## 📞 Support

For security questions or concerns, contact your security team immediately.

**Remember**: Security is not a one-time fix. Continuously monitor, test, and improve your security posture.
