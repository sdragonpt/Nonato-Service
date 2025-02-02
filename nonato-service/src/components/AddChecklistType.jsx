import { useState } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AddChecklistType = () => {
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

      const newTypeId = await getNextTypeId();

      // Clean empty characteristics before saving
      const cleanedGroups = formData.groups.map((group) => ({
        name: group.name,
        characteristics: group.characteristics.filter((char) => char.trim()),
      }));

      await setDoc(doc(db, "checklist_machines", newTypeId.toString()), {
        type: formData.type,
        groups: cleanedGroups,
        createdAt: new Date(),
      });

      navigate("/app/manage-checklist");
    } catch (err) {
      console.error("Erro ao adicionar checklist:", err);
      setError("Erro ao adicionar checklist. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNextTypeId = async () => {
    try {
      const counterRef = doc(db, "counters", "checklistTypesCounter");
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
      throw new Error("Falha ao gerar ID do tipo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Checklist</h1>
          <p className="text-sm text-zinc-400">
            Adicione um novo tipo de checklist ao sistema
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
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Criar Checklist
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddChecklistType;
