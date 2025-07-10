// components/layout/ErrorBoundary.jsx - VERSÃO MELHORADA
import React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isDOMError: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Detectar se é erro comum de PC antigo
    const isDOMError =
      error.message?.includes("removeChild") ||
      error.message?.includes("insertBefore") ||
      error.message?.includes("appendChild") ||
      error.message?.includes("Node");

    return {
      hasError: true,
      error,
      isDOMError,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log melhorado para PCs antigos
    if (this.state.isDOMError) {
      console.warn("🔧 Erro de DOM capturado (PC antigo):", error, errorInfo);
    } else {
      console.error("Error capturado pelo ErrorBoundary:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1,
      isDOMError: false,
    });

    // Callback customizado se fornecido
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoBack = () => {
    try {
      window.history.back();
    } catch (error) {
      // Fallback para biblioteca de peças
      window.location.href = "/app/parts-library";
    }
  };

  render() {
    if (this.state.hasError) {
      const isOldBrowserError = this.state.isDOMError;

      return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 bg-zinc-900">
          <div className="max-w-md w-full space-y-4">
            {/* Alert principal */}
            <div
              className={`p-4 rounded-lg border ${
                isOldBrowserError
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-red-500 bg-red-500/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`h-5 w-5 mt-0.5 ${
                    isOldBrowserError ? "text-amber-400" : "text-red-400"
                  }`}
                />
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isOldBrowserError ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {isOldBrowserError
                      ? "🖥️ Erro de Compatibilidade (PC Antigo)"
                      : "❌ Algo deu errado"}
                  </h3>

                  <div
                    className={`mt-2 text-sm ${
                      isOldBrowserError ? "text-amber-300" : "text-red-300"
                    }`}
                  >
                    {isOldBrowserError ? (
                      <div className="space-y-2">
                        <p>
                          O navegador teve dificuldade com a última operação.
                          Isso é comum em sistemas mais antigos.
                        </p>
                        <p className="text-xs bg-amber-900/30 p-2 rounded">
                          💡 <strong>Dica:</strong> A operação provavelmente foi
                          concluída com sucesso, mesmo com este erro de
                          compatibilidade.
                        </p>
                      </div>
                    ) : (
                      <p>{this.state.error?.message || "Erro inesperado"}</p>
                    )}

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
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isOldBrowserError
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                {isOldBrowserError
                  ? "Continuar (Ignorar Erro)"
                  : "Tentar Novamente"}
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

            {/* Detalhes técnicos (só em desenvolvimento) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 p-3 bg-zinc-800 rounded text-xs text-zinc-400">
                <summary className="cursor-pointer mb-2 font-medium">
                  Detalhes Técnicos (Dev)
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-32 text-xs">
                  {this.state.error.toString()}
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
