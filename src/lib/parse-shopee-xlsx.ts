import type * as XLSXType from "xlsx";

let xlsxPromise: Promise<typeof XLSXType> | null = null;

function getXLSX() {
  if (!xlsxPromise) {
    xlsxPromise = import("xlsx");
  }
  return xlsxPromise;
}

export type ParsedDelivery = {
  at_id: string | null;
  sequence: number | null;
  stop: number | null;
  spx_tn: string | null;
  destination_address: string;
  neighborhood: string | null;
  city: string | null;
  zipcode: string | null;
  latitude: number | null;
  longitude: number | null;
  freight_value: number | null;
  confidence?: "high" | "medium" | "low";
  confidence_reason?: string;
  package_count?: number;
};

export type ParseResult = {
  total: number;
  valid: ParsedDelivery[];
  invalid: number;
  warnings: string[];
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s_/-]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const HEADER_MAP: Record<string, keyof ParsedDelivery> = {
  atid: "at_id",
  sequence: "sequence",
  seq: "sequence",
  stop: "stop",
  spxtn: "spx_tn",
  tracking: "spx_tn",
  trackingcode: "spx_tn",
  destinationaddress: "destination_address",
  address: "destination_address",
  endereco: "destination_address",
  bairro: "neighborhood",
  neighborhood: "neighborhood",
  city: "city",
  cidade: "city",
  zipcode: "zipcode",
  postalcode: "zipcode",
  cep: "zipcode",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  lon: "longitude",
  frete: "freight_value",
  valor: "freight_value",
  ganho: "freight_value",
  value: "freight_value",
  freight: "freight_value",
  price: "freight_value",
  earnings: "freight_value",
};

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseRows(
  rows: Record<string, unknown>[],
  onProgress?: (percent: number) => void,
): ParseResult {
  if (rows.length === 0) return { total: 0, valid: [], invalid: 0, warnings: [] };

  const warnings: string[] = [];
  const valid: ParsedDelivery[] = [];
  let invalid = 0;

  const firstRow = rows[0];
  const fieldMap: Record<string, keyof ParsedDelivery> = {};
  for (const key of Object.keys(firstRow)) {
    const mapped = HEADER_MAP[norm(key)];
    if (mapped) {
      fieldMap[key] = mapped;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (i % 50 === 0) onProgress?.(Math.round((i / rows.length) * 100));
    const row = rows[i];
    const out: ParsedDelivery = {
      at_id: null,
      sequence: null,
      stop: null,
      spx_tn: null,
      destination_address: "",
      neighborhood: null,
      city: null,
      zipcode: null,
      latitude: null,
      longitude: null,
      freight_value: null,
    };

    for (const [key, val] of Object.entries(row)) {
      const mapped = fieldMap[key];
      if (!mapped) continue;

      if (
        mapped === "sequence" ||
        mapped === "stop" ||
        mapped === "latitude" ||
        mapped === "longitude" ||
        mapped === "freight_value"
      ) {
        out[mapped] = parseNum(val);
      } else {
        const s = val === null || val === undefined ? "" : String(val).trim();
        (out as any)[mapped] = s === "" ? null : s;
      }
    }

    // Skip the AT (collection point) row which has "-" for sequence and stop
    const isAtCollectionPoint = 
      (row["Sequence"] === "-" || row["Sequence"] === null) && 
      (row["Stop"] === "-" || row["Stop"] === null);

    if (!out.destination_address || isAtCollectionPoint) {
      invalid++;
      continue;
    }
    valid.push(out);
  }

  onProgress?.(100);
  const missingCoords = valid.filter((v) => v.latitude == null || v.longitude == null).length;
  if (missingCoords > 0) warnings.push(`${missingCoords} entregas sem latitude/longitude`);

  return { total: rows.length, valid, invalid, warnings };
}

export async function parseShopeeArrayBuffer(
  buffer: ArrayBuffer,
  onProgress?: (percent: number) => void,
): Promise<ParseResult> {
  const XLSX = await getXLSX();
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    return parseRows(rows, onProgress);
  } catch (error) {
    console.error("XLSX Read Error:", error);
    throw new Error("Não foi possível ler o arquivo. Verifique se é um arquivo Excel válido.");
  }
}


export async function parseShopeeXlsx(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  return parseShopeeArrayBuffer(buf, onProgress);
}
