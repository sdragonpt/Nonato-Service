import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Settings,
} from "lucide-react";

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
  const [touched, setTouched] = useState({
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

    // Verifica mudanças no tipo
    if (formData.type !== originalData.type) return true;

    // Verifica mudanças nos grupos
    if (formData.groups.length !== originalData.groups.length) return true;

    // Verifica mudanças em cada grupo
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

    // Validações
    if (!formData.type.trim()) {
      setError("O nome do checklist é obrigatório");
      return;
    }

    // Validar grupos e características
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

      // Limpar características vazias antes de salvar
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
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl text-center text-white font-semibold mb-6">
        Editar Checklist
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome do Checklist */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nome do Checklist
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={() => handleBlur("type")}
              className="w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ex: Checklist de Manutenção de Impressoras"
            />
          </div>
        </div>

        {/* Grupos */}
        <div className="space-y-4">
          {formData.groups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="bg-gray-800 p-6 rounded-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome do Grupo {groupIndex + 1}
                  </label>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) =>
                      handleGroupNameChange(groupIndex, e.target.value)
                    }
                    onBlur={() => handleGroupBlur(groupIndex)}
                    className="w-full p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Ex: Verificação Inicial"
                  />
                </div>
                {formData.groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGroup(groupIndex)}
                    className="ml-2 p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Características do Grupo */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-300">
                    Características do Grupo
                  </label>
                  <button
                    type="button"
                    onClick={() => addCharacteristic(groupIndex)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </button>
                </div>

                {group.characteristics.map((characteristic, charIndex) => (
                  <div key={charIndex} className="flex items-center gap-2">
                    <input
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
                      className="flex-1 p-3 text-gray-300 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {group.characteristics.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeCharacteristic(groupIndex, charIndex)
                        }
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Botão para adicionar novo grupo */}
          <button
            type="button"
            onClick={addGroup}
            className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Novo Grupo
          </button>
        </div>
      </form>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasChanges()}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors disabled:opacity-50 disabled:hover:bg-[#117d49]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditChecklistType;
