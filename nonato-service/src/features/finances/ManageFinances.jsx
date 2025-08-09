// src/features/finances/ManageFinances.jsx
import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  BarChart3,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Package,
  Users,
  Loader2,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Hooks and utils
import {
  useFinancialSummary,
  useMonthlyFinancialData,
  useTopClients,
} from "../../hooks/useFinancialData";
import { formatPrice, formatPercentage } from "../../utils/financialUtils";
import {
  FinancialMetricCard,
  VATBreakdown,
  CollectionProgress,
  FinancialAlert,
} from "../../components/financial/FinancialComponents";

const ManageFinances = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Hooks para dados financeiros
  const { summary: annualSummary, isLoading: isLoadingAnnual } =
    useFinancialSummary(selectedYear);
  const { summary: monthlySummary, isLoading: isLoadingMonthly } =
    useFinancialSummary(selectedYear, selectedMonth);
  const { monthlyData, isLoading: isLoadingMonthlyData } =
    useMonthlyFinancialData(selectedYear);
  const { topClients, isLoading: isLoadingTopClients } = useTopClients(
    selectedYear,
    10
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleDateString("pt-PT", { month: "long" }),
  }));

  if (isLoadingAnnual || isLoadingMonthly) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finanças</h1>
          <p className="text-zinc-400">
            Dashboard financeiro e controle de pagamentos
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas Financeiros */}
      {annualSummary && annualSummary.overdue > 0 && (
        <FinancialAlert
          alert={{
            type: "overdue",
            severity: "high",
            title: "Atenção: Valores em atraso",
            description: "Existem serviços não pagos há mais de 1 mês",
            totalAmount: annualSummary.overdue,
          }}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full lg:w-[400px] bg-zinc-800">
          <TabsTrigger className="flex-1" value="overview">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="monthly">
            Mensal
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="clients">
            Clientes
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="tax">
            Fiscalidade
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cards de Resumo Anual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FinancialMetricCard
              title={`Faturação ${selectedYear}`}
              value={annualSummary?.total || 0}
              subtitle={`${annualSummary?.servicesCount || 0} serviços`}
              icon={Euro}
              color="blue"
            />

            <FinancialMetricCard
              title="Pagos"
              value={annualSummary?.paid || 0}
              subtitle={
                formatPercentage(
                  annualSummary?.paid || 0,
                  annualSummary?.total || 0
                ) + " do total"
              }
              icon={CheckCircle}
              color="green"
            />

            <FinancialMetricCard
              title="Pendentes"
              value={annualSummary?.pending || 0}
              subtitle={
                formatPercentage(
                  annualSummary?.pending || 0,
                  annualSummary?.total || 0
                ) + " do total"
              }
              icon={Clock}
              color="yellow"
            />

            <FinancialMetricCard
              title="Devedores"
              value={annualSummary?.overdue || 0}
              subtitle={
                formatPercentage(
                  annualSummary?.overdue || 0,
                  annualSummary?.total || 0
                ) + " do total"
              }
              icon={AlertTriangle}
              color="red"
            />
          </div>

          {/* Separação Fiscal e Evolução Mensal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Composição Fiscal */}
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Composição Fiscal {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VATBreakdown
                  totalWithVat={annualSummary?.total || 0}
                  vatAmount={annualSummary?.vatTotal || 0}
                  salesAmount={annualSummary?.salesTotal || 0}
                  vatRate={23}
                  showDetails={true}
                />
              </CardContent>
            </Card>

            {/* Evolução Mensal */}
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolução Mensal {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {!isLoadingMonthlyData &&
                    monthlyData?.map((month) => {
                      const maxTotal = Math.max(
                        ...monthlyData.map((m) => m.total)
                      );
                      const widthPercentage =
                        maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;

                      return (
                        <div
                          key={month.month}
                          className="flex items-center justify-between p-2 rounded border border-zinc-700"
                        >
                          <span className="text-sm text-zinc-300 w-12">
                            {month.name}
                          </span>
                          <div className="flex-1 mx-3">
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${widthPercentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-white font-medium w-20 text-right">
                            {formatPrice(month.total)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progresso de Cobrança */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">
                Progresso de Cobrança {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CollectionProgress
                paid={annualSummary?.paid || 0}
                pending={annualSummary?.pending || 0}
                overdue={annualSummary?.overdue || 0}
                total={annualSummary?.total || 0}
                showLabels={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FinancialMetricCard
              title={`${
                months.find((m) => m.value === selectedMonth)?.label
              } ${selectedYear}`}
              value={monthlySummary?.total || 0}
              subtitle={`${monthlySummary?.servicesCount || 0} serviços`}
              icon={Calendar}
              color="blue"
            />

            <FinancialMetricCard
              title="IVA Mensal"
              value={monthlySummary?.vatTotal || 0}
              subtitle="A entregar ao Estado"
              icon={FileText}
              color="blue"
            />

            <FinancialMetricCard
              title="Vendas Mensais"
              value={monthlySummary?.salesTotal || 0}
              subtitle="Valor sem IVA"
              icon={TrendingUp}
              color="purple"
            />

            <FinancialMetricCard
              title="Taxa Cobrança"
              value={formatPercentage(
                monthlySummary?.paid || 0,
                monthlySummary?.total || 0
              )}
              subtitle="Pagos vs Total"
              icon={CreditCard}
              color="green"
            />
          </div>

          {/* Comparação Mensal */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">
                Comparação com Mês Anterior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {monthlyData && selectedMonth > 1 && (
                  <>
                    {/* Faturação */}
                    <div className="text-center p-4 bg-zinc-700/50 rounded-lg">
                      <p className="text-sm text-zinc-400">Faturação</p>
                      <p className="text-2xl font-bold text-white">
                        {formatPrice(
                          monthlyData[selectedMonth - 1]?.total || 0
                        )}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-green-400">
                          vs{" "}
                          {formatPrice(
                            monthlyData[selectedMonth - 2]?.total || 0
                          )}
                        </span>
                      </div>
                    </div>

                    {/* IVA */}
                    <div className="text-center p-4 bg-zinc-700/50 rounded-lg">
                      <p className="text-sm text-zinc-400">IVA</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {formatPrice(monthlyData[selectedMonth - 1]?.vat || 0)}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-blue-400">
                          vs{" "}
                          {formatPrice(
                            monthlyData[selectedMonth - 2]?.vat || 0
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Vendas */}
                    <div className="text-center p-4 bg-zinc-700/50 rounded-lg">
                      <p className="text-sm text-zinc-400">Vendas</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {formatPrice(
                          monthlyData[selectedMonth - 1]?.sales || 0
                        )}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-purple-400">
                          vs{" "}
                          {formatPrice(
                            monthlyData[selectedMonth - 2]?.sales || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Clientes {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!isLoadingTopClients &&
                  topClients?.map((client, index) => (
                    <div
                      key={client.clientId}
                      className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full p-0 flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-white">
                            {client.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {client.servicesCount} serviços
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="font-bold text-white">
                          {formatPrice(client.total)}
                        </p>
                        <div className="flex gap-1 text-xs">
                          {client.paid > 0 && (
                            <span className="text-green-400">
                              P: {formatPrice(client.paid)}
                            </span>
                          )}
                          {client.pending > 0 && (
                            <span className="text-yellow-400">
                              Pe: {formatPrice(client.pending)}
                            </span>
                          )}
                          {client.overdue > 0 && (
                            <span className="text-red-400">
                              D: {formatPrice(client.overdue)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {isLoadingTopClients && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax */}
        <TabsContent value="tax" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Declaração de IVA - {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-zinc-700/30 rounded">
                    <span className="text-zinc-300">Vendas sujeitas a IVA</span>
                    <span className="text-white font-medium">
                      {formatPrice(annualSummary?.salesTotal || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 bg-blue-500/10 rounded">
                    <span className="text-zinc-300">IVA liquidado (23%)</span>
                    <span className="text-blue-400 font-medium">
                      {formatPrice(annualSummary?.vatTotal || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 bg-green-500/10 rounded border-t border-zinc-600 pt-3">
                    <span className="text-zinc-300 font-medium">
                      Total faturado
                    </span>
                    <span className="text-green-400 font-bold">
                      {formatPrice(annualSummary?.total || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white">Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-green-500/10 rounded">
                    <span className="text-zinc-300">Valores recebidos</span>
                    <span className="text-green-400 font-medium">
                      {formatPrice(annualSummary?.paid || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 bg-yellow-500/10 rounded">
                    <span className="text-zinc-300">A receber (pendente)</span>
                    <span className="text-yellow-400 font-medium">
                      {formatPrice(annualSummary?.pending || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 bg-red-500/10 rounded">
                    <span className="text-zinc-300">Em incumprimento</span>
                    <span className="text-red-400 font-medium">
                      {formatPrice(annualSummary?.overdue || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between p-3 bg-zinc-700/50 rounded border-t border-zinc-600 pt-3">
                    <span className="text-zinc-300 font-medium">
                      Taxa de cobrança
                    </span>
                    <span className="text-white font-bold">
                      {formatPercentage(
                        annualSummary?.paid || 0,
                        annualSummary?.total || 0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageFinances;
