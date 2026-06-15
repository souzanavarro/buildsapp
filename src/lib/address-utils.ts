/**
 * Standardizes an address string for comparison.
 * Lowercases, removes accents, and strips extra spaces/punctuation.
 */
export const standardizeAddress = (address: string | null | undefined): string => {
  if (!address) return "";
  return address
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s,]/g, "")   // remove most punctuation except comma
    .replace(/\s+/g, " ")           // collapse spaces
    .trim();
};

/**
 * Canonicalizes an address for grouping (same building/house).
 * Removes complements and specific details.
 */
export const canonicalizeAddress = (address: string | null | undefined): string => {
  if (!address) return 'sem-endereco';
  
  // Remove everything after a hyphen (common for complements like - Bloco A)
  let base = address.split('-')[0].trim();
  
  // Also handle cases where comma is used for complement: "Rua X, 123, Apt 1"
  const commaParts = base.split(',');
  if (commaParts.length > 2) {
    base = `${commaParts[0]}, ${commaParts[1]}`.trim();
  }
  
  return standardizeAddress(base);
};

/**
 * Extracts only the street/avenue name from an address.
 */
export const canonicalizeStreet = (address: string | null | undefined): string => {
  if (!address) return 'sem-rua';
  
  // Standard format often is: "Rua X, 123 - Neighborhood, City"
  // Or "Avenida Y, 456"
  const base = address.split(',')[0].trim();
  
  // Try to remove common prefixes like "Rua", "Av.", "Avenida" to group better
  // but keeping them might be safer for identification.
  // For now, let's just use the part before the first comma as the "Street".
  return standardizeAddress(base);
};

/**
 * Tries to extract a numeric house number from an address string.
 */
export const extractHouseNumber = (address: string | null | undefined): number | null => {
  if (!address) return null;
  // Usually "Street, 123" or "Street 123"
  const match = address.match(/,?\s*(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};
