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
  // Contas Google (ex: @gmail.com) não precisam de senha: basta autorizar o
  // email. A conta e o documento em "users" são criados no primeiro login
  // com o botão "Entrar com Google" (ver useAuth.js).
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

    if (googleOnly) {
      try {
        await addAuthorizedEmail(formData.email.trim().toLowerCase());
        onClose();
      } catch (err) {
        console.error("Erro ao autorizar email:", err);
        setError("Erro ao autorizar o email. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ✅ Criar o novo utilizador numa instância secundária da app Firebase,
    // isolada da sessão principal. createUserWithEmailAndPassword autentica
    // automaticamente como o utilizador recém-criado NA INSTÂNCIA em que
    // corre — antes desta correção isso fazia o admin perder a sua própria
    // sessão (ficava autenticado como o novo utilizador assim que a app
    // recarregava). Usando uma instância à parte, a sessão do admin na app
    // principal nunca muda, por isso o setDoc abaixo corre como admin e as
    // regras de segurança permitem gravar o "role" escolhido no formulário.
    const secondaryApp = initializeApp(
      firebaseApp.options,
      `AddUser-${Date.now()}`
    );
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Adicionar o email à lista de autorizados
      await addAuthorizedEmail(formData.email);

      // 2. Criar usuário no Firebase Auth (sessão secundária, isolada)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );

      // 3. Adicionar informações adicionais no Firestore — corre com a
      // sessão do admin (instância principal), por isso pode definir o role.
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
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
      // Limpar a instância secundária, sem afetar a sessão principal
      try {
        await signOut(secondaryAuth);
      } catch {
        // instância vai ser destruída de seguida de qualquer forma
      }
      await deleteApp(secondaryApp).catch(() => {});
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <UserPlus className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Novo Usuário</h2>
            <p className="text-sm text-zinc-400">
              Adicione um novo usuário ao sistema
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
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

        <label className="flex items-start gap-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={googleOnly}
            onChange={(e) => setGoogleOnly(e.target.checked)}
            className="mt-1"
          />
          <span>
            Entra com Google (sem senha)
            <span className="block text-zinc-500">
              Para contas Gmail/Google. A pessoa entra com o botão &quot;Entrar com Google&quot;.
              Fica com a função &quot;Cliente&quot; no primeiro login; depois pode mudá-la na
              lista de utilizadores.
            </span>
          </span>
        </label>

        {!googleOnly && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              placeholder="Senha"
              required
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

        {!googleOnly && (
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
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
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
