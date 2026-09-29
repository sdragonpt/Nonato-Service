import { useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, firebaseApp } from "../../../firebase";
import { addAuthorizedEmail } from "../../../hooks/useAuth";
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ROLE_OPTIONS } from "../../../config/roles.js";

const AddUser = ({ onClose }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "client", // default role
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  // Mensagem clara para cada motivo de erro, em vez de um "tente novamente" genérico.
  const errorMessage = (err) => {
    switch (err?.code) {
      case "permission-denied":
        return "A sua conta não tem permissão para adicionar utilizadores. É preciso ter a função Administrador.";
      case "auth/email-already-in-use":
        return "Este email já tem conta (por exemplo, já entrou com o Google). Marque \"Entra com Google (sem senha)\" para só lhe dar acesso.";
      case "auth/invalid-email":
        return "Email inválido.";
      case "auth/weak-password":
        return "A senha deve ter pelo menos 6 caracteres.";
      case "auth/operation-not-allowed":
        return "O login com email e senha está desligado no Firebase. Use a opção \"Entra com Google\".";
      case "unavailable":
      case "auth/network-request-failed":
        return "Sem ligação à internet. Tente de novo.";
      default:
        return `Erro ao criar utilizador${err?.code ? ` (${err.code})` : ""}. Tente novamente.`;
    }
  };

  // Convite: guarda o nome e a função escolhidos; aplicados no primeiro
  // login (useAuth.js). Com id = email.
  const saveInvite = (cleanEmail) =>
    setDoc(doc(db, "authorized_profiles", cleanEmail), {
      email: cleanEmail,
      displayName: formData.displayName,
      role: formData.role,
      createdAt: new Date(),
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const cleanEmail = formData.email.trim().toLowerCase();

    // FLUXO: GOOGLE APENAS
    if (googleOnly) {
      try {
        // 1. Guardar o convite (função escolhida) e 2. dar acesso ao email
        await saveInvite(cleanEmail);
        await addAuthorizedEmail(cleanEmail);

        onClose();
      } catch (err) {
        console.error("Erro ao autorizar email:", err);
        setError(errorMessage(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // FLUXO: EMAIL E SENHA (INSTÂNCIA SECUNDÁRIA)
    const secondaryApp = initializeApp(
      firebaseApp.options,
      `AddUser-${Date.now()}`
    );
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Guardar o convite e adicionar o email à lista de autorizados
      await saveInvite(cleanEmail);
      await addAuthorizedEmail(cleanEmail);

      // 2. Criar usuário no Firebase Auth (instância secundária)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        cleanEmail,
        formData.password
      );

      // 3. Criar documento no Firestore com sessão do Admin principal
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: cleanEmail,
        displayName: formData.displayName,
        photoURL: "",
        createdAt: new Date(),
        lastLogin: new Date(),
        role: formData.role,
      });

      onClose();
    } catch (err) {
      console.error("Erro ao criar usuário:", err);
      setError(errorMessage(err));
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // Ignora erro no logout secundário
      }
      await deleteApp(secondaryApp).catch(() => {});
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header acessível para o Dialog */}
      <DialogHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white text-left">
                Novo Usuário
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-400 text-left">
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              placeholder="Nome do usuário"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              placeholder="Email do usuário"
              required
            />
          </div>
        </div>

        {/* Checkbox Google */}
        <label className="flex items-start gap-2 text-sm text-zinc-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={googleOnly}
            onChange={(e) => setGoogleOnly(e.target.checked)}
            className="mt-1 rounded border-zinc-700 bg-zinc-900"
          />
          <span>
            Entra com Google (sem senha)
            <span className="block text-xs text-zinc-500">
              A pessoa autentica-se com a sua conta Google.
            </span>
          </span>
        </label>

        {/* Senha (apenas se não for Google) */}
        {!googleOnly && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                placeholder="Senha"
                required={!googleOnly}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Função / Role */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Função</label>
          <Select value={formData.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {ROLE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white hover:bg-zinc-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botão de Envio */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando usuário...
            </>
          ) : (
            "Criar Usuário"
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddUser;