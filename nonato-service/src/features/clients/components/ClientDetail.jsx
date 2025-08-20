// src/features/clients/components/ClientDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Edit2,
  Trash2,
  Users,
  Printer,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Euro,
  Calculator,
  FileText,
  Package,
  CreditCard,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// Financial Components
import {
  PaymentStatusBadge,
  PaymentStatusButtons,
} from "../../../components/financial/FinancialComponents";
import {
  calculateServiceFinancials,
  getPaymentStatus,
  formatPrice,
} from "../../../utils/financialUtils";

// ===================================
// COMPONENTE DE SEÇÃO FINANCEIRA
// ===================================
const ClientFinancialSection = ({ clientId }) => {
  const [financialData, setFinancialData] = useState({
    partsBudgets: [],
    closures: [],
    summary: {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      vatTotal: 0,
      salesTotal: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch dados financeiros do cliente
  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);

      // Buscar orçamentos de peças (isQuote: true)
      const partsBudgetsQuery = query(
        collection(db, "ordens"),
        where("clientId", "==", clientId),
        where("isQuote", "==", true)
      );

      // Buscar fechamentos (orçamentos regulares)
      const closuresQuery = query(
        collection(db, "orcamentos"),
        where("clientId", "==", clientId)
      );

      const [partsBudgetsSnapshot, closuresSnapshot] = await Promise.all([
        getDocs(partsBudgetsQuery),
        getDocs(closuresQuery),
      ]);

      const partsBudgets = partsBudgetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "parts_budget",
        ...doc.data(),
      }));

      const closures = closuresSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "closure",
        ...doc.data(),
      }));

      // Calcular resumo financeiro
      const allServices = [...partsBudgets, ...closures];
      const summary = calculateFinancialSummary(allServices);

      setFinancialData({
        partsBudgets,
        closures,
        summary,
      });
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular resumo financeiro
  const calculateFinancialSummary = (services) => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    let vatTotal = 0;
    let salesTotal = 0;

    services.forEach((service) => {
      const financials = calculateServiceFinancials(service);
      const paymentStatus = getPaymentStatus(service);

      total += financials.totalWithVat;
      vatTotal += financials.vatAmount;
      salesTotal += financials.salesAmount;

      switch (paymentStatus) {
        case "paid":
          paid += financials.totalWithVat;
          break;
        case "pending":
          pending += financials.totalWithVat;
          break;
        case "overdue":
          overdue += financials.totalWithVat;
          break;
      }
    });

    return { total, paid, pending, overdue, vatTotal, salesTotal };
  };

  // Atualizar status de pagamento
  const updatePaymentStatus = async (serviceId, serviceType, newStatus) => {
    try {
      setIsUpdating(true);

      const collection_name =
        serviceType === "parts_budget" ? "ordens" : "orcamentos";
      await updateDoc(doc(db, collection_name, serviceId), {
        paymentStatus: newStatus,
        paymentUpdatedAt: new Date(),
      });

      // Recarregar dados
      await fetchFinancialData();
    } catch (error) {
      console.error("Erro ao atualizar status de pagamento:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Formatar data
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT");
  };

  useEffect(() => {
    if (clientId) {
      fetchFinancialData();
    }
  }, [clientId]);

  if (isLoading) {
    return (
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Situação Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const allServices = [
    ...financialData.partsBudgets,
    ...financialData.closures,
  ];

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Situação Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-700/50 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Total Faturado</p>
            <p className="text-xl font-bold text-white">
              {formatPrice(financialData.summary.total)}
            </p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Pagos</p>
            <p className="text-xl font-bold text-green-400">
              {formatPrice(financialData.summary.paid)}
            </p>
          </div>

          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Pendentes</p>
            <p className="text-xl font-bold text-yellow-400">
              {formatPrice(financialData.summary.pending)}
            </p>
          </div>

          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Devedores</p>
            <p className="text-xl font-bold text-red-400">
              {formatPrice(financialData.summary.overdue)}
            </p>
          </div>
        </div>

        {/* Detalhamento IVA/Vendas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-700">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">IVA Total</p>
            <p className="text-lg font-bold text-blue-400">
              {formatPrice(financialData.summary.vatTotal)}
            </p>
          </div>

          <div className="bg-purple-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Vendas (s/ IVA)</p>
            <p className="text-lg font-bold text-purple-400">
              {formatPrice(financialData.summary.salesTotal)}
            </p>
          </div>
        </div>

        {/* Lista de Serviços */}
        {allServices.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium text-white border-b border-zinc-700 pb-2">
              Histórico de Serviços ({allServices.length})
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allServices.map((service) => {
                const financials = calculateServiceFinancials(service);
                const paymentStatus = getPaymentStatus(service);

                return (
                  <div
                    key={`${service.type}-${service.id}`}
                    className="bg-zinc-700/30 p-4 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {service.type === "parts_budget" ? (
                          <Package className="h-4 w-4 text-blue-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-400" />
                        )}
                        <span className="font-medium text-white">
                          {service.type === "parts_budget"
                            ? "Orçamento"
                            : "Fechamento"}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-orange-500/50 text-orange-400"
                        >
                          {service.id}
                        </Badge>
                      </div>

                      <PaymentStatusBadge status={paymentStatus} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-400">Data</p>
                        <p className="text-white">
                          {formatDate(service.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">Subtotal</p>
                        <p className="text-white">
                          {formatPrice(financials.totalBeforeVat)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">IVA</p>
                        <p className="text-white">
                          {formatPrice(financials.vatAmount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">Total</p>
                        <p className="text-white font-bold">
                          {formatPrice(financials.totalWithVat)}
                        </p>
                      </div>
                    </div>

                    {/* Botões de Status */}
                    <div className="mt-4">
                      <PaymentStatusButtons
                        currentStatus={paymentStatus}
                        onStatusChange={(newStatus) =>
                          updatePaymentStatus(
                            service.id,
                            service.type,
                            newStatus
                          )
                        }
                        isLoading={isUpdating}
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">
              Nenhum serviço financeiro encontrado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===================================
// COMPONENTE PRINCIPAL ClientDetail
// ===================================
const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clientDoc, servicesSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDoc(doc(db, "clientes", clientId)),
            getDocs(
              query(collection(db, "ordens"), where("clientId", "==", clientId))
            ),
            getDocs(
              query(
                collection(db, "equipamentos"),
                where("clientId", "==", clientId)
              )
            ),
          ]);

        if (!clientDoc.exists()) {
          setError("Cliente não encontrado");
          return;
        }

        setClient({ id: clientDoc.id, ...clientDoc.data() });

        const servicesList = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(servicesList);

        const equipmentsList = equipmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsList);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(
          "Erro ao carregar dados do cliente. Por favor, tente novamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const handleDeleteClient = async () => {
    try {
      setIsSubmitting(true);

      // Delete orders first
      const servicesDeletePromises = services.map((service) =>
        deleteDoc(doc(db, "ordens", service.id))
      );
      await Promise.all(servicesDeletePromises);

      // Then delete equipments
      const equipmentsDeletePromises = equipments.map((equipment) =>
        deleteDoc(doc(db, "equipamentos", equipment.id))
      );
      await Promise.all(equipmentsDeletePromises);

      // Finally delete the client
      await deleteDoc(doc(db, "clientes", clientId));

      navigate("/app/manage-clients");
    } catch (err) {
      console.error("Erro ao apagar cliente:", err);
      setError("Erro ao apagar cliente. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-white">
            Cliente não encontrado
          </p>
          <Button
            onClick={() => navigate("/app/manage-clients")}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detalhes do Cliente</h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie informações do cliente
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/manage-clients")}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Client Information Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Informações do Cliente</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/app/edit-client/${clientId}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={client.profilePic} className="object-cover" />
                <AvatarFallback className="bg-zinc-700 text-zinc-300 text-2xl">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{client.name}</h3>
                <p className="text-zinc-400">{client.nif || "Sem NIF"}</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white border-b border-zinc-700 pb-2">
                Informações de Contato
              </h4>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Telefone</p>
                    <p className="text-white">{client.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Endereço</p>
                    <p className="text-white">{client.address || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Código Postal</p>
                    <p className="text-white">{client.postalCode || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">NIF</p>
                    <p className="text-white">{client.nif || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white border-b border-zinc-700 pb-2">
                Estatísticas
              </h4>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Cliente desde</p>
                    <p className="text-white">{formatDate(client.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Total de Serviços</p>
                    <p className="text-white">{services.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Printer className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Equipamentos</p>
                    <p className="text-white">{equipments.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">ID do Cliente</p>
                    <p className="text-white text-xs font-mono">
                      {clientId.substring(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment List */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Equipamentos ({equipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {equipments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipments.map((equipment) => (
                <div
                  key={equipment.id}
                  className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600 hover:bg-zinc-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/app/equipment/${equipment.id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Printer className="h-8 w-8 text-blue-400" />
                    <div>
                      <h4 className="font-medium text-white">
                        {equipment.brand} {equipment.model}
                      </h4>
                      <p className="text-sm text-zinc-400">
                        {equipment.serialNumber || "Sem nº série"}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Adicionado em {formatDate(equipment.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Printer className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Nenhum equipamento cadastrado</p>
              <Button
                onClick={() =>
                  navigate(`/app/add-equipment?clientId=${clientId}`)
                }
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                Adicionar Equipamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Section */}
      <ClientFinancialSection clientId={clientId} />

      {/* Service History - CORRIGIDO: Mostrar ID completo */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Histórico de Serviços ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <div className="space-y-3">
              {services
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((service) => (
                  <div
                    key={service.id}
                    className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        {service.isQuote ? "Orçamento" : "Fechamento"}
                      </h4>
                      <Badge
                        className={
                          service.status === "Fechado"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {service.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mb-2 font-mono">
                      {service.id}
                    </p>
                    <div className="text-xs text-zinc-500">
                      {formatDate(service.date || service.createdAt)}
                    </div>
                  </div>
                ))}

              {services.length > 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/app/manage-orders")}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    Ver todos os serviços ({services.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Nenhum serviço registrado</p>
              <Button
                onClick={() => navigate(`/app/add-order?clientId=${clientId}`)}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                Criar Primeira Ordem
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este cliente? Esta ação irá também
              excluir todos os equipamentos e serviços associados. Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Cliente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
