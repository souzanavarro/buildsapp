import { canonicalizeStreet, extractHouseNumber } from "./address-utils";

// Haversine distance in km
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Stop = { id: string; lat: number | null; lng: number | null };

// Nearest neighbor heuristic for "shortest distance" optimization
export function nearestNeighborOrder(stops: Stop[], start?: Stop): string[] {
  const valid = stops.filter((s) => s != null && s.lat != null && s.lng != null) as Array<
    Required<Pick<Stop, "id">> & { lat: number; lng: number }
  >;
  
  if (valid.length === 0) return stops.map((s) => s.id);

  const result: string[] = [];
  const remaining = [...valid];
  
  let current: { id: string; lat: number; lng: number };

  if (start && start.lat != null && start.lng != null) {
    current = { id: start.id, lat: start.lat, lng: start.lng };
    // If start is in stops, remove it from remaining to avoid duplicates
    const startIndex = remaining.findIndex(s => s.id === start.id);
    if (startIndex !== -1) {
      remaining.splice(startIndex, 1);
    }
  } else {
    current = remaining.shift()!;
    result.push(current.id);
  }

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    current = remaining.splice(bestIdx, 1)[0];
    result.push(current.id);
  }

  // append stops without coordinates at the end, preserving order
  for (const s of stops) {
    if (!result.includes(s.id)) result.push(s.id);
  }
  return result;
}

export function totalRouteKm(stops: Stop[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
      total += haversineKm(
        { lat: a.lat, lng: a.lng },
        { lat: b.lat, lng: b.lng },
      );
    }
  }
  return total;
}

export type TelemetryStop = Stop & { destination_address?: string };

/**
 * Optimizes the route by grouping by street and ordering by proximity.
 * This helps avoid returning to the same street multiple times.
 */
export function optimizeTelemetryRoute(stops: TelemetryStop[], start?: Stop): string[] {
  const valid = stops.filter((s) => s != null && s.lat != null && s.lng != null) as Array<
    Required<Pick<TelemetryStop, "id">> & { lat: number; lng: number; destination_address?: string }
  >;
  
  if (valid.length === 0) return stops.map((s) => s.id);

  // 1. Group by street
  const streetGroups: Record<string, typeof valid> = {};
  valid.forEach(s => {
    const street = canonicalizeStreet(s.destination_address);
    if (!streetGroups[street]) streetGroups[street] = [];
    streetGroups[street].push(s);
  });

  // 2. For each street group, calculate a centroid or use the first stop as representative
  const streetCentroids = Object.entries(streetGroups).map(([street, items]) => {
    const avgLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
    const avgLng = items.reduce((sum, item) => sum + item.lng, 0) / items.length;
    return { street, lat: avgLat, lng: avgLng };
  });

  // 3. Order streets using Nearest Neighbor
  const orderedStreetNames: string[] = [];
  const remainingStreets = [...streetCentroids];
  let currentPos: { lat: number; lng: number } = start && start.lat != null && start.lng != null 
    ? { lat: start.lat, lng: start.lng } 
    : { lat: remainingStreets[0].lat, lng: remainingStreets[0].lng };

  while (remainingStreets.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remainingStreets.length; i++) {
      const d = haversineKm(currentPos, remainingStreets[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const bestStreet = remainingStreets.splice(bestIdx, 1)[0];
    orderedStreetNames.push(bestStreet.street);
    currentPos = { lat: bestStreet.lat, lng: bestStreet.lng };
  }

  // 4. Within each street, order by house number (best for delivery sequence)
  const result: string[] = [];
  orderedStreetNames.forEach(streetName => {
    const group = streetGroups[streetName];
    // Sort by house number
    group.sort((a, b) => {
      const numA = extractHouseNumber(a.destination_address) || 0;
      const numB = extractHouseNumber(b.destination_address) || 0;
      return numA - numB;
    });
    group.forEach(s => result.push(s.id));
  });

  // Append any invalid stops
  for (const s of stops) {
    if (!result.includes(s.id)) result.push(s.id);
  }

  return result;
}
