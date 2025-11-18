-- Migration: Create Stock Transfer Requests Table
-- Description: Allows SubBranch managers to request stock transfers from parent locations
-- Date: 2025-11-18

-- Step 1: Create stock_transfer_requests table
CREATE TABLE public.stock_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  to_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
  notes TEXT,

  -- Approval information
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_transfer_requests_status ON public.stock_transfer_requests(status);
CREATE INDEX idx_transfer_requests_to_location ON public.stock_transfer_requests(to_location_id);
CREATE INDEX idx_transfer_requests_from_location ON public.stock_transfer_requests(from_location_id);
CREATE INDEX idx_transfer_requests_requested_by ON public.stock_transfer_requests(requested_by);
CREATE INDEX idx_transfer_requests_created_at ON public.stock_transfer_requests(created_at DESC);

-- Step 3: Add comments
COMMENT ON TABLE public.stock_transfer_requests IS 'Stock transfer requests from SubBranch managers to parent locations';
COMMENT ON COLUMN public.stock_transfer_requests.status IS 'Pending: awaiting approval, Approved: approved but not yet transferred, Completed: transfer executed, Rejected: request denied';

-- Step 4: Enable RLS
ALTER TABLE public.stock_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies

-- Select: Users can see requests they created OR requests for locations they manage
CREATE POLICY transfer_requests_select_policy ON public.stock_transfer_requests
FOR SELECT USING (
  -- HQ Admin can see all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Request creator can see their own requests
  requested_by = auth.uid()
  OR
  -- Branch/SubBranch Manager can see requests for their location or children
  from_location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
);

-- Insert: SubBranch/Branch managers can create requests
CREATE POLICY transfer_requests_insert_policy ON public.stock_transfer_requests
FOR INSERT WITH CHECK (
  -- HQ Admin can create requests
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Branch/SubBranch Manager can create requests for their location
  (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Branch_Manager', 'SubBranch_Manager')
    AND to_location_id = (SELECT location_id FROM public.users WHERE id = auth.uid())
    AND requested_by = auth.uid()
  )
);

-- Update: Only HQ Admin or parent location manager can approve/reject
CREATE POLICY transfer_requests_update_policy ON public.stock_transfer_requests
FOR UPDATE USING (
  -- HQ Admin can update all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
  OR
  -- Parent location manager can update requests from their children
  from_location_id IN (
    SELECT (SELECT location_id FROM public.users WHERE id = auth.uid())
    UNION
    SELECT location_id FROM get_child_locations((SELECT location_id FROM public.users WHERE id = auth.uid()))
  )
);

-- Delete: Only request creator or HQ Admin can delete (only if status is Pending)
CREATE POLICY transfer_requests_delete_policy ON public.stock_transfer_requests
FOR DELETE USING (
  status = 'Pending' AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'HQ_Admin'
    OR requested_by = auth.uid()
  )
);

-- Step 6: Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_transfer_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transfer_request_updated_at
  BEFORE UPDATE ON public.stock_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_transfer_request_updated_at();

-- Step 7: Create function to validate request before approval
CREATE OR REPLACE FUNCTION validate_transfer_request()
RETURNS TRIGGER AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  -- Only validate when status changes to 'Approved'
  IF NEW.status = 'Approved' AND OLD.status = 'Pending' THEN
    -- Check if enough stock is available at from_location
    SELECT COALESCE(SUM(qty_available), 0) INTO available_stock
    FROM public.stock_batches
    WHERE location_id = NEW.from_location_id
      AND product_id = NEW.product_id
      AND quality_status = 'OK';

    IF available_stock < NEW.requested_qty THEN
      RAISE EXCEPTION 'Insufficient stock at source location. Available: %, Requested: %', available_stock, NEW.requested_qty;
    END IF;

    -- Set approval timestamp and approver
    NEW.approved_at = NOW();
    NEW.approved_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_transfer_request
  BEFORE UPDATE ON public.stock_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_transfer_request();
