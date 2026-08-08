// components/layout/ErrorBoundary.jsx - VERSÃO CORRIGIDA
// Antes: erros com "removeChild"/"insertBefore"/"appendChild"/"Node" eram
// automaticamente etiquetados como "Erro de Compatibilidade (PC Antigo)",
// mesmo em browsers atualizados/telemóveis modernos. Essa etiqueta era só
// um filtro de texto na mensagem de erro, não uma deteção real de hardware.
// Isto escondia o erro real e impedia de o corrigir. Agora: mostra sempre
// o erro tal como é, e regista SEMPRE (não só em dev) a mensagem, stack e
// componentStack na consola, para conseguirmos apanhar o componente exato
// da próxima vez que isto acontecer.
import React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log completo, sempre (produção incluída) — é a única forma de
    // conseguirmos apanhar o stacktrace real quando isto acontece a um
    // cliente, em vez de adivinhar.
    console.error("[ErrorBoundary] Erro capturado:", {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoBack = () => {
    try {
      window.history.back();
    } catch (error) {
      window.location.href = "/app/parts-library";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 bg-zinc-900">
          <div className="max-w-md w-full space-y-4">
            {/* Alert principal */}
            <div className="p-4 rounded-lg border border-red-500 bg-red-500/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-400">
                    ❌ Algo deu errado
                  </h3>

                  <div className="mt-2 text-sm text-red-300">
                    <p>{this.state.error?.message || "Erro inesperado"}</p>

                    {this.state.retryCount > 0 && (
                      <p className="mt-2 text-xs">
                        Tentativas: {this.state.retryCount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>

              <button
                onClick={this.handleGoBack}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium border border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              {this.state.retryCount > 1 && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium border border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar Página
                </button>
              )}
            </div>

            {/* Detalhes técnicos — mostrados sempre, não só em dev, para
                dar para ler o stack diretamente no telemóvel/PC do cliente
                se for preciso (ex: pedir print). */}
            {this.state.error && (
              <details className="mt-4 p-3 bg-zinc-800 rounded text-xs text-zinc-400" open={false}>
                <summary className="cursor-pointer mb-2 font-medium">
                  Detalhes Técnicos
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-32 text-xs">
                  {this.state.error.stack || this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;