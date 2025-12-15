-- Add archive columns for each role (independent visibility)
-- Each role can hide orders for themselves without affecting other roles

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by_china BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by_vzla BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_by_pagos BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_archived_by_china ON orders(archived_by_china) WHERE archived_by_china = false;
CREATE INDEX IF NOT EXISTS idx_orders_archived_by_vzla ON orders(archived_by_vzla) WHERE archived_by_vzla = false;
CREATE INDEX IF NOT EXISTS idx_orders_archived_by_pagos ON orders(archived_by_pagos) WHERE archived_by_pagos = false;
