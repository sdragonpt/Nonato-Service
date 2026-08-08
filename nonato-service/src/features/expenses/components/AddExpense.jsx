// AddExpense.jsx - Registar despesa com comprovativo (upload)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase.jsx";
import { useClients } from "../../../context/ClientsContext.jsx";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertTriangle,
  Upload,
  FileText,
  X,
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

const AddExpense = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const fileInputRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Despesa</h1>
          <p className="text-sm text-zinc-400">
            Registe uma despesa com o respetivo comprovativo
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/manage-expenses")}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Detalhes da Despesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Descrição</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Ex: Combustível para deslocação ao cliente X"
                rows={2}
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Valor (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Data</label>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Tipo</label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value, clientId: "" }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="pessoal" className="text-white hover:bg-zinc-700">
                    Pessoal
                  </SelectItem>
                  <SelectItem value="cliente" className="text-white hover:bg-zinc-700">
                    Ligada a Cliente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "cliente" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Cliente</label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, clientId: value }))
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {clients
                      .slice()
                      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT"))
                      .map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          {client.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Comprovativo (opcional)
              </label>
              {receiptPreviewName ? (
                <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="text-white text-sm truncate">{receiptPreviewName}</span>
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
                <label className="flex flex-col items-center p-6 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors">
                  <Upload className="h-6 w-6 text-zinc-400 mb-2" />
                  <span className="text-sm text-zinc-400">
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
          className="w-full bg-green-600 hover:bg-green-700"
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
