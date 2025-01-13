import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para que o próximo render mostre a UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Você pode registrar o erro em um serviço de log
    console.error("Error capturado pelo ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen flex items-center justify-center">
          <h1 className="text-red-500 text-center">
            Algo deu errado: {this.state.error.message}
          </h1>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
