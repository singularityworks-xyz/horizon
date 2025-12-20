# Deployment Guide

## Environment Variables Setup

All deployment platforms require these environment variables:

```env
BETTER_AUTH_SECRET=your-production-secret
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
NODE_ENV=production
ENABLE_ANALYTICS=true
```

## Platform-Specific Instructions

### Vercel

1. Connect your repository to Vercel
2. Set Framework Preset to "Next.js"
3. Set Root Directory to `apps/web-admin`
4. Add environment variables in Project Settings
5. Deploy

**Build Settings:**

- Build Command: `cd ../.. && npx turbo build --filter=web-admin`
- Output Directory: `apps/web-admin/.next`
- Install Command: `npm install`

### Railway

1. Create a new project from GitHub repo
2. Set root directory to `apps/web-admin`
3. Add environment variables in Variables tab
4. Deploy

**Build Settings:**

- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### Docker

See `Dockerfile` for containerization setup.

```bash
# Build
docker build -t web-admin .

# Run
docker run -p 3000:3000 --env-file .env web-admin
```

## Post-Deployment Checklist

- [ ] All environment variables are set
- [ ] Database is accessible from the deployment
- [ ] BETTER_AUTH_URL matches your domain
- [ ] NEXT_PUBLIC_BETTER_AUTH_URL matches your domain
- [ ] SSL/HTTPS is enabled
- [ ] API keys are valid
- [ ] Test authentication flow
- [ ] Check database connection
- [ ] Verify asset upload/download functionality

## Security Considerations

### Environment Variables

- Never commit `.env.local` files to version control
- Use different secrets for development and production
- Rotate secrets regularly
- Use secure secret generation (openssl rand -base64 32)

### Database

- Use connection pooling in production
- Enable SSL connections
- Restrict database access to deployment IP ranges
- Use read replicas for better performance

### File Storage

- Configure CORS properly for your domain
- Use private buckets for sensitive assets
- Implement proper access controls
- Enable versioning for important files

## Monitoring and Maintenance

### Health Checks

Use the `/api/ai/health` endpoint to monitor system health:

```bash
curl https://your-domain.com/api/ai/health
```

### Logs

Monitor application logs for:

- Environment variable validation errors
- Database connection issues
- Authentication failures
- Asset upload/download errors

### Backups

- Database backups should be automated
- File storage backups should be configured
- Test restore procedures regularly

## Troubleshooting

### Common Issues

**Environment Variables Missing**

```
❌ Invalid environment variables:
  - BETTER_AUTH_SECRET: BETTER_AUTH_SECRET is required
```

- Check that all required variables are set in deployment platform
- Verify variable names match exactly

**Database Connection Failed**

- Verify DATABASE_URL is correct
- Check firewall rules
- Ensure SSL is properly configured

**Authentication Not Working**

- Verify BETTER_AUTH_URL matches your domain exactly
- Check that BETTER_AUTH_SECRET is set
- Ensure HTTPS is enabled

**Asset Upload Failed**

- Verify Cloudflare R2 credentials
- Check bucket permissions
- Ensure CORS is configured for your domain
