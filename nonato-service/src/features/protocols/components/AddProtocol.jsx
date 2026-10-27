// AddProtocol.jsx - Passo inicial: escolher cliente + equipamento e criar o protocolo
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import { generateDocNumber } from "../../../utils/docNumbering.js";
import {
  Loader2,
  Plus,
  AlertTriangle,
  Printer,
  FileCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { ClientCombobox } from "@/components/shared/ClientCombobox.jsx";
import { PageHeader } from "../../../components/app";

const AddProtocol = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [clientId, setClientId] = useState("");
  const [equipmentId, setEquipmentId] = useState("none");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const list = await ensureClients();
        setClients(list);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setError("Erro ao carregar clientes.");
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!clientId) {
      setEquipments([]);
      return;
    }
    const fetchEquipments = async () => {
      try {
        setLoadingEquipments(true);
        const allEquipments = await ensureEquipments();
        setEquipments(allEquipments.filter((e) => e.clientId === clientId));
      } catch (err) {
        console.error("Erro ao carregar equipamentos:", err);
      } finally {
        setLoadingEquipments(false);
      }
    };
    fetchEquipments();
  }, [clientId, ensureEquipments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError("Selecione um cliente.");
      return;
    }
    if (!title.trim()) {
      setError("Indique um título para o protocolo.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const client = clients.find((c) => c.id === clientId);
      const equipment =
        equipmentId !== "none"
          ? equipments.find((eq) => eq.id === equipmentId)
          : null;

      const protocolNumber = await generateDocNumber("prot");
      const docRef = await addDoc(collection(db, "protocolosServico"), {
        protocolNumber,
        clientId,
        clientName: client?.name || "",
        equipmentId: equipment?.id || "",
        equipmentName: equipment
          ? `${equipment.brand || ""} ${equipment.model || ""}`.trim()
          : "",
        title: title.trim(),
        status: "rascunho",
        blocosAntes: [],
        blocosDepois: [],
        pecasTrocadas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      navigate(`/app/edit-protocol/${docRef.id}`);
    } catch (err) {
      console.error("Erro ao criar protocolo:", err);
      setError("Erro ao criar protocolo. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Novo Protocolo de Serviço"
        description="Escolha o cliente e o equipamento para começar"
        icon={FileCheck}
        back="/app/protocols"
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações do Protocolo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manutenção preventiva - Fresadora CNC"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              {loadingClients ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar clientes...
                </div>
              ) : (
                <ClientCombobox
                  clients={clients}
                  value={clientId}
                  onValueChange={(value) => {
                    setClientId(value);
                    setEquipmentId("none");
                  }}
                />
              )}
            </div>

            {clientId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Equipamento (opcional)
                </label>
                {loadingEquipments ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> A carregar equipamentos...
                  </div>
                ) : (
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger>
                      <Printer className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Sem equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Sem equipamento
                      </SelectItem>
                      {equipments.map((eq) => (
                        <SelectItem
                          key={eq.id}
                          value={eq.id}
                        >
                          {eq.brand} {eq.model}
                          {eq.serialNumber ? ` — ${eq.serialNumber}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A criar...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Criar Protocolo e Continuar
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddProtocol;
