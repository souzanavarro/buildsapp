CREATE OR REPLACE FUNCTION public.update_deliveries_sequence(delivery_ids uuid[], sequences int[])
RETURNS void AS $$
BEGIN
  UPDATE public.deliveries d
  SET sequence = s.new_sequence
  FROM (
    SELECT unnest(delivery_ids) as id, unnest(sequences) as new_sequence
  ) s
  WHERE d.id = s.id;
END;
$$ LANGUAGE plpgsql;
