// src/hooks/useFinancialData.js
import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  calculateServiceFinancials,
  getPaymentStatus,
  calculateFinancialSummary
} from '../utils/financialUtils';

// ===================================
// 1. HOOK PRINCIPAL PARA DADOS FINANCEIROS
// ===================================
export const useFinancialData = (options = {}) => {
  const { realTime = false, year = new Date().getFullYear() } = options;
  
  const [data, setData] = useState({
    partsBudgets: [],
    closures: [],
    clients: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Buscar dados em paralelo
        const [partsBudgetsSnapshot, closuresSnapshot, clientsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "ordens"), where("isQuote", "==", true))),
          getDocs(collection(db, "orcamentos")),
          getDocs(collection(db, "clientes"))
        ]);

        // Processar dados (ignora ordens excluídas / na Reciclagem)
        const partsBudgets = partsBudgetsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            type: 'parts_budget',
            ...doc.data()
          }))
          .filter(service => !service.eliminadoEm);

        const closures = closuresSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'closure',
          ...doc.data()
        }));

        const clients = clientsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        setData({
          partsBudgets,
          closures,
          clients,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error("Erro ao buscar dados financeiros:", error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: "Erro ao carregar dados financeiros"
        }));
      }
    };

    fetchData();
  }, [realTime, year]);

  return data;
};

// ===================================
// 2. HOOK PARA STATUS FINANCEIRO DE CLIENTES
// ===================================
export const useClientFinancialStatus = (clients) => {
  const [financialStatuses, setFinancialStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clients?.length) {
      setFinancialStatuses({});
      return;
    }

    const calculateStatuses = async () => {
      setIsLoading(true);
      
      try {
        // Buscar todos os serviços financeiros
        const [partsBudgetsSnapshot, closuresSnapshot] = await Promise.all([
          getDocs(query(collection(db, "ordens"), where("isQuote", "==", true))),
          getDocs(collection(db, "orcamentos"))
        ]);

        const allServices = [
          ...partsBudgetsSnapshot.docs.map(doc => ({ id: doc.id, type: 'parts_budget', ...doc.data() })),
          ...closuresSnapshot.docs.map(doc => ({ id: doc.id, type: 'closure', ...doc.data() }))
        ].filter(service => !service.eliminadoEm);

        const statuses = {};

        clients.forEach(client => {
          const clientServices = allServices.filter(service => service.clientId === client.id);
          const status = calculateClientFinancialStatus(clientServices);
          statuses[client.id] = status;
        });

        setFinancialStatuses(statuses);
      } catch (error) {
        console.error("Erro ao calcular status financeiros:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStatuses();
  }, [clients]);

  return { financialStatuses, isLoading };
};

// ===================================
// 3. HOOK PARA RESUMOS FINANCEIROS
// ===================================
export const useFinancialSummary = (year, month = null) => {
  const { partsBudgets, closures, isLoading } = useFinancialData({ year });
  
  const summary = useMemo(() => {
    if (isLoading) return null;

    const allServices = [...partsBudgets, ...closures];
    
    return calculateFinancialSummary(allServices, year, month);
  }, [partsBudgets, closures, year, month, isLoading]);

  return { summary, isLoading };
};

// ===================================
// 4. HOOK PARA DADOS MENSAIS
// ===================================
export const useMonthlyFinancialData = (year) => {
  const { partsBudgets, closures, isLoading } = useFinancialData({ year });

  const monthlyData = useMemo(() => {
    if (isLoading) return [];

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: new Date(year, i).toLocaleDateString('pt-PT', { month: 'short' }),
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      vat: 0,
      sales: 0,
      servicesCount: 0
    }));

    const allServices = [...partsBudgets, ...closures];

    allServices.forEach(service => {
      const serviceDate = service.createdAt?.toDate() || new Date(service.createdAt);
      
      if (serviceDate.getFullYear() === year) {
        const monthIndex = serviceDate.getMonth();
        const financials = calculateServiceFinancials(service);
        const paymentStatus = getPaymentStatus(service);

        months[monthIndex].total += financials.totalWithVat;
        months[monthIndex].vat += financials.vatAmount;
        months[monthIndex].sales += financials.salesAmount;
        months[monthIndex].servicesCount += 1;

        switch (paymentStatus) {
          case 'paid':
            months[monthIndex].paid += financials.totalWithVat;
            break;
          case 'pending':
            months[monthIndex].pending += financials.totalWithVat;
            break;
          case 'overdue':
            months[monthIndex].overdue += financials.totalWithVat;
            break;
        }
      }
    });

    return months;
  }, [partsBudgets, closures, year, isLoading]);

  return { monthlyData, isLoading };
};

// ===================================
// 5. HOOK PARA TOP CLIENTES
// ===================================
export const useTopClients = (year, limit = 10) => {
  const { partsBudgets, closures, clients, isLoading } = useFinancialData({ year });

  const topClients = useMemo(() => {
    if (isLoading) return [];

    const clientTotals = {};
    const allServices = [...partsBudgets, ...closures];

    allServices.forEach(service => {
      const serviceDate = service.createdAt?.toDate() || new Date(service.createdAt);
      
      if (serviceDate.getFullYear() === year && service.clientId) {
        if (!clientTotals[service.clientId]) {
          clientTotals[service.clientId] = {
            clientId: service.clientId,
            name: clients[service.clientId]?.name || 'Cliente não encontrado',
            total: 0,
            paid: 0,
            pending: 0,
            overdue: 0,
            servicesCount: 0,
            vatTotal: 0,
            salesTotal: 0
          };
        }

        const financials = calculateServiceFinancials(service);
        const paymentStatus = getPaymentStatus(service);

        clientTotals[service.clientId].total += financials.totalWithVat;
        clientTotals[service.clientId].vatTotal += financials.vatAmount;
        clientTotals[service.clientId].salesTotal += financials.salesAmount;
        clientTotals[service.clientId].servicesCount += 1;

        switch (paymentStatus) {
          case 'paid':
            clientTotals[service.clientId].paid += financials.totalWithVat;
            break;
          case 'pending':
            clientTotals[service.clientId].pending += financials.totalWithVat;
            break;
          case 'overdue':
            clientTotals[service.clientId].overdue += financials.totalWithVat;
            break;
        }
      }
    });

    return Object.values(clientTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }, [partsBudgets, closures, clients, year, limit, isLoading]);

  return { topClients, isLoading };
};

// ===================================
// 6. HOOK PARA ALERTAS FINANCEIROS
// ===================================
export const useFinancialAlerts = () => {
  const { partsBudgets, closures, clients } = useFinancialData({ realTime: true });
  
  const alerts = useMemo(() => {
    const allServices = [...partsBudgets, ...closures];
    const alerts = [];

    // Serviços em atraso
    const overdueServices = allServices.filter(service => {
      const paymentStatus = getPaymentStatus(service);
      return paymentStatus === 'overdue';
    });

    if (overdueServices.length > 0) {
      alerts.push({
        type: 'overdue',
        severity: 'high',
        title: `${overdueServices.length} serviços em atraso`,
        description: 'Existem pagamentos pendentes há mais de 1 mês',
        count: overdueServices.length,
        totalAmount: overdueServices.reduce((total, service) => {
          const financials = calculateServiceFinancials(service);
          return total + financials.totalWithVat;
        }, 0)
      });
    }

    // Clientes com múltiplos atrasos
    const clientsWithMultipleOverdue = {};
    overdueServices.forEach(service => {
      if (service.clientId) {
        clientsWithMultipleOverdue[service.clientId] = 
          (clientsWithMultipleOverdue[service.clientId] || 0) + 1;
      }
    });

    const problematicClients = Object.entries(clientsWithMultipleOverdue)
      .filter(([clientId, count]) => count > 1)
      .map(([clientId, count]) => ({
        clientId,
        name: clients[clientId]?.name || 'Cliente não encontrado',
        overdueCount: count
      }));

    if (problematicClients.length > 0) {
      alerts.push({
        type: 'problematic_clients',
        severity: 'medium',
        title: `${problematicClients.length} clientes problemáticos`,
        description: 'Clientes com múltiplos serviços em atraso',
        clients: problematicClients
      });
    }

    return alerts;
  }, [partsBudgets, closures, clients]);

  return alerts;
};

// ===================================
// FUNÇÕES AUXILIARES
// ===================================

const calculateClientFinancialStatus = (clientServices) => {
  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;
  let hasOverdueServices = false;
  let hasPendingServices = false;

  clientServices.forEach(service => {
    const financials = calculateServiceFinancials(service);
    const paymentStatus = getPaymentStatus(service);
    
    totalAmount += financials.totalWithVat;

    switch (paymentStatus) {
      case 'paid':
        paidAmount += financials.totalWithVat;
        break;
      case 'pending':
        pendingAmount += financials.totalWithVat;
        hasPendingServices = true;
        break;
      case 'overdue':
        overdueAmount += financials.totalWithVat;
        hasOverdueServices = true;
        break;
    }
  });

  // Determinar status geral do cliente
  let clientStatus = 'good';
  let statusColor = 'border-zinc-700';
  let statusBadge = null;

  if (hasOverdueServices) {
    clientStatus = 'overdue';
    statusColor = 'border-red-500 bg-red-500/10';
    statusBadge = {
      text: 'Devedor',
      color: 'bg-red-500/20 text-red-400',
      icon: 'AlertTriangle'
    };
  } else if (hasPendingServices) {
    clientStatus = 'pending';
    statusColor = 'border-yellow-500 bg-yellow-500/5';
    statusBadge = {
      text: 'Pendente',
      color: 'bg-yellow-500/20 text-yellow-400',
      icon: 'Clock'
    };
  } else if (totalAmount > 0) {
    statusBadge = {
      text: 'Em Dia',
      color: 'bg-green-500/20 text-green-400',
      icon: 'CheckCircle'
    };
  }

  return {
    status: clientStatus,
    statusColor,
    statusBadge,
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    servicesCount: clientServices.length
  };
};