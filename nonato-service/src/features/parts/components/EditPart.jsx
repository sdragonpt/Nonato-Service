import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, setDoc, increment } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../firebase.jsx";
import { useCategories } from "../../../context/CategoriesContext.jsx";
import {
  incrementPartCount,
  decrementPartCount,
} from "../../../utils/MetadataCounters.js";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  X,
  Package,
  AlertTriangle,
  DollarSign,
  AlignLeft,
  Brackets,
  Plus,
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
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// ✅ HOOK para compatibilidade com PCs antigos
const useOldBrowserSafe = () => {
  const mounted = useRef(true);
  const timeouts = useRef([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Limpar todos os timeouts pendentes
      timeouts.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const safeSetState = (setter, delay = 200) => {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          try {
            setter();
            resolve(true);
          } catch (error) {
            console.warn("Estado não atualizado (PC antigo):", error);
            resolve(false);
          }
        }
      }, delay);
      timeouts.current.push(timeoutId);
    });
  };

  const safeNavigate = (navigate, path, delay = 800) => {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (mounted.current) {
          try {
            console.log("🔄 Navegando de forma segura para:", path);
            navigate(path);
            resolve(true);
          } catch (error) {
            console.warn("Navigate falhou, usando fallback:", error);
            window.location.href = path;
            resolve(true);
          }
        }
      }, delay);
      timeouts.current.push(timeoutId);
    });
  };

  return { safeSetState, safeNavigate, isMounted: () => mounted.current };
};

const EditPart = () => {
  const { partId } = useParams();
  const navigate = useNavigate();

  // ✅ NOVO: Hook para compatibilidade com PCs antigos
  const { safeSetState, safeNavigate } = useOldBrowserSafe();

  const {
    categories,
    getSubcategoriesByParent,
    addCategoryToCache,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price: "",
    description: "",
    categoryId: "none",
    subcategoryId: "none",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [currentImageHash, setCurrentImageHash] = useState(null); // ✅ NOVO: Track da imagem atual
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryDialogOpen, setNewSubcategoryDialogOpen] =
    useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);

  // ✅ NOVO: Ordenar categorias alfabeticamente
  const sortedCategories = categories.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT")
  );

  // ✅ MODIFICADO: Ordenar subcategorias alfabeticamente
  const subcategories =
    formData.categoryId && formData.categoryId !== "none"
      ? getSubcategoriesByParent(formData.categoryId).sort((a, b) =>
          a.name.localeCompare(b.name, "pt-PT")
        )
      : [];

  // Função para gerar IDs únicos
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}-${Math.floor(Math.random() * 10000)}`;
  };

  // ✅ MODIFICADO: Função para gerar hash único da imagem (sempre único)
  const generateImageHash = () => {
    // Sempre gerar hash único usando timestamp + random
    return `img_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}_${Math.floor(Math.random() * 10000)}`;
  };

  // ✅ NOVO: Buscar imagem da biblioteca
  const loadImageFromLibrary = async (imageHash) => {
    try {
      if (!imageHash) return null;

      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar imagem da biblioteca:", error);
      return null;
    }
  };

  // ✅ MODIFICADO: Salvar imagem na biblioteca (sempre salva nova entrada)
  const saveImageToLibrary = async (imageData) => {
    try {
      const imageHash = generateImageHash();
      const imageRef = doc(db, "image_library", imageHash);

      // Sempre salvar como nova entrada (sem verificar duplicatas)
      await setDoc(imageRef, {
        hash: imageHash,
        data: imageData,
        createdAt: new Date(),
        usageCount: 1,
      });

      console.log("✅ Nova imagem salva na biblioteca:", imageHash);
      return imageHash;
    } catch (error) {
      console.error("Erro ao salvar imagem na biblioteca:", error);
      throw error;
    }
  };

  // ✅ NOVO: Decrementar uso da imagem antiga
  const decrementImageUsage = async (imageHash) => {
    try {
      if (!imageHash) return;

      const imageRef = doc(db, "image_library", imageHash);
      await setDoc(
        imageRef,
        {
          usageCount: increment(-1),
          lastUnused: new Date(),
        },
        { merge: true }
      );

      console.log("♻️ Uso de imagem decrementado:", imageHash);
    } catch (error) {
      console.error("Erro ao decrementar uso da imagem:", error);
    }
  };

  // ✅ NOVO: Função de navegação mais robusta para computadores antigos
  const handleGoBack = () => {
    try {
      // Tentar usar navigate primeiro
      navigate(-1);
    } catch (error) {
      console.warn("Erro no navigate, redirecionando para biblioteca:", error);
      // Fallback: ir direto para a biblioteca de peças
      window.location.href = "/app/parts-library";
    }
  };

  // ✅ NOVO: Função para ir direto ao detalhe da peça (caso necessário)
  const handleGoToPartDetail = () => {
    window.location.href = `/app/part/${partId}`;
  };

  // Fetch part data
  useEffect(() => {
    const fetchPart = async () => {
      try {
        setIsLoading(true);
        const partDoc = doc(db, "pecas", partId);
        const partData = await getDoc(partDoc);

        if (!partData.exists()) {
          setError("Peça não encontrada");
          return;
        }

        const data = partData.data();
        setFormData({
          name: data.name || "",
          code: data.code || "",
          price: data.price ? data.price.toString() : "",
          description: data.description || "",
          categoryId: data.categoryId || "none",
          subcategoryId: data.subcategoryId || "none",
        });

        // ✅ NOVO: Carregar imagem da biblioteca ou usar legacy
        if (data.imageHash) {
          // Nova estrutura com hash
          setCurrentImageHash(data.imageHash);
          const imageData = await loadImageFromLibrary(data.imageHash);
          setImagePreview(imageData || "");
        } else if (data.image) {
          // Legacy: imagem salva diretamente
          setImagePreview(data.image);
          setCurrentImageHash(null);
        } else {
          setImagePreview("");
          setCurrentImageHash(null);
        }

        setOriginalData(data);
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar peça:", err);
        setError("Erro ao carregar dados da peça");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPart();
  }, [partId]);

  // Reset subcategoryId when categoryId changes to none
  useEffect(() => {
    if (formData.categoryId === "none" && formData.subcategoryId !== "none") {
      setFormData((prev) => ({
        ...prev,
        subcategoryId: "none",
      }));
    }
  }, [formData.categoryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle price formatting
    if (name === "price") {
      const formattedValue = value.replace(/[^\d.]/g, "");
      const parts = formattedValue.split(".");
      const formattedPrice =
        parts.length > 1
          ? `${parts[0]}.${parts.slice(1).join("")}`
          : formattedValue;

      setFormData((prev) => ({ ...prev, [name]: formattedPrice }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    // ✅ NOVO: Marcar que a imagem foi removida explicitamente
    setCurrentImageHash("REMOVED");
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || isCreatingCategory) return;

    try {
      setIsCreatingCategory(true);
      setError(null);

      const newCategoryId = generateUniqueId();

      const newCategory = {
        id: newCategoryId,
        name: newCategoryName,
        createdAt: new Date(),
        parentId: null,
      };

      await setDoc(doc(db, "categorias", newCategoryId), newCategory);
      addCategoryToCache(newCategory);

      setNewCategoryName("");
      setNewCategoryDialogOpen(false);

      setFormData((prev) => ({
        ...prev,
        categoryId: newCategoryId,
        subcategoryId: "none",
      }));
    } catch (err) {
      console.error("Erro ao adicionar categoria:", err);
      setError("Erro ao adicionar categoria. Por favor, tente novamente.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleAddSubcategory = async () => {
    if (
      !newSubcategoryName.trim() ||
      !formData.categoryId ||
      formData.categoryId === "none" ||
      isCreatingSubcategory
    ) {
      return;
    }

    try {
      setIsCreatingSubcategory(true);
      setError(null);

      const newSubcategoryId = generateUniqueId();

      const newSubcategory = {
        id: newSubcategoryId,
        name: newSubcategoryName,
        createdAt: new Date(),
        parentId: formData.categoryId,
      };

      await setDoc(doc(db, "categorias", newSubcategoryId), newSubcategory);
      addCategoryToCache(newSubcategory);

      setNewSubcategoryName("");
      setNewSubcategoryDialogOpen(false);
      setFormData((prev) => ({
        ...prev,
        subcategoryId: newSubcategoryId,
      }));
    } catch (err) {
      console.error("Erro ao adicionar subcategoria:", err);
      setError("Erro ao adicionar subcategoria. Por favor, tente novamente.");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ MODIFICADO: Só nome e código são obrigatórios
    const requiredFields = { name: true, code: true };
    setTouched((prev) => ({ ...prev, ...requiredFields }));

    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Os campos Nome e Código são obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Find category and subcategory names
      let categoryName = "";
      let subcategoryName = "";
      let formDataToSave = { ...formData };

      if (formDataToSave.categoryId === "none") {
        formDataToSave.categoryId = "";
      }

      if (formDataToSave.subcategoryId === "none") {
        formDataToSave.subcategoryId = "";
      }

      if (formDataToSave.categoryId) {
        const category = categories.find(
          (cat) => cat.id === formDataToSave.categoryId
        );
        if (category) {
          categoryName = category.name;
        }
      }

      if (formDataToSave.subcategoryId) {
        const subcategory = subcategories.find(
          (subcat) => subcat.id === formDataToSave.subcategoryId
        );
        if (subcategory) {
          subcategoryName = subcategory.name;
        }
      }

      // ✅ NOVO: Detectar mudanças nas categorias para atualizar contadores
      const oldCategoryId = originalData?.categoryId || null;
      const oldSubcategoryId = originalData?.subcategoryId || null;
      const newCategoryId = formDataToSave.categoryId || null;
      const newSubcategoryId = formDataToSave.subcategoryId || null;

      const categoryChanged = oldCategoryId !== newCategoryId;
      const subcategoryChanged = oldSubcategoryId !== newSubcategoryId;

      // Atualizar contadores apenas se houve mudança
      if (categoryChanged || subcategoryChanged) {
        console.log("🔄 Categorias alteradas, atualizando contadores...");

        // Decrementar da categoria/subcategoria antiga
        if (oldCategoryId || oldSubcategoryId) {
          await decrementPartCount(oldCategoryId, oldSubcategoryId);
          console.log("➖ Decrementado:", oldCategoryId, oldSubcategoryId);
        }

        // Incrementar na nova categoria/subcategoria
        if (newCategoryId || newSubcategoryId) {
          await incrementPartCount(newCategoryId, newSubcategoryId);
          console.log("➕ Incrementado:", newCategoryId, newSubcategoryId);
        }
      }

      // ✅ CORRIGIDO: Gerenciar imagens na biblioteca
      let newImageHash = currentImageHash;

      // Verificar se houve mudança na imagem
      const originalImageData = originalData?.image || "";
      const imageWasChanged =
        imagePreview !== originalImageData || currentImageHash === "REMOVED";

      if (imageWasChanged) {
        console.log("🔄 Imagem foi alterada/removida");

        // Decrementar uso da imagem antiga (se houver e não for "REMOVED")
        if (currentImageHash && currentImageHash !== "REMOVED") {
          await decrementImageUsage(currentImageHash);
          console.log(
            "♻️ Uso da imagem antiga decrementado:",
            currentImageHash
          );
        }

        // Verificar se foi removida explicitamente ou se há nova imagem
        if (currentImageHash === "REMOVED" || !imagePreview) {
          // Imagem foi removida
          newImageHash = null;
          console.log("🗑️ Imagem removida - definindo imageHash como null");
        } else if (imagePreview) {
          // Nova imagem foi adicionada
          newImageHash = await saveImageToLibrary(imagePreview);
          console.log("📷 Nova imagem salva:", newImageHash);
        }
      }

      const partRef = doc(db, "pecas", partId);
      const updateData = {
        ...formDataToSave,
        price: parseFloat(formDataToSave.price) || 0, // ✅ Default para 0
        lastUpdate: new Date(),
        categoryName,
        subcategoryName,
      };

      // ✅ CORRIGIDO: Gerir campos de imagem corretamente
      if (newImageHash) {
        // Há nova imagem
        updateData.imageHash = newImageHash;
        updateData.image = null; // Limpar campo legacy
      } else {
        // Não há imagem (removida ou nunca teve)
        updateData.imageHash = null;
        updateData.image = null; // Garantir que legacy também é limpo
      }

      await updateDoc(partRef, updateData);

      // ✅ MODIFICADO: Redirecionar de forma segura para PCs antigos
      console.log(
        "✅ Peça atualizada com sucesso, navegando de forma segura..."
      );

      // ✅ Aguardar mais tempo e navegar com fallback robusto
      await safeNavigate(navigate, `/app/part/${partId}`, 1200);
    } catch (err) {
      console.error("Erro ao atualizar peça:", err);
      setError("Erro ao salvar alterações. Por favor, tente novamente.");

      // ✅ Só resetar o loading se houver erro (com delay seguro)
      await safeSetState(() => setIsSubmitting(false), 300);
    }
    // ✅ Não resetar isSubmitting no sucesso para manter loading durante navegação
  };

  const hasChanges =
    originalData &&
    (formData.name !== originalData.name ||
      formData.code !== originalData.code ||
      parseFloat(formData.price) !== originalData.price ||
      formData.description !== originalData.description ||
      (formData.categoryId !== "none" &&
        formData.categoryId !== originalData.categoryId) ||
      (formData.subcategoryId !== "none" &&
        formData.subcategoryId !== originalData.subcategoryId) ||
      imagePreview !== (originalData.image || "") ||
      currentImageHash === "REMOVED"); // ✅ NOVO: Detectar remoção explícita

  // Loading state para categorias ou peça
  if (isLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Mostrar erro das categorias se houver
  if (categoriesError && !error) {
    setError(categoriesError);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Peça</h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações da peça
          </p>
        </div>
        <div className="flex gap-2">
          {/* ✅ Botão principal de voltar */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleGoBack}
            className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Part Image Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Imagem da Peça
              <span className="text-sm font-normal text-zinc-400 ml-2">
                (Cada imagem é salva individualmente)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative w-32 h-32">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full rounded-lg object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center p-6 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700/50 transition-colors">
                <Camera className="h-8 w-8 text-zinc-400 mb-2" />
                <span className="text-sm text-zinc-400">
                  Clique para adicionar imagem
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  ✅ Todas as imagens são sempre salvas
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Part Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações da Peça
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                  placeholder="Ex: Filtro de Óleo"
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.name && !formData.name ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.name && !formData.name && (
                <p className="text-sm text-red-500">Nome é obrigatório</p>
              )}
            </div>

            {/* Code Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Código <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Brackets className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  onBlur={() => handleBlur("code")}
                  placeholder="Ex: FO-123-ABC"
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.code && !formData.code ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.code && !formData.code && (
                <p className="text-sm text-red-500">Código é obrigatório</p>
              )}
            </div>

            {/* ✅ MODIFICADO: Price Field - Não obrigatório */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Preço (€)
                <span className="text-zinc-500 text-xs ml-1">(Opcional)</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={() => handleBlur("price")}
                  placeholder="Ex: 29.99"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Descrição
              </label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 text-zinc-400" />
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descreva a peça..."
                  className="pl-10 min-h-24 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
                />
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400">
                  Categoria
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewCategoryDialogOpen(true)}
                  className="h-8 text-green-500 hover:text-green-400 hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Categoria
                </Button>
              </div>
              <select
                value={
                  formData.categoryId === "" ? "none" : formData.categoryId
                }
                onChange={(e) => {
                  const value = e.target.value === "none" ? "" : e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: value,
                    subcategoryId: "",
                  }));
                }}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
              >
                <option value="none">Nenhuma</option>
                {/* ✅ MODIFICADO: Usar categorias ordenadas alfabeticamente */}
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Selection */}
            {formData.categoryId && formData.categoryId !== "none" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-400">
                    Subcategoria
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewSubcategoryDialogOpen(true)}
                    disabled={
                      !formData.categoryId || formData.categoryId === "none"
                    }
                    className="h-8 text-green-500 hover:text-green-400 hover:bg-zinc-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Subcategoria
                  </Button>
                </div>
                <select
                  value={
                    formData.subcategoryId === ""
                      ? "none"
                      : formData.subcategoryId
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value === "none" ? "" : e.target.value;
                    setFormData((prev) => ({ ...prev, subcategoryId: value }));
                  }}
                  disabled={subcategories.length === 0}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
                >
                  <option value="none">Nenhuma</option>
                  {/* ✅ JÁ MODIFICADO: subcategories já estão ordenadas acima */}
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                {subcategories.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    Sem subcategorias disponíveis para esta categoria
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando e redirecionando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>

        {/* ✅ MODIFICADO: Aviso melhorado sobre o redirecionamento */}
        {isSubmitting && (
          <Alert className="border-blue-500 bg-blue-500/10">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-blue-400">
              💾 Salvando alterações... Será redirecionado para verificar as
              mudanças.
              <br />
              <span className="text-xs text-blue-300">
                Em PCs antigos este processo pode demorar alguns segundos.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </form>

      {/* New Category Dialog */}
      <Dialog
        open={newCategoryDialogOpen}
        onOpenChange={setNewCategoryDialogOpen}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Categoria</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Adicione uma nova categoria para as peças.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome da Categoria
              </label>
              <Input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Filtros"
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setNewCategoryDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Subcategory Dialog */}
      <Dialog
        open={newSubcategoryDialogOpen}
        onOpenChange={setNewSubcategoryDialogOpen}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Subcategoria</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Adicione uma nova subcategoria para a categoria selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                Categoria:{" "}
                <span className="text-white">
                  {formData.categoryId && formData.categoryId !== "none"
                    ? categories.find((c) => c.id === formData.categoryId)?.name
                    : "Nenhuma"}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome da Subcategoria
              </label>
              <Input
                type="text"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="Ex: Filtros de Óleo"
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setNewSubcategoryDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSubcategory}
              disabled={
                !newSubcategoryName.trim() ||
                !formData.categoryId ||
                formData.categoryId === "none"
              }
              className="bg-green-600 hover:bg-green-700"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditPart;
