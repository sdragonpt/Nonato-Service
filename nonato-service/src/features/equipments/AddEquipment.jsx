import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { compressImage } from "../../utils/imageCompression.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Camera,
  Loader2,
  Plus,
  Printer,
  Tag,
  Package,
  Barcode,
  AlertTriangle,
  Wrench,
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
import { PageHeader, InputField } from "../../components/app";


const AddEquipment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
  });
  const [clientName, setClientName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (!clientId) {
      setError("ID do cliente não encontrado na URL.");
      return;
    }
    getDoc(doc(db, "clientes", clientId))
      .then((snap) => {
        if (snap.exists()) setClientName(snap.data().name || "");
      })
      .catch((err) => console.error("Erro ao carregar cliente:", err));
  }, [clientId]);

  // Liberta o object URL da pré-visualização quando deixa de ser preciso.
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
    setError(null);
  };

  const getNextEquipmentId = async () => {
    try {
      const counterRef = doc(db, "counters", "equipmentsCounter");
      const counterSnapshot = await getDoc(counterRef);

      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count || 0;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        return currentCounter + 1;
      } else {
        await setDoc(counterRef, { count: 1 });
        return 1;
      }
    } catch (error) {
      console.error("Erro ao gerar ID:", error);
      throw error;
    }
  };

  // ✅ Mesmo princípio do AddClient — comprime e envia a foto para o Storage
  // em vez de gravar um base64 gigante dentro do próprio documento.
  const uploadEquipmentPic = async (equipmentId, file) => {
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.8 });
    const storagePath = `equipamentos/${equipmentId}/foto_${Date.now()}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched((prev) => ({ ...prev, type: true }));

    if (!formData.type.trim()) {
      setError("O campo 'Tipo' é obrigatório.");
      return;
    }

    if (!clientId) {
      setError("ID do cliente não encontrado.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newEquipmentId = await getNextEquipmentId();

      const uploaded = photoFile
        ? await uploadEquipmentPic(newEquipmentId, photoFile)
        : null;

      const equipmentData = {
        clientId: clientId,
        type: formData.type.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        serialNumber: formData.serialNumber.trim().toUpperCase(),
        createdAt: new Date(),
        equipmentPic: uploaded?.url || "",
        equipmentPicStoragePath: uploaded?.storagePath || "",
      };

      await setDoc(
        doc(db, "equipamentos", newEquipmentId.toString()),
        equipmentData
      );

      navigate(`/app/client/${clientId}`);
    } catch (err) {
      console.error("Erro ao adicionar equipamento:", err);
      setError(`Erro ao adicionar equipamento: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Novo Equipamento"
        description={clientName
                ? `Adicione um equipamento para ${clientName}`
                : "Adicione um novo equipamento ao sistema"}
        icon={Wrench}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Foto */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="relative group shrink-0">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage
                    src={photoPreview}
                    alt="Foto do equipamento"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted/50 text-muted-foreground">
                    <Printer className="h-9 w-9" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground sm:pt-2">
                Clique na foto para adicionar uma imagem (opcional)
              </p>
            </div>

            <InputField
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
              <InputField
                label="Marca"
                icon={Tag}
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Ex: HP, Epson..."
              />
              <InputField
                label="Modelo"
                icon={Package}
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Ex: LaserJet Pro M428fdw"
              />
            </div>

            <InputField
              label="Número de Série"
              icon={Barcode}
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="Ex: XYZ123456"
              inputClassName="uppercase"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !clientId}
          className="w-full"
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
