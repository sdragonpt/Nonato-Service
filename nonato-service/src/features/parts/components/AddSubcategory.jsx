import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  getDoc,
  increment,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, AlertTriangle, Tag } from "lucide-react";

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

const AddSubcategory = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [parentCategory, setParentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const fetchParentCategory = async () => {
      try {
        setIsLoading(true);
        const categoryDoc = doc(db, "categorias", categoryId);
        const categorySnapshot = await getDoc(categoryDoc);

        if (!categorySnapshot.exists()) {
          setError("Categoria pai não encontrada");
          return;
        }

        setParentCategory({
          id: categorySnapshot.id,
          ...categorySnapshot.data(),
        });
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar categoria pai:", err);
        setError("Erro ao carregar categoria pai. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentCategory();
  }, [categoryId]);

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
      await setDoc(doc(db, "categorias", newSubcategoryId.toString()), {
        ...formData,
        createdAt: new Date(),
        parentId: categoryId, // Referência à categoria pai
      });

      navigate("/app/parts-library?tab=categories");
    } catch (err) {
      console.error("Erro ao adicionar subcategoria:", err);
      setError("Erro ao adicionar subcategoria. Por favor, tente novamente.");
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
          <h1 className="text-2xl font-bold text-white">Nova Subcategoria</h1>
          <p className="text-sm text-zinc-400">
            Adicione uma nova subcategoria para {parentCategory?.name}
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
        {/* Parent Category Info */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-zinc-400">Categoria Principal:</p>
                <p className="text-base font-medium text-white">
                  {parentCategory?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subcategory Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações da Subcategoria
            </CardTitle>
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
                  placeholder="Ex: Filtros de Óleo"
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
                placeholder="Descrição da subcategoria..."
                className="min-h-20 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
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
