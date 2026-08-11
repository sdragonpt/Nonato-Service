import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../firebase.jsx";
import { compressImage } from "../../utils/imageCompression.js";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  Printer,
  Tag,
  Package,
  Barcode,
  Building2,
  UserCog,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar.jsx";

// ✅ Mesmo bloco reutilizável do AddEquipment.jsx/AddClient.jsx.
const FieldRow = ({ label, icon: Icon, error, className = "", ...inputProps }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <Input
        {...inputProps}
        className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${className} ${
          error ? "border-red-500" : ""
        }`}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const EditEquipment = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [existingStoragePath, setExistingStoragePath] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const previewUrlRef = useRef(null);

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
        setPhotoPreview(equipmentData.equipmentPic || "");
        setExistingStoragePath(equipmentData.equipmentPicStoragePath || "");
        setClientId(equipmentData.clientId || "");

        if (equipmentData.clientId) {
          const clientDoc = await getDoc(doc(db, "clientes", equipmentData.clientId));
          if (clientDoc.exists()) {
            setClientName(clientDoc.data().name);
          }
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

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("A imagem deve ter menos de 8MB");
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPhotoPreview(objectUrl);
    setPhotoFile(file);
    setPhotoRemoved(false);
    setError(null);
  };

  const removeImage = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhotoPreview("");
    setPhotoFile(null);
    setPhotoRemoved(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.type.trim()) errors.type = "Tipo é obrigatório";
    return errors;
  };

  // ✅ Mesmo princípio do EditClient — comprime e envia para o Storage em vez
  // de gravar base64 no documento. `<img src={equipment.equipmentPic}>`
  // continua a funcionar sem alterações em qualquer sítio que já mostra a
  // foto, seja um data URL antigo ou um URL do Storage novo.
  const uploadEquipmentPic = async (file) => {
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
    const storagePath = `equipamentos/${equipmentId}/foto_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  };

  const deleteOldStorageFile = async () => {
    if (!existingStoragePath) return;
    try {
      await deleteObject(ref(storage, existingStoragePath));
    } catch {
      // foto antiga pode já não existir no storage
    }
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

      const updatedData = {
        ...formData,
        type: formData.type.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        serialNumber: formData.serialNumber.trim().toUpperCase(),
        lastUpdate: new Date(),
      };

      if (photoFile) {
        const uploaded = await uploadEquipmentPic(photoFile);
        await deleteOldStorageFile();
        updatedData.equipmentPic = uploaded.url;
        updatedData.equipmentPicStoragePath = uploaded.storagePath;
      } else if (photoRemoved) {
        await deleteOldStorageFile();
        updatedData.equipmentPic = "";
        updatedData.equipmentPicStoragePath = "";
      }

      await updateDoc(doc(db, "equipamentos", equipmentId), updatedData);

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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    (originalData &&
      Object.keys(formData).some((key) => formData[key] !== originalData[key])) ||
    !!photoFile ||
    photoRemoved;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <UserCog className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Editar Equipamento
            </h1>
            <p className="text-sm text-zinc-400">
              Atualize as informações do equipamento
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600 shrink-0"
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
        {/* Client Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => clientId && navigate(`/app/client/${clientId}`)}
              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <Building2 className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-400">Nome do Cliente</p>
                <p className="text-white font-medium">{clientName || "—"}</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Equipment Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Foto */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="shrink-0 space-y-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-zinc-700">
                    <AvatarImage
                      src={photoPreview}
                      alt="Foto do equipamento"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-zinc-900 text-zinc-500">
                      <Printer className="h-9 w-9" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mx-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover foto
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 sm:pt-2">
                Clique na foto para a substituir
              </p>
            </div>

            <FieldRow
              label="Tipo"
              icon={Printer}
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={() => handleBlur("type")}
              placeholder="Ex: Impressora, Scanner..."
              error={touched.type && !formData.type ? "Tipo é obrigatório" : null}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow
                label="Marca"
                icon={Tag}
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Ex: HP, Epson..."
              />
              <FieldRow
                label="Modelo"
                icon={Package}
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Ex: LaserJet Pro M428fdw"
              />
            </div>

            <FieldRow
              label="Número de Série"
              icon={Barcode}
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="Ex: XYZ123456"
              className="uppercase"
            />
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
