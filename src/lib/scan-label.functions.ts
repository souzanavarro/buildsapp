import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageBase64: z.string().min(100).max(8_000_000), // data URL base64
});

export type ScanLabelResult = {
  success: boolean;
  trackingCode: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  zipcode: string | null;
  raw?: string;
  error?: string;
};

export const scanLabel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ScanLabelResult> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return {
        success: false,
        trackingCode: null,
        address: null,
        neighborhood: null,
        city: null,
        zipcode: null,
        error: "Lovable AI não configurado.",
      };
    }

    // Garantir formato data URL
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "manual",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você analisa etiquetas de envio brasileiras (Shopee, Mercado Livre, Amazon, Magalu, Correios etc). Extraia o CÓDIGO DE RASTREIO (barcode/SPX TN/AWB) e o ENDEREÇO DE ENTREGA completo do destinatário. Responda APENAS um JSON válido sem markdown, no formato: {\"trackingCode\":\"...\",\"address\":\"Rua, Numero - Bairro\",\"neighborhood\":\"...\",\"city\":\"Cidade - UF\",\"zipcode\":\"00000-000\"}. Se algum campo não for legível, use null. Nunca invente dados.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extraia os dados desta etiqueta." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          trackingCode: null,
          address: null,
          neighborhood: null,
          city: null,
          zipcode: null,
          error: `AI ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      const content: string = json.choices?.[0]?.message?.content ?? "";

      // Limpar possíveis blocos markdown
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();

      let parsed: any = {};
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      return {
        success: true,
        trackingCode: parsed.trackingCode || null,
        address: parsed.address || null,
        neighborhood: parsed.neighborhood || null,
        city: parsed.city || null,
        zipcode: parsed.zipcode || null,
        raw: content,
      };
    } catch (error: any) {
      return {
        success: false,
        trackingCode: null,
        address: null,
        neighborhood: null,
        city: null,
        zipcode: null,
        error: error?.message || "Erro desconhecido",
      };
    }
  });
