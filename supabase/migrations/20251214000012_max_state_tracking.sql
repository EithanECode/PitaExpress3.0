-- Track maximum state reached before cancellation
-- This allows filtering cancelled orders by who interacted with them

-- Add column to track max state reached
ALTER TABLE orders ADD COLUMN IF NOT EXISTS max_state_reached INTEGER DEFAULT 0;

-- Update existing orders: set max_state_reached to current state (if positive)
UPDATE orders SET max_state_reached = GREATEST(state, 0) WHERE max_state_reached = 0 OR max_state_reached IS NULL;

-- Create trigger function to update max_state_reached
CREATE OR REPLACE FUNCTION update_max_state_reached()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if new state is positive and greater than current max
  IF NEW.state > 0 AND NEW.state > COALESCE(NEW.max_state_reached, 0) THEN
    NEW.max_state_reached := NEW.state;
  END IF;
  
  -- If this is an INSERT and state is positive, set initial max
  IF TG_OP = 'INSERT' AND NEW.state > 0 THEN
    NEW.max_state_reached := NEW.state;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_max_state ON orders;

-- Create trigger
CREATE TRIGGER trigger_update_max_state
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_max_state_reached();

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_orders_max_state_reached ON orders(max_state_reached);
