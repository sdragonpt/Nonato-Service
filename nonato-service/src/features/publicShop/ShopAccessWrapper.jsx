// ShopAccessWrapper.jsx - Versão simplificada

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const ShopAccessWrapper = ({ children }) => {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [accessToken, setAccessToken] = useState("");

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);

      // Verificar se há um token na URL
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get("token");

      if (tokenFromUrl) {
        try {
          // Verificar se o token é válido
          const tokenQuery = query(
            collection(db, "shop_access_tokens"),
            where("token", "==", tokenFromUrl),
            where("status", "==", "active"),
            limit(1)
          );

          const tokenSnapshot = await getDocs(tokenQuery);

          if (!tokenSnapshot.empty) {
            // Token válido encontrado na URL, salvá-lo e permitir acesso
            localStorage.setItem("shop_access_token", tokenFromUrl);

            // Limpar URL para não manter o token visível na barra de endereço
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            setIsCheckingAccess(false);
            return;
          }
        } catch (err) {
          console.error("Erro ao verificar token da URL:", err);
        }
      }

      // Verificar primeiro se há um usuário logado no sistema principal
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user && !user.isAnonymous) {
          // Se o usuário está logado no sistema principal, permitir acesso
          setIsCheckingAccess(false);
          return;
        }

        // Se chegou aqui, não há um usuário logado. Verificar token
        // Verificar se tem token salvo
        const savedToken = localStorage.getItem("shop_access_token");

        if (savedToken) {
          try {
            // Buscar o token no Firestore
            console.log("Verificando token:", savedToken);
            const tokenQuery = query(
              collection(db, "shop_access_tokens"),
              where("token", "==", savedToken),
              where("status", "==", "active"),
              limit(1)
            );

            const tokenSnapshot = await getDocs(tokenQuery);

            if (!tokenSnapshot.empty) {
              // Token encontrado e está ativo
              console.log("Token válido, permitindo acesso");
              setIsCheckingAccess(false);
              return;
            } else {
              // Token não encontrado ou não está ativo
              console.log(
                "Token inválido ou revogado, removendo do localStorage"
              );
              localStorage.removeItem("shop_access_token");
            }
          } catch (err) {
            console.error("Erro ao verificar token:", err);
            localStorage.removeItem("shop_access_token");
          }
        }

        // Se chegou aqui, não tem token válido
        setShowAccessForm(true);
        setIsCheckingAccess(false);
      });

      return () => unsubscribe && unsubscribe();
    };

    checkAccess();
  }, []);

  // Validar token de acesso
  const validateToken = async () => {
    if (!accessToken.trim()) {
      setAccessError("Por favor, insira um token de acesso");
      return;
    }

    try {
      setAccessError(null);

      // Verificar se o token existe e está ativo
      const tokenQuery = query(
        collection(db, "shop_access_tokens"),
        where("token", "==", accessToken),
        where("status", "==", "active"),
        limit(1)
      );

      const tokenSnapshot = await getDocs(tokenQuery);
      if (!tokenSnapshot.empty) {
        // Token válido, salvar e permitir acesso
        localStorage.setItem("shop_access_token", accessToken);
        setShowAccessForm(false);
      } else {
        setAccessError("Token inválido ou revogado");
      }
    } catch (err) {
      console.error("Erro ao validar token:", err);
      setAccessError("Erro ao validar token. Por favor, tente novamente.");
    }
  };

  // Componente de formulário de acesso
  const AccessForm = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <img
            src="/nonato.png"
            alt="Nonato Service Logo"
            className="h-12 w-12 mr-3"
          />
          <h3 className="text-xl font-bold text-white">Acesso à Loja</h3>
        </div>

        {accessError && (
          <Alert
            variant="destructive"
            className="border-red-500 bg-red-500/10 mb-4"
          >
            <AlertDescription className="text-red-400">
              {accessError}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1 block">
              Token de Acesso
            </label>
            <Input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="bg-zinc-700 border-zinc-600 text-white"
              placeholder="Insira seu token de acesso"
            />
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 mt-2"
            onClick={validateToken}
          >
            Acessar Loja
          </Button>

          <div className="text-center mt-4 text-sm text-zinc-400">
            <p>
              Para obter um token de acesso, entre em contato com um
              representante da Nonato Service.
            </p>
            <p className="mt-2">
              <button
                onClick={() => navigate("/app")}
                className="text-green-500 hover:text-green-400"
              >
                Voltar para o painel principal
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isCheckingAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (showAccessForm) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <AccessForm />
      </div>
    );
  }

  // Renderiza o conteúdo da loja
  return React.cloneElement(children, { auth: auth });
};

export default ShopAccessWrapper;
