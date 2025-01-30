import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Package,
  CheckSquare,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  UserPlus,
  GraduationCap,
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
import { Badge } from "@/components/ui/badge";

const InspectionDetail = () => {
  const { inspectionId: id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [client, setClient] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [checklistType, setChecklistType] = useState(null);
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [overallCondition, setOverallCondition] = useState("");
  const [safeToUse, setSafeToUse] = useState("");
  const [maintenanceRequired, setMaintenanceRequired] = useState("");
  const [assetStatus, setAssetStatus] = useState("");
  const [maintenancePriority, setMaintenancePriority] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [trainingParticipants, setTrainingParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState("");

  useEffect(() => {
    const fetchInspectionDetails = async () => {
      try {
        setIsLoading(true);
        const inspectionDoc = await getDoc(doc(db, "inspections", id));

        if (!inspectionDoc.exists()) {
          setError("Inspeção não encontrada");
          return;
        }

        const inspectionData = inspectionDoc.data();
        setInspection(inspectionData);
        setOverallCondition(inspectionData.overallCondition || "");
        setSafeToUse(inspectionData.safeToUse || "");
        setMaintenanceRequired(inspectionData.maintenanceRequired || "");
        setAssetStatus(inspectionData.assetStatus || "");
        setMaintenancePriority(inspectionData.maintenancePriority || "");
        setAdditionalNotes(inspectionData.additionalNotes || "");
        setTrainingParticipants(inspectionData.trainingParticipants || []);

        // Fetch related data
        const [clientDoc, equipmentDoc, checklistDoc] = await Promise.all([
          getDoc(doc(db, "clientes", inspectionData.clientId)),
          getDoc(doc(db, "equipamentos", inspectionData.equipmentId)),
          getDoc(doc(db, "checklist_machines", inspectionData.checklistTypeId)),
        ]);

        setClient(clientDoc.data());
        setEquipment(equipmentDoc.data());
        setChecklistType(checklistDoc.data());

        // Initialize groups with states
        const selectedGroups = inspectionData.selectedGroups || [];
        const initialGroups = selectedGroups.map((group) => ({
          ...group,
          characteristics: group.selectedCharacteristics.map((char) => ({
            name: char,
            state: inspectionData.states?.[group.name]?.[char]?.state || "",
            description:
              inspectionData.states?.[group.name]?.[char]?.description || "",
            imageUrl:
              inspectionData.states?.[group.name]?.[char]?.imageUrl || null,
          })),
        }));

        setGroups(initialGroups);
      } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
        setError("Erro ao carregar detalhes da inspeção");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspectionDetails();
  }, [id]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Prepare states object
      const states = {};
      groups.forEach((group) => {
        states[group.name] = {};
        group.characteristics.forEach((char) => {
          states[group.name][char.name] = {
            state: char.state,
            description: char.description,
            imageUrl: char.imageUrl,
          };
        });
      });

      // Update inspection document
      await updateDoc(doc(db, "inspections", id), {
        states,
        status: "completed",
        completedAt: new Date(),
        overallCondition,
        safeToUse,
        maintenanceRequired,
        assetStatus,
        maintenancePriority,
        additionalNotes,
        trainingParticipants,
      });

      navigate("/app/manage-inspection");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (groupName, characteristicName, file) => {
    try {
      setIsUploading(true);

      // Compress image
      const compressedFile = await compressImage(file);

      const storageRef = ref(
        storage,
        `inspections/${id}/${groupName}-${characteristicName}-${Date.now()}`
      );

      const snapshot = await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(snapshot.ref);

      setGroups((prev) =>
        prev.map((group) =>
          group.name === groupName
            ? {
                ...group,
                characteristics: group.characteristics.map((char) =>
                  char.name === characteristicName
                    ? { ...char, imageUrl: url }
                    : char
                ),
              }
            : group
        )
      );
    } catch (error) {
      console.error("Error:", error);
      setError("Erro ao fazer upload da imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (groupName, characteristicName) => {
    try {
      setIsDeleting(true);

      const currentGroup = groups.find((group) => group.name === groupName);
      const currentChar = currentGroup.characteristics.find(
        (char) => char.name === characteristicName
      );

      if (currentChar.imageUrl) {
        const imageRef = ref(storage, currentChar.imageUrl);
        await deleteObject(imageRef);

        setGroups((prev) =>
          prev.map((group) =>
            group.name === groupName
              ? {
                  ...group,
                  characteristics: group.characteristics.map((char) =>
                    char.name === characteristicName
                      ? { ...char, imageUrl: null }
                      : char
                  ),
                }
              : group
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Erro ao deletar imagem");
    } finally {
      setIsDeleting(false);
    }
  };

  // Image compression utility
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * ratio;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            },
            "image/jpeg",
            quality
          );
        };
      };
    });
  };

  // State handlers
  const handleStateChange = (groupName, characteristicName, newState) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              characteristics: group.characteristics.map((char) =>
                char.name === characteristicName
                  ? { ...char, state: newState }
                  : char
              ),
            }
          : group
      )
    );
  };

  const handleDescriptionChange = (
    groupName,
    characteristicName,
    newDescription
  ) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.name === groupName
          ? {
              ...group,
              characteristics: group.characteristics.map((char) =>
                char.name === characteristicName
                  ? { ...char, description: newDescription }
                  : char
              ),
            }
          : group
      )
    );
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Training participants handlers
  const addTrainingParticipant = () => {
    if (newParticipantName.trim()) {
      setTrainingParticipants([
        ...trainingParticipants,
        newParticipantName.trim(),
      ]);
      setNewParticipantName("");
    }
  };

  const removeTrainingParticipant = (index) => {
    setTrainingParticipants(trainingParticipants.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const ImagePicker = ({
    groupName,
    characterName,
    onImageSelect,
    hasImage,
  }) => {
    const [showOptions, setShowOptions] = useState(false);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const handleFileSelect = async (e) => {
      if (e.target.files?.[0]) {
        await onImageSelect(e.target.files[0]);
        setShowOptions(false);
      }
    };

    if (!isMobile) {
      return (
        <Button
          variant="outline"
          onClick={() =>
            document
              .getElementById(`${groupName}-${characterName}-image`)
              .click()
          }
          className="bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-700"
        >
          {hasImage ? "Alterar Imagem" : "Adicionar Imagem"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`${groupName}-${characterName}-image`}
          />
        </Button>
      );
    }

    return (
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowOptions(!showOptions)}
          className="bg-zinc-700 hover:bg-zinc-600"
        >
          {hasImage ? "Alterar Imagem" : "Adicionar Imagem"}
        </Button>

        {showOptions && (
          <Card className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-800 border-zinc-700">
            <CardContent className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none px-4 py-2 hover:bg-zinc-700"
                onClick={() =>
                  document
                    .getElementById(`${groupName}-${characterName}-gallery`)
                    .click()
                }
              >
                Escolher da Galeria
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id={`${groupName}-${characterName}-gallery`}
                />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none px-4 py-2 hover:bg-zinc-700"
                onClick={() =>
                  document
                    .getElementById(`${groupName}-${characterName}-camera`)
                    .click()
                }
              >
                Tirar Foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id={`${groupName}-${characterName}-camera`}
                />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Detalhes da Inspeção
          </h1>
          <p className="text-sm text-zinc-400">
            {inspection?.type === "training" ? "Treinamento" : "Inspeção"} de{" "}
            {client?.name}
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

      {/* Basic Info Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            <span className="text-white">{client?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-400" />
            <span className="text-white">{equipment?.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-zinc-400" />
            <span className="text-white">{checklistType?.type}</span>
          </div>
          <Badge
            className={
              inspection?.type === "training"
                ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            }
          >
            {inspection?.type === "training" ? (
              <GraduationCap className="w-4 h-4 mr-2" />
            ) : (
              <CheckSquare className="w-4 h-4 mr-2" />
            )}
            {inspection?.type === "training"
              ? "Treinamento"
              : "Inspeção Padrão"}
          </Badge>
        </CardContent>
      </Card>

      {/* Training Participants Section */}
      {inspection?.type === "training" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Participantes do Treinamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new participant */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Nome do participante"
                  className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  onKeyPress={(e) =>
                    e.key === "Enter" && addTrainingParticipant()
                  }
                />
              </div>
              <Button
                onClick={addTrainingParticipant}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Participants list */}
            <div className="space-y-2">
              {trainingParticipants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-white">{participant}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTrainingParticipant(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {trainingParticipants.length === 0 && (
                <p className="text-zinc-400 text-center py-4">
                  Nenhum participante adicionado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standard Inspection Fields */}
      {inspection?.type !== "training" && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Avaliação Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Condição Geral
              </label>
              <Select
                value={overallCondition}
                onValueChange={setOverallCondition}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Excelente condição">
                    Excelente condição
                  </SelectItem>
                  <SelectItem value="Boa condição">Boa condição</SelectItem>
                  <SelectItem value="Condição regular">
                    Condição regular
                  </SelectItem>
                  <SelectItem value="Condição ruim">Condição ruim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Ativo seguro para usar
              </label>
              <Select value={safeToUse} onValueChange={setSafeToUse}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Manutenção requerida
              </label>
              <Select
                value={maintenanceRequired}
                onValueChange={setMaintenanceRequired}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Status do ativo
              </label>
              <Select value={assetStatus} onValueChange={setAssetStatus}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Manutenção requerida">
                    Manutenção requerida
                  </SelectItem>
                  <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                  <SelectItem value="Inoperante">Inoperante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Prioridade de manutenção
              </label>
              <Select
                value={maintenancePriority}
                onValueChange={setMaintenancePriority}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Notas Adicionais
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Digite notas adicionais aqui..."
                className="w-full p-3 bg-zinc-900 border border-zinc-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="4"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection Groups */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <Card key={groupIndex} className="bg-zinc-800 border-zinc-700">
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleGroup(group.name)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">
                    {group.name}
                  </CardTitle>
                  {expandedGroups[group.name] ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
              </CardHeader>

              {expandedGroups[group.name] && (
                <CardContent className="space-y-6 border-t border-zinc-700">
                  {group.characteristics.map((char, charIndex) => (
                    <div key={charIndex} className="space-y-4">
                      <h4 className="text-white font-medium">{char.name}</h4>

                      {/* State buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["Bom", "Reparar", "Substituir", "N/D"].map(
                          (state) => (
                            <Button
                              key={state}
                              variant={
                                char.state === state ? "default" : "outline"
                              }
                              onClick={() =>
                                handleStateChange(group.name, char.name, state)
                              }
                              className={
                                char.state === state
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
                              }
                            >
                              {state}
                            </Button>
                          )
                        )}
                      </div>

                      {/* Description */}
                      <textarea
                        value={char.description}
                        onChange={(e) =>
                          handleDescriptionChange(
                            group.name,
                            char.name,
                            e.target.value
                          )
                        }
                        placeholder="Adicionar descrição..."
                        className="w-full p-3 bg-zinc-900 border border-zinc-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows="2"
                      />

                      {/* Image handling */}
                      <div className="flex items-center gap-3">
                        <ImagePicker
                          groupName={group.name}
                          characterName={char.name}
                          onImageSelect={(file) =>
                            handleImageUpload(group.name, char.name, file)
                          }
                          hasImage={!!char.imageUrl}
                        />
                        {char.imageUrl && (
                          <div className="relative">
                            <img
                              src={char.imageUrl}
                              alt="Característica"
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                handleDeleteImage(group.name, char.name)
                              }
                              disabled={isDeleting}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <CheckSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-white">
              Nenhum grupo selecionado
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Esta inspeção não possui grupos de características selecionados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="fixed bottom-4 right-4 left-4 flex justify-center md:left-64">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-green-600 hover:bg-green-700 px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Inspeção
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default InspectionDetail;
