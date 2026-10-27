// AddExpense.jsx - Registar despesa com comprovativo (upload)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import {
  Loader2,
  Plus,
  AlertTriangle,
  Upload,
  FileText,
  X,
  Receipt,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { ClientCombobox } from "@/components/shared/ClientCombobox.jsx";
import { toDateKey } from "../../../utils/formatDate.js";
import { PageHeader } from "../../../components/app";

const AddExpense = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const fileInputRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: toDateKey(),
    type: "pessoal",
    clientId: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewName, setReceiptPreviewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const list = await ensureClients();
        setClients(list);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("O comprovativo deve ter menos de 5MB.");
      return;
    }
    setReceiptFile(file);
    setReceiptPreviewName(file.name);
    setError(null);
  };

  const uploadReceipt = () =>
    new Promise((resolve, reject) => {
      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
      const storagePath = `despesas/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, receiptFile);

      task.on(
        "state_changed",
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, storagePath });
        }
      );
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim() || !formData.amount || !formData.date) {
      setError("Preencha descrição, valor e data.");
      return;
    }
    if (formData.type === "cliente" && !formData.clientId) {
      setError("Selecione o cliente associado a esta despesa.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let receiptUrl = null;
      let receiptStoragePath = null;
      if (receiptFile) {
        const uploaded = await uploadReceipt();
        receiptUrl = uploaded.url;
        receiptStoragePath = uploaded.storagePath;
      }

      const client =
        formData.type === "cliente"
          ? clients.find((c) => c.id === formData.clientId)
          : null;

      await addDoc(collection(db, "comprovantesDespesas"), {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        type: formData.type,
        clientId: client?.id || "",
        clientName: client?.name || "",
        receiptUrl,
        receiptStoragePath,
        createdAt: new Date(),
      });

      navigate("/app/manage-expenses");
    } catch (err) {
      console.error("Erro ao registar despesa:", err);
      setError("Erro ao registar despesa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Nova Despesa"
        description="Registe uma despesa com o respetivo comprovativo"
        icon={Receipt}
        back="/app/manage-expenses"
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
            <CardTitle className="text-lg">Detalhes da Despesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Descrição</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Ex: Combustível para deslocação ao cliente X"
                rows={2}
               
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Valor (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Data</label>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value, clientId: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">
                    Pessoal
                  </SelectItem>
                  <SelectItem value="cliente">
                    Ligada a Cliente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "cliente" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <ClientCombobox
                  clients={clients}
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, clientId: value }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Comprovativo (opcional)
              </label>
              {receiptPreviewName ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="text-foreground text-sm truncate">{receiptPreviewName}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreviewName("");
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center p-6 bg-muted/50 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para carregar o comprovativo
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>
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
              {uploadProgress > 0 ? `A enviar... ${uploadProgress}%` : "A guardar..."}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Registar Despesa
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddExpense;
