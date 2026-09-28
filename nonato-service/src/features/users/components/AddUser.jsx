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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const cleanEmail = formData.email.trim().toLowerCase();

    // FLUXO: GOOGLE APENAS
    if (googleOnly) {
      try {
        // 1. Adicionar email à lista de autorizados
        await addAuthorizedEmail(cleanEmail);

        // 2. Pré-criar o perfil no Firestore (com id = email) para guardar a função definida pelo admin
        await setDoc(doc(db, "authorized_profiles", cleanEmail), {
          email: cleanEmail,
          displayName: formData.displayName,
          role: formData.role,
          createdAt: new Date(),
        });

        onClose();
      } catch (err) {
        console.error("Erro ao autorizar email:", err);
        setError("Erro ao autorizar o email. Por favor, tente novamente.");
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
      // 1. Adicionar o email à lista de autorizados
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
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("Este email já está em uso.");
          break;
        case "auth/invalid-email":
          setError("Email inválido.");
          break;
        case "auth/weak-password":
          setError("A senha deve ter pelo menos 6 caracteres.");
          break;
        default:
          setError("Erro ao criar usuário. Por favor, tente novamente.");
      }
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