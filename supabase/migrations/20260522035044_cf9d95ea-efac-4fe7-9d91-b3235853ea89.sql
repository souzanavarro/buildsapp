ALTER TABLE public.deliveries ADD COLUMN original_sequence INTEGER;

-- Initialize original_sequence with the current sequence for existing data
UPDATE public.deliveries SET original_sequence = sequence WHERE original_sequence IS NULL;