// src/utils/oldBrowserUtils.js
// ✅ ARQUIVO ÚNICO E LIMPO - SEM DUPLICAÇÕES

import { useEffect, useRef, useCallback } from 'react';

// ===============================================
// 1. ✅ DETECÇÃO DE NAVEGADOR ANTIGO
// ===============================================
export const detectOldBrowser = () => {
  const ua = navigator.userAgent;
  const isIE = ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident') !== -1;
  const isOldEdge = /Edge\/\d+/.test(ua) && !/Edg\/\d+/.test(ua);
  const isOldChrome = /Chrome\/([0-9]+)/.test(ua) && parseInt(RegExp.$1) < 90;
  const isOldFirefox = /Firefox\/([0-9]+)/.test(ua) && parseInt(RegExp.$1) < 88;
  
  return isIE || isOldEdge || isOldChrome || isOldFirefox;
};

// ===============================================
// 2. ✅ CONFIGURAÇÕES GLOBAIS PARA PCs ANTIGOS
// ===============================================
export const OLD_BROWSER_CONFIG = {
  // Delays para operações (em ms)
  STATE_UPDATE_DELAY: 250,
  NAVIGATION_DELAY: 1000,
  DOM_UPDATE_DELAY: 150,
  FORM_SUBMIT_DELAY: 500,
  
  // Retry e timeout
  MAX_RETRIES: 3,
  OPERATION_TIMEOUT: 10000,
  
  // Batch operations
  BATCH_SIZE: 5,
  BATCH_DELAY: 100,
  
  // Memory management
  CLEANUP_INTERVAL: 30000,
  MAX_CACHE_SIZE: 50,
};

// ===============================================
// 3. ✅ HOOK UNIVERSAL PARA PCs ANTIGOS
// ===============================================
export const useOldBrowserCompat = () => {
  const mounted = useRef(true);
  const timeouts = useRef([]);
  const retryCount = useRef(0);
  
  useEffect(() => {
    mounted.current = true;
    const isOld = detectOldBrowser();
    
    if (isOld) {
      console.log('🔧 Modo compatibilidade PC antigo ativado');
    }
    
    return () => {
      mounted.current = false;
      // Limpar todos os timeouts
      timeouts.current.forEach(id => clearTimeout(id));
      timeouts.current = [];
    };
  }, []);

  // ✅ Estado seguro com retry
  const safeSetState = useCallback((setter, delay = OLD_BROWSER_CONFIG.STATE_UPDATE_DELAY) => {
    return new Promise((resolve) => {
      if (!mounted.current) return resolve(false);
      
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          try {
            setter();
            retryCount.current = 0; // Reset counter em sucesso
            resolve(true);
          } catch (error) {
            console.warn('Estado não atualizado (PC antigo):', error);
            
            // Retry automático para PCs antigos
            if (retryCount.current < OLD_BROWSER_CONFIG.MAX_RETRIES) {
              retryCount.current++;
              console.log(`🔄 Retry ${retryCount.current}/${OLD_BROWSER_CONFIG.MAX_RETRIES}`);
              
              setTimeout(() => {
                if (mounted.current) {
                  try {
                    setter();
                    resolve(true);
                  } catch (retryError) {
                    console.warn('Retry falhou:', retryError);
                    resolve(false);
                  }
                }
              }, delay * retryCount.current);
            } else {
              resolve(false);
            }
          }
        }
      }, delay);
      
      timeouts.current.push(timeoutId);
    });
  }, []);

  // ✅ Navegação segura com fallbacks múltiplos
  const safeNavigate = useCallback((navigate, path, delay = OLD_BROWSER_CONFIG.NAVIGATION_DELAY) => {
    return new Promise((resolve) => {
      if (!mounted.current) return resolve(false);
      
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          console.log('🔄 Navegando de forma segura para:', path);
          
          try {
            // Método 1: React Router navigate
            navigate(path);
            resolve(true);
          } catch (error) {
            console.warn('Navigate falhou, tentando fallback:', error);
            
            try {
              // Método 2: window.history
              window.history.pushState(null, '', path);
              window.location.reload();
              resolve(true);
            } catch (fallbackError) {
              console.warn('History fallback falhou, usando location:', fallbackError);
              
              // Método 3: window.location (último recurso)
              window.location.href = path;
              resolve(true);
            }
          }
        }
      }, delay);
      
      timeouts.current.push(timeoutId);
    });
  }, []);

  // ✅ Operação DOM segura
  const safeDOMOperation = useCallback((operation, delay = OLD_BROWSER_CONFIG.DOM_UPDATE_DELAY) => {
    return new Promise((resolve) => {
      if (!mounted.current) return resolve(false);
      
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          try {
            operation();
            resolve(true);
          } catch (error) {
            console.warn('Operação DOM falhou (PC antigo):', error);
            resolve(false);
          }
        }
      }, delay);
      
      timeouts.current.push(timeoutId);
    });
  }, []);

  return {
    isMounted: () => mounted.current,
    isOldBrowser: detectOldBrowser(),
    safeSetState,
    safeNavigate,
    safeDOMOperation,
    config: OLD_BROWSER_CONFIG
  };
};

// ===============================================
// 4. ✅ GLOBAL ERROR HANDLER PARA PCs ANTIGOS
// ===============================================
export const setupGlobalErrorHandling = () => {
  // Handler para erros de JavaScript não capturados
  window.addEventListener('error', (event) => {
    const isDOMError = event.error?.message?.includes('removeChild') ||
                      event.error?.message?.includes('insertBefore') ||
                      event.error?.message?.includes('appendChild') ||
                      event.error?.message?.includes('Node');
    
    if (isDOMError) {
      console.warn('🔧 Erro DOM capturado globalmente (PC antigo):', event.error);
      
      // Evitar que o erro quebre completamente a aplicação
      event.preventDefault();
      
      // Opcional: Mostrar notificação não-intrusiva
      showOldBrowserNotification('Operação concluída (ignorando erro de compatibilidade)');
      
      return false;
    }
  });

  // Handler para Promise rejections não capturadas
  window.addEventListener('unhandledrejection', (event) => {
    const isDOMError = event.reason?.message?.includes('removeChild') ||
                       event.reason?.message?.includes('insertBefore') ||
                       event.reason?.message?.includes('appendChild');
    
    if (isDOMError) {
      console.warn('🔧 Promise rejection DOM capturada (PC antigo):', event.reason);
      event.preventDefault();
      return;
    }
    
    console.warn('🔧 Promise rejection capturada:', event.reason);
    
    // Para PCs antigos, logar mas não quebrar a aplicação
    if (detectOldBrowser()) {
      event.preventDefault();
    }
  });
};

// ===============================================
// 5. ✅ NOTIFICAÇÃO DISCRETA PARA PCs ANTIGOS
// ===============================================
let notificationTimeout;

export const showOldBrowserNotification = (message, duration = 2000) => {
  // Limpar notificação anterior
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  // Remover notificação existente
  const existing = document.getElementById('old-browser-notification');
  if (existing) {
    existing.remove();
  }
  
  // Criar nova notificação
  const notification = document.createElement('div');
  notification.id = 'old-browser-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(34, 197, 94, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    max-width: 280px;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  notification.textContent = `🔧 ${message}`;
  
  document.body.appendChild(notification);
  
  // Remover automaticamente
  notificationTimeout = setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, duration);
};

// ===============================================
// 6. ✅ INICIALIZAÇÃO AUTOMÁTICA PARA APP.JSX
// ===============================================
export const initOldBrowserSupport = () => {
  const isOld = detectOldBrowser();
  
  if (isOld) {
    console.log('🔧 Iniciando suporte para PC antigo...');
    
    // Setup global error handling
    setupGlobalErrorHandling();
    
    // Ajustar configurações do React (se possível)
    if (window.React?.unstable_batchedUpdates) {
      const originalBatch = window.React.unstable_batchedUpdates;
      window.React.unstable_batchedUpdates = (callback) => {
        setTimeout(() => originalBatch(callback), OLD_BROWSER_CONFIG.BATCH_DELAY);
      };
    }
    
    // Cleanup periódico de memória
    const cleanupInterval = setInterval(() => {
      if (window.gc) {
        try {
          window.gc();
          console.log('♻️ Garbage collection executado');
        } catch (e) {
          // Ignore se não suportado
        }
      }
    }, OLD_BROWSER_CONFIG.CLEANUP_INTERVAL);
    
    // Mostrar notificação inicial discreta
    setTimeout(() => {
      showOldBrowserNotification('Sistema otimizado para seu computador', 3000);
    }, 1000);
    
    // Retornar função de cleanup
    return () => {
      clearInterval(cleanupInterval);
    };
  }
  
  return () => {}; // Cleanup vazio para PCs modernos
};