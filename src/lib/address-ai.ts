import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const cleanAddressWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: any) => z.object({ address: z.string() }).parse(input))
  .handler(async ({ data: input }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) return { address: input.address, success: false };

    try {
      const response = await fetch("https://api.lovable.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a Brazilian address normalization specialist. Convert messy addresses into a standard format: 'Rua/Av, Numero - Bairro, Cidade - UF, CEP'. Only return the cleaned string, nothing else."
            },
            {
              role: "user",
              content: input.address
            }
          ]
        })
      });

      const data = await response.json();
      const cleaned = data.choices[0].message.content.trim();
      return { address: cleaned, success: true };
    } catch (error) {
      console.error("AI Address Cleaning failed:", error);
      return { address: input.address, success: false };
    }
  });
