ALTER TABLE public.proof_of_delivery 
ADD COLUMN IF NOT EXISTS scanned_barcode TEXT;
