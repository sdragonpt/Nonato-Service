import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Layers,
  ClipboardEdit,
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

const EditChecklistType = () => {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const [familyItems, setFamilyItems] = useState([]);

  const [formData, setFormData] = useState({
    type: "",
    familyId: "",
    groupId: "",
    groups: [
      {
        name: "",
        characteristics: [""],
      },
    ],
  });

  const families = familyItems.filter((i) => !i.parentId);
  const groupsForFamily = familyItems.filter(
    (i) => i.parentId === formData.familyId
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTouched] = useState({
    type: false,
    category: "",
    groups: [
      {
        name: false,
        characteristics: [false],
      },
    ],
  });
  const [originalData, setOriginalData] = useState(null);

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
          category: data.category || "",
          familyId: data.familyId || "",
          groupId: data.groupId || "",
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

    // Check type and category changes
    if (formData.type !== originalData.type) return true;
    if (formData.category !== originalData.category) return true; // Adiciona verificação da categoria

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

      const family = families.find((f) => f.id === formData.familyId);
      const group = groupsForFamily.find((g) => g.id === formData.groupId);

      await updateDoc(doc(db, "checklist_machines", typeId), {
        type: formData.type,
        category: formData.category,
        familyId: family?.id || "",
        familyName: family?.name || "",
        groupId: group?.id || "",
        groupName: group?.name || "",
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
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Editar Checklist"
        description="Atualize as informações do checklist"
        icon={ClipboardEdit}
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

        <ChecklistTypeSelector
          value={formData.category}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, category: value }))
          }
        />

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

          {/* Add New Group Button */}
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
          onClick={handleSubmit}
          disabled={isSubmitting || !hasChanges()}
          className="w-full disabled:opacity-50 disabled:hover:bg-primary"
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
