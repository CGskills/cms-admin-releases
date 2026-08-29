# CMS Admin Panel

Production-ready Content Management System built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

### ✅ Complete CMS Modules
- **Dashboard** - Real-time statistics and quick actions
- **Pages Management** - Create and edit website pages with SEO
- **Portfolio Builder** - Visual drag & drop grid builder with dynamic sizing
- **Services** - Manage service offerings
- **Pricing** - Configure pricing plans
- **Testimonials** - Client reviews and ratings
- **Employees** - Team member profiles
- **Settings** - Site-wide configuration
- **Media Library** - File management with Supabase Storage

### 🎨 Visual Portfolio Builder
- Drag & Drop reorder
- 12-column responsive grid system
- Dynamic tile sizes (col_span: 4-12, height: 200-560px)
- Before/After image slider support
- Image positioning controls (cover_x, cover_y, cover_zoom)
- Gallery support
- Visibility toggle

### 🔐 Security
- Supabase Authentication (Email/Password)
- Protected routes with middleware
- Row Level Security (RLS) policies
- Session management

### 📦 Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth
- **Drag & Drop:** @dnd-kit

## 📁 Project Structure

```
admin/
├── app/
│   ├── admin/                  # Admin panel routes
│   │   ├── _components/        # Shared admin components (Sidebar, Header)
│   │   ├── dashboard/          # Dashboard (page.tsx)
│   │   ├── pages/              # Pages CRUD
│   │   ├── portfolio/          # Portfolio Builder with drag & drop
│   │   ├── services/           # Services CRUD
│   │   ├── pricing/            # Pricing CRUD
│   │   ├── testimonials/       # Testimonials CRUD
│   │   ├── employees/          # Employees CRUD
│   │   ├── settings/           # Site settings
│   │   ├── media/              # Media library
│   │   └── login/              # Login page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Public homepage
├── components/
│   └── ui/                     # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Textarea.tsx
├── lib/
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Middleware client
│   └── storage/
│       └── upload.ts           # File upload utilities
├── types/
│   ├── database.types.ts       # Supabase database types
│   └── portfolio.ts            # Portfolio-specific types
├── supabase/
│   └── schema.sql              # Legacy/reference schema (not for production)
└── middleware.ts               # Route protection
```

## 🗄️ Database Schema

### Tables
1. **pages** - Website pages with SEO
2. **portfolio_items** - Portfolio projects with grid layout
3. **services** - Service offerings
4. **pricing** - Pricing plans
5. **testimonials** - Client testimonials with ratings
6. **employees** - Team member profiles
7. **settings** - Site configuration

### Storage Buckets
- `portfolio` - Project images
- `employees` - Employee photos
- `services` - Service icons
- `avatars` - Testimonial avatars
- `logos` - Logo files

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd admin
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Supabase**

Create a new project at [supabase.com](https://supabase.com)

For a new project, execute the schema/migrations in the Supabase SQL Editor,
then apply the canonical hardening migration last:
```bash
# Legacy schema.sql/FULL_MIGRATION.sql files are reference material only.
# Use the schema migrations required by your installation, then run:
# supabase/migrations/20260823000000_admin_hardening.sql
```

Create Storage buckets:
- portfolio
- employees
- services
- avatars
- logos

Do not create broad `authenticated` write/delete policies. The hardening
migration configures public reads and admin-only Storage mutations. Bootstrap
the first administrator using the trusted SQL in `AUTH_SETUP.md`.

4. **Environment Variables**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

5. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### First Login

1. Go to `/admin/login`
2. Create user in Supabase Dashboard (Authentication > Users > Add user)
3. Login with email/password
4. Start managing content!

## 📚 Documentation

- **[CMS_COMPLETE_SUMMARY.md](./CMS_COMPLETE_SUMMARY.md)** - Complete feature overview and implementation details
- **[PORTFOLIO_BUILDER_GUIDE.md](./PORTFOLIO_BUILDER_GUIDE.md)** - Portfolio Builder documentation and usage guide

## 🎨 Design System

### Colors
- Primary: `#DB9844` (Gold)
- Secondary: `#AF5D3E` (Brown)
- Background: Dark glassmorphism
- Text: White/Slate

### Components
- Glassmorphic cards with backdrop blur
- Gradient buttons with hover effects
- Responsive sidebar navigation
- Modal confirmations for destructive actions

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build command:
```bash
npm run build
```

Start command:
```bash
npm start
```

## 📝 Usage Examples

### Creating a Portfolio Project

```typescript
// Server Action
import { createPortfolio } from '@/app/admin/portfolio/actions';

// FormData includes:
// - title, subtitle, description
// - category, technologies, client, project_date, project_url
// - image_url, before_image, after_image, gallery
// - col_span (4-12), tile_height (200-560)
// - visible (boolean)

await createPortfolio(formData);
```

### Fetching Portfolio for Frontend

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const { data: projects } = await supabase
  .from('portfolio_items')
  .select('*')
  .eq('visible', true)
  .order('order_index', { ascending: true });
```

### Uploading Images

```typescript
import { uploadFile } from '@/lib/storage/upload';

const result = await uploadFile({
  bucket: 'portfolio',
  folder: 'projects',
  file: imageFile,
  onProgress: (progress) => console.log(progress)
});

if (result.url) {
  console.log('Uploaded:', result.url);
}
```

## 🔒 Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Protected admin routes via middleware
- ✅ Supabase SSR authentication
- ✅ Secure file upload with validation
- ✅ CSRF protection (Next.js built-in)
- ✅ Environment variables for sensitive data

## 🐛 Troubleshooting

### Build Errors

Check TypeScript errors:
```bash
npx tsc --noEmit
```

### Database Connection Issues

Verify `.env.local` has correct Supabase credentials.

### Image Upload Fails

1. Check Storage bucket exists
2. Verify RLS policies allow uploads
3. Check file size (<10MB)
4. Ensure file type is image/*

## 📊 Performance

- Server-side rendering (SSR) for admin routes
- Client-side caching with Supabase
- Optimized images via Supabase CDN
- Lazy loading for media library
- Efficient database queries with selective fields

## 🤝 Contributing

This is a production-ready CMS. For improvements:

1. Fork the repository
2. Create a feature branch
3. Make changes with TypeScript types
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 🎉 Status

**Production Ready** - All modules fully implemented and tested.

✅ Dashboard
✅ Pages Management
✅ Portfolio Builder (with drag & drop)
✅ Services Management
✅ Pricing Management
✅ Testimonials Management
✅ Employees Management
✅ Settings
✅ Media Library
✅ Authentication
✅ Database & Storage

Ready to deploy and use!

---

Built with ❤️ using Next.js, TypeScript, Tailwind CSS, and Supabase.
