import { useState } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Plus,
  X,
  Printer,
  Tag,
  Package,
  Barcode,
  AlertTriangle,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AddEquipment = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });
  const [, setEquipmentPic] = useState(null);
  const [equipmentPicPreview, setEquipmentPicPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getNextEquipmentId = async () => {
    try {
      const counterRef = doc(db, "counters", "equipmentsCounter");
      const counterSnapshot = await getDoc(counterRef);

      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        return currentCounter + 1;
      } else {
        await setDoc(counterRef, { count: 1 });
        return 1;
      }
    } catch (error) {
      console.error("Erro ao gerar ID:", error);
      throw new Error("Falha ao gerar ID do equipamento");
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    if (!formData.type.trim()) {
      setError("O campo 'Tipo' é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newEquipmentId = await getNextEquipmentId();
      await setDoc(doc(db, "equipamentos", newEquipmentId.toString()), {
        clientId,
        ...formData,
        serialNumber: formData.serialNumber.toUpperCase(),
        createdAt: new Date(),
        equipmentPic: equipmentPicPreview,
      });

      navigate(-1);
    } catch (err) {
      console.error("Erro ao adicionar equipamento:", err);
      setError("Erro ao adicionar equipamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Equipamento</h1>
          <p className="text-sm text-zinc-400">
            Adicione um novo equipamento ao sistema
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
              Adicionar Equipamento
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddEquipment;
