import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useRef } from "react";

const ProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // ✅ SUPER OTIMIZADO: Redireciona apenas quando necessário
    if (!loading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // ✅ RENDERIZAÇÃO ULTRARRÁPIDA: Sem delays ou spinners
  if (loading) {
    // Primeiro carregamento: fundo limpo sem loader
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
    );
  }

  // ✅ Se não autenticado, não renderiza nada (redirecionamento em andamento)
  if (!isAuthenticated) {
    return null;
  }

  // ✅ RENDERIZAÇÃO INSTANTÂNEA para usuários autenticados
  return children;
};

export default ProtectedRoute;
