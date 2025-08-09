// src/features/finances/components/TaxReport.jsx
import React from "react";
import {
  FileText,
  Download,
  Calculator,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatPercentage } from "../../../utils/financialUtils";

const TaxReport = ({
  annualSummary,
  monthlySummary,
  selectedYear,
  selectedMonth,
  monthlyData,
}) => {
  // Calcular dados para declaração de IVA
  const calculateVATDeclaration = () => {
    if (!annualSummary) return null;

    const quarterlyVAT = calculateQuarterlyVAT();
    const monthlyAverage = annualSummary.vatTotal / 12;
    const complianceStatus = getComplianceStatus();

    return {
      quarterlyVAT,
      monthlyAverage,
      complianceStatus,
      totalSales: annualSummary.salesTotal,
      totalVAT: annualSummary.vatTotal,
      totalWithVAT: annualSummary.total,
      vatRate: 23,
    };
  };

  // Calcular IVA trimestral
  const calculateQuarterlyVAT = () => {
    if (!monthlyData) return [];

    const quarters = [
      { name: "Q1", months: [0, 1, 2], label: "Jan-Mar" },
      { name: "Q2", months: [3, 4, 5], label: "Abr-Jun" },
      { name: "Q3", months: [6, 7, 8], label: "Jul-Set" },
      { name: "Q4", months: [9, 10, 11], label: "Out-Dez" },
    ];

    return quarters.map((quarter) => {
      const quarterVAT = quarter.months.reduce((total, monthIndex) => {
        return total + (monthlyData[monthIndex]?.vat || 0);
      }, 0);

      const quarterSales = quarter.months.reduce((total, monthIndex) => {
        return total + (monthlyData[monthIndex]?.sales || 0);
      }, 0);

      const quarterTotal = quarter.months.reduce((total, monthIndex) => {
        return total + (monthlyData[monthIndex]?.total || 0);
      }, 0);

      return {
        ...quarter,
        vat: quarterVAT,
        sales: quarterSales,
        total: quarterTotal,
      };
    });
  };

  // Verificar status de conformidade fiscal
  const getComplianceStatus = () => {
    if (!annualSummary)
      return { status: "unknown", message: "Dados insuficientes" };

    const vatRate =
      annualSummary.salesTotal > 0
        ? (annualSummary.vatTotal / annualSummary.salesTotal) * 100
        : 0;

    if (Math.abs(vatRate - 23) < 0.5) {
      return {
        status: "compliant",
        message: "Taxa de IVA conforme (23%)",
        color: "text-green-400",
        bgColor: "bg-green-500/10",
      };
    } else if (vatRate < 20) {
      return {
        status: "warning",
        message: "Taxa de IVA abaixo do esperado",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
      };
    } else {
      return {
        status: "error",
        message: "Taxa de IVA inconsistente",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
      };
    }
  };

  // Gerar relatório em PDF (função placeholder)
  const generateTaxReport = () => {
    // Aqui seria implementada a geração do PDF do relatório fiscal
    console.log("Generating tax report PDF...");
    alert("Funcionalidade de geração de relatório será implementada em breve!");
  };

  // Exportar dados para contabilista
  const exportForAccountant = () => {
    if (!annualSummary) return;

    const data = {
      year: selectedYear,
      summary: {
        totalSales: annualSummary.salesTotal,
        totalVAT: annualSummary.vatTotal,
        totalRevenue: annualSummary.total,
        paidAmount: annualSummary.paid,
        pendingAmount: annualSummary.pending,
        overdueAmount: annualSummary.overdue,
      },
      quarterly: calculateQuarterlyVAT(),
      monthly: monthlyData?.map((month, index) => ({
        month: index + 1,
        name: month.name,
        sales: month.sales,
        vat: month.vat,
        total: month.total,
      })),
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-fiscal-${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const taxData = calculateVATDeclaration();
  if (!taxData) return null;

  return (
    <div className="space-y-6">
      {/* Status de Conformidade */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Status Fiscal {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`p-4 rounded-lg border ${taxData.complianceStatus.bgColor}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  taxData.complianceStatus.status === "compliant"
                    ? "bg-green-500"
                    : taxData.complianceStatus.status === "warning"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className={`font-medium ${taxData.complianceStatus.color}`}>
                {taxData.complianceStatus.message}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">Taxa Efetiva</p>
                <p className="text-white font-medium">
                  {formatPercentage(taxData.totalVAT, taxData.totalSales)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Taxa Legal</p>
                <p className="text-white font-medium">23%</p>
              </div>
              <div>
                <p className="text-zinc-400">Diferença</p>
                <p
                  className={`font-medium ${
                    Math.abs(
                      (taxData.totalVAT / taxData.totalSales) * 100 - 23
                    ) < 0.5
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {((taxData.totalVAT / taxData.totalSales) * 100 - 23).toFixed(
                    1
                  )}
                  %
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Status</p>
                <Badge className={taxData.complianceStatus.color}>
                  {taxData.complianceStatus.status === "compliant"
                    ? "Conforme"
                    : taxData.complianceStatus.status === "warning"
                    ? "Atenção"
                    : "Erro"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Declaração de IVA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Declaração de IVA - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-zinc-700/30 rounded border-l-4 border-purple-500">
                <span className="text-zinc-300">
                  Vendas sujeitas a IVA (23%)
                </span>
                <span className="text-white font-medium">
                  {formatPrice(taxData.totalSales)}
                </span>
              </div>

              <div className="flex justify-between p-3 bg-blue-500/10 rounded border-l-4 border-blue-500">
                <span className="text-zinc-300">IVA liquidado</span>
                <span className="text-blue-400 font-medium">
                  {formatPrice(taxData.totalVAT)}
                </span>
              </div>

              <div className="flex justify-between p-3 bg-green-500/10 rounded border-l-4 border-green-500">
                <span className="text-zinc-300 font-medium">
                  Total faturado
                </span>
                <span className="text-green-400 font-bold">
                  {formatPrice(taxData.totalWithVAT)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-700">
              <div className="text-xs text-zinc-500 space-y-1">
                <p>• IVA médio mensal: {formatPrice(taxData.monthlyAverage)}</p>
                <p>
                  • Taxa efetiva:{" "}
                  {formatPercentage(taxData.totalVAT, taxData.totalSales)}
                </p>
                <p>• Regime: Normal (periodicidade trimestral)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumo Trimestral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculateQuarterlyVAT().map((quarter, index) => (
                <div
                  key={quarter.name}
                  className="p-3 bg-zinc-700/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {quarter.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {quarter.label}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {formatPrice(quarter.vat)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-zinc-500">Vendas</p>
                      <p className="text-zinc-300">
                        {formatPrice(quarter.sales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">IVA</p>
                      <p className="text-blue-400">
                        {formatPrice(quarter.vat)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Total</p>
                      <p className="text-zinc-300">
                        {formatPrice(quarter.total)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa e Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Fluxo de Caixa {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-green-500/10 rounded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-zinc-300">Valores recebidos</span>
                </div>
                <span className="text-green-400 font-medium">
                  {formatPrice(annualSummary?.paid || 0)}
                </span>
              </div>

              <div className="flex justify-between p-3 bg-yellow-500/10 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-zinc-300">A receber (pendente)</span>
                </div>
                <span className="text-yellow-400 font-medium">
                  {formatPrice(annualSummary?.pending || 0)}
                </span>
              </div>

              <div className="flex justify-between p-3 bg-red-500/10 rounded">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-zinc-300">Em incumprimento</span>
                </div>
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

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Ações e Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={generateTaxReport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Relatório Fiscal (PDF)
              </Button>

              <Button
                onClick={exportForAccountant}
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar para Contabilista
              </Button>

              <div className="p-3 bg-zinc-700/30 rounded-lg border border-zinc-600">
                <h4 className="text-sm font-medium text-white mb-2">
                  Próximas Obrigações
                </h4>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Declaração trimestral IVA</span>
                    <span>15 dias após trimestre</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagamento IVA apurado</span>
                    <span>Até dia 20 do mês seguinte</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Declaração anual IRS</span>
                    <span>31 de Março {selectedYear + 1}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="text-sm font-medium text-blue-400 mb-1">
                  Dica Fiscal
                </h4>
                <p className="text-xs text-zinc-400">
                  Mantenha todos os documentos organizados por trimestre para
                  facilitar as declarações fiscais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaxReport;
