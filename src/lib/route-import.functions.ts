import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createRouteImportWithAdmin, findRecentlyCreatedRouteWithAdmin } from "./route-import.server";
import { processRouteJobWithAdmin, waitForRouteJobWithAdmin } from "./route-jobs.server";

const deliverySchema = z.object({
  at_id: z.string().nullable().optional(),
  sequence: z.number().int(),
  original_sequence: z.number().int(),
  spx_tn: z.string().nullable().optional(),
  destination_address: z.string().min(1),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  zipcode: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  freight_value: z.number().nullable().optional(),
  status: z
    .enum(["pending", "in_route", "delivered", "problem", "rescheduled", "returned", "cancelled"])
    .default("pending"),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  confidence_reason: z.string().nullable().optional(),
  package_count: z.number().int().optional(),
});

const inputSchema = z.object({
  name: z.string().min(1),
  source_file_name: z.string().min(1),
  company_id: z.string().uuid(),
  user_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  route_date: z.string().optional(),
  total_deliveries: z.number().int().positive(),
  freight_value: z.number(),
  deliveries: z.array(deliverySchema).min(1).optional(),
  stored_file_path: z.string().min(1).max(512).optional(),
  total_rows: z.number().int().nonnegative().default(0),
  invalid_rows: z.number().int().nonnegative().default(0),
  upload_id: z.string().min(1).max(64).optional(),
}).superRefine((value, ctx) => {
  if (!value.stored_file_path && (!value.deliveries || value.deliveries.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deliveries"],
      message: "Informe as entregas ou um arquivo salvo no backend.",
    });
  }
});

const confirmationInputSchema = z.object({
  jobId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  fileName: z.string().min(1),
  totalDeliveries: z.number().int().positive(),
  routeDate: z.string().min(1),
});

export const createRouteImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => {
    const payload = input?.data || input;
    return inputSchema.parse(payload);
  })
  .handler(async ({ data, context }) => {
    if (context.userId !== data.user_id) {
      throw new Error("Usuário inválido para esta importação.");
    }
    return createRouteImportWithAdmin(data);
  });

export const confirmRecentRouteImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => {
    const payload = input?.data || input;
    return confirmationInputSchema.parse(payload);
  })
  .handler(async ({ data, context }) => {
    if (context.userId !== data.userId) {
      throw new Error("Usuário inválido para esta confirmação.");
    }

    if (data.jobId) {
      await processRouteJobWithAdmin(data.jobId);
      const result = await waitForRouteJobWithAdmin(data.jobId);
      if (result?.id) {
        return result;
      }
    }

    return findRecentlyCreatedRouteWithAdmin(data);
  });