import { useState, useEffect } from "react";
import { updateCategory } from "../../../services/categoriesStore.js";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../../../context/CategoriesContext.jsx"; // NOVO
import {
  renameCategoryInAssignments,
  renameSubcategoryInAssignments,
} from "../../../services/partCategoryAssignments.js";
import { Loader2, Save, AlertTriangle, Tag, ClipboardEdit } from "lucide-react";

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
import { PageHeader, PageLoader } from "../../../components/app";

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

      // Update category data
      await updateCategory(categoryId, {
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
      <PageLoader />
    );
  }

  const hasChanges =
    originalData &&
    (formData.name !== originalData.name ||
      formData.description !== (originalData.description || ""));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={<>Editar {isSubcategory ? "Subcategoria" : "Categoria"}</>}
        description={<>Atualize as informações da{" "}
              {isSubcategory ? "subcategoria" : "categoria"}</>}
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
        {/* Parent Category Info (for subcategories) */}
        {isSubcategory && parentCategory && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Categoria Principal:</p>
                  <p className="text-base font-medium text-foreground">
                    {parentCategory.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Information Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
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
              <label className="text-sm font-medium text-muted-foreground">
                Nome <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder={
                    isSubcategory ? "Ex: Filtros de Óleo" : "Ex: Filtros"
                  }
                  className={`pl-10 bg-muted/50 border-border text-foreground ${
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
              <label className="text-sm font-medium text-muted-foreground">
                Descrição (Opcional)
              </label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descrição da categoria..."
                className="min-h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !hasChanges || !originalData}
          className="w-full"
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
