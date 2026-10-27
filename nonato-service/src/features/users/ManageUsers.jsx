import { useState, useEffect, useMemo } from "react";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { OWNER_EMAILS, revokeAuthorizedEmail } from "../../hooks/useAuth.js";
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
  Clock,
  X,
} from "lucide-react";

import AddUser from "./components/AddUser.jsx";
import EditUser from "./components/EditUser.jsx";
import { getRoleLabel, getRoleBadgeStyle, isStaffRole } from "../../config/roles.js";
import { PageHeader } from "../../components/app";

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

  // Emails com acesso e convites (nome/função escolhidos ao autorizar).
  const [authorizedEmails, setAuthorizedEmails] = useState([]);
  const [invites, setInvites] = useState(new Map());
  useEffect(() => {
    const unsubEmails = onSnapshot(
      doc(db, "config", "authorizedEmails"),
      (snap) => setAuthorizedEmails(snap.data()?.emails || []),
      (err) => console.error("Erro ao ler emails autorizados:", err)
    );
    const unsubInvites = onSnapshot(
      collection(db, "authorized_profiles"),
      (snap) => setInvites(new Map(snap.docs.map((d) => [d.id, d.data()]))),
      (err) => console.error("Erro ao ler convites:", err)
    );
    return () => {
      unsubEmails();
      unsubInvites();
    };
  }, []);

  // Convites pendentes: emails com acesso que ainda não entraram na app.
  const pendingInvites = useMemo(() => {
    const registered = new Set(users.map((u) => (u.email || "").toLowerCase()));
    return authorizedEmails
      .filter((email) => !registered.has(email.toLowerCase()) && !OWNER_EMAILS.includes(email))
      .map((email) => ({ email, ...invites.get(email) }));
  }, [authorizedEmails, invites, users]);

  const cancelInvite = async (email) => {
    if (!window.confirm(`Retirar o acesso a ${email}?`)) return;
    try {
      await revokeAuthorizedEmail(email);
    } catch (err) {
      console.error("Erro ao cancelar convite:", err);
      setError(
        err?.code === "permission-denied"
          ? "A sua conta não tem permissão para gerir acessos. É preciso ter a função Administrador."
          : "Não foi possível retirar o acesso. Tente novamente."
      );
    }
  };

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

      // 2. Retirar o acesso (lista de emails autorizados + convite).
      // As contas dono nunca são retiradas.
      if (userToDelete.email) await revokeAuthorizedEmail(userToDelete.email);

      // 3. Delete from Firebase Authentication
      // IMPORTANTE: Isto deve ser feito através de uma função do backend/Cloud Function
      // Não é possível deletar outros usuários diretamente do cliente por questões de segurança
      // Você precisará criar uma API ou Cloud Function para fazer esta operação

      // A lista atualiza-se sozinha via onSnapshot (UsersContext)
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar usuário:", err);
      setError(
        err?.code === "permission-denied"
          ? "A sua conta não tem permissão para apagar utilizadores. É preciso ter a função Administrador."
          : "Erro ao deletar usuário. Por favor, tente novamente."
      );
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
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Users}
        title="Gerenciar Usuários"
        description="Gerencie todas as contas de usuário em um só lugar"
        actions={
          <>
            <Button
            onClick={() => setAddUserDialogOpen(true)}
            className="hidden sm:flex"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Equipa Interna
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {stats.staff}
              </h3>
            </div>
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clientes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {stats.client}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Lista de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white/5 border-border">
                <TableCell className="text-muted-foreground">Nome</TableCell>
                <TableCell className="text-muted-foreground">Email</TableCell>
                <TableCell className="text-muted-foreground">Função</TableCell>
                <TableCell className="text-muted-foreground">Ações</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-white/5 border-border"
                >
                  <TableCell className="text-foreground">
                    {user.displayName || "N/A"}
                  </TableCell>
                  <TableCell className="text-foreground">{user.email}</TableCell>
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
                        className="text-muted-foreground"
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

      {/* Convites pendentes — autorizados que ainda não entraram */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Convites pendentes
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Estas pessoas já têm acesso mas ainda não entraram na app. Ficam com a função
              indicada no primeiro login.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {pendingInvites.map((inv) => (
                <li key={inv.email} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{inv.displayName || inv.email}</p>
                    {inv.displayName && (
                      <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                    )}
                  </div>
                  <Badge className={getRoleBadgeStyle(inv.role || "client")}>
                    {getRoleLabel(inv.role || "client")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Retirar acesso"
                    onClick={() => cancelInvite(inv.email)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o usuário{" "}
              <span className="font-semibold text-foreground">
                {userToDelete?.displayName || userToDelete?.email}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-accent"
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
        <DialogContent className="sm:max-w-[425px]">
          <AddUser onClose={() => setAddUserDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
          className="rounded-full shadow-lg"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageUsers;
