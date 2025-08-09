// src/features/finances/components/FinancialSummaryCards.jsx
import React from "react";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  CreditCard,
  FileText,
  Calendar,
  Users,
  Package,
  BarChart3,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatPercentage } from "../../../utils/financialUtils";

const FinancialSummaryCards = ({
  summary,
  previousPeriodSummary = null,
  period = "annual",
  showComparison = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card
            key={index}
            className="bg-zinc-800 border-zinc-700 animate-pulse"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-zinc-700 rounded w-20"></div>
                  <div className="h-8 bg-zinc-700 rounded w-24"></div>
                  <div className="h-3 bg-zinc-700 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 bg-zinc-700 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="text-center text-zinc-400">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Dados não disponíveis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular comparações com período anterior
  const calculateComparison = (current, previous) => {
    if (!previous || previous === 0) {
      return { percentage: 0, trend: "neutral", isPositive: false };
    }

    const percentage = ((current - previous) / previous) * 100;
    const isPositive = percentage > 0;
    const trend = isPositive ? "up" : percentage < 0 ? "down" : "neutral";

    return { percentage: Math.abs(percentage), trend, isPositive };
  };

  // Obter label do período
  const getPeriodLabel = () => {
    switch (period) {
      case "monthly":
        return "Mensal";
      case "quarterly":
        return "Trimestral";
      case "annual":
        return "Anual";
      default:
        return "Período";
    }
  };

  // Componente para indicador de tendência
  const TrendIndicator = ({ comparison, value }) => {
    if (
      !showComparison ||
      !previousPeriodSummary ||
      comparison.percentage === 0
    ) {
      return null;
    }

    const TrendIcon = comparison.trend === "up" ? ArrowUpRight : ArrowDownRight;
    const colorClass = comparison.isPositive
      ? "text-green-400"
      : "text-red-400";

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <TrendIcon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {comparison.percentage.toFixed(1)}%
        </span>
      </div>
    );
  };

  // Configuração dos cards
  const cardConfigs = [
    {
      id: "total",
      title: `Faturação ${getPeriodLabel()}`,
      value: summary.total,
      subtitle: `${summary.servicesCount || 0} serviços`,
      icon: Euro,
      color: "blue",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      comparison: showComparison
        ? calculateComparison(summary.total, previousPeriodSummary?.total)
        : null,
    },
    {
      id: "paid",
      title: "Valores Pagos",
      value: summary.paid,
      subtitle: formatPercentage(summary.paid, summary.total) + " do total",
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      comparison: showComparison
        ? calculateComparison(summary.paid, previousPeriodSummary?.paid)
        : null,
    },
    {
      id: "pending",
      title: "Valores Pendentes",
      value: summary.pending,
      subtitle: formatPercentage(summary.pending, summary.total) + " do total",
      icon: Clock,
      color: "yellow",
      bgColor: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
      comparison: showComparison
        ? calculateComparison(summary.pending, previousPeriodSummary?.pending)
        : null,
    },
    {
      id: "overdue",
      title: "Valores em Atraso",
      value: summary.overdue,
      subtitle: formatPercentage(summary.overdue, summary.total) + " do total",
      icon: AlertTriangle,
      color: "red",
      bgColor: "bg-red-500/10",
      iconColor: "text-red-500",
      comparison: showComparison
        ? calculateComparison(summary.overdue, previousPeriodSummary?.overdue)
        : null,
    },
  ];

  // Cards secundários (IVA e Vendas)
  const secondaryCards = [
    {
      id: "vat",
      title: "IVA Total",
      value: summary.vatTotal,
      subtitle: "A entregar ao Estado",
      icon: DollarSign,
      color: "purple",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
      comparison: showComparison
        ? calculateComparison(summary.vatTotal, previousPeriodSummary?.vatTotal)
        : null,
    },
    {
      id: "sales",
      title: "Vendas (s/ IVA)",
      value: summary.salesTotal,
      subtitle: "Receita líquida",
      icon: BarChart3,
      color: "indigo",
      bgColor: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
      comparison: showComparison
        ? calculateComparison(
            summary.salesTotal,
            previousPeriodSummary?.salesTotal
          )
        : null,
    },
  ];

  // Calcular taxa de cobrança
  const collectionRate =
    summary.total > 0 ? (summary.paid / summary.total) * 100 : 0;
  const collectionComparison =
    showComparison && previousPeriodSummary
      ? calculateComparison(
          collectionRate,
          previousPeriodSummary.total > 0
            ? (previousPeriodSummary.paid / previousPeriodSummary.total) * 100
            : 0
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardConfigs.map((config) => (
          <Card
            key={config.id}
            className={`bg-zinc-800 border-zinc-700 ${config.bgColor}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-400 mb-1">
                    {config.title}
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {formatPrice(config.value)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500">{config.subtitle}</p>
                    <TrendIndicator
                      comparison={config.comparison}
                      value={config.value}
                    />
                  </div>
                </div>
                <div
                  className={`h-12 w-12 rounded-full ${config.bgColor} flex items-center justify-center ml-4`}
                >
                  <config.icon className={`h-6 w-6 ${config.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards Secundários e Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IVA e Vendas */}
        {secondaryCards.map((config) => (
          <Card
            key={config.id}
            className={`bg-zinc-800 border-zinc-700 ${config.bgColor}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-400 mb-1">
                    {config.title}
                  </p>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {formatPrice(config.value)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500">{config.subtitle}</p>
                    <TrendIndicator
                      comparison={config.comparison}
                      value={config.value}
                    />
                  </div>
                </div>
                <div
                  className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center ml-4`}
                >
                  <config.icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Taxa de Cobrança */}
        <Card className="bg-zinc-800 border-zinc-700 bg-teal-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-400 mb-1">
                  Taxa de Cobrança
                </p>
                <h3 className="text-xl font-bold text-white mb-1">
                  {collectionRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-500">Valores recebidos</p>
                  <TrendIndicator
                    comparison={collectionComparison}
                    value={collectionRate}
                  />
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-teal-500/10 flex items-center justify-center ml-4">
                <Percent className="h-5 w-5 text-teal-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de IVA Efetiva */}
        <Card className="bg-zinc-800 border-zinc-700 bg-orange-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-400 mb-1">
                  Taxa IVA Efetiva
                </p>
                <h3 className="text-xl font-bold text-white mb-1">
                  {summary.salesTotal > 0
                    ? ((summary.vatTotal / summary.salesTotal) * 100).toFixed(1)
                    : "0.0"}
                  %
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-500">
                    {Math.abs(
                      (summary.vatTotal / summary.salesTotal) * 100 - 23
                    ).toFixed(1)}
                    % vs 23%
                  </p>
                  {Math.abs(
                    (summary.vatTotal / summary.salesTotal) * 100 - 23
                  ) < 0.5 ? (
                    <Badge className="text-xs bg-green-500/20 text-green-400">
                      Conforme
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-yellow-500/20 text-yellow-400">
                      Verificar
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center ml-4">
                <Calculator className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Comparativo (se disponível) */}
      {showComparison && previousPeriodSummary && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-zinc-400" />
              <h4 className="font-medium text-white">
                Comparação com Período Anterior
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-zinc-700/30 rounded-lg">
                <p className="text-sm text-zinc-400">Crescimento Faturação</p>
                <div
                  className={`text-lg font-bold ${
                    summary.total >= previousPeriodSummary.total
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {summary.total >= previousPeriodSummary.total ? "+" : ""}
                  {formatPercentage(
                    summary.total - previousPeriodSummary.total,
                    previousPeriodSummary.total
                  )}
                </div>
              </div>

              <div className="text-center p-3 bg-zinc-700/30 rounded-lg">
                <p className="text-sm text-zinc-400">Melhoria Cobrança</p>
                <div
                  className={`text-lg font-bold ${
                    collectionRate >=
                    (previousPeriodSummary.paid / previousPeriodSummary.total) *
                      100
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {collectionRate >=
                  (previousPeriodSummary.paid / previousPeriodSummary.total) *
                    100
                    ? "+"
                    : ""}
                  {(
                    collectionRate -
                    (previousPeriodSummary.paid / previousPeriodSummary.total) *
                      100
                  ).toFixed(1)}
                  %
                </div>
              </div>

              <div className="text-center p-3 bg-zinc-700/30 rounded-lg">
                <p className="text-sm text-zinc-400">Diferença IVA</p>
                <div className="text-lg font-bold text-blue-400">
                  {formatPrice(
                    summary.vatTotal - previousPeriodSummary.vatTotal
                  )}
                </div>
              </div>

              <div className="text-center p-3 bg-zinc-700/30 rounded-lg">
                <p className="text-sm text-zinc-400">Serviços</p>
                <div className="text-lg font-bold text-white">
                  {(summary.servicesCount || 0) -
                    (previousPeriodSummary.servicesCount || 0) >=
                  0
                    ? "+"
                    : ""}
                  {(summary.servicesCount || 0) -
                    (previousPeriodSummary.servicesCount || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas e Recomendações */}
      {(summary.overdue > 0 || collectionRate < 70) && (
        <Card className="bg-zinc-800 border-zinc-700 border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-400 mb-2">
                  Atenção Requerida
                </h4>
                <div className="space-y-2 text-sm text-zinc-300">
                  {summary.overdue > 0 && (
                    <p>
                      • Existem {formatPrice(summary.overdue)} em valores em
                      atraso que precisam de acompanhamento.
                    </p>
                  )}
                  {collectionRate < 70 && (
                    <p>
                      • Taxa de cobrança de {collectionRate.toFixed(1)}% está
                      abaixo do recomendado (70%+).
                    </p>
                  )}
                  {summary.pending > summary.paid && (
                    <p>
                      • Valores pendentes ({formatPrice(summary.pending)})
                      superam os pagos - considere ações de cobrança.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialSummaryCards;
