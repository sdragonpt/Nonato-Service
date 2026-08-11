// src/components/financial/FinancialComponents.jsx
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "../../utils/financialUtils";

// ===================================
// 1. BADGE DE STATUS DE PAGAMENTO
// ===================================
export const PaymentStatusBadge = ({ status, size = "default" }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case "paid":
        return {
          text: "Pago",
          color: "bg-green-500/20 text-green-400 border-green-500/30",
          icon: CheckCircle,
        };
      case "pending":
        return {
          text: "Pendente",
          color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          icon: Clock,
        };
      case "overdue":
        return {
          text: "Devedor",
          color: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: AlertTriangle,
        };
      default:
        return {
          text: "Indefinido",
          color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
          icon: FileText,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1";

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${sizeClass} flex items-center gap-1 font-medium`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"}`} />
      {config.text}
    </Badge>
  );
};

// ===================================
// 2. CARD DE MÉTRICA FINANCEIRA
// ===================================
export const FinancialMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = null,
  color = "blue",
  onClick = null,
}) => {
  const colorClasses = {
    blue: "text-blue-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    purple: "text-purple-500",
    zinc: "text-zinc-500",
  };

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : null;

  return (
    <Card
      className={`bg-zinc-800 border-zinc-700 transition-colors ${
        onClick ? "hover:bg-zinc-700 cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-white mb-1">
              {typeof value === "number" ? formatPrice(value) : value}
            </h3>
            {subtitle && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">{subtitle}</p>
                {trend && TrendIcon && (
                  <div
                    className={`flex items-center gap-1 ${
                      trend.direction === "up"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    <TrendIcon className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {trend.percentage}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={`h-12 w-12 rounded-full bg-${color}-500/10 flex items-center justify-center ml-4`}
            >
              <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ===================================
// 3. BOTÕES DE STATUS DE PAGAMENTO
// ===================================
export const PaymentStatusButtons = ({
  currentStatus,
  onStatusChange,
  isLoading = false,
  size = "default",
}) => {
  const buttonSize = size === "sm" ? "sm" : "default";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  // ✅ "bg-transparent" é essencial aqui — a variante "outline" do Button
  // traz "bg-background" por omissão, que neste tema (fundo claro na
  // variável --background do shadcn, nunca redefinida para dark) pintava
  // os botões não selecionados de branco/sem cor, escondendo a cor
  // (verde/amarelo/vermelho) da borda e do texto.
  const buttons = [
    {
      status: "paid",
      label: "Pago",
      icon: CheckCircle,
      color: "bg-green-600 hover:bg-green-700 text-white",
      outlineColor: "bg-transparent border-green-600 text-green-400 hover:bg-green-600/10",
    },
    {
      status: "pending",
      label: "Pendente",
      icon: Clock,
      color: "bg-yellow-600 hover:bg-yellow-700 text-white",
      outlineColor: "bg-transparent border-yellow-600 text-yellow-400 hover:bg-yellow-600/10",
    },
    {
      status: "overdue",
      label: "Devedor",
      icon: AlertTriangle,
      color: "bg-red-600 hover:bg-red-700 text-white",
      outlineColor: "bg-transparent border-red-600 text-red-400 hover:bg-red-600/10",
    },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {buttons.map(({ status, label, icon: Icon, color, outlineColor }) => {
        const isActive = currentStatus === status;

        return (
          <Button
            key={status}
            size={buttonSize}
            variant={isActive ? "default" : "outline"}
            onClick={() => onStatusChange(status)}
            disabled={isLoading}
            className={isActive ? color : outlineColor}
          >
            <Icon className={`${iconSize} mr-1`} />
            {label}
          </Button>
        );
      })}
    </div>
  );
};

// ===================================
// 4. BREAKDOWN DE IVA E VENDAS
// ===================================
export const VATBreakdown = ({
  totalWithVat,
  vatAmount,
  salesAmount,
  vatRate = 23,
  showDetails = true,
}) => {
  return (
    <div className="space-y-3">
      {showDetails && (
        <div className="text-sm text-zinc-400 mb-3">
          <span>Separação Fiscal (IVA {vatRate}%)</span>
        </div>
      )}

      <div className="space-y-2">
        {/* Vendas sem IVA */}
        <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-zinc-300">Vendas (sem IVA)</span>
          </div>
          <span className="text-purple-400 font-medium">
            {formatPrice(salesAmount)}
          </span>
        </div>

        {/* IVA */}
        <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-zinc-300">IVA ({vatRate}%)</span>
          </div>
          <span className="text-blue-400 font-medium">
            {formatPrice(vatAmount)}
          </span>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center p-3 bg-zinc-700/50 rounded-lg border border-zinc-600 font-medium">
          <span className="text-white">Total com IVA</span>
          <span className="text-white text-lg">
            {formatPrice(totalWithVat)}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-700">
          <p>
            • IVA a entregar ao Estado:{" "}
            <span className="text-blue-400">{formatPrice(vatAmount)}</span>
          </p>
          <p>
            • Receita líquida da empresa:{" "}
            <span className="text-purple-400">{formatPrice(salesAmount)}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// ===================================
// 5. PROGRESSO DE COBRANÇA
// ===================================
export const CollectionProgress = ({
  paid,
  pending,
  overdue,
  total,
  showLabels = true,
}) => {
  const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
  const pendingPercentage = total > 0 ? (pending / total) * 100 : 0;
  const overduePercentage = total > 0 ? (overdue / total) * 100 : 0;

  return (
    <div className="space-y-3">
      {showLabels && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-zinc-300">
            Progresso de Cobrança
          </span>
          <span className="text-sm text-zinc-400">
            {paidPercentage.toFixed(1)}% cobrado
          </span>
        </div>
      )}

      {/* Barra de progresso visual */}
      <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
        <div className="h-full flex">
          {/* Pago (verde) */}
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${paidPercentage}%` }}
          />
          {/* Pendente (amarelo) */}
          <div
            className="bg-yellow-500 transition-all duration-300"
            style={{ width: `${pendingPercentage}%` }}
          />
          {/* Devedor (vermelho) */}
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${overduePercentage}%` }}
          />
        </div>
      </div>

      {/* Legendas */}
      {showLabels && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-zinc-400">Pago</span>
            <span className="text-green-400 font-medium ml-auto">
              {formatPrice(paid)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-zinc-400">Pendente</span>
            <span className="text-yellow-400 font-medium ml-auto">
              {formatPrice(pending)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-zinc-400">Devedor</span>
            <span className="text-red-400 font-medium ml-auto">
              {formatPrice(overdue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================
// 6. CARD DE ALERTA FINANCEIRO
// ===================================
export const FinancialAlert = ({ alert, onDismiss, onViewDetails }) => {
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case "high":
        return {
          bgColor: "bg-red-500/10 border-red-500/30",
          iconColor: "text-red-400",
          titleColor: "text-red-300",
        };
      case "medium":
        return {
          bgColor: "bg-yellow-500/10 border-yellow-500/30",
          iconColor: "text-yellow-400",
          titleColor: "text-yellow-300",
        };
      case "low":
        return {
          bgColor: "bg-blue-500/10 border-blue-500/30",
          iconColor: "text-blue-400",
          titleColor: "text-blue-300",
        };
      default:
        return {
          bgColor: "bg-zinc-500/10 border-zinc-500/30",
          iconColor: "text-zinc-400",
          titleColor: "text-zinc-300",
        };
    }
  };

  const config = getSeverityConfig(alert.severity);

  return (
    <Card className={`${config.bgColor} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
            <div>
              <h4 className={`font-medium ${config.titleColor}`}>
                {alert.title}
              </h4>
              <p className="text-sm text-zinc-400 mt-1">{alert.description}</p>

              {alert.totalAmount && (
                <p className="text-sm font-medium text-white mt-2">
                  Valor total: {formatPrice(alert.totalAmount)}
                </p>
              )}

              {alert.clients && (
                <div className="mt-2">
                  <p className="text-xs text-zinc-500">Clientes afetados:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alert.clients.slice(0, 3).map((client) => (
                      <Badge
                        key={client.clientId}
                        variant="outline"
                        className="text-xs"
                      >
                        {client.name} ({client.overdueCount})
                      </Badge>
                    ))}
                    {alert.clients.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{alert.clients.length - 3} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            {onViewDetails && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewDetails}
                className="text-xs border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                Detalhes
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ===================================
// 7. MINI CARD DE SERVIÇO FINANCEIRO
// ===================================
export const FinancialServiceCard = ({
  service,
  client,
  onStatusChange,
  onViewDetails,
  showClient = true,
  calculateServiceFinancials,
  getPaymentStatus,
}) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT");
  };

  const financials = calculateServiceFinancials(service);
  const paymentStatus = getPaymentStatus(service);

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {service.type === "parts_budget" ? (
              <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-400" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded bg-green-500/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-white text-sm">
                {service.type === "parts_budget"
                  ? "Orçamento de Peças"
                  : "Fechamento"}
              </p>
              <p className="text-xs text-zinc-400">
                {formatDate(service.createdAt)}
              </p>
            </div>
          </div>

          <PaymentStatusBadge status={paymentStatus} size="sm" />
        </div>

        {showClient && client && (
          <div className="mb-3 pb-3 border-b border-zinc-700">
            <p className="text-xs text-zinc-400">Cliente</p>
            <p className="text-sm text-white font-medium">{client.name}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div>
            <p className="text-zinc-400">Subtotal</p>
            <p className="text-white font-medium">
              {formatPrice(financials.totalBeforeVat)}
            </p>
          </div>
          <div>
            <p className="text-zinc-400">IVA</p>
            <p className="text-blue-400 font-medium">
              {formatPrice(financials.vatAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-300">Total</span>
          <span className="text-lg font-bold text-white">
            {formatPrice(financials.totalWithVat)}
          </span>
        </div>

        <div className="flex gap-2">
          <PaymentStatusButtons
            currentStatus={paymentStatus}
            onStatusChange={(newStatus) =>
              onStatusChange(service.id, service.type, newStatus)
            }
            size="sm"
          />
        </div>

        {onViewDetails && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewDetails}
            className="w-full mt-3 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            Ver Detalhes
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
