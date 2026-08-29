# 🚀 Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies (1 min)

```bash
npm install
```

### 2. Setup Supabase (2 min)

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Copy and paste contents of `supabase/schema.sql`
4. Click "Run"

### 3. Create Storage Buckets (1 min)

In Supabase Dashboard > Storage:

1. Create bucket: `portfolio`
2. Create bucket: `employees`
3. Create bucket: `services`
4. Create bucket: `avatars`
5. Create bucket: `logos`

For each bucket, set policies:
- ✅ Public read
- ✅ Authenticated insert/update/delete

### 4. Environment Variables (30 sec)

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard > Settings > API

### 5. Create Admin User (30 sec)

In Supabase Dashboard:
1. Go to Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Click "Create user"

### 6. Start Development (10 sec)

```bash
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## First Steps After Login

### 1. Configure Settings
Go to `/admin/settings` and set:
- Site name
- Contact email
- Contact phone
- Social links

### 2. Add Your First Portfolio Project
1. Go to `/admin/portfolio`
2. Click "Add Project"
3. Fill in project details
4. Upload main image
5. Choose grid size
6. Click "Create Project"

### 3. Create a Service
1. Go to `/admin/services`
2. Click "Add Service"
3. Enter title and description
4. Choose an icon
5. Save

### 4. Add Testimonials
1. Go to `/admin/testimonials`
2. Click "Add Testimonial"
3. Enter client name, position, review
4. Upload avatar (optional)
5. Set rating (1-5 stars)
6. Save

---

## Key Features

### 📊 Dashboard
Real-time stats for all content types

### 📄 Pages
Create and manage website pages with SEO fields

### 🎨 Portfolio Builder
- Visual drag & drop grid
- Dynamic tile sizes (4, 6, 8, 12 columns)
- Multiple heights (200, 280, 360, 560px)
- Before/After image support
- Gallery support

### 🛠️ Services
Manage service offerings with icons

### 💰 Pricing
Configure pricing plans by category

### ⭐ Testimonials
Client reviews with star ratings

### 👥 Employees
Team member profiles with photos

### ⚙️ Settings
Site-wide configuration

### 📁 Media Library
View and manage all uploaded files

---

## Common Tasks

### Upload an Image

**Option 1: Via Media Library**
1. Go to `/admin/media`
2. Choose bucket
3. Click upload button
4. Select file
5. Copy URL

**Option 2: While Creating Content**
- Use ImageUploader component
- Click "Upload Image"
- Select file
- Wait for upload
- URL auto-filled

### Reorder Portfolio Projects

1. Go to `/admin/portfolio`
2. Drag tiles to new positions
3. Auto-saves on drop

### Change Project Grid Size

1. Edit project
2. Change "Column Span" or "Tile Height"
3. Save
4. Grid rebuilds automatically

### Hide Content Without Deleting

Use "Visible" checkbox:
- ✅ Checked = visible on website
- ❌ Unchecked = hidden (but not deleted)

---

## Keyboard Shortcuts

In development:
- `Ctrl/Cmd + K` - Command palette (if implemented)
- `Esc` - Close modals
- `Tab` - Navigate form fields

---

## Troubleshooting

### Can't Login?

1. Check `.env.local` has correct Supabase credentials
2. Verify user exists in Supabase Dashboard
3. Try creating new user
4. Clear browser cache

### Images Won't Upload?

1. Check Storage buckets exist
2. Verify bucket policies allow uploads
3. Check file size (<10MB)
4. Check file type (must be image/*)

### Drag & Drop Not Working?

1. Refresh page
2. Check browser console for errors
3. Verify `@dnd-kit` packages installed

### Build Errors?

```bash
# Check TypeScript
npx tsc --noEmit

# Check for missing deps
npm install
```

---

## File Locations

### Where to find things:

**Database Schema:**
```
supabase/schema.sql
```

**Types:**
```
types/database.types.ts
types/portfolio.ts
```

**Storage Utils:**
```
lib/storage/upload.ts
```

**Supabase Clients:**
```
lib/supabase/client.ts    # Browser
lib/supabase/server.ts    # Server
lib/supabase/middleware.ts # Middleware
```

**Admin Pages:**
```
app/admin/[section]/page.tsx
```

**Server Actions:**
```
app/admin/[section]/actions.ts
```

**UI Components:**
```
components/ui/Button.tsx
components/ui/Input.tsx
components/ui/Textarea.tsx
```

---

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `pages` | Website pages | title, slug, content, SEO |
| `portfolio_items` | Portfolio projects | title, images, grid_size, order |
| `services` | Service offerings | title, description, icon |
| `pricing` | Pricing plans | category, name, price |
| `testimonials` | Client reviews | name, text, rating, avatar |
| `employees` | Team members | name, position, photo |
| `settings` | Site config | site_name, email, social_links |

---

## Storage Buckets

| Bucket | Purpose | Used By |
|--------|---------|---------|
| `portfolio` | Project images | Portfolio Builder |
| `employees` | Team photos | Employees |
| `services` | Service icons | Services |
| `avatars` | Testimonial avatars | Testimonials |
| `logos` | Site logos | Settings |

---

## URL Structure

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/login` | Login page |
| `/admin/pages` | Pages list |
| `/admin/pages/new` | Create page |
| `/admin/pages/[id]` | Edit page |
| `/admin/portfolio` | Portfolio grid builder |
| `/admin/portfolio/new` | Create project |
| `/admin/portfolio/[id]` | Edit project |
| `/admin/services` | Services list |
| `/admin/pricing` | Pricing table |
| `/admin/testimonials` | Testimonials list |
| `/admin/employees` | Team list |
| `/admin/settings` | Site settings |
| `/admin/media` | Media library |

---

## Next Steps

### After Setup:

1. **Populate Content**
   - Add portfolio projects
   - Create services
   - Add team members
   - Collect testimonials

2. **Customize Design** (if needed)
   - Edit `app/globals.css`
   - Modify Tailwind config
   - Update color scheme in components

3. **Build Frontend Website**
   - Create public pages
   - Fetch data from Supabase
   - Use Portfolio Grid component
   - Display testimonials

4. **Deploy to Production**
   - Push to GitHub
   - Deploy to Vercel/Netlify
   - Set environment variables
   - Test production build

---

## Resources

- **Full Documentation:** [CMS_COMPLETE_SUMMARY.md](./CMS_COMPLETE_SUMMARY.md)
- **Portfolio Guide:** [PORTFOLIO_BUILDER_GUIDE.md](./PORTFOLIO_BUILDER_GUIDE.md)
- **Deployment:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

## Support

Having issues? Check:

1. **Documentation files** in this repo
2. **Browser console** for errors
3. **Supabase Dashboard** for database/storage issues
4. **Next.js error messages** for framework issues

---

## 🎉 You're Ready!

Your CMS is set up and ready to use.

**Happy content managing! 🚀**
