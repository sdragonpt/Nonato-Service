import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../../../context/CategoriesContext.jsx"; // NOVO
import {
  renameCategoryInAssignments,
  renameSubcategoryInAssignments,
} from "../../../services/partCategoryAssignments.js";
import { ArrowLeft, Loader2, Save, AlertTriangle, Tag, ClipboardEdit } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";

const EditCategory = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  // USAR cache de categorias
  const {
    getCategoryById,
    getSubcategoryById,
    updateCategoryInCache,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [parentCategory, setParentCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [isSubcategory, setIsSubcategory] = useState(false);

  // USAR cache em vez de fetch direto
  useEffect(() => {
    if (!categoriesLoading) {
      // Primeiro tentar como categoria principal
      let categoryData = getCategoryById(categoryId);

      if (categoryData) {
        // É uma categoria principal
        setIsSubcategory(false);
        setFormData({
          name: categoryData.name || "",
          description: categoryData.description || "",
        });
        setOriginalData(categoryData);
        setError(null);
      } else {
        // Tentar como subcategoria
        categoryData = getSubcategoryById(categoryId);

        if (categoryData) {
          // É uma subcategoria
          setIsSubcategory(true);
          setFormData({
            name: categoryData.name || "",
            description: categoryData.description || "",
          });
          setOriginalData(categoryData);

          // Buscar categoria pai usando cache
          if (categoryData.parentId) {
            const parentData = getCategoryById(categoryData.parentId);
            if (parentData) {
              setParentCategory(parentData);
            }
          }
          setError(null);
        } else {
          setError("Categoria não encontrada");
        }
      }
    }
  }, [categoryId, categoriesLoading, getCategoryById, getSubcategoryById]);

  // Mostrar erro das categorias se houver
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    }
  }, [categoriesError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, name: true }));

    if (!formData.name.trim()) {
      setError("O campo Nome é obrigatório");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const categoryRef = doc(db, "categorias", categoryId);

      // Update category data
      await updateDoc(categoryRef, {
        ...formData,
        lastUpdate: new Date(),
      });

      // Se o nome mudou, atualizar também o nome já guardado nas atribuições
      // de categoria das peças do catálogo (ver partCategoryAssignments.js)
      if (formData.name !== originalData.name) {
        if (isSubcategory) {
          await renameSubcategoryInAssignments(categoryId, formData.name);
        } else {
          await renameCategoryInAssignments(categoryId, formData.name);
        }
      }

      // NOVO: Atualizar cache em vez de forçar refresh
      updateCategoryInCache(categoryId, formData);

      const urlParams = new URLSearchParams(window.location.search);
      const returnCategoryId = urlParams.get("returnCategoryId");
      const returnSubcategoryId = urlParams.get("returnSubcategoryId");

      if (returnSubcategoryId) {
        navigate(
          `/app/parts-library?tab=categories&categoryId=${returnCategoryId}&subcategoryId=${returnSubcategoryId}`
        );
      } else if (returnCategoryId) {
        navigate(
          `/app/parts-library?tab=categories&categoryId=${returnCategoryId}`
        );
      } else {
        navigate("/app/parts-library?tab=categories");
      }
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    originalData &&
    (formData.name !== originalData.name ||
      formData.description !== (originalData.description || ""));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <ClipboardEdit className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Editar {isSubcategory ? "Subcategoria" : "Categoria"}
            </h1>
            <p className="text-sm text-zinc-400">
              Atualize as informações da{" "}
              {isSubcategory ? "subcategoria" : "categoria"}
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
        {/* Parent Category Info (for subcategories) */}
        {isSubcategory && parentCategory && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-zinc-400">Categoria Principal:</p>
                  <p className="text-base font-medium text-white">
                    {parentCategory.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">
                Informações da {isSubcategory ? "Subcategoria" : "Categoria"}
              </CardTitle>

              <Badge
                className={
                  isSubcategory
                    ? "bg-purple-500/10 text-purple-500"
                    : "bg-blue-500/10 text-blue-500"
                }
              >
                {isSubcategory ? "Subcategoria" : "Categoria"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder={
                    isSubcategory ? "Ex: Filtros de Óleo" : "Ex: Filtros"
                  }
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.name && !formData.name ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.name && !formData.name && (
                <p className="text-sm text-red-500">Nome é obrigatório</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Descrição (Opcional)
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descrição da categoria..."
                className="min-h-20 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !hasChanges || !originalData}
          className="w-full bg-green-600 hover:bg-green-700"
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

export default EditCategory;
