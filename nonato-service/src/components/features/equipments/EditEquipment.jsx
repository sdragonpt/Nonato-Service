import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  X,
  AlertTriangle,
  Printer,
  Tag,
  Package,
  Barcode,
  Building2,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";

const EditEquipment = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });
  const [, setEquipmentPic] = useState(null);
  const [equipmentPicPreview, setEquipmentPicPreview] = useState("");
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const equipmentDoc = await getDoc(doc(db, "equipamentos", equipmentId));

        if (!equipmentDoc.exists()) {
          setError("Equipamento não encontrado");
          return;
        }

        const equipmentData = equipmentDoc.data();
        const formattedData = {
          type: equipmentData.type || "",
          brand: equipmentData.brand || "",
          model: equipmentData.model || "",
          serialNumber: equipmentData.serialNumber || "",
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
        setEquipmentPicPreview(equipmentData.equipmentPic || "");

        const clientDoc = await getDoc(
          doc(db, "clientes", equipmentData.clientId)
        );
        if (clientDoc.exists()) {
          setClientName(clientDoc.data().name);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [equipmentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleEquipmentPicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentPicPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setEquipmentPic(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setEquipmentPic(null);
    setEquipmentPicPreview("");
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.type.trim()) errors.type = "Tipo é obrigatório";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setError("Por favor, corrija os erros no formulário");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "equipamentos", equipmentId), {
        ...formData,
        serialNumber: formData.serialNumber.toUpperCase(),
        equipmentPic: equipmentPicPreview,
        lastUpdate: new Date(),
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar equipamento:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    originalData &&
    (Object.keys(formData).some((key) => formData[key] !== originalData[key]) ||
      equipmentPicPreview !== originalData.equipmentPic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Equipamento</h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do equipamento
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
        {/* Client Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-sm text-zinc-400">Nome do Cliente</p>
              <p className="text-white font-medium">{clientName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Picture Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Foto do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentPicPreview ? (
              <div className="relative w-24 h-24">
                <img
                  src={equipmentPicPreview}
                  alt="Preview"
                  className="w-full h-full rounded-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center p-6 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors">
                <Camera className="h-8 w-8 text-zinc-400 mb-2" />
                <span className="text-sm text-zinc-400">
                  Clique para adicionar foto
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleEquipmentPicChange}
                  accept="image/*"
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Equipment Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Tipo</label>
              <div className="relative">
                <Printer className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  onBlur={() => handleBlur("type")}
                  placeholder="Ex: Impressora, Scanner..."
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.type && !formData.type ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.type && !formData.type && (
                <p className="text-sm text-red-500">Tipo é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Marca</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Ex: HP, Epson..."
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Modelo
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Ex: LaserJet Pro M428fdw"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Número de Série
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Ex: XYZ123456"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 uppercase"
                />
              </div>
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

export default EditEquipment;
