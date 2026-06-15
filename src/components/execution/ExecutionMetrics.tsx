import React from 'react';
import { useTranslation } from "react-i18next";
import { Target, MapPin } from 'lucide-react';


interface ExecutionMetricsProps {
  totalDistance?: string;
  nextDistance?: string;
}

export function ExecutionMetrics({ totalDistance, nextDistance }: ExecutionMetricsProps) {
  const { t } = useTranslation();
  return (

    <div className="grid grid-cols-2 gap-3 mb-3">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Target className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{t("Próxima Parada", "Próxima Parada")}</p>
          <p className="text-lg font-black leading-none">{nextDistance ?? '—'} <span className="text-[10px] font-normal">km</span></p>
        </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div className="bg-slate-700 p-2 rounded-lg">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("Restante Total", "Restante Total")}</p>
          <p className="text-lg font-black leading-none">{totalDistance ?? '—'} <span className="text-[10px] font-normal">km</span></p>
        </div>
      </div>
    </div>
  );
}
