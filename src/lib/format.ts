import i18n from "./i18n";

export const formatBRL = (n: number | null | undefined) => {
  const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR';
  const currency = i18n.language === 'en' ? 'USD' : i18n.language === 'es' ? 'EUR' : 'BRL';
  return (n ?? 0).toLocaleString(locale, { style: "currency", currency });
};


export const formatDateBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR';
  return date.toLocaleDateString(locale, { timeZone: "America/Sao_Paulo" });

};

export const formatDateTimeBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR';
  return date.toLocaleString(locale, { timeZone: "America/Sao_Paulo" });

};

export const todayBR = () => {
  const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR';
  return new Date().toLocaleDateString(locale, { timeZone: "America/Sao_Paulo" });
};


export const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_route: "In Route",
  delivered: "Completed",
  problem: "Failed",
  rescheduled: "Rescheduled",
  returned: "Returned",
  cancelled: "Cancelled",
  draft: "Draft",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  active: "Active",
  overdue: "Overdue",
};

export const getStatusLabel = (key: string, t: any) => {
  return t(statusLabel[key] || key, statusLabel[key] || key);
};





































export const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_route: "bg-info/20 text-info border border-info/40",
  delivered: "bg-success/20 text-success border border-success/40",
  problem: "bg-destructive/20 text-destructive border border-destructive/40",
  rescheduled: "bg-warning/20 text-warning border border-warning/40",
  returned: "bg-warning/20 text-warning border border-warning/40",
  cancelled: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  planned: "bg-info/20 text-info",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  active: "bg-success/20 text-success",
  overdue: "bg-destructive/20 text-destructive",
};
