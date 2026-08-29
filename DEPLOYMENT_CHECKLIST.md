# 🚀 Production Deployment Checklist

## Pre-Deployment Checklist

### ✅ 1. Supabase Setup

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Execute SQL schema from `supabase/schema.sql`
- [ ] Verify all 7 tables created:
  - [ ] pages
  - [ ] portfolio_items
  - [ ] services
  - [ ] pricing
  - [ ] testimonials
  - [ ] employees
  - [ ] settings
- [ ] Create Storage buckets:
  - [ ] portfolio
  - [ ] employees
  - [ ] services
  - [ ] avatars
  - [ ] logos
- [ ] Configure Storage bucket policies:
  - [ ] Public read access
  - [ ] Authenticated write/delete access
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Copy Supabase URL and anon key

### ✅ 2. Authentication Setup

- [ ] Create first admin user in Supabase Dashboard
  - Go to Authentication > Users
  - Click "Add user"
  - Use Email/Password
  - Confirm email (auto-confirm in dashboard)

### ✅ 3. Environment Variables

Create `.env.local` for development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

For production (Vercel/Netlify):

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### ✅ 4. Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test login at http://localhost:3000/admin/login
# Test all CRUD operations
# Test image uploads
# Test drag & drop in Portfolio

# Build for production
npm run build

# Test production build locally
npm start
```

- [ ] Login works
- [ ] Dashboard loads with stats
- [ ] Pages CRUD works
- [ ] Portfolio Builder works (drag & drop)
- [ ] Services CRUD works
- [ ] Pricing CRUD works
- [ ] Testimonials CRUD works
- [ ] Employees CRUD works
- [ ] Settings page works
- [ ] Media library works
- [ ] Image uploads work
- [ ] No TypeScript errors
- [ ] No console errors

### ✅ 5. Database Initial Data (Optional)

Insert initial settings record:

```sql
INSERT INTO settings (site_name, email, phone)
VALUES ('Your Site Name', 'contact@example.com', '+1234567890');
```

### ✅ 6. Code Quality

- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Run ESLint: `npm run lint`
- [ ] No build warnings
- [ ] All imports resolved
- [ ] No unused variables

---

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial CMS setup"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### Step 2: Import in Vercel

1. [ ] Go to [vercel.com](https://vercel.com)
2. [ ] Click "Add New Project"
3. [ ] Import your GitHub repository
4. [ ] Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3: Add Environment Variables

In Vercel project settings > Environment Variables:

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (Production)
- [ ] Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production)

### Step 4: Deploy

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Visit production URL

### Step 5: Post-Deployment Testing

- [ ] Login at `https://your-domain.vercel.app/admin/login`
- [ ] Test all CRUD operations
- [ ] Test image uploads
- [ ] Test Portfolio drag & drop
- [ ] Check responsive design on mobile
- [ ] Verify all routes protected by middleware

---

## Deployment to Netlify

### Step 1: Build Settings

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  status = 200
  force = true
```

### Step 2: Deploy

1. [ ] Go to [netlify.com](https://netlify.com)
2. [ ] Click "Add new site"
3. [ ] Import from GitHub
4. [ ] Configure build:
   - Build command: `npm run build`
   - Publish directory: `.next`

### Step 3: Environment Variables

In Netlify site settings > Environment variables:

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Step 4: Deploy & Test

- [ ] Trigger deploy
- [ ] Test production site

---

## Post-Deployment

### ✅ Security Checks

- [ ] Admin routes require authentication
- [ ] Middleware redirects unauthenticated users
- [ ] RLS policies prevent unauthorized data access
- [ ] Storage buckets enforce auth for uploads
- [ ] No sensitive data in client-side code

### ✅ Performance Optimization

- [ ] Enable Supabase CDN for images
- [ ] Configure caching headers
- [ ] Enable gzip compression
- [ ] Test page load speed
- [ ] Check Lighthouse scores

### ✅ Monitoring

- [ ] Setup error tracking (Sentry, etc.)
- [ ] Monitor Supabase usage
- [ ] Check Vercel/Netlify analytics
- [ ] Setup uptime monitoring

### ✅ Backup

- [ ] Document Supabase credentials securely
- [ ] Export database schema
- [ ] Backup environment variables
- [ ] Document deployment process

---

## Common Issues & Solutions

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Check for errors
npx tsc --noEmit

# Fix all type errors before deploying
```

### Issue: Cannot login after deployment

**Possible causes:**
1. Environment variables not set correctly
2. Supabase URL/key mismatch
3. User not created in Supabase

**Solution:**
1. Verify environment variables in deployment platform
2. Check Supabase project URL matches
3. Create user in Supabase Dashboard

### Issue: Images not uploading

**Possible causes:**
1. Storage buckets not created
2. RLS policies too restrictive
3. File size too large

**Solution:**
1. Create buckets in Supabase Storage
2. Set public read, authenticated write policies
3. Check file size (<10MB limit)

### Issue: 404 on admin routes

**Possible causes:**
1. Middleware not running
2. Routing configuration issue

**Solution:**
1. Verify `middleware.ts` exists at root
2. Check Next.js config for custom routing
3. Ensure `/admin/*` routes exist in `app/admin/`

### Issue: Drag & Drop not working

**Possible causes:**
1. @dnd-kit dependencies not installed
2. Client-side hydration issue

**Solution:**
1. Run `npm install` to ensure all deps installed
2. Check browser console for errors
3. Verify component is marked as client component (`'use client'`)

---

## ✅ Final Checklist

Before going live:

- [ ] All Supabase tables created
- [ ] All Storage buckets created
- [ ] RLS policies configured
- [ ] Admin user created
- [ ] Environment variables set
- [ ] Build succeeds locally
- [ ] Build succeeds on deployment platform
- [ ] Login works in production
- [ ] All CRUD operations work
- [ ] Image uploads work
- [ ] Middleware protects routes
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Performance acceptable
- [ ] Backup credentials documented

---

## 🎉 Deployment Complete!

Your CMS Admin Panel is now live and ready to use.

**Next Steps:**
1. Login at your production URL + `/admin/login`
2. Configure site settings
3. Add initial content (portfolio, services, etc.)
4. Start managing your website!

**Documentation:**
- [CMS_COMPLETE_SUMMARY.md](./CMS_COMPLETE_SUMMARY.md) - Full feature list
- [PORTFOLIO_BUILDER_GUIDE.md](./PORTFOLIO_BUILDER_GUIDE.md) - Portfolio Builder guide
- [README.md](./README.md) - Project overview

**Support:**
- Check documentation for usage guides
- Refer to Supabase docs for database questions
- Check Next.js docs for framework questions

Good luck! 🚀
