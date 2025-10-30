# Arno Cosmetics Global Inventory & Sales Management System

A multi-location inventory and sales management system for a Korean cosmetics distributor operating branches in Vietnam and China.

## Project Status

**Current Phase:** Phase 08 - MVP Complete ✅

All 8 phases completed:
- ✅ Phase 01: Project Setup & Authentication
- ✅ Phase 02: Master Data CRUD (Locations, Suppliers, Products)
- ✅ Phase 03: Purchase Orders
- ✅ Phase 04: Inventory Management
- ✅ Phase 05: Exchange Rates
- ✅ Phase 06: Pricing Calculation Engine
- ✅ Phase 07: Sales Entry & FIFO Deduction
- ✅ Phase 08: Dashboard, Reports & Deployment

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

## Features

### Authentication & Authorization
✅ Email/password login with Supabase Auth
✅ JWT-based authentication
✅ Role-based access control (RBAC)
  - HQ_Admin: Full system access
  - Branch_Manager: Limited to assigned branch
✅ Protected routes with middleware

### Master Data Management
✅ Locations management (HQ and branches)
✅ Suppliers management with contact information
✅ Products management with multi-language names
✅ Supplier-Product relationship (many-to-many)

### Purchase & Receiving
✅ Purchase Order creation and approval workflow
✅ Supplier-based product filtering
✅ Receiving goods at HQ warehouse
✅ Batch/lot tracking with expiry dates
✅ Automatic HQ stock increment on receipt

### Inventory Management
✅ Multi-location stock tracking
✅ HQ to Branch stock transfers
✅ FIFO (First In, First Out) inventory deduction
✅ Batch-level quality status tracking
✅ Drag & drop location ordering

### Pricing & Exchange Rates
✅ Manual exchange rate entry (KRW, VND, CNY)
✅ Cost-based pricing calculation
✅ Multi-level margins (HQ + Branch)
✅ Product-branch specific pricing
✅ Transfer cost inclusion

### Sales Management
✅ Sales entry by branch managers
✅ Automatic price lookup from pricing configs
✅ FIFO stock deduction on sales
✅ Multi-currency support
✅ Sales history tracking

### Dashboard & Reports
✅ Real-time dashboard with key metrics
  - Today's sales by currency
  - Stock value calculation
  - Expiry warnings (3-tier alerts)
  - Recent sales activity
✅ Sales Report (last 30 days)
✅ Inventory Report (current stock levels)
✅ Transaction History (purchase orders)

### DevOps
✅ GitHub Actions CI/CD pipeline
✅ Automated linting and type checking
✅ Production build testing
✅ Vercel deployment automation

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
| Locations | ✅ | ❌ |
| Suppliers | ✅ | ❌ |
| Products | ✅ | ❌ |
| Purchase Orders | ✅ | ❌ |
| Inventory | ✅ | ✅ |
| Exchange Rates | ✅ | ❌ |
| Pricing | ✅ | ❌ |
| Sales | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Settings | ✅ | ❌ |

## User Manual

### For HQ Admin

#### 1. Purchase Orders (Factory → HQ)
1. Go to **Purchase Orders** → **Create PO**
2. Select supplier (system shows only products from that supplier)
3. Add products and quantities
4. Approve PO (status: Draft → Approved)
5. Receive goods (enter batch number, manufacture date, expiry date)
6. HQ stock automatically increases

#### 2. Stock Transfers (HQ → Branch)
1. Go to **Inventory** → **Transfer Stock**
2. Select destination branch (Vietnam or China)
3. Select product and quantity
4. System applies FIFO (earliest expiry first)
5. Confirm transfer
6. HQ stock decreases, Branch stock increases

#### 3. Pricing Configuration
1. Go to **Pricing** → **Add Price**
2. Select product and destination branch
3. Enter purchase price, transfer cost, margins, exchange rate
4. Click **Calculate** to compute selling price
5. Manually adjust if needed (e.g., round to clean number)
6. Save final price

### For Branch Manager

#### 1. Sales Entry
1. Go to **Sales** → **Add Sale**
2. Select sale date and product
3. Unit price auto-populated from pricing configs
4. Enter quantity sold
5. Confirm sale
6. Branch stock auto-decrements via FIFO

#### 2. View Reports
1. Go to **Reports**
2. View Sales Report (last 30 days)
3. View Inventory Report (current stock)
4. Check Transaction History

## Deployment

### Vercel Deployment

1. Push code to GitHub (main or master branch)
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automatically on push to main/master

### GitHub Secrets (for CI/CD)

Set these secrets in GitHub repository settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN` (from Vercel account settings)
- `VERCEL_ORG_ID` (from Vercel project settings)
- `VERCEL_PROJECT_ID` (from Vercel project settings)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Business Workflow

```
Factory Production
  ↓
HQ Purchase Order (Draft → Approved)
  ↓
HQ Receiving (with batch tracking)
  ↓
HQ Stock (FIFO inventory)
  ↓
Branch Transfer (HQ → VN/CN Branch)
  ↓
Branch Stock (FIFO inventory)
  ↓
Sales Entry (by Branch Manager)
  ↓
Revenue Tracking & Reports
```

## Next Steps (Post-MVP)

### Short-term (1-2 months)
- Excel bulk upload
- Returns/refund processing
- Detailed reports (P&L, margin analysis)
- Audit logs

### Mid-term (3-6 months)
- Promotions and discounts
- Auto exchange rate API integration
- Advanced pricing simulator
- Sample inventory management

### Long-term (6+ months)
- Ingredient and certification management
- Barcode/QR scanning
- Mobile application
- AI demand forecasting

## Documentation

- Full project requirements: `docs/inventory_management.txt`
- MVP scope: `docs/mvp_inventory_management.txt`
- Project guidelines: `CLAUDE.md`

## License

Proprietary - Arno Cosmetics
