import React, { createContext, useContext, useState, useEffect } from "react";
import { addDays, startOfMonth, endOfMonth, format } from "date-fns";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface DateFilterContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  formattedRange: { from: string; to: string } | null;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  // Aumentamos o período padrão para os últimos 30 dias para garantir que rotas recentes apareçam
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    // Initialize on client to avoid hydration mismatch
    setDateRange({
      from: addDays(new Date(), -30),
      to: addDays(new Date(), 1),
    });
  }, []);

  const value = React.useMemo(() => ({
    dateRange,
    setDateRange,
    formattedRange: dateRange.from && dateRange.to ? {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    } : null
  }), [dateRange]);

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateFilterProvider");
  }
  return context;
}
