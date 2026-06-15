CREATE OR REPLACE FUNCTION public.update_deliveries_original_sequence(delivery_ids uuid[], sequences integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  FOR i IN 1 .. array_upper(delivery_ids, 1) LOOP
    UPDATE deliveries
    SET original_sequence = sequences[i]
    WHERE id = delivery_ids[i];
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_deliveries_original_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_deliveries_original_sequence TO service_role;