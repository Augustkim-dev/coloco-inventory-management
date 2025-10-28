# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Arno Cosmetics Global Inventory & Sales Management System**

A multi-location inventory and sales management system for a Korean cosmetics distributor operating branches in Vietnam and China. The system tracks the complete flow: Factory → Korean HQ → Branches (VN/CN) → End Customers.

### Core Business Flow

```
Factory Production → HQ Purchase Order → HQ Receiving → HQ Stock
  → Branch Transfer → Branch Stock → Sales → Revenue Tracking
```

**Key Features:**
- Cost-based pricing calculation with exchange rates, transfer costs, and multi-level margins
- Multi-currency support (KRW, VND, CNY) with automatic exchange rate updates
- FIFO inventory management with batch/lot tracking
- Expiry date management with 3-tier alerts (6mo/3mo/1mo)
- Factory supplier management and quality tracking
- Country-specific certification management (Korea MFDS, China NMPA, Vietnam MOH)
- Channel-based sales tracking (Online/Offline/Live Commerce)

## Project Status

**Current Phase:** Documentation/Planning (Pre-MVP)

Two requirement documents exist in `docs/`:
- `inventory_management.txt` - Full PRD with comprehensive features
- `mvp_inventory_management.txt` - Simplified MVP scope (2-month timeline)

**MVP Focus:** Core inventory flow implementation without advanced features like barcode scanning, mobile app, bulk Excel upload, promotions, returns, or bundles.

## Technology Stack (Planned)

### Backend
- **Language:** Node.js + TypeScript OR Python
- **Framework:** Express.js OR FastAPI
- **Database:** PostgreSQL
- **Authentication:** JWT

### Frontend
- **Framework:** React + TypeScript
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** React Context API
- **Forms:** React Hook Form

### Deployment (Suggested)
- **Backend:** Heroku or Railway
- **Frontend:** Vercel or Netlify
- **Database:** Heroku PostgreSQL or Supabase

## Data Architecture

### Core Tables (MVP - 10 tables)

1. **users** - Authentication and role-based access (HQ_Admin, Branch_Manager)
2. **locations** - HQ and branch locations (Korea HQ, Vietnam Branch, China Branch)
3. **suppliers** - Factory/supplier information
4. **products** - Product master data (SKU, name, category, shelf life)
5. **purchase_orders** - Purchase orders to factories
6. **purchase_order_items** - Line items for purchase orders
7. **stock_batches** - Inventory by location and batch with FIFO tracking
8. **pricing_configs** - Price calculation parameters by product and destination
9. **sales** - Sales transactions by branch
10. **exchange_rates** - Currency conversion rates (manual entry in MVP)

### Price Calculation Formula (Simplified MVP)

```
Branch Cost (Local Currency) = (Purchase Price + Transfer Cost) / Exchange Rate

Selling Price = Branch Cost / (1 - HQ Margin% - Branch Margin%)

Example:
- Purchase Price: 5,000 KRW
- Transfer Cost: 500 KRW
- Exchange Rate: 1 KRW = 18 VND
- HQ Margin: 10%
- Branch Margin: 30%

→ Branch Cost = (5,000 + 500) / 18 = 305.56 VND
→ Selling Price = 305.56 / (1 - 0.40) = 509.27 VND
→ Final: 500 VND (rounded)
```

## Key Business Workflows

### 1. Factory Purchase → HQ Receiving
1. Create purchase order (PO) for supplier with products, quantities, unit prices
2. Approve PO (Draft → Approved)
3. Receive goods at HQ warehouse
   - Verify quantities
   - Simple quality approval (Pass/Fail)
   - Enter batch number, manufacture date, expiry date
   - **HQ stock auto-increments**

### 2. HQ → Branch Transfer
1. Create transfer from HQ to branch (Vietnam or China)
2. Select product and quantity
3. System applies FIFO (earliest expiry first)
4. **HQ stock decreases, Branch stock increases**

### 3. Branch Sales Entry
1. Branch manager enters daily sales
2. Select date, product, quantity
3. Unit price auto-populated from `pricing_configs.final_price`
4. **Branch stock auto-decrements via FIFO**

### 4. Price Configuration
1. Select product and destination branch
2. Enter: purchase price (auto from recent PO), transfer cost, margins, exchange rate
3. Click "Calculate" to compute selling price
4. Manually adjust if needed (e.g., round to clean number)
5. Save final price for branch sales

## User Roles & Permissions

### MVP Roles (2 types only)
- **HQ Admin:** Full access to all features and all location data
- **Branch Manager:** Access only to assigned branch data (inventory, sales)

### Post-MVP Roles
- HQ Viewer (read-only)
- Branch Clerk (data entry only)

## Critical Design Decisions

### FIFO Implementation
- Always deduct inventory from batches with earliest expiry date first
- Applies to both branch transfers and sales
- Implemented at `stock_batches` level

### Inventory Deduction Points
- **HQ Stock:** Decrements on transfer to branch
- **Branch Stock:** Increments on receiving from HQ, decrements on sales
- No transfer tracking table in MVP (directly manipulate `stock_batches`)

### Multi-Currency Handling
- Each location has default currency (HQ: KRW, VN: VND, CN: CNY)
- Exchange rates manually entered in MVP (no auto-update API)
- All amounts stored in local currency
- `pricing_configs` stores calculation parameters per product-branch pair

### Batch/Lot Tracking
- Each receipt creates new batch in `stock_batches`
- Batch identified by: product + location + batch_no (unique constraint)
- Tracks: manufacture date, expiry date, cost per unit, quality status

## MVP Scope Exclusions

**Explicitly NOT in MVP (Post-MVP features):**
- Complex quality inspection workflows (simple pass/fail only)
- Ingredient and certification management
- Promotions, discounts, bundles
- Sample inventory management
- Returns/refund processing
- Barcode/QR scanning
- Mobile application
- Excel bulk upload
- Advanced reporting (basic tables only)
- Auto exchange rate updates (manual entry)
- Advanced pricing simulator
- Detailed cost breakdown (labeling, certification, sample costs)

## Development Timeline (8 weeks)

- **Week 1-2:** Project setup, DB schema, authentication, basic CRUD (users, locations, suppliers, products)
- **Week 3-4:** Purchase orders and HQ receiving with stock auto-increment
- **Week 5-6:** Stock transfers, exchange rates, pricing engine, sales entry with FIFO
- **Week 7:** Dashboard and basic reports
- **Week 8:** Integration testing and deployment

## API Design Patterns

### Key Endpoints

```
POST /api/v1/purchase-orders/{id}/receive
  - Receives goods at HQ
  - Creates stock_batches records
  - Auto-increments HQ inventory

POST /api/v1/stock/transfer
  - Transfers from HQ to branch
  - FIFO deduction from HQ stock_batches
  - Creates/updates branch stock_batches

POST /api/v1/sales
  - Records branch sale
  - FIFO deduction from branch stock_batches
  - Fetches unit price from pricing_configs

POST /api/v1/pricing-configs/calculate
  - Calculates selling price from inputs
  - Returns: local_cost, calculated_price, suggested_price (rounded)
```

## Localization Requirements

- **MVP:** English UI only (Korean, Vietnamese, Chinese deferred to Post-MVP)
- Database stores multi-language product names: `name_ko`, `name_vn`, `name_cn`
- All dates in ISO format, displayed per user locale
- Number formatting: KRW (no decimals), VND (no decimals), CNY (2 decimals)

## Database Design Notes

### Indexes (Performance Critical)
- `stock_batches(location_id, product_id)` - Frequent inventory queries
- `stock_batches(expiry_date)` - FIFO sorting and expiry alerts
- `sales(location_id, sale_date)` - Daily sales reports
- `pricing_configs(product_id, to_location_id)` - Price lookups on sales

### Generated Columns
```sql
stock_batches.qty_available = qty_on_hand - qty_reserved (STORED)
```

### No Audit Log in MVP
- Audit trail (`audit_logs` table) deferred to Phase 2
- Critical for compliance but not blocking for MVP

## Testing Requirements

### MVP Success Criteria
1. Factory PO → HQ receipt → HQ stock increases
2. HQ → Branch transfer → HQ stock decreases, Branch stock increases
3. Branch sale → Branch stock decreases
4. Dashboard shows real-time inventory and sales
5. Stock quantities match transaction history
6. FIFO applied (earliest expiry consumed first)
7. Pricing formula accuracy verified
8. Branch-specific prices correctly applied on sales

### Performance Targets
- API response < 500ms (complex queries < 1s)
- Support 10 concurrent users
- Assumes: ≤5 users, ≤50 products, ≤100 daily sales

## Known Limitations (MVP)

- No concurrency control (simultaneous edits may conflict)
- No price change history
- Manual exchange rate entry (no auto-updates, but saved for reuse)
- Transfer costs are per-product averages (not actual shipping costs)
- No offline mode
- Desktop web only (no mobile optimization)
- Basic auth only (no 2FA in MVP)

## Important Conventions

### Status Values
- Purchase Orders: `'Draft' | 'Approved' | 'Received'`
- Quality Status: `'OK' | 'Damaged' | 'Quarantine'`
- User Roles: `'HQ_Admin' | 'Branch_Manager'`
- Location Types: `'HQ' | 'Branch'`

### Currency Codes
- Korea: `KRW`
- Vietnam: `VND`
- China: `CNY`

### Date Handling
- Manufacturing dates and expiry dates in `DATE` format
- Shelf life stored as integer days in `products.shelf_life_days`
- Expiry auto-calculated: `expiry_date = manufactured_date + shelf_life_days`

## Security Considerations

- JWT tokens for authentication
- Role-based access control (RBAC)
- Branch managers can only access their own branch data (enforced at API level)
- Sensitive fields (supplier bank accounts) require encryption (Post-MVP)

## Future Enhancements (Post-MVP Roadmap)

**Phase 2:** Excel upload, returns processing, detailed reports, audit logs
**Phase 3:** Promotions, bundles, auto exchange rates, advanced pricing simulator
**Phase 4:** Ingredient/certification management, barcode scanning, mobile app
**Phase 5:** AI demand forecasting, advanced costing (ABC), external system integrations

## Documentation & Workflow Management

### Project Documentation Structure

All project planning and work records are maintained in the `/docs` folder with two key subfolders:

#### 1. `/docs/plans` - Planning Documents
- Contains all planning documents for upcoming or ongoing work
- Plans are created BEFORE starting implementation
- Updated when requirements change or new features are added
- Sequential organization by phase

#### 2. `/docs/worklogs` - Work Logs
- Records completed work from each context/session
- Documents actual implementation results
- Maintains history of project progress

### File Naming Convention

All planning and worklog files follow this strict naming pattern:

```
[3-digit-number].[phase-identifier].[descriptive-title-in-korean].md
```

**Components:**
- **Sequential Number:** 3-digit zero-padded (001, 002, 003, etc.)
- **Phase Identifier:** `phase01`, `phase02`, etc.
- **Descriptive Title:** Korean language, underscores for spaces
- **Extension:** `.md` (Markdown format)

**Examples:**
- `001.phase01.프로젝트구조와_폴더_생성하기.md`
- `002.phase02.라이브러리파일_가져오기.md`
- `003.phase01.데이터베이스_스키마_설계.md`

### Workflow Process

1. **Before Starting Work:**
   - Create plan file in `/docs/plans` with next sequential number
   - Document objectives, approach, and expected outcomes

2. **During Implementation:**
   - Follow the plan created in step 1
   - Update plan if requirements change

3. **After Completing Work:**
   - Create corresponding worklog file in `/docs/worklogs`
   - Use same sequential number as the plan
   - Document what was actually completed, decisions made, and any deviations from plan

### Important Rules

- **Korean Titles:** All file titles must be in Korean for better readability
- **Underscores for Spaces:** Replace all spaces with `_` in filenames
- **Sequential Numbering:** Never skip numbers, always use next available number
- **Phase Alignment:** Group related work under same phase number
- **Markdown Format:** All documentation in `.md` format for consistency
