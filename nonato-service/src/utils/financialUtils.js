// src/utils/financialUtils.js
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// ===================================
// 1. CONSTANTES FINANCEIRAS
// ===================================
export const FINANCIAL_CONSTANTS = {
  // Prazos
  DEFAULT_PAYMENT_TERM_DAYS: 30,
  OVERDUE_THRESHOLD_DAYS: 30,
  
  // Taxas de IVA
  VAT_RATES: {
    SERVICES: 23,
    PARTS: 23,
    SHIPPING: 23
  },
  
  // Status de pagamento
  PAYMENT_STATUSES: {
    PAID: 'paid',
    PENDING: 'pending', 
    OVERDUE: 'overdue'
  },
  
  // Métodos de pagamento
  PAYMENT_METHODS: {
    TRANSFER: 'transfer',
    CASH: 'cash',
    CARD: 'card',
    CHECK: 'check'
  },
  
  // Tipos de serviço
  SERVICE_TYPES: {
    PARTS_BUDGET: 'parts_budget',
    CLOSURE: 'closure'
  }
};

// ===================================
// 2. FUNÇÕES DE CÁLCULO FINANCEIRO
// ===================================

/**
 * Calcula valores financeiros para orçamento de peças
 */
export const calculatePartsBudgetFinancials = (order) => {
  const items = order.partsQuoteItems || [];
  const subtotal = items.reduce((total, item) => 
    total + (item.quantity * (item.price || 0)), 0
  );
  
  const shipping = parseFloat(order.shippingPrice) || 0;
  const totalBeforeVat = subtotal + shipping;
  const vatRate = order.vatRate || FINANCIAL_CONSTANTS.VAT_RATES.PARTS;
  const vatAmount = order.includeVat ? (totalBeforeVat * vatRate) / 100 : 0;
  const totalWithVat = totalBeforeVat + vatAmount;
  
  return {
    subtotal: roundToTwoDecimals(subtotal),
    shipping: roundToTwoDecimals(shipping),
    totalBeforeVat: roundToTwoDecimals(totalBeforeVat),
    vatAmount: roundToTwoDecimals(vatAmount),
    totalWithVat: roundToTwoDecimals(totalWithVat),
    salesAmount: roundToTwoDecimals(totalBeforeVat),
    vatRate
  };
};

/**
 * Calcula valores financeiros para fechamento de serviços
 */
export const calculateClosureFinancials = (budget) => {
  const servicesTotal =
    budget.services?.reduce((total, service) => total + (service.total || 0), 0) ||
    budget.total ||
    0;

  // Forçar IVA de 23% sempre
  const vatRate = FINANCIAL_CONSTANTS.VAT_RATES.SERVICES;
  const vatAmount = (servicesTotal * vatRate) / 100;
  const totalWithVat = servicesTotal + vatAmount;

  return {
    subtotal: roundToTwoDecimals(servicesTotal),
    shipping: 0,
    totalBeforeVat: roundToTwoDecimals(servicesTotal),
    vatAmount: roundToTwoDecimals(vatAmount),
    totalWithVat: roundToTwoDecimals(totalWithVat),
    salesAmount: roundToTwoDecimals(servicesTotal),
    vatRate
  };
};


/**
 * Determina status de pagamento baseado na data e status atual
 */
export const determinePaymentStatus = (serviceDate, currentStatus = null) => {
  if (currentStatus && Object.values(FINANCIAL_CONSTANTS.PAYMENT_STATUSES).includes(currentStatus)) {
    return currentStatus;
  }
  
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() - FINANCIAL_CONSTANTS.OVERDUE_THRESHOLD_DAYS);
  
  const date = serviceDate?.toDate ? serviceDate.toDate() : new Date(serviceDate);
  
  return date < threshold ? 
    FINANCIAL_CONSTANTS.PAYMENT_STATUSES.OVERDUE : 
    FINANCIAL_CONSTANTS.PAYMENT_STATUSES.PENDING;
};

/**
 * Verifica se um serviço está em atraso
 */
export const isServiceOverdue = (serviceDate) => {
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() - FINANCIAL_CONSTANTS.OVERDUE_THRESHOLD_DAYS);
  
  const date = serviceDate?.toDate ? serviceDate.toDate() : new Date(serviceDate);
  return date < threshold;
};

/**
 * Formata preço para exibição
 */
export const formatPrice = (price, currency = '€') => {
  const value = parseFloat(price || 0);
  return `${currency} ${value.toFixed(2)}`;
};

/**
 * Formata percentual
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Arredonda para duas casas decimais
 */
const roundToTwoDecimals = (number) => {
  return Math.round(number * 100) / 100;
};

// ===================================
// 3. SCRIPT DE MIGRAÇÃO DE DADOS EXISTENTES
// ===================================

/**
 * MIGRAÇÃO PRINCIPAL - Executa migração completa dos dados financeiros
 */
export const migrateFinancialData = async (options = {}) => {
  const { 
    dryRun = false, 
    onProgress = null,
    skipPartsBudgets = false,
    skipClosures = false 
  } = options;
  
  console.log(`🚀 Iniciando migração financeira ${dryRun ? '(DRY RUN)' : '(REAL)'}`);
  
  const migrationLog = {
    startTime: new Date(),
    partsBudgets: { total: 0, updated: 0, errors: 0 },
    closures: { total: 0, updated: 0, errors: 0 },
    errors: []
  };

  try {
    // Migrar orçamentos de peças
    if (!skipPartsBudgets) {
      console.log('📦 Migrando orçamentos de peças...');
      const partsBudgetsResult = await migratePartsBudgets(dryRun, onProgress);
      migrationLog.partsBudgets = partsBudgetsResult;
    }

    // Migrar fechamentos
    if (!skipClosures) {
      console.log('📄 Migrando fechamentos...');
      const closuresResult = await migrateClosures(dryRun, onProgress);
      migrationLog.closures = closuresResult;
    }

    migrationLog.endTime = new Date();
    migrationLog.duration = migrationLog.endTime - migrationLog.startTime;

    console.log('✅ Migração concluída!', migrationLog);
    return migrationLog;

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    migrationLog.errors.push({ type: 'GENERAL', error: error.message });
    throw error;
  }
};

/**
 * Migra orçamentos de peças (isQuote: true)
 */
const migratePartsBudgets = async (dryRun = false, onProgress = null) => {
  const result = { total: 0, updated: 0, errors: 0 };
  
  try {
    const partsBudgetsQuery = query(
      collection(db, "ordens"), 
      where("isQuote", "==", true)
    );
    const snapshot = await getDocs(partsBudgetsQuery);
    
    result.total = snapshot.docs.length;
    console.log(`📦 Encontrados ${result.total} orçamentos de peças para migrar`);

    for (let i = 0; i < snapshot.docs.length; i++) {
      const docRef = snapshot.docs[i];
      const data = docRef.data();

      try {
        // Calcular valores financeiros
        const financials = calculatePartsBudgetFinancials(data);
        
        // Determinar status de pagamento
        const paymentStatus = determinePaymentStatus(
          data.createdAt, 
          data.paymentStatus
        );

        // Preparar dados de atualização
        const updateData = {
          paymentStatus,
          paymentUpdatedAt: serverTimestamp(),
          financialSummary: financials
        };

        // Campos adicionais se não existirem
        if (!data.paymentDueDate) updateData.paymentDueDate = null;
        if (!data.paymentReceivedDate) updateData.paymentReceivedDate = null;
        if (!data.paymentNotes) updateData.paymentNotes = "";
        if (!data.paymentMethod) updateData.paymentMethod = "";

        // Executar atualização (se não for dry run)
        if (!dryRun) {
          await updateDoc(docRef.ref, updateData);
        }

        result.updated++;
        
        if (onProgress) {
          onProgress({
            type: 'parts_budget',
            current: i + 1,
            total: result.total,
            item: { id: docRef.id, status: paymentStatus, total: financials.totalWithVat }
          });
        }

        // Log progresso a cada 10 itens
        if ((i + 1) % 10 === 0) {
          console.log(`📦 Progresso: ${i + 1}/${result.total} orçamentos de peças`);
        }

      } catch (error) {
        console.error(`❌ Erro ao migrar orçamento ${docRef.id}:`, error);
        result.errors++;
      }
    }

    console.log(`✅ Orçamentos de peças: ${result.updated}/${result.total} migrados (${result.errors} erros)`);
    return result;

  } catch (error) {
    console.error('❌ Erro ao migrar orçamentos de peças:', error);
    throw error;
  }
};

/**
 * Migra fechamentos de serviços
 */
const migrateClosures = async (dryRun = false, onProgress = null) => {
  const result = { total: 0, updated: 0, errors: 0 };
  
  try {
    const closuresSnapshot = await getDocs(collection(db, "orcamentos"));
    
    result.total = closuresSnapshot.docs.length;
    console.log(`📄 Encontrados ${result.total} fechamentos para migrar`);

    for (let i = 0; i < closuresSnapshot.docs.length; i++) {
      const docRef = closuresSnapshot.docs[i];
      const data = docRef.data();

      try {
        // Calcular valores financeiros
        const financials = calculateClosureFinancials(data);
        
        // Determinar status de pagamento
        const paymentStatus = determinePaymentStatus(
          data.createdAt, 
          data.paymentStatus
        );

        // Preparar dados de atualização
        const updateData = {
          paymentStatus,
          paymentUpdatedAt: serverTimestamp(),
          financialSummary: financials,
          showIVA: data.showIVA || false,
          ivaRate: data.ivaRate || FINANCIAL_CONSTANTS.VAT_RATES.SERVICES
        };

        // Campos adicionais se não existirem
        if (!data.paymentDueDate) updateData.paymentDueDate = null;
        if (!data.paymentReceivedDate) updateData.paymentReceivedDate = null;
        if (!data.paymentNotes) updateData.paymentNotes = "";
        if (!data.paymentMethod) updateData.paymentMethod = "";

        // Executar atualização (se não for dry run)
        if (!dryRun) {
          await updateDoc(docRef.ref, updateData);
        }

        result.updated++;
        
        if (onProgress) {
          onProgress({
            type: 'closure',
            current: i + 1,
            total: result.total,
            item: { id: docRef.id, status: paymentStatus, total: financials.totalWithVat }
          });
        }

        // Log progresso a cada 10 itens
        if ((i + 1) % 10 === 0) {
          console.log(`📄 Progresso: ${i + 1}/${result.total} fechamentos`);
        }

      } catch (error) {
        console.error(`❌ Erro ao migrar fechamento ${docRef.id}:`, error);
        result.errors++;
      }
    }

    console.log(`✅ Fechamentos: ${result.updated}/${result.total} migrados (${result.errors} erros)`);
    return result;

  } catch (error) {
    console.error('❌ Erro ao migrar fechamentos:', error);
    throw error;
  }
};

// ===================================
// 4. FUNÇÕES AUXILIARES PARA COMPONENTES
// ===================================

/**
 * Calcula financials de um serviço baseado no tipo
 */
export const calculateServiceFinancials = (service) => {
  if (service.type === 'parts_budget') {
    return calculatePartsBudgetFinancials(service);
  } else {
    return calculateClosureFinancials(service);
  }
};

/**
 * Obtém status de pagamento de um serviço
 */
export const getPaymentStatus = (service) => {
  if (service.paymentStatus) return service.paymentStatus;
  
  return determinePaymentStatus(service.createdAt, service.paymentStatus);
};

/**
 * Calcula resumo financeiro de múltiplos serviços
 */
export const calculateFinancialSummary = (services, year = null, month = null) => {
  const summary = {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    vatTotal: 0,
    salesTotal: 0,
    servicesCount: 0
  };

  services.forEach(service => {
    const serviceDate = service.createdAt?.toDate() || new Date(service.createdAt);
    const serviceYear = serviceDate.getFullYear();
    const serviceMonth = serviceDate.getMonth() + 1;

    // Filtrar por ano e mês se especificado
    if (year && serviceYear !== year) return;
    if (month && serviceMonth !== month) return;

    const financials = calculateServiceFinancials(service);
    const paymentStatus = getPaymentStatus(service);

    summary.total += financials.totalWithVat;
    summary.vatTotal += financials.vatAmount;
    summary.salesTotal += financials.salesAmount;
    summary.servicesCount += 1;

    switch (paymentStatus) {
      case FINANCIAL_CONSTANTS.PAYMENT_STATUSES.PAID:
        summary.paid += financials.totalWithVat;
        break;
      case FINANCIAL_CONSTANTS.PAYMENT_STATUSES.PENDING:
        summary.pending += financials.totalWithVat;
        break;
      case FINANCIAL_CONSTANTS.PAYMENT_STATUSES.OVERDUE:
        summary.overdue += financials.totalWithVat;
        break;
    }
  });

  // Arredondar valores finais
  Object.keys(summary).forEach(key => {
    if (typeof summary[key] === 'number' && key !== 'servicesCount') {
      summary[key] = roundToTwoDecimals(summary[key]);
    }
  });

  return summary;
};