// src/features/users/components/EditUser.jsx
// Edita os dados de um utilizador já existente (nome + função/role).
// O email de login e a password ficam de fora de propósito: alterar
// credenciais de autenticação de OUTRO utilizador exige o Admin SDK
// (Cloud Function), não é possível fazer isso em segurança a partir do
// cliente — por isso o email aparece só como leitura.
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  Mail,
  User,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Info,
  UserCog,
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

const EditUser = ({ user, onClose, onUpdated }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [role, setRole] = useState(user?.role || "client");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsLoading(true);
    setError("");

    try {
      await updateDoc(doc(db, "users", user.id), {
        displayName: displayName.trim(),
        role,
        updatedAt: new Date(),
      });

      onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
      setError("Erro ao atualizar usuário. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <UserCog className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Editar Usuário</h2>
            <p className="text-sm text-zinc-400">Atualize o nome e a função do usuário</p>
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              value={user?.email || ""}
              disabled
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-500 disabled:opacity-70"
            />
          </div>
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            O email de login não pode ser alterado por aqui.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Função</label>
          <Select value={role} onValueChange={setRole}>
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

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            "Guardar Alterações"
          )}
        </Button>
      </form>
    </div>
  );
};

export default EditUser;
