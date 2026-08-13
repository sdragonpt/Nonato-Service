import { useState, useEffect } from "react";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Trash2,
  Edit2,
  Loader2,
  AlertTriangle,
  Users,
  UserPlus,
  Shield,
} from "lucide-react";

import AddUser from "./components/AddUser.jsx";
import EditUser from "./components/EditUser.jsx";
import { getRoleLabel, getRoleBadgeStyle, isStaffRole } from "../../config/roles.js";

const ManageUsers = () => {
  // ✅ Tempo real (onSnapshot) via UsersContext partilhado — a lista
  // atualiza-se sozinha, sem precisar de um botão "Atualizar" manual.
  const { users, error: usersError, ensureUsers } = useUsers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  useEffect(() => {
    ensureUsers().finally(() => setLoading(false));
  }, [ensureUsers]);

  useEffect(() => {
    if (usersError) setError(usersError);
  }, [usersError]);

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openEditUser = (user) => {
    setUserToEdit(user);
    setEditUserDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);

      // 1. Delete from Firestore users collection
      await deleteDoc(doc(db, "users", userToDelete.id));

      // 2. Remove from authorized emails config
      const configRef = doc(db, "config", "authorizedEmails");
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const currentEmails = configDoc.data().emails;
        const updatedEmails = currentEmails.filter(
          (email) => email !== userToDelete.email
        );
        await setDoc(configRef, { emails: updatedEmails });
      }

      // 3. Delete from Firebase Authentication
      // IMPORTANTE: Isto deve ser feito através de uma função do backend/Cloud Function
      // Não é possível deletar outros usuários diretamente do cliente por questões de segurança
      // Você precisará criar uma API ou Cloud Function para fazer esta operação

      // A lista atualiza-se sozinha via onSnapshot (UsersContext)
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar usuário:", err);
      setError("Erro ao deletar usuário. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: users.length,
    staff: users.filter((user) => isStaffRole(user.role)).length,
    client: users.filter((user) => user.role === "client" || !user.role).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
          <p className="text-sm text-zinc-400">
            Gerencie todas as contas de usuário em um só lugar
          </p>
        </div>
        <Button
          onClick={() => setAddUserDialogOpen(true)}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Equipa Interna
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.staff}
              </h3>
            </div>
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Clientes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.client}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Lista de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-zinc-800 border-zinc-700">
                <TableCell className="text-zinc-400">Nome</TableCell>
                <TableCell className="text-zinc-400">Email</TableCell>
                <TableCell className="text-zinc-400">Função</TableCell>
                <TableCell className="text-zinc-400">Ações</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-zinc-700/50 border-zinc-700"
                >
                  <TableCell className="text-white">
                    {user.displayName || "N/A"}
                  </TableCell>
                  <TableCell className="text-white">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeStyle(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditUser(user)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(user)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o usuário{" "}
              <span className="font-semibold text-white">
                {userToDelete?.displayName || userToDelete?.email}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-[425px]">
          <AddUser onClose={() => setAddUserDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 sm:max-w-[425px]">
          <EditUser
            user={userToEdit}
            onClose={() => {
              setEditUserDialogOpen(false);
              setUserToEdit(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => setAddUserDialogOpen(true)}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageUsers;
