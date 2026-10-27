import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, getDocs, collection, increment } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Layers,
  ListChecks,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

import ChecklistTypeSelector from "./ChecklistTypeSelector";
import { PageHeader } from "../../../components/app";

const AddChecklistType = () => {
  const navigate = useNavigate();
  const [familyItems, setFamilyItems] = useState([]);
  const [formData, setFormData] = useState({
    type: "",
    category: "",
    familyId: "",
    groupId: "",
    groups: [
      {
        name: "",
        characteristics: [""],
      },
    ],
  });

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const snap = await getDocs(collection(db, "familiasChecklist"));
        setFamilyItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao carregar famílias de checklist:", err);
      }
    };
    fetchFamilies();
  }, []);

  const families = familyItems.filter((i) => !i.parentId);
  const groupsForFamily = familyItems.filter(
    (i) => i.parentId === formData.familyId
  );

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

    if (!formData.category) {
      setError("A categoria do checklist é obrigatória");
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

      const family = families.find((f) => f.id === formData.familyId);
      const group = groupsForFamily.find((g) => g.id === formData.groupId);

      await setDoc(doc(db, "checklist_machines", newTypeId.toString()), {
        type: formData.type,
        category: formData.category,
        familyId: family?.id || "",
        familyName: family?.name || "",
        groupId: group?.id || "",
        groupName: group?.name || "",
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
      <PageHeader
        title="Novo Checklist"
        description="Adicione um novo tipo de checklist ao sistema"
        icon={ListChecks}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Checklist Name Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nome do Checklist
              </label>
              <Input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={() => handleBlur("type")}
                placeholder="Ex: Checklist de Manutenção de Impressoras"
              />
            </div>
          </CardContent>
        </Card>

        <ChecklistTypeSelector
          value={formData.category}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, category: value }))
          }
        />

        {/* Família / Grupo de Equipamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Família / Grupo de Equipamento (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Família</label>
              <Select
                value={formData.familyId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    familyId: value === "none" ? "" : value,
                    groupId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem família" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Sem família
                  </SelectItem>
                  {families.map((family) => (
                    <SelectItem
                      key={family.id}
                      value={family.id}
                    >
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.familyId && groupsForFamily.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Grupo</label>
                <Select
                  value={formData.groupId || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      groupId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Sem grupo
                    </SelectItem>
                    {groupsForFamily.map((group) => (
                      <SelectItem
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Groups Section */}
        <div className="space-y-4">
          {formData.groups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Grupo {groupIndex + 1}
                </CardTitle>
                {formData.groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGroup(groupIndex)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
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
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      Características
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCharacteristic(groupIndex)}
                      className="bg-accent"
                    >
                      <Plus className="w-4 h-4" />
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
                      />
                      {group.characteristics.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeCharacteristic(groupIndex, charIndex)
                          }
                          className="text-red-400 hover:text-red-300"
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
            className="w-full bg-accent"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Grupo
          </Button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
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
