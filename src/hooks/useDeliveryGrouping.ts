import { useMemo } from "react";
import { canonicalizeAddress, canonicalizeStreet } from "@/lib/address-utils";

export interface GroupedDelivery {
  id: string;
  destination_address: string;
  neighborhood?: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  sequence: number;
  original_sequence?: number;
  stop?: number;
  isGroup: boolean;
  groupedItems: any[];
  totalItems: number;
  itemsDelivered: number;
}

export function useDeliveryGrouping(
  deliveries: any[] | null | undefined, 
  viewMode: 'original' | 'optimized' = 'original',
  groupMode: 'canonical' | 'street' = 'canonical'
) {
  return useMemo(() => {
    if (!deliveries) return [];
    
    const groups: Record<string, any[]> = {};
    
    deliveries.forEach((d) => {
      // Group by stop if available, otherwise by chosen grouping method
      let groupKey;
      if (d.stop != null) {
        groupKey = `stop-${d.stop}`;
      } else if (groupMode === 'street') {
        groupKey = canonicalizeStreet(d.destination_address);
      } else {
        groupKey = canonicalizeAddress(d.destination_address);
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(d);
    });

    return Object.entries(groups).map(([_, items]) => {
      const lowestSequenceItem = items.reduce((min, curr) => {
        const seqA = viewMode === 'original' ? (min.original_sequence || min.sequence || 999) : (min.sequence || 999);
        const seqB = viewMode === 'original' ? (curr.original_sequence || curr.sequence || 999) : (curr.sequence || 999);
        return seqA < seqB ? min : curr;
      });

      return {
        ...lowestSequenceItem,
        isGroup: items.length > 1,
        groupedItems: items,
        totalItems: items.length,
        itemsDelivered: items.filter((i) => i.status === 'delivered').length,
      };
    }).sort((a, b) => {
      const seqA = viewMode === 'original' ? (a.original_sequence || a.sequence || 999) : (a.sequence || 999);
      const seqB = viewMode === 'original' ? (b.original_sequence || b.sequence || 999) : (b.sequence || 999);
      return seqA - seqB;
    }) as GroupedDelivery[];
  }, [deliveries, viewMode, groupMode]);
}
