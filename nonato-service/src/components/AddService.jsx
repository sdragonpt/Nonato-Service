import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertTriangle,
  Tag,
  Wrench,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const AddService = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "base",
    description: "",
  });
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    if (!formData.name.trim()) {
      setError("O campo Nome é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await addDoc(collection(db, "servicos"), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      navigate("/app/manage-services");
    } catch (err) {
      console.error("Erro ao adicionar serviço:", err);
      setError("Erro ao adicionar serviço. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Serviço</h1>
          <p className="text-sm text-zinc-400">
            Adicione um novo serviço ao sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
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
        {/* Service Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome do Serviço
              </label>
              <div className="relative">
                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder="Ex: Manutenção Básica"
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.name && !formData.name ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.name && !formData.name && (
                <p className="text-sm text-red-500">Nome é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Tipo de Serviço
              </label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white pl-10 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="base"
                    className="text-white hover:bg-zinc-700"
                  >
                    Valor Base
                  </SelectItem>
                  <SelectItem
                    value="un"
                    className="text-white hover:bg-zinc-700"
                  >
                    Despesa
                  </SelectItem>
                  <SelectItem
                    value="hour"
                    className="text-white hover:bg-zinc-700"
                  >
                    Por Hora
                  </SelectItem>
                  <SelectItem
                    value="day"
                    className="text-white hover:bg-zinc-700"
                  >
                    Por Dia
                  </SelectItem>
                  <SelectItem
                    value="km"
                    className="text-white hover:bg-zinc-700"
                  >
                    Por Km
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Descrição (Opcional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descreva o serviço..."
                className="w-full p-3 bg-zinc-900 border-zinc-700 text-white rounded-md resize-none h-32 focus:outline-none focus:ring-2 focus:ring-green-500 [&::placeholder]:text-zinc-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Serviço
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddService;
