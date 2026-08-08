// ShopAccessWrapper.jsx - Modificado: Usuários logados têm acesso direto

import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { getAuth } from "firebase/auth";
import { useAuth } from "../../hooks/useAuth"; // ✅ NOVO: Importar hook de autenticação
import {
  Loader2,
  Store,
  User,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

// Componente para solicitar acesso quando tenta usar o carrinho
const RequestAccessModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  formData,
  setFormData,
  formErrors,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="mb-4">
          <h2 className="flex items-center text-xl font-bold text-white mb-2">
            <Store className="h-5 w-5 mr-2 text-green-500" />
            Solicitar Acesso à Loja
          </h2>
          <p className="text-zinc-400 text-sm">
            Para usar o carrinho e solicitar orçamentos, precisamos de algumas
            informações. Sua solicitação será analisada pela nossa equipe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.name}
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
              value={formData.email}
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
              value={formData.company}
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
              value={formData.phone}
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
              value={formData.notes}
              onChange={handleChange}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
              rows="3"
              placeholder="Informações adicionais (opcional)"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-zinc-600 text-white hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
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
          </div>
        </form>
      </div>
    </div>
  );
};

// Tela de acesso pendente
const AccessPendingScreen = ({ email, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Solicitação Enviada!
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Sua solicitação de acesso ao carrinho foi enviada. Entraremos em
            contato através do email{" "}
            <span className="text-white font-medium">{email}</span> assim que
            sua solicitação for aprovada.
          </p>
          <p className="text-amber-400 text-sm">
            Você pode continuar navegando na loja enquanto aguarda!
          </p>
        </div>

        <Button
          className="w-full bg-zinc-700 hover:bg-zinc-600"
          onClick={onClose}
        >
          Continuar Navegando
        </Button>
      </div>
    </div>
  );
};

// Tela de acesso rejeitado
const AccessRejectedScreen = ({ rejectionReason, onClose }) => {
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
            Sua solicitação de acesso ao carrinho não foi aprovada.
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

        <div className="space-y-2">
          <Button
            className="w-full bg-zinc-700 hover:bg-zinc-600"
            onClick={onClose}
          >
            Continuar Navegando
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-600 hover:bg-red-600/20 text-white"
            onClick={() => {
              window.location.href = `mailto:suporte@nonatoservice.com?subject=Sobre%20o%20acesso%20ao%20carrinho&body=Olá,%0A%0AEntro%20em%20contato%20referente%20ao%20meu%20pedido%20de%20acesso%20ao%20carrinho%20que%20foi%20rejeitado.%0A%0AAtenciosamente.`;
            }}
          >
            Entrar em Contato
          </Button>
        </div>
      </div>
    </div>
  );
};

const ShopAccessWrapper = ({ children }) => {
  // ✅ NOVO: Hook de autenticação para verificar usuário logado
  const { user, loading: authLoading } = useAuth();

  const [accessStatus, setAccessStatus] = useState("public"); // public, requesting, pending, approved, rejected
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [showRejectedScreen, setShowRejectedScreen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // ✅ NOVO: Loading state geral

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const auth = getAuth();

  useEffect(() => {
    const checkExistingAccess = async () => {
      try {
        setIsLoading(true);

        // ✅ NOVO: Se o usuário está logado na plataforma, tem acesso direto
        if (user && !authLoading) {
          console.log(
            "👤 Usuário logado detectado, concedendo acesso direto ao carrinho"
          );

          // Criar um "userToken" virtual baseado nos dados do usuário logado
          const loggedUserToken = {
            name: user.displayName || "",
            email: user.email || "",
            phone: "", // Pode ser expandido para buscar do perfil do usuário
            company: "", // Pode ser expandido para buscar do perfil do usuário
            token: "logged_user", // Token especial para usuários logados
            isLoggedUser: true, // Flag para identificar usuário logado
          };

          setUserToken(loggedUserToken);
          setAccessStatus("approved");
          setIsLoading(false);
          return;
        }

        // ✅ Lógica original para usuários não logados (verificar token salvo)
        if (!authLoading) {
          const savedToken = localStorage.getItem("shop_access_token");

          if (savedToken) {
            const tokenQuery = query(
              collection(db, "shop_access_tokens"),
              where("token", "==", savedToken),
              where("status", "==", "active"),
              limit(1)
            );

            const tokenSnapshot = await getDocs(tokenQuery);

            if (!tokenSnapshot.empty) {
              const tokenData = tokenSnapshot.docs[0].data();
              setUserToken(tokenData);

              if (tokenData.accessStatus === "approved") {
                setAccessStatus("approved");
              } else if (tokenData.accessStatus === "pending") {
                setAccessStatus("pending");
                setFormData({ email: tokenData.email || "" });
              } else if (tokenData.accessStatus === "rejected") {
                setAccessStatus("rejected");
                setRejectionReason(tokenData.rejectionReason || "");
              }
            } else {
              localStorage.removeItem("shop_access_token");
              setAccessStatus("public");
            }
          } else {
            setAccessStatus("public");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        setAccessStatus("public");
      } finally {
        setIsLoading(false);
      }
    };

    // Só executar quando a autenticação terminar de carregar
    if (!authLoading) {
      checkExistingAccess();
    }
  }, [user, authLoading]);

  // Função chamada quando tenta usar o carrinho
  const requestCartAccess = () => {
    // ✅ NOVO: Se o usuário está logado, não precisa solicitar acesso
    if (user) {
      console.log(
        "👤 Usuário já está logado, carrinho liberado automaticamente"
      );
      return;
    }

    if (accessStatus === "public") {
      setShowRequestModal(true);
    } else if (accessStatus === "pending") {
      setShowPendingScreen(true);
    } else if (accessStatus === "rejected") {
      setShowRejectedScreen(true);
    }
  };

  // Validar formulário
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    }

    if (!formData.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submeter solicitação de acesso
  const submitAccessRequest = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      // Gerar token único
      const generateToken = () => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let token = "";
        for (let i = 0; i < 8; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const token = generateToken();

      // Criar token de acesso
      await addDoc(collection(db, "shop_access_tokens"), {
        token,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        createdBy: "public_request",
        createdByName: "Solicitação Pública",
        createdAt: serverTimestamp(),
        status: "active",
        isComplete: true,
        accessStatus: "pending",
        requestedAt: serverTimestamp(),
        source: "cart_request",
      });

      // Salvar token
      localStorage.setItem("shop_access_token", token);

      // Atualizar estado
      setAccessStatus("pending");
      setShowRequestModal(false);
      setShowPendingScreen(true);

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
      });
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      setFormErrors({
        submit: "Erro ao enviar solicitação. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ NOVO: Loading screen enquanto verifica autenticação e acesso
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-white">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // ✅ NOVO: Determinar se pode usar carrinho
  const canUseCart = user || accessStatus === "approved";

  // Props para passar para o componente da loja
  const shopProps = {
    auth,
    canUseCart,
    requestCartAccess,
    userToken,
    isLoggedUser: !!user, // ✅ NOVO: Flag para identificar usuário logado
  };

  return (
    <>
      {React.cloneElement(children, shopProps)}

      {/* ✅ Modais só aparecem para usuários não logados */}
      {!user && (
        <>
          <RequestAccessModal
            isOpen={showRequestModal}
            onClose={() => setShowRequestModal(false)}
            onSubmit={submitAccessRequest}
            isSubmitting={isSubmitting}
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
          />

          {showPendingScreen && (
            <AccessPendingScreen
              email={formData.email}
              onClose={() => setShowPendingScreen(false)}
            />
          )}

          {showRejectedScreen && (
            <AccessRejectedScreen
              rejectionReason={rejectionReason}
              onClose={() => setShowRejectedScreen(false)}
            />
          )}
        </>
      )}
    </>
  );
};

export default ShopAccessWrapper;
