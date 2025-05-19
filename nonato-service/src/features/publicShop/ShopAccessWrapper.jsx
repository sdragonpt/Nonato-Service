// ShopAccessWrapper.jsx - Versão adaptada para sistema de aprovação

import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Store,
  User,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

// Componente para exibir o status de acesso pendente
const AccessPendingScreen = ({ email }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Solicitação em Análise
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Seu pedido de acesso à loja está sendo analisado pela nossa equipe.
            Entraremos em contato através do email{" "}
            <span className="text-white font-medium">{email}</span> assim que
            sua solicitação for processada.
          </p>
        </div>

        <div className="bg-amber-500/10 p-4 rounded-md border border-amber-500/30 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Este processo geralmente leva até 24 horas úteis. Agradecemos sua
              paciência!
            </p>
          </div>
        </div>

        <Button
          className="w-full bg-zinc-700 hover:bg-zinc-600"
          onClick={() => navigate("/")}
        >
          Voltar para Página Inicial
        </Button>
      </div>
    </div>
  );
};

// Componente para exibir o status de acesso rejeitado
const AccessRejectedScreen = ({ rejectionReason, email }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Acesso Não Autorizado
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Seu pedido de acesso à loja não foi aprovado. Por favor, entre em
            contato com nossa equipe de suporte para mais informações.
          </p>
        </div>

        {rejectionReason && (
          <div className="bg-red-500/10 p-4 rounded-md border border-red-500/30 mb-6">
            <p className="text-sm text-white font-medium mb-1">
              Motivo informado:
            </p>
            <p className="text-sm text-red-400 whitespace-pre-line">
              {rejectionReason}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            className="w-full bg-zinc-700 hover:bg-zinc-600"
            onClick={() => navigate("/")}
          >
            Voltar para Página Inicial
          </Button>

          <Button
            variant="outline"
            className="w-full border-red-600 hover:bg-red-600/20 text-white"
            onClick={() => {
              window.location.href = `mailto:suporte@nonatoservice.com?subject=Sobre%20o%20acesso%20à%20loja&body=Olá,%0A%0AEntro%20em%20contato%20referente%20ao%20meu%20pedido%20de%20acesso%20à%20loja%20que%20foi%20rejeitado.%0A%0AMeu%20email%20cadastrado:%20${email}%0A%0AAtenciosamente.`;
            }}
          >
            Entrar em Contato
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente separado para o modal de informações do usuário
const UserInfoForm = ({
  userInfo,
  setUserInfo,
  onSubmit,
  formErrors,
  isSubmitting,
}) => {
  // Função local para manipular as alterações nos campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="mb-4">
          <h2 className="flex items-center text-xl font-bold text-white mb-2">
            <Store className="h-5 w-5 mr-2 text-green-500" />
            Complete seu cadastro para solicitar acesso
          </h2>
          <p className="text-zinc-400 text-sm">
            Preencha suas informações para solicitar acesso à loja. Sua
            solicitação será analisada pela nossa equipe.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {formErrors.submit && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertDescription className="text-red-400">
                {formErrors.submit}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 flex items-center">
              <User className="h-4 w-4 mr-2 text-zinc-400" />
              Nome <span className="text-red-400 ml-1">*</span>
            </label>
            <Input
              name="name"
              value={userInfo.name}
              onChange={handleChange}
              className={`bg-zinc-700 border-zinc-600 text-white ${
                formErrors.name ? "border-red-500" : ""
              }`}
              placeholder="Seu nome completo"
              autoFocus
            />
            {formErrors.name && (
              <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 flex items-center">
              <Mail className="h-4 w-4 mr-2 text-zinc-400" />
              Email <span className="text-red-400 ml-1">*</span>
            </label>
            <Input
              name="email"
              type="email"
              value={userInfo.email}
              onChange={handleChange}
              className={`bg-zinc-700 border-zinc-600 text-white ${
                formErrors.email ? "border-red-500" : ""
              }`}
              placeholder="seu@email.com"
            />
            {formErrors.email && (
              <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-zinc-400" />
              Empresa
            </label>
            <Input
              name="company"
              value={userInfo.company}
              onChange={handleChange}
              className="bg-zinc-700 border-zinc-600 text-white"
              placeholder="Nome da sua empresa (opcional)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 flex items-center">
              <Phone className="h-4 w-4 mr-2 text-zinc-400" />
              Telemóvel
            </label>
            <Input
              name="phone"
              value={userInfo.phone}
              onChange={handleChange}
              className="bg-zinc-700 border-zinc-600 text-white"
              placeholder="Seu número de telemóvel"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-zinc-400" />
              Observações
            </label>
            <textarea
              name="notes"
              value={userInfo.notes}
              onChange={handleChange}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
              rows="3"
              placeholder="Informações adicionais ou observações (opcional)"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 w-full mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar Acesso"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

// Componente separado para o formulário de acesso
const AccessTokenForm = ({
  accessToken,
  setAccessToken,
  validateToken,
  accessError,
  navigate,
}) => {
  return (
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

        <form onSubmit={validateToken} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1 block">
              Token de Acesso
            </label>
            <Input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="bg-zinc-700 border-zinc-600 text-white"
              placeholder="Insira seu token de acesso"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 mt-2"
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
                type="button"
                onClick={() => navigate("/app")}
                className="text-green-500 hover:text-green-400"
              >
                Voltar para o painel principal
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const ShopAccessWrapper = ({ children }) => {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [accessToken, setAccessToken] = useState("");

  // Estados para o modal de informações adicionais
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenId, setTokenId] = useState(null);
  const [userInfo, setUserInfo] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Novos estados para controlar as telas de status
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [showRejectedScreen, setShowRejectedScreen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
            // Token válido encontrado na URL
            const tokenData = tokenSnapshot.docs[0].data();
            const tokenDocId = tokenSnapshot.docs[0].id;

            // Limpar URL para não manter o token visível na barra de endereço
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            // Salvar o token no localStorage
            localStorage.setItem("shop_access_token", tokenFromUrl);

            // Verificar se o token já foi aprovado para acesso
            if (tokenData.accessStatus === "approved") {
              // Token aprovado, permitir acesso direto
              setIsCheckingAccess(false);
              return;
            }
            // Se o acesso foi rejeitado, mostrar tela de rejeição
            else if (tokenData.accessStatus === "rejected") {
              setRejectionReason(tokenData.rejectionReason || "");
              setShowRejectedScreen(true);
              setIsCheckingAccess(false);
              return;
            }
            // Se o acesso está pendente, mostrar tela de aguarde
            else if (tokenData.accessStatus === "pending") {
              setShowPendingScreen(true);
              setIsCheckingAccess(false);
              return;
            }
            // Se o token não tem informações completas, mostrar formulário
            else if (!tokenData.isComplete) {
              // Token não está completo, mostrar modal para preenchimento
              setTokenInfo(tokenData);
              setTokenId(tokenDocId);
              setUserInfo({
                name: tokenData.name || "",
                company: tokenData.company || "",
                email: tokenData.email || "",
                phone: tokenData.phone || "",
                notes: "",
              });
              setShowInfoModal(true);
              setIsCheckingAccess(false);
              return;
            }
          } else {
            localStorage.removeItem("shop_access_token");
            setAccessError("Token inválido ou revogado");
            setShowAccessForm(true);
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
              const tokenData = tokenSnapshot.docs[0].data();
              const tokenDocId = tokenSnapshot.docs[0].id;

              // Verificar se o token foi aprovado para acesso
              if (tokenData.accessStatus === "approved") {
                // Token aprovado, permitir acesso
                console.log("Token válido e aprovado, permitindo acesso");

                // Atualizar timestamp de último acesso
                try {
                  await updateDoc(doc(db, "shop_access_tokens", tokenDocId), {
                    lastAccess: serverTimestamp(),
                  });
                } catch (updateErr) {
                  console.warn("Erro ao atualizar lastAccess:", updateErr);
                }

                setIsCheckingAccess(false);
                return;
              }
              // Se o acesso foi rejeitado, mostrar tela de rejeição
              else if (tokenData.accessStatus === "rejected") {
                setRejectionReason(tokenData.rejectionReason || "");
                setUserInfo({
                  email: tokenData.email || "",
                });
                setShowRejectedScreen(true);
                setIsCheckingAccess(false);
                return;
              }
              // Se o acesso está pendente, mostrar tela de aguarde
              else if (tokenData.accessStatus === "pending") {
                setUserInfo({
                  email: tokenData.email || "",
                });
                setShowPendingScreen(true);
                setIsCheckingAccess(false);
                return;
              }
              // Se o token não tem informações completas, mostrar formulário
              else if (!tokenData.isComplete) {
                // Token não está completo, exibir modal
                setTokenInfo(tokenData);
                setTokenId(tokenDocId);
                setUserInfo({
                  name: tokenData.name || "",
                  company: tokenData.company || "",
                  email: tokenData.email || "",
                  phone: tokenData.phone || "",
                  notes: "",
                });
                setShowInfoModal(true);
                setIsCheckingAccess(false);
                return;
              }
            } else {
              // Token não encontrado ou não está ativo
              console.log(
                "Token inválido ou revogado, removendo do localStorage"
              );
              localStorage.removeItem("shop_access_token");
              setAccessError("Token inválido ou revogado");
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
  const validateToken = async (e) => {
    e.preventDefault(); // Prevenir submit do form

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
        const tokenData = tokenSnapshot.docs[0].data();
        const tokenDocId = tokenSnapshot.docs[0].id;

        // Salvar o token no localStorage
        localStorage.setItem("shop_access_token", accessToken);

        // Verificar o status de acesso do token
        if (tokenData.accessStatus === "approved") {
          // Token aprovado, permitir acesso direto
          try {
            await updateDoc(doc(db, "shop_access_tokens", tokenDocId), {
              lastAccess: serverTimestamp(),
            });
          } catch (updateErr) {
            console.warn("Erro ao atualizar lastAccess:", updateErr);
          }

          setShowAccessForm(false);
          window.location.reload(); // Para inicializar a loja
          return;
        }
        // Se o acesso foi rejeitado, mostrar tela de rejeição
        else if (tokenData.accessStatus === "rejected") {
          setRejectionReason(tokenData.rejectionReason || "");
          setUserInfo({
            email: tokenData.email || "",
          });
          setShowRejectedScreen(true);
          setShowAccessForm(false);
          return;
        }
        // Se o acesso está pendente, mostrar tela de aguarde
        else if (tokenData.accessStatus === "pending") {
          setUserInfo({
            email: tokenData.email || "",
          });
          setShowPendingScreen(true);
          setShowAccessForm(false);
          return;
        }
        // Se o token não tem informações completas, mostrar formulário
        else if (!tokenData.isComplete) {
          setTokenInfo(tokenData);
          setTokenId(tokenDocId);
          setUserInfo({
            name: tokenData.name || "",
            company: tokenData.company || "",
            email: tokenData.email || "",
            phone: tokenData.phone || "",
            notes: "",
          });
          setShowInfoModal(true);
          setShowAccessForm(false);
          return;
        }
      } else {
        setAccessError("Token inválido ou revogado");
      }
    } catch (err) {
      console.error("Erro ao validar token:", err);
      setAccessError("Erro ao validar token. Por favor, tente novamente.");
    }
  };

  // Manipular mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validar formulário de informações
  const validateForm = () => {
    const errors = {};

    if (!userInfo.name.trim()) {
      errors.name = "Nome é obrigatório";
    }

    if (!userInfo.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(userInfo.email)) {
      errors.email = "Email inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submeter informações adicionais
  const submitUserInfo = async (e) => {
    e.preventDefault(); // Prevenir submit do form

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Atualizar o documento do token com as novas informações
      const tokenRef = doc(db, "shop_access_tokens", tokenId);

      await updateDoc(tokenRef, {
        name: userInfo.name,
        company: userInfo.company,
        email: userInfo.email,
        phone: userInfo.phone,
        notes: userInfo.notes,
        isComplete: true,
        accessRequested: true,
        accessStatus: "pending", // pending, approved, rejected
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Mostrar a tela de pendente após enviar as informações
      setShowInfoModal(false);
      setShowPendingScreen(true);
    } catch (error) {
      console.error("Erro ao enviar pedido de acesso:", error);
      setFormErrors({
        submit:
          "Ocorreu um erro ao processar as informações. Por favor, tente novamente.",
      });
      setIsSubmitting(false);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Mostrar tela de acesso pendente
  if (showPendingScreen) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <AccessPendingScreen email={userInfo.email} />
      </div>
    );
  }

  // Mostrar tela de acesso rejeitado
  if (showRejectedScreen) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <AccessRejectedScreen
          rejectionReason={rejectionReason}
          email={userInfo.email}
        />
      </div>
    );
  }

  // Se o modal de informações estiver aberto, mostrar o modal
  if (showInfoModal) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <UserInfoForm
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          onSubmit={submitUserInfo}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  if (showAccessForm) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <AccessTokenForm
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          validateToken={validateToken}
          accessError={accessError}
          navigate={navigate}
        />
      </div>
    );
  }

  // Renderiza o conteúdo da loja
  return React.cloneElement(children, { auth: auth });
};

export default ShopAccessWrapper;
