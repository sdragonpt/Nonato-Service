// src/utils/financialUtils.js - ✅ CORRIGIDO: IVA 23% default para fechamentos

/**
 * Calcula os valores financeiros de um serviço/orçamento
 * Agora inclui o cálculo de margem de lucro para orçamentos de peças
 * ✅ CORRIGIDO: Fechamentos agora usam 23% IVA por default
 */
export const calculateServiceFinancials = (service) => {
  if (!service) {
    return {
      totalBeforeVat: 0,
      vatAmount: 0,
      totalWithVat: 0,
      salesAmount: 0,
      profitAmount: 0,
      profitMargin: 0,
    };
  }

  let salesAmount = 0;
  let profitAmount = 0;

  // ✅ ORÇAMENTOS DE PEÇAS (isQuote: true)
  if (service.isQuote && service.partsQuoteItems) {
    const itemsTotal = service.partsQuoteItems.reduce((total, item) => {
      const basePrice = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      
      // Calcular valor base (sem margem)
      const basePriceTotal = basePrice * quantity;
      salesAmount += basePriceTotal;
      
      // Calcular margem de lucro se aplicável
      if (service.includeProfitMargin && service.profitMargin > 0) {
        const marginAmount = basePriceTotal * (service.profitMargin / 100);
        profitAmount += marginAmount;
        return total + basePriceTotal + marginAmount;
      }
      
      return total + basePriceTotal;
    }, 0);

    const shippingCost = parseFloat(service.shippingPrice || 0);
    const totalBeforeVat = itemsTotal + shippingCost;
    
    const vatRate = parseFloat(service.vatRate || 23);
    const vatAmount = service.includeVat ? (totalBeforeVat * vatRate) / 100 : 0;
    const totalWithVat = totalBeforeVat + vatAmount;

    return {
      totalBeforeVat,
      vatAmount,
      totalWithVat,
      salesAmount: salesAmount + shippingCost, // Vendas = valor base + envio
      profitAmount, // Lucro da margem aplicada
      profitMargin: service.profitMargin || 0,
    };
  }

  // ✅ ORÇAMENTOS REGULARES (fechamentos) - CORRIGIDO: Default 23% IVA
  if (service.services && Array.isArray(service.services)) {
    const servicesTotal = service.services.reduce((total, serviceItem) => {
      const value = parseFloat(serviceItem.value || 0);
      const quantity = parseFloat(serviceItem.quantity || 1);
      return total + (value * quantity);
    }, 0);

    const vatRate = parseFloat(service.ivaRate || 23); // ✅ CORRIGIDO: Default 23%
    // ✅ CORRIGIDO: Sempre incluir IVA para fechamentos, a menos que explicitamente false
    const includeIva = service.showIVA !== false; // Default true
    const vatAmount = includeIva ? (servicesTotal * vatRate) / 100 : 0;
    const totalWithVat = servicesTotal + vatAmount;

    return {
      totalBeforeVat: servicesTotal,
      vatAmount,
      totalWithVat,
      salesAmount: servicesTotal, // Para fechamentos, vendas = total dos serviços
      profitAmount: 0, // Fechamentos não têm margem calculada separadamente
      profitMargin: 0,
    };
  }

  // ✅ FALLBACK para estruturas antigas - CORRIGIDO: Default 23% IVA
  const total = parseFloat(service.total || service.value || 0);
  const vatRate = parseFloat(service.vatRate || service.ivaRate || 23); // ✅ CORRIGIDO
  // ✅ CORRIGIDO: Default incluir IVA para fechamentos
  const includeIva = service.includeVat !== false && service.showIVA !== false;
  const vatAmount = includeIva ? (total * vatRate) / 100 : 0;

  return {
    totalBeforeVat: total,
    vatAmount,
    totalWithVat: total + vatAmount,
    salesAmount: total,
    profitAmount: 0,
    profitMargin: 0,
  };
};

/**
 * Calcula estatísticas financeiras resumidas para um conjunto de serviços
 * Inclui separação entre vendas e lucros
 */
export const calculateFinancialSummary = (services) => {
  let totalRevenue = 0;
  let totalSales = 0;
  let totalProfit = 0;
  let totalVat = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;

  services.forEach(service => {
    const financials = calculateServiceFinancials(service);
    const paymentStatus = getPaymentStatus(service);
    
    totalRevenue += financials.totalWithVat;
    totalSales += financials.salesAmount;
    totalProfit += financials.profitAmount;
    totalVat += financials.vatAmount;

    switch (paymentStatus) {
      case 'paid':
        paidAmount += financials.totalWithVat;
        break;
      case 'pending':
        pendingAmount += financials.totalWithVat;
        break;
      case 'overdue':
        overdueAmount += financials.totalWithVat;
        break;
    }
  });

  return {
    totalRevenue,    // Faturamento total (com IVA)
    totalSales,      // Vendas líquidas (sem margem)
    totalProfit,     // Lucro das margens
    totalVat,        // Total de IVA
    paidAmount,      // Valores recebidos
    pendingAmount,   // Valores pendentes
    overdueAmount,   // Valores em atraso
    profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0, // Margem média
    averageTicket: services.length > 0 ? totalRevenue / services.length : 0, // ✅ NOVO: Ticket médio aqui
  };
};

/**
 * Determina o status de pagamento de um serviço
 */
export const getPaymentStatus = (service) => {
  if (!service) return 'unknown';

  const paymentStatus = service.paymentStatus || 'pending';
  
  // Se marcado como pago
  if (paymentStatus === 'paid') {
    return 'paid';
  }

  // Se tem data de vencimento e já passou
  if (service.dueDate) {
    const dueDate = service.dueDate.toDate ? service.dueDate.toDate() : new Date(service.dueDate);
    const now = new Date();
    
    if (now > dueDate) {
      return 'overdue';
    }
  }

  // Se serviço foi criado há mais de 30 dias e não foi pago
  if (service.createdAt) {
    const createdDate = service.createdAt.toDate ? service.createdAt.toDate() : new Date(service.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (createdDate < thirtyDaysAgo && paymentStatus !== 'paid') {
      return 'overdue';
    }
  }

  return 'pending';
};

/**
 * Verifica se um serviço está em atraso
 */
export const isServiceOverdue = (service) => {
  return getPaymentStatus(service) === 'overdue';
};

/**
 * Formata um valor monetário para exibição, com separador de milhares
 * (ex: € 1.234,56). Formatação manual (em vez de toLocaleString) para
 * garantir sempre "." nos milhares e "," nos decimais, independentemente
 * do ambiente/ICU do dispositivo.
 */
export const formatPrice = (amount, currency = '€') => {
  const numericAmount = parseFloat(amount || 0);
  const isNegative = numericAmount < 0;
  const [intPart, decPart] = Math.abs(numericAmount).toFixed(2).split('.');
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}${currency} ${intWithDots},${decPart}`;
};

/**
 * Formata uma percentagem para exibição
 */
export const formatPercentage = (percentage) => {
  const numericPercentage = parseFloat(percentage || 0);
  return `${numericPercentage.toFixed(1)}%`;
};

/**
 * Calcula a margem de lucro em percentagem
 */
export const calculateProfitMarginPercentage = (profit, sales) => {
  if (!sales || sales === 0) return 0;
  return (profit / sales) * 100;
};

/**
 * Agrupa serviços por tipo para análise financeira
 */
export const groupServicesByType = (services) => {
  const groups = {
    partsBudgets: [], // Orçamentos de peças
    closures: [],     // Fechamentos/orçamentos regulares
    others: []        // Outros tipos
  };

  services.forEach(service => {
    if (service.isQuote) {
      groups.partsBudgets.push(service);
    } else if (service.services || service.type === 'closure') {
      groups.closures.push(service);
    } else {
      groups.others.push(service);
    }
  });

  return groups;
};

/**
 * Calcula métricas de performance financeira
 */
export const calculateFinancialMetrics = (services, previousPeriodServices = []) => {
  const currentPeriod = calculateFinancialSummary(services);
  const previousPeriod = calculateFinancialSummary(previousPeriodServices);
  
  const revenueGrowth = previousPeriod.totalRevenue > 0 
    ? ((currentPeriod.totalRevenue - previousPeriod.totalRevenue) / previousPeriod.totalRevenue) * 100
    : 0;

  const profitGrowth = previousPeriod.totalProfit > 0
    ? ((currentPeriod.totalProfit - previousPeriod.totalProfit) / previousPeriod.totalProfit) * 100
    : 0;

  return {
    ...currentPeriod,
    revenueGrowth,
    profitGrowth,
    averageTicket: services.length > 0 ? currentPeriod.totalRevenue / services.length : 0,
    conversionRate: services.length > 0 ? (currentPeriod.paidAmount / currentPeriod.totalRevenue) * 100 : 0,
  };
};

/**
 * Exportar também as funções antigas para compatibilidade
 */
export const calculateTotalsWithIVA = (services, ivaRate = 23) => {
  const subtotal = services.reduce((total, service) => {
    const value = parseFloat(service.value || 0);
    const quantity = parseFloat(service.quantity || 1);
    return total + (value * quantity);
  }, 0);

  const ivaAmount = (subtotal * ivaRate) / 100;
  const total = subtotal + ivaAmount;

  return {
    subtotal,
    ivaAmount,
    total
  };
};