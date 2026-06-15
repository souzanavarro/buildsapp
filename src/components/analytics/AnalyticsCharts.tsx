import { useMemo, memo } from 'react';
import { useTranslation } from "react-i18next";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { PremiumCard } from "@/components/ui/premium-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon as TrendingUp, PackageIcon as Package, PieChartIcon, DollarIcon as DollarSign } from '@/components/ui/icons';

interface AnalyticsChartsProps {
  data: {
    routes: any[];
    total: number;
    byStatus: Record<string, number>;
    totalFreight: number;
  } | null;
}

export const AnalyticsCharts = memo(({ data }: AnalyticsChartsProps) => {
  const { t } = useTranslation();
  const statusData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byStatus).map(([name, value]) => ({
      name: name === 'delivered' ? t('Entregue', 'Entregue') : name === 'pending' ? t('Pendente', 'Pendente') : name === 'problem' ? t('Problema', 'Problema') : name,
      value
    }));
  }, [data, t]);


  const routePerformanceData = useMemo(() => {
    if (!data?.routes) return [];
    return data.routes.map(r => ({
      name: r.name.split('-')[0].trim().substring(0, 10), // Simplifica o nome
      entregas: r.total_deliveries,
      faturamento: Number(r.freight_value || 0)
    })).reverse(); // Mostrar do mais antigo para o mais novo
  }, [data]);

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'];

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8">
      {/* Gráfico de Desempenho por Rota */}
      <PremiumCard className="overflow-hidden">
        <CardHeader className="border-b border-border/10 bg-muted/20 px-6 py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("Entregas por Rota", "Entregas por Rota")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 xs:p-6 h-[250px] xs:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: 'currentColor', opacity: 0.5}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: 'currentColor', opacity: 0.5}} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px'
                }} 
              />
              <Bar dataKey="entregas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </PremiumCard>

      {/* Gráfico de Distribuição de Status */}
      <PremiumCard className="overflow-hidden">
        <CardHeader className="border-b border-border/10 bg-muted/20 px-6 py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
            <PieChartIcon className="h-4 w-4 text-emerald-500" />
            {t("Status das Entregas", "Status das Entregas")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 xs:p-6 h-[250px] xs:h-[300px] flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px'
                }} 
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </PremiumCard>

      {/* Gráfico de Faturamento por Rota */}
      <PremiumCard className="overflow-hidden lg:col-span-2">
        <CardHeader className="border-b border-border/10 bg-muted/20 px-6 py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
            <DollarSign className="h-4 w-4 text-amber-500" />
            {t("Faturamento por Rota (R$)", "Faturamento por Rota (R$)")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 xs:p-6 h-[250px] xs:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={routePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: 'currentColor', opacity: 0.5}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fill: 'currentColor', opacity: 0.5}} 
              />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="faturamento" 
                stroke="#f59e0b" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </PremiumCard>
    </div>
  );
});

AnalyticsCharts.displayName = "AnalyticsCharts";
