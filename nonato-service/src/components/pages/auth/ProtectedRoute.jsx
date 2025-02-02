import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [error] = useState(null);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 max-w-md w-full">
          <p className="text-red-500">Erro ao verificar autenticação.</p>
        </div>
      </div>
    );
  }

  // Se não houver usuário, redireciona para o login com um pequeno delay
  if (!user) {
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 0);
    return null;
  }

  return children;
};

export default ProtectedRoute;
