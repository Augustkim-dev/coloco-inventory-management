# Arno Cosmetics Global Inventory & Sales Management System

A multi-location inventory and sales management system for a Korean cosmetics distributor operating branches in Vietnam and China.

## Project Status

**Current Phase:** Phase 01 - Project Initial Setup & Authentication ✅

## Tech Stack

- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript 5.6
- **Styling:** Tailwind CSS 3.4
- **UI Components:** shadcn/ui
- **Backend/Database:** Supabase
- **Authentication:** Supabase Auth (JWT)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier available at [supabase.com](https://supabase.com))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coloco_Inventory management
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings > API
   - Copy your project URL and anon key

4. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the SQL migration:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and run the SQL from `supabase/migrations/001_create_users_table.sql`

6. Create a test user:
   - In Supabase dashboard, go to Authentication > Users
   - Click "Add user" and create an email/password user
   - Go to Table Editor > users table
   - Insert a row with:
     - id: (same as the auth user id)
     - email: (same as auth user email)
     - name: Your Name
     - role: HQ_Admin or Branch_Manager
     - location_id: null (for now)

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Features (Phase 01)

✅ Next.js 14 project with App Router and TypeScript
✅ Tailwind CSS and shadcn/ui components
✅ Supabase integration for authentication and database
✅ Email/password login
✅ JWT-based authentication with Supabase Auth
✅ Role-based access control (RBAC)
  - HQ_Admin: Full access
  - Branch_Manager: Limited access
✅ Protected routes with authentication middleware
✅ Dashboard layout with sidebar navigation
✅ User session management
✅ Logout functionality

## Project Structure

```
.
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   │   └── login/           # Login page
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/       # Main dashboard
│   │   └── layout.tsx       # Dashboard layout
│   ├── api/                 # API routes (future)
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Root page (redirects to login)
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── auth/                # Auth-related components
│   └── layout/              # Layout components
├── lib/                     # Utilities
│   ├── supabase/           # Supabase clients
│   ├── utils.ts            # Utility functions
│   └── constants.ts        # Constants and navigation items
├── types/                   # TypeScript types
├── hooks/                   # Custom React hooks
├── docs/                    # Documentation
│   ├── plans/              # Planning documents
│   └── worklogs/           # Work logs
├── supabase/               # Supabase files
│   └── migrations/         # SQL migrations
└── public/                 # Static files
```

## User Roles

- **HQ_Admin:** Full access to all features and all locations
- **Branch_Manager:** Access only to assigned branch data

## Navigation (Role-Based)

| Feature | HQ_Admin | Branch_Manager |
|---------|----------|----------------|
| Dashboard | ✅ | ✅ |
| Suppliers | ✅ | ❌ |
| Products | ✅ | ❌ |
| Purchase Orders | ✅ | ❌ |
| Inventory | ✅ | ✅ |
| Sales | ✅ | ✅ |
| Settings | ✅ | ❌ |

## Next Steps (Phase 02)

- Create locations table (HQ and branches)
- Add suppliers and products tables
- Implement CRUD operations for master data
- Set up multi-language support for product names

## Documentation

- Full project requirements: `docs/inventory_management.txt`
- MVP scope: `docs/mvp_inventory_management.txt`
- Project guidelines: `CLAUDE.md`

## License

Proprietary - Arno Cosmetics
