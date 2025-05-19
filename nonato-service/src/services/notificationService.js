// src/services/notificationService.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const notificationTypes = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_CHANGE: 'order_status_change',
  NEW_QUOTE_REQUEST: 'new_quote_request',
  QUOTE_APPROVED: 'quote_approved',
  SYSTEM_UPDATE: 'system_update',
};

export const createNotification = async ({ userId, type, title, message, data = {} }) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
};

// Quando um novo pedido é criado na loja online
export const notifyNewOrder = async (userId, orderData) => {
  await createNotification({
    userId,
    type: notificationTypes.NEW_ORDER,
    title: 'Novo Pedido da Loja',
    message: `Novo pedido #${orderData.id} de ${orderData.customerName}`,
    data: { orderId: orderData.id },
  });
};

// Quando um orçamento online é solicitado
export const notifyNewQuoteRequest = async (userId, quoteData) => {
  await createNotification({
    userId,
    type: notificationTypes.NEW_QUOTE_REQUEST,
    title: 'Nova Solicitação de Orçamento',
    message: `${quoteData.customerName} solicitou um orçamento`,
    data: { quoteId: quoteData.id },
  });
};

export const notifyOrderStatusChange = async (userId, orderData) => {
    await createNotification({
      userId,
      type: notificationTypes.ORDER_STATUS_CHANGE,
      title: 'Status do Pedido Alterado',
      message: `O pedido #${orderData.id} mudou para ${orderData.status}`,
      data: { orderId: orderData.id },
    });
  };