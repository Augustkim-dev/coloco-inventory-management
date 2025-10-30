# Supplier-Products Relationship Design

## Overview

This document explains the many-to-many relationship between suppliers and products, and how to implement it in the Purchase Order workflow.

## Problem Statement

**Before:**
- Suppliers and products were completely separate
- When creating a PO, users saw ALL products regardless of which supplier was selected
- No way to track which supplier provides which products
- No supplier-specific pricing information

**After:**
- Clear relationship: which supplier supplies which products
- Filter products based on selected supplier
- Track supplier-specific pricing and terms
- Support multiple suppliers for the same product (alternative suppliers)

## Database Schema

### New Table: `supplier_products`

```sql
CREATE TABLE public.supplier_products (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  product_id UUID REFERENCES products(id),

  -- Business data
  supplier_product_code TEXT,      -- Supplier's own SKU
  unit_price DECIMAL(12, 2),       -- Supplier's price (KRW)
  lead_time_days INTEGER,          -- Delivery time
  minimum_order_qty INTEGER,       -- MOQ
  is_primary_supplier BOOLEAN,     -- Preferred supplier flag
  is_active BOOLEAN,               -- Can order from this supplier?

  UNIQUE(supplier_id, product_id)
);
```

### Key Features

1. **Many-to-Many Relationship**
   - One supplier → Many products
   - One product → Many suppliers (alternative suppliers)

2. **Supplier-Specific Information**
   - Each supplier may have different prices for the same product
   - Different lead times and minimum order quantities
   - Can mark primary/preferred suppliers

3. **Example Data**

```
Seoul Beauty (Supplier #1)
├── Hyaluronic Acid Serum (25,000 KRW, 7 days, MOQ: 100) ✓ Primary
├── Vitamin C Cream (35,000 KRW, 7 days, MOQ: 100) ✓ Primary
└── Green Tea Cleanser (12,000 KRW, 7 days, MOQ: 100) ✓ Primary

Jeju Natural (Supplier #2)
├── Green Tea Cleanser (13,000 KRW, 10 days, MOQ: 50) ✗ Alternative
└── Cherry Blossom Lotion (16,000 KRW, 10 days, MOQ: 50) ✓ Primary

Busan Marine (Supplier #4)
├── Hyaluronic Acid Serum (26,000 KRW, 7 days, MOQ: 150) ✗ Alternative
└── Snail Mucin Mask (14,500 KRW, 7 days, MOQ: 150) ✗ Alternative
```

**Note:** "Green Tea Cleanser" and "Hyaluronic Acid Serum" have multiple suppliers!

## API Implementation

### 1. Get Products for Supplier (filtered list)

**Endpoint:** `GET /api/v1/suppliers/:supplierId/products`

**Purpose:** Get only the products that a specific supplier can provide

```typescript
// Backend implementation
export async function getSupplierProducts(supplierId: string) {
  const { data, error } = await supabase
    .from('supplier_products')
    .select(`
      *,
      product:products (
        id,
        sku,
        name,
        category,
        unit,
        shelf_life_days
      )
    `)
    .eq('supplier_id', supplierId)
    .eq('is_active', true)  // Only active products
    .order('product.name');

  return data;
}
```

**Response:**
```json
[
  {
    "id": "sp-uuid-1",
    "supplier_id": "supplier-1",
    "product_id": "product-1",
    "supplier_product_code": "SB-SKN-HYA-SRM-100",
    "unit_price": 25000,
    "lead_time_days": 7,
    "minimum_order_qty": 100,
    "is_primary_supplier": true,
    "product": {
      "id": "product-1",
      "sku": "SKN-HYA-SRM-100",
      "name": "Hyaluronic Acid Serum 100ml",
      "category": "skincare",
      "unit": "EA"
    }
  },
  // ... more products
]
```

### 2. Create Purchase Order (with validation)

**Endpoint:** `POST /api/v1/purchase-orders`

```typescript
export async function createPurchaseOrder(poData: {
  supplier_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}) {
  // 1. Validate: Check that all products belong to selected supplier
  const { data: supplierProducts } = await supabase
    .from('supplier_products')
    .select('product_id')
    .eq('supplier_id', poData.supplier_id)
    .eq('is_active', true);

  const validProductIds = new Set(
    supplierProducts?.map(sp => sp.product_id)
  );

  for (const item of poData.items) {
    if (!validProductIds.has(item.product_id)) {
      throw new Error(
        `Product ${item.product_id} is not supplied by this supplier`
      );
    }
  }

  // 2. Create PO
  const { data: po } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: poData.supplier_id,
      status: 'Draft',
      // ... other fields
    })
    .select()
    .single();

  // 3. Create PO items
  const items = poData.items.map(item => ({
    purchase_order_id: po.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));

  await supabase
    .from('purchase_order_items')
    .insert(items);

  return po;
}
```

### 3. Get Supplier Info for Product

**Endpoint:** `GET /api/v1/products/:productId/suppliers`

**Purpose:** When viewing a product, see which suppliers can provide it

```typescript
export async function getProductSuppliers(productId: string) {
  const { data } = await supabase
    .from('supplier_products')
    .select(`
      *,
      supplier:suppliers (
        id,
        name,
        contact_person,
        email
      )
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('is_primary_supplier', { ascending: false })  // Primary first
    .order('unit_price', { ascending: true });           // Then by price

  return data;
}
```

**Response:**
```json
[
  {
    "id": "sp-uuid-1",
    "unit_price": 25000,
    "lead_time_days": 7,
    "minimum_order_qty": 100,
    "is_primary_supplier": true,
    "supplier": {
      "id": "supplier-1",
      "name": "Seoul Beauty Co., Ltd.",
      "contact_person": "Kim Min-ji"
    }
  },
  {
    "id": "sp-uuid-2",
    "unit_price": 26000,
    "lead_time_days": 7,
    "minimum_order_qty": 150,
    "is_primary_supplier": false,
    "supplier": {
      "id": "supplier-4",
      "name": "Busan Marine Skincare",
      "contact_person": "Choi Hyun-woo"
    }
  }
]
```

## Frontend Implementation

### Purchase Order Creation Flow

```typescript
// 1. Component State
const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
const [poItems, setPoItems] = useState<POItem[]>([]);

// 2. When supplier is selected, fetch their products
const handleSupplierChange = async (supplierId: string) => {
  setSelectedSupplier(supplierId);

  // Fetch products for this supplier
  const products = await getSupplierProducts(supplierId);
  setAvailableProducts(products);

  // Clear previously selected items (different supplier = different products)
  setPoItems([]);
};

// 3. Add product to PO (with supplier's unit price pre-filled)
const handleAddProduct = (supplierProduct: SupplierProduct) => {
  const newItem = {
    product_id: supplierProduct.product_id,
    product_name: supplierProduct.product.name,
    quantity: supplierProduct.minimum_order_qty, // Pre-fill with MOQ
    unit_price: supplierProduct.unit_price,      // Pre-fill with supplier price
  };

  setPoItems([...poItems, newItem]);
};
```

### UI Flow

```
Step 1: Select Supplier
┌─────────────────────────────────────┐
│ Supplier: [Seoul Beauty Co. ▼]     │
└─────────────────────────────────────┘
           ↓
Step 2: Add Products (filtered by supplier)
┌─────────────────────────────────────────────────────────┐
│ Available Products (from Seoul Beauty):                 │
│                                                          │
│ ☐ Hyaluronic Acid Serum    25,000 KRW  MOQ: 100  [Add] │
│ ☐ Vitamin C Cream          35,000 KRW  MOQ: 100  [Add] │
│ ☐ Snail Mucin Mask         15,000 KRW  MOQ: 100  [Add] │
└─────────────────────────────────────────────────────────┘
           ↓
Step 3: Review PO Items
┌─────────────────────────────────────────────────────────┐
│ Product              Qty    Unit Price    Subtotal      │
├─────────────────────────────────────────────────────────┤
│ Hyaluronic Serum     200    25,000       5,000,000      │
│ Vitamin C Cream      150    35,000       5,250,000      │
├─────────────────────────────────────────────────────────┤
│ Total:                                  10,250,000 KRW   │
└─────────────────────────────────────────────────────────┘
```

### Validation Rules

1. **Supplier Selection Required**
   - Cannot add products before selecting supplier
   - Changing supplier clears current items (warn user!)

2. **Product Availability**
   - Only show products where `is_active = true`
   - Show supplier's specific price (not generic product price)

3. **Minimum Order Quantity**
   - Warn if quantity < MOQ
   - Pre-fill quantity input with MOQ value

4. **Duplicate Products**
   - Prevent adding same product twice to same PO
   - Or allow but combine quantities

## Benefits of This Design

### 1. Data Integrity
- Cannot accidentally order products from wrong supplier
- Clear audit trail of supplier-product relationships

### 2. Business Logic Support
- **Price Comparison:** See all suppliers for a product, compare prices
- **Alternative Suppliers:** If primary supplier is unavailable, easily switch
- **Supplier Performance:** Track which supplier provides which products

### 3. User Experience
- **Reduced Confusion:** Users only see relevant products
- **Faster Data Entry:** Pre-filled prices and MOQs
- **Better Decisions:** Can see lead times and MOQs upfront

### 4. Scalability
- Easy to add/remove products from supplier's catalog
- Support for thousands of products without performance issues
- Simple to deactivate supplier-product relationships

## Migration Guide

### For Existing Data

If you already have purchase orders without supplier-product relationships:

```sql
-- Create relationships based on existing POs
INSERT INTO supplier_products (supplier_id, product_id, unit_price, is_primary_supplier)
SELECT DISTINCT
  po.supplier_id,
  poi.product_id,
  AVG(poi.unit_price),  -- Use average price from past orders
  true                   -- Mark all as primary initially
FROM purchase_orders po
JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.supplier_id, poi.product_id
ON CONFLICT (supplier_id, product_id) DO NOTHING;
```

### Adding New Supplier-Product Relationship

```sql
INSERT INTO supplier_products (
  supplier_id,
  product_id,
  supplier_product_code,
  unit_price,
  lead_time_days,
  minimum_order_qty,
  is_primary_supplier
) VALUES (
  'supplier-uuid',
  'product-uuid',
  'SUPPLIER-SKU-CODE',
  25000,
  7,
  100,
  true
);
```

## Query Examples

### 1. Find cheapest supplier for a product

```sql
SELECT
  s.name,
  sp.unit_price,
  sp.lead_time_days,
  sp.minimum_order_qty
FROM supplier_products sp
JOIN suppliers s ON sp.supplier_id = s.id
WHERE sp.product_id = 'product-uuid'
  AND sp.is_active = true
ORDER BY sp.unit_price ASC;
```

### 2. Get all products from primary suppliers

```sql
SELECT
  s.name AS supplier_name,
  p.name AS product_name,
  sp.unit_price
FROM supplier_products sp
JOIN suppliers s ON sp.supplier_id = s.id
JOIN products p ON sp.product_id = p.id
WHERE sp.is_primary_supplier = true
  AND sp.is_active = true
ORDER BY s.name, p.name;
```

### 3. Find products with multiple suppliers

```sql
SELECT
  p.name AS product_name,
  COUNT(*) AS supplier_count,
  MIN(sp.unit_price) AS min_price,
  MAX(sp.unit_price) AS max_price
FROM supplier_products sp
JOIN products p ON sp.product_id = p.id
WHERE sp.is_active = true
GROUP BY p.id, p.name
HAVING COUNT(*) > 1
ORDER BY supplier_count DESC;
```

## Future Enhancements

### 1. Supplier Performance Tracking
- Track delivery success rate
- Quality issue history
- Automatically adjust `is_primary_supplier` based on performance

### 2. Price History
- Store historical prices in separate table
- Track price changes over time
- Alert when supplier raises prices

### 3. Supplier Contracts
- Link supplier-products to contracts
- Enforce contract pricing
- Alert when contracts expire

### 4. Automatic Supplier Selection
- When creating PO, suggest best supplier based on:
  - Price
  - Lead time
  - Past performance
  - Current inventory levels
