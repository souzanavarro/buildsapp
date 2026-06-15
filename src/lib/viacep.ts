import { supabase } from "@/integrations/supabase/client";

// Enriquecimento de endereço via ViaCEP e BrasilAPI (gratuitos, sem chave)
// Usado para corrigir bairro/cidade/UF quando a IA leu errado da etiqueta.

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  erro?: boolean;
}

export interface NormalizedAddress {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  fullAddress: string;
  source: "viacep" | "brasilapi" | "ai" | "merged";
  confidence: "high" | "medium" | "low";
  confidenceReason?: string;
}

const memoryCache = new Map<string, ViaCepResult | null>();

function cleanCep(cep: string): string {
  return (cep || "").replace(/\D/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Busca CEP no Supabase, depois ViaCEP, depois BrasilAPI
 */
export async function lookupCep(rawCep: string): Promise<ViaCepResult | null> {
  const cep = cleanCep(rawCep);
  if (cep.length !== 8) return null;

  // 1. Memory Cache
  if (memoryCache.has(cep)) return memoryCache.get(cep) ?? null;

  try {
    // 2. Supabase Cache
    const { data: cached } = await supabase
      .from("cep_cache")
      .select("*")
      .eq("cep", cep)
      .maybeSingle();

    if (cached) {
      const result = {
        cep: cached.cep,
        logradouro: cached.logradouro || "",
        bairro: cached.bairro || "",
        localidade: cached.localidade || "",
        uf: cached.uf || "",
      };
      memoryCache.set(cep, result);
      return result;
    }

    // 3. ViaCEP
    let data: ViaCepResult | null = null;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (res.ok) {
        const json = await res.json();
        if (!json.erro) data = json;
      }
    } catch (e) {
      console.warn("ViaCEP failed, trying BrasilAPI...", e);
    }

    // 4. Fallback BrasilAPI
    if (!data) {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        if (res.ok) {
          const json = await res.json();
          data = {
            cep: json.cep,
            logradouro: json.street,
            bairro: json.neighborhood,
            localidade: json.city,
            uf: json.state,
          };
        }
      } catch (e) {
        console.error("BrasilAPI also failed:", e);
      }
    }

    if (data) {
      // Save to Supabase (fire and forget)
      supabase.from("cep_cache").upsert({
        cep: data.cep.replace(/\D/g, ""),
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
      }).then(({ error }) => {
        if (error) console.error("Error saving to cep_cache:", error);
      });

      memoryCache.set(cep, data);
      return data;
    }

    return null;
  } catch (e) {
    console.error("CEP lookup master error:", e);
    return null;
  }
}

// Palavras-chave de logradouro (PT-BR)
const STREET_KEYWORDS = /\b(rua|r\.|avenida|av\.?|estrada|rodovia|rod\.?|travessa|tv\.?|alameda|al\.?|praça|praca|largo|viela|servidão|servidao|beco|via|vila|quadra|qd\.?|conjunto|cj\.?|residencial|loteamento|chácara|chacara|sítio|sitio|fazenda|passagem|psg\.?|ladeira|rampa)\b/i;

// Detecta "sem número": s/n, s/nº, SN, S.N., etc.
function isSemNumero(addr: string): boolean {
  return /\b(s\.?\s*\/?\s*n[ºo°.]?|sem\s+n[úu]mero)\b/i.test(addr || "");
}

// Extrai o número (ex: "Rua X, 123 - Bairro" -> "123")
function extractNumber(addr: string): string | null {
  if (!addr) return null;
  if (isSemNumero(addr)) return "s/n";
  // Ignora CEPs (8 dígitos) e códigos longos; pega de 1 a 5 dígitos próximo a vírgula/nº
  const cleaned = addr.replace(/\d{5}-?\d{3}/g, "");
  const m = cleaned.match(/(?:,\s*|n[ºo°.]?\s*)(\d{1,5})\b/i)
    || cleaned.match(/\b(\d{1,5})\b(?=\s*[-,–]|\s*$)/);
  return m ? m[1] : null;
}

// Tenta achar o logradouro mesmo quando vem APÓS o bairro
// ex: "Cai, Estrada Antônio Spina s/n" -> "Estrada Antônio Spina"
function extractStreet(addr: string, knownNeighborhood?: string | null, knownCity?: string | null): string {
  if (!addr) return "";
  let s = addr;
  s = s.replace(/\d{5}-?\d{3}/g, ""); // remove CEP
  if (knownNeighborhood) s = s.replace(new RegExp(`\\b${escapeRegExp(knownNeighborhood)}\\b`, "ig"), "");
  if (knownCity) s = s.replace(new RegExp(`\\b${escapeRegExp(knownCity)}\\b`, "ig"), "");

  // Se houver uma palavra-chave de logradouro, recorta a partir dela
  const kw = s.match(STREET_KEYWORDS);
  if (kw && kw.index !== undefined) {
    s = s.slice(kw.index);
  } else {
    s = s.split(/\s[-–]\s|,/)[0];
  }

  // Remove "s/n" e número final para deixar só o nome da via
  s = s.replace(/\b(s\.?\s*\/?\s*n[ºo°.]?|sem\s+n[úu]mero)\b/ig, "");
  s = s.replace(/[,\-\s]+$/g, "").replace(/^[,\-\s]+/g, "").trim();
  return s;
}

export function buildDestinationAddress(
  normalized: Pick<NormalizedAddress, "street" | "number" | "neighborhood" | "city" | "state">,
  fallback?: string | null,
): string {
  const streetPart = normalized.street
    ? [normalized.street, normalized.number].filter(Boolean).join(", ")
    : "";
  const cityPart = normalized.city
    ? normalized.state
      ? `${normalized.city} - ${normalized.state}`
      : normalized.city
    : "";

  const formatted = [streetPart, normalized.neighborhood, cityPart]
    .filter(Boolean)
    .join(", ")
    .trim();

  return formatted || fallback || "";
}

/**
 * Normaliza e valida endereço.
 */
export async function normalizeAddress(input: {
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  zipcode: string | null;
}): Promise<NormalizedAddress> {
  const cep = input.zipcode ? cleanCep(input.zipcode) : "";
  const via = cep ? await lookupCep(cep) : null;
  const aiNumber = input.address ? extractNumber(input.address) : null;

  let confidence: "high" | "medium" | "low" = "high";
  let reason = "";

  if (via) {
    // Validação Cruzada
    const cityMatch = input.city && via.localidade.toLowerCase().includes(input.city.toLowerCase());
    const neighborhoodMatch = input.neighborhood && via.bairro.toLowerCase().includes(input.neighborhood.toLowerCase());

    if (!cityMatch) {
      confidence = "low";
      reason = "Cidade da etiqueta diverge do CEP";
    } else if (!neighborhoodMatch && via.bairro) {
      confidence = "medium";
      reason = "Bairro divergente (CEP vs Etiqueta)";
    }

    if (!aiNumber) {
      confidence = confidence === "low" ? "low" : "medium";
      reason += (reason ? " + " : "") + "Número não identificado";
    }

    // Se ViaCEP traz logradouro, prefere ele. Senão, extrai da string da IA
    // mesmo que o nome da rua venha DEPOIS do bairro (ex: "Cai, Estrada Spina s/n").
    const street = via.logradouro
      || extractStreet(input.address || "", via.bairro, via.localidade);
    const zipcode = via.cep.includes("-") ? via.cep : via.cep.replace(/(\d{5})(\d{3})/, "$1-$2");

    // Geocoders preferem rua sem "s/n" no fim — só anexa número se for numérico
    const numForAddress = aiNumber && aiNumber !== "s/n" ? aiNumber : null;
    const parts = [
      [street, numForAddress].filter(Boolean).join(", "),
      via.bairro || input.neighborhood,
      `${via.localidade} - ${via.uf}`,
      zipcode,
      "Brasil",
    ].filter(Boolean);

    return {
      street: street || null,
      number: aiNumber,
      neighborhood: via.bairro || input.neighborhood,
      city: via.localidade,
      state: via.uf,
      zipcode,
      fullAddress: parts.join(", "),
      source: "merged",
      confidence,
      confidenceReason: reason,
    };
  }

  // Fallback: Sem CEP
  confidence = "low";
  reason = "CEP não identificado ou inválido";

  const street = extractStreet(input.address || "", input.neighborhood, input.city);
  const numForAddress = aiNumber && aiNumber !== "s/n" ? aiNumber : null;
  const parts = [
    [street, numForAddress].filter(Boolean).join(", ") || input.address,
    input.neighborhood,
    input.city,
    "Brasil",
  ].filter(Boolean);

  return {
    street: street || null,
    number: aiNumber,
    neighborhood: input.neighborhood,
    city: input.city,
    state: null,
    zipcode: input.zipcode,
    fullAddress: parts.join(", "),
    source: "ai",
    confidence,
    confidenceReason: reason,
  };
}
