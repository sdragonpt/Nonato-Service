import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { saveCategory } from "../../../services/categoriesStore.js";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../../../context/CategoriesContext.jsx"; // NOVO
import { Loader2, Plus, AlertTriangle, Tag } from "lucide-react";

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
import { PageHeader, PageLoader } from "../../../components/app";

const AddSubcategory = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  // USAR cache de categorias
  const {
    getCategoryById,
    addCategoryToCache,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [parentCategory, setParentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  // USAR cache em vez de fetch direto
  useEffect(() => {
    if (!categoriesLoading) {
      const category = getCategoryById(categoryId);
      if (category) {
        setParentCategory(category);
        setError(null);
      } else {
        setError("Categoria pai não encontrada");
      }
    }
  }, [categoryId, getCategoryById, categoriesLoading]);

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

  const getNextCategoryId = async () => {
    try {
      const counterRef = doc(db, "counters", "categoriesCounter");
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
      console.error("Erro ao gerar ID da subcategoria:", error);
      throw new Error("Falha ao gerar ID da subcategoria");
    }
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

      const newSubcategoryId = await getNextCategoryId();

      const newSubcategory = {
        id: newSubcategoryId.toString(),
        ...formData,
        createdAt: new Date(),
        parentId: categoryId, // Referência à categoria pai
      };

      await saveCategory(newSubcategoryId.toString(), {
        ...formData,
        createdAt: new Date(),
        parentId: categoryId,
      });

      // NOVO: Adicionar subcategoria ao cache para evitar nova leitura
      addCategoryToCache(newSubcategory);

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
        // Como é uma subcategoria, sempre volta para a categoria pai
        navigate(`/app/parts-library?tab=categories&categoryId=${categoryId}`);
      }
    } catch (err) {
      console.error("Erro ao adicionar subcategoria:", err);
      setError("Erro ao adicionar subcategoria. Por favor, tente novamente.");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Nova Subcategoria"
        description={<>Adicione uma nova subcategoria para {parentCategory?.name}</>}
        icon={Tag}
        back
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parent Category Info */}
        {parentCategory && (
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

        {/* Subcategory Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações da Subcategoria
            </CardTitle>
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
                  placeholder="Ex: Filtros de Óleo"
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
                placeholder="Descrição da subcategoria..."
                className="min-h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !parentCategory}
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
              Adicionar Subcategoria
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddSubcategory;
