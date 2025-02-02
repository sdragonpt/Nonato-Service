import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
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

const EditChecklistType = () => {
  const { typeId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    groups: [
      {
        name: "",
        characteristics: [""],
      },
    ],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTouched] = useState({
    type: false,
    groups: [
      {
        name: false,
        characteristics: [false],
      },
    ],
  });
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchType = async () => {
      try {
        setIsLoading(true);
        const typeDoc = doc(db, "checklist_machines", typeId);
        const typeData = await getDoc(typeDoc);

        if (!typeData.exists()) {
          setError("Checklist não encontrado");
          return;
        }

        const data = typeData.data();
        const formattedData = {
          type: data.type || "",
          groups: data.groups || [
            {
              name: "",
              characteristics: [""],
            },
          ],
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
        setTouched({
          type: false,
          groups: formattedData.groups.map((group) => ({
            name: false,
            characteristics: group.characteristics.map(() => false),
          })),
        });

        setError(null);
      } catch (err) {
        console.error("Erro ao carregar checklist:", err);
        setError("Erro ao carregar dados do checklist");
      } finally {
        setIsLoading(false);
      }
    };

    fetchType();
  }, [typeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGroupNameChange = (groupIndex, value) => {
    setFormData((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        name: value,
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const handleCharacteristicChange = (groupIndex, charIndex, value) => {
    setFormData((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: newGroups[groupIndex].characteristics.map((char, i) =>
          i === charIndex ? value : char
        ),
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const addGroup = () => {
    setFormData((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          name: "",
          characteristics: [""],
        },
      ],
    }));
    setTouched((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          name: false,
          characteristics: [false],
        },
      ],
    }));
  };

  const removeGroup = (groupIndex) => {
    if (formData.groups.length === 1) {
      setError("É necessário ter pelo menos um grupo");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== groupIndex),
    }));
    setTouched((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== groupIndex),
    }));
  };

  const addCharacteristic = (groupIndex) => {
    setFormData((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: [...newGroups[groupIndex].characteristics, ""],
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
    setTouched((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: [...newGroups[groupIndex].characteristics, false],
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const removeCharacteristic = (groupIndex, charIndex) => {
    if (formData.groups[groupIndex].characteristics.length === 1) {
      setError("É necessário ter pelo menos uma característica no grupo");
      return;
    }

    setFormData((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: newGroups[groupIndex].characteristics.filter(
          (_, i) => i !== charIndex
        ),
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
    setTouched((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: newGroups[groupIndex].characteristics.filter(
          (_, i) => i !== charIndex
        ),
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleGroupBlur = (groupIndex) => {
    setTouched((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        name: true,
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const handleCharacteristicBlur = (groupIndex, charIndex) => {
    setTouched((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        characteristics: newGroups[groupIndex].characteristics.map((t, i) =>
          i === charIndex ? true : t
        ),
      };
      return {
        ...prev,
        groups: newGroups,
      };
    });
  };

  const hasChanges = () => {
    if (!originalData) return false;

    // Check type changes
    if (formData.type !== originalData.type) return true;

    // Check groups length changes
    if (formData.groups.length !== originalData.groups.length) return true;

    // Check changes in each group
    return formData.groups.some((group, groupIndex) => {
      const originalGroup = originalData.groups[groupIndex];
      if (!originalGroup) return true;
      if (group.name !== originalGroup.name) return true;
      if (group.characteristics.length !== originalGroup.characteristics.length)
        return true;
      return group.characteristics.some(
        (char, charIndex) => char !== originalGroup.characteristics[charIndex]
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.type.trim()) {
      setError("O nome do checklist é obrigatório");
      return;
    }

    // Validate groups and characteristics
    const invalidGroup = formData.groups.find(
      (group) =>
        !group.name.trim() || !group.characteristics.some((char) => char.trim())
    );

    if (invalidGroup) {
      setError(
        "Todos os grupos precisam ter um nome e pelo menos uma característica"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Clean empty characteristics before saving
      const cleanedGroups = formData.groups.map((group) => ({
        name: group.name,
        characteristics: group.characteristics.filter((char) => char.trim()),
      }));

      await updateDoc(doc(db, "checklist_machines", typeId), {
        type: formData.type,
        groups: cleanedGroups,
        updatedAt: new Date(),
      });

      navigate("/app/manage-checklist");
    } catch (err) {
      console.error("Erro ao atualizar checklist:", err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Checklist</h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do checklist
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
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
        {/* Checklist Name Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome do Checklist
              </label>
              <Input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={() => handleBlur("type")}
                placeholder="Ex: Checklist de Manutenção de Impressoras"
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Groups Section */}
        <div className="space-y-4">
          {formData.groups.map((group, groupIndex) => (
            <Card key={groupIndex} className="bg-zinc-800 border-zinc-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white">
                  Grupo {groupIndex + 1}
                </CardTitle>
                {formData.groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGroup(groupIndex)}
                    className="text-red-400 hover:text-red-300 hover:bg-zinc-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Nome do Grupo
                  </label>
                  <Input
                    type="text"
                    value={group.name}
                    onChange={(e) =>
                      handleGroupNameChange(groupIndex, e.target.value)
                    }
                    onBlur={() => handleGroupBlur(groupIndex)}
                    placeholder="Ex: Verificação Inicial"
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-400">
                      Características
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCharacteristic(groupIndex)}
                      className="border-zinc-700 text-white hover:text-white bg-zinc-600 hover:bg-zinc-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {group.characteristics.map((characteristic, charIndex) => (
                    <div key={charIndex} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={characteristic}
                        onChange={(e) =>
                          handleCharacteristicChange(
                            groupIndex,
                            charIndex,
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleCharacteristicBlur(groupIndex, charIndex)
                        }
                        placeholder={`Característica ${charIndex + 1}`}
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                      {group.characteristics.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeCharacteristic(groupIndex, charIndex)
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-zinc-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Group Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addGroup}
            className="w-full border-zinc-700 text-white hover:text-white bg-zinc-600 hover:bg-zinc-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Novo Grupo
          </Button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasChanges()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600"
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

export default EditChecklistType;
