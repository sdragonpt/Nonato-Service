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
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Plus,
  X,
  Package,
  Tag,
  AlertTriangle,
  DollarSign,
  FileText,
  AlignLeft,
  Brackets,
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

const AddPart = () => {
  const navigate = useNavigate();

  // Initialize formData with "none" for select fields
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price: "",
    description: "",
    categoryId: "none",
    subcategoryId: "none",
  });

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryDialogOpen, setNewSubcategoryDialogOpen] =
    useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const q = query(
          collection(db, "categorias"),
          where("parentId", "==", null)
        );
        const snapshot = await getDocs(q);
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesData);
        setError(null);
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        setError("Erro ao carregar categorias. Por favor, tente novamente.");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!formData.categoryId || formData.categoryId === "none") {
        setSubcategories([]);
        return;
      }

      try {
        const q = query(
          collection(db, "categorias"),
          where("parentId", "==", formData.categoryId)
        );
        const snapshot = await getDocs(q);
        const subcategoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubcategories(subcategoriesData);
      } catch (err) {
        console.error("Erro ao buscar subcategorias:", err);
      }
    };

    fetchSubcategories();
  }, [formData.categoryId]);

  // Reset subcategoryId when categoryId changes to none
  useEffect(() => {
    // Esta função é chamada sempre que formData.categoryId mudar
    // para verificar se precisamos atualizar o valor de subcategoryId
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
      // Allow only numbers and decimal point
      const formattedValue = value.replace(/[^\d.]/g, "");
      // Ensure only one decimal point
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
      setImage(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview("");
  };

  const getNextPartId = async () => {
    try {
      const counterRef = doc(db, "counters", "partsCounter");
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
      console.error("Erro ao gerar ID da peça:", error);
      throw new Error("Falha ao gerar ID da peça");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      const counterRef = doc(db, "counters", "categoriesCounter");
      const counterSnapshot = await getDoc(counterRef);

      let newCategoryId;
      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        newCategoryId = currentCounter + 1;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
      } else {
        newCategoryId = 1;
        await setDoc(counterRef, { count: 1 });
      }

      await setDoc(doc(db, "categorias", newCategoryId.toString()), {
        name: newCategoryName,
        createdAt: new Date(),
        parentId: null,
      });

      // Refresh categories
      const q = query(
        collection(db, "categorias"),
        where("parentId", "==", null)
      );
      const snapshot = await getDocs(q);
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);

      // Reset and close dialog
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);

      // Set the newly created category as selected
      setFormData((prev) => ({
        ...prev,
        categoryId: newCategoryId.toString(),
        subcategoryId: "none", // Reset subcategory to "none"
      }));
    } catch (err) {
      console.error("Erro ao adicionar categoria:", err);
      setError("Erro ao adicionar categoria. Por favor, tente novamente.");
    }
  };

  const handleAddSubcategory = async () => {
    if (
      !newSubcategoryName.trim() ||
      !formData.categoryId ||
      formData.categoryId === "none"
    ) {
      return;
    }

    try {
      const counterRef = doc(db, "counters", "categoriesCounter");
      const counterSnapshot = await getDoc(counterRef);

      let newSubcategoryId;
      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        newSubcategoryId = currentCounter + 1;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
      } else {
        newSubcategoryId = 1;
        await setDoc(counterRef, { count: 1 });
      }

      await setDoc(doc(db, "categorias", newSubcategoryId.toString()), {
        name: newSubcategoryName,
        createdAt: new Date(),
        parentId: formData.categoryId,
      });

      // Refresh subcategories
      const q = query(
        collection(db, "categorias"),
        where("parentId", "==", formData.categoryId)
      );
      const snapshot = await getDocs(q);
      const subcategoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubcategories(subcategoriesData);

      // Reset and close dialog
      setNewSubcategoryName("");
      setNewSubcategoryDialogOpen(false);

      // Set the newly created subcategory as selected
      setFormData((prev) => ({
        ...prev,
        subcategoryId: newSubcategoryId.toString(),
      }));
    } catch (err) {
      console.error("Erro ao adicionar subcategoria:", err);
      setError("Erro ao adicionar subcategoria. Por favor, tente novamente.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Set all fields as touched for validation
    const allFields = { name: true, code: true, price: true };
    setTouched((prev) => ({ ...prev, ...allFields }));

    // Validate required fields
    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Os campos Nome e Código são obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newPartId = await getNextPartId();

      // Find category and subcategory names
      let categoryName = "";
      let subcategoryName = "";
      let formDataToSave = { ...formData };

      // Convert "none" values to empty strings
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

      await setDoc(doc(db, "pecas", newPartId.toString()), {
        ...formDataToSave,
        price: parseFloat(formDataToSave.price) || 0,
        image: imagePreview,
        createdAt: new Date(),
        lastUpdate: new Date(),
        categoryName,
        subcategoryName,
      });

      navigate("/app/parts-library");
    } catch (err) {
      console.error("Erro ao adicionar peça:", err);
      setError("Erro ao adicionar peça. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Peça</h1>
          <p className="text-sm text-zinc-400">
            Adicione uma nova peça à biblioteca
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
        {/* Part Image Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Imagem da Peça</CardTitle>
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

            {/* Price Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Preço (€)
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
                  className={`pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500 ${
                    touched.price && !formData.price ? "border-red-500" : ""
                  }`}
                />
              </div>
              {touched.price && !formData.price && (
                <p className="text-sm text-red-500">Preço é obrigatório</p>
              )}
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Selection (only if category is selected) */}
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
              Adicionar Peça
            </>
          )}
        </Button>
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

export default AddPart;
