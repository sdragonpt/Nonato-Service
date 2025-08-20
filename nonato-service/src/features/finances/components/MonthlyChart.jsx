// src/features/finances/components/MonthlyChart.jsx
import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Info,
  Calendar,
  Euro,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatPercentage } from "../../../utils/financialUtils";

const MonthlyChart = ({ monthlyData, selectedYear, isLoading }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("total");

  if (isLoading || !monthlyData) {
    return (
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução Mensal {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400">Carregando dados...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Métricas disponíveis para visualização
  const metrics = {
    total: {
      label: "Faturação Total",
      color: "bg-blue-500",
      lightColor: "bg-blue-500/20",
      textColor: "text-blue-400",
    },
    paid: {
      label: "Valores Pagos",
      color: "bg-green-500",
      lightColor: "bg-green-500/20",
      textColor: "text-green-400",
    },
    pending: {
      label: "Valores Pendentes",
      color: "bg-yellow-500",
      lightColor: "bg-yellow-500/20",
      textColor: "text-yellow-400",
    },
    overdue: {
      label: "Valores em Atraso",
      color: "bg-red-500",
      lightColor: "bg-red-500/20",
      textColor: "text-red-400",
    },
    vat: {
      label: "IVA Liquidado",
      color: "bg-purple-500",
      lightColor: "bg-purple-500/20",
      textColor: "text-purple-400",
    },
    sales: {
      label: "Vendas (s/ IVA)",
      color: "bg-indigo-500",
      lightColor: "bg-indigo-500/20",
      textColor: "text-indigo-400",
    },
  };

  // Calcular valores máximos para normalização
  const getMaxValue = (metric) => {
    return Math.max(...monthlyData.map((month) => month[metric] || 0));
  };

  // Calcular crescimento mensal
  const calculateGrowth = (currentMonth, previousMonth, metric) => {
    const current = currentMonth[metric] || 0;
    const previous = previousMonth[metric] || 0;

    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calcular estatísticas do ano
  const calculateYearStats = () => {
    const totalRevenue = monthlyData.reduce(
      (sum, month) => sum + (month.total || 0),
      0
    );
    const totalVAT = monthlyData.reduce(
      (sum, month) => sum + (month.vat || 0),
      0
    );
    const totalSales = monthlyData.reduce(
      (sum, month) => sum + (month.sales || 0),
      0
    );
    const totalPaid = monthlyData.reduce(
      (sum, month) => sum + (month.paid || 0),
      0
    );

    const averageMonthly = totalRevenue / 12;
    const monthsWithRevenue = monthlyData.filter(
      (month) => month.total > 0
    ).length;
    const bestMonth = monthlyData.reduce(
      (best, month) => ((month.total || 0) > (best.total || 0) ? month : best),
      monthlyData[0]
    );

    return {
      totalRevenue,
      totalVAT,
      totalSales,
      totalPaid,
      averageMonthly,
      monthsWithRevenue,
      bestMonth,
      collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
    };
  };

  const yearStats = calculateYearStats();
  const maxValue = getMaxValue(selectedMetric);
  const selectedMetricData = metrics[selectedMetric];

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução Mensal {selectedYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                {showDetails ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showDetails ? "Ocultar" : "Detalhes"}
              </Button>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.entries(metrics).map(([key, metric]) => (
              <Badge
                key={key}
                variant={selectedMetric === key ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedMetric === key
                    ? `${metric.color} text-white`
                    : "border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                }`}
                onClick={() => setSelectedMetric(key)}
              >
                {metric.label}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Chart Visualization */}
          <div className="space-y-4">
            {/* Current Metric Info */}
            <div
              className={`p-3 rounded-lg ${selectedMetricData.lightColor} border border-zinc-600`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${selectedMetricData.textColor}`}>
                  {selectedMetricData.label}
                </span>
                <span className="text-white font-bold">
                  {formatPrice(
                    monthlyData.reduce(
                      (sum, month) => sum + (month[selectedMetric] || 0),
                      0
                    )
                  )}
                </span>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="space-y-2">
              {monthlyData.map((month, index) => {
                const value = month[selectedMetric] || 0;
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const previousMonth = index > 0 ? monthlyData[index - 1] : null;
                const growth = previousMonth
                  ? calculateGrowth(month, previousMonth, selectedMetric)
                  : 0;

                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 w-16">
                        <span className="text-zinc-300 font-medium">
                          {month.name}
                        </span>
                        {showDetails && growth !== 0 && (
                          <div
                            className={`flex items-center gap-1 ${
                              growth > 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {growth > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="text-xs">
                              {Math.abs(growth).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {showDetails && (
                          <div className="text-xs text-zinc-400">
                            {month.servicesCount || 0} serviços
                          </div>
                        )}
                        <span className="text-white font-medium w-20 text-right">
                          {formatPrice(value)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full ${selectedMetricData.color} transition-all duration-500 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Euro className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Média Mensal</p>
                <p className="text-lg font-bold text-white">
                  {formatPrice(yearStats.averageMonthly)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Melhor Mês</p>
                <p className="text-lg font-bold text-white">
                  {yearStats.bestMonth.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatPrice(yearStats.bestMonth.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Meses Ativos</p>
                <p className="text-lg font-bold text-white">
                  {yearStats.monthsWithRevenue}/12
                </p>
                <p className="text-xs text-zinc-500">
                  {formatPercentage(yearStats.monthsWithRevenue, 12)} do ano
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Taxa Cobrança</p>
                <p className="text-lg font-bold text-white">
                  {yearStats.collectionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500">
                  {formatPrice(yearStats.totalPaid)} recebidos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      {showDetails && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5" />
              Análise Detalhada {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quarterly Breakdown */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Resumo Trimestral
                </h4>
                <div className="space-y-3">
                  {[
                    { name: "Q1", months: [0, 1, 2], label: "Jan-Mar" },
                    { name: "Q2", months: [3, 4, 5], label: "Abr-Jun" },
                    { name: "Q3", months: [6, 7, 8], label: "Jul-Set" },
                    { name: "Q4", months: [9, 10, 11], label: "Out-Dez" },
                  ].map((quarter) => {
                    const quarterTotal = quarter.months.reduce(
                      (total, monthIndex) => {
                        return total + (monthlyData[monthIndex]?.total || 0);
                      },
                      0
                    );

                    const quarterVAT = quarter.months.reduce(
                      (total, monthIndex) => {
                        return total + (monthlyData[monthIndex]?.vat || 0);
                      },
                      0
                    );

                    return (
                      <div
                        key={quarter.name}
                        className="p-3 bg-zinc-700/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-white">
                              {quarter.name}
                            </span>
                            <span className="text-sm text-zinc-400 ml-2">
                              {quarter.label}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">
                            {formatPrice(quarterTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span>IVA: {formatPrice(quarterVAT)}</span>
                          <span>
                            {formatPercentage(
                              quarterTotal,
                              yearStats.totalRevenue
                            )}{" "}
                            do ano
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Growth Analysis */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  Análise de Crescimento
                </h4>
                <div className="space-y-3">
                  {monthlyData
                    .map((month, index) => {
                      const previousMonth =
                        index > 0 ? monthlyData[index - 1] : null;
                      const growth = previousMonth
                        ? calculateGrowth(month, previousMonth, "total")
                        : 0;
                      return { ...month, growth, index };
                    })
                    .filter(
                      (month) => month.index > 0 && Math.abs(month.growth) > 5
                    ) // Apenas mudanças significativas
                    .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
                    .slice(0, 6)
                    .map((month) => (
                      <div
                        key={month.month}
                        className="p-3 bg-zinc-700/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {month.name}
                          </span>
                          <div
                            className={`flex items-center gap-2 ${
                              month.growth > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {month.growth > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {month.growth > 0 ? "+" : ""}
                              {month.growth.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">
                          {formatPrice(month.total)} vs{" "}
                          {formatPrice(
                            monthlyData[month.index - 1]?.total || 0
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonthlyChart;
