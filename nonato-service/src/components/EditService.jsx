import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
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

const EditService = () => {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "base",
    description: "",
  });
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const serviceDoc = await getDoc(doc(db, "servicos", serviceId));

        if (serviceDoc.exists()) {
          const serviceData = serviceDoc.data();
          const formattedData = {
            name: serviceData.name || "",
            type: serviceData.type || "base",
            description: serviceData.description || "",
          };
          setFormData(formattedData);
          setOriginalData(formattedData);
        } else {
          setError("Serviço não encontrado");
        }
      } catch (err) {
        console.error("Erro ao buscar serviço:", err);
        setError("Erro ao carregar serviço. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

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

      await updateDoc(doc(db, "servicos", serviceId), {
        ...formData,
        updatedAt: new Date(),
      });

      navigate("/app/manage-services");
    } catch (err) {
      console.error("Erro ao atualizar serviço:", err);
      setError("Erro ao atualizar serviço. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    originalData &&
    Object.keys(formData).some((key) => formData[key] !== originalData[key]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Serviço</h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do serviço
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
          disabled={isSubmitting || !hasChanges}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default EditService;
