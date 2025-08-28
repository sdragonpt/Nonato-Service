// PartDetail.jsx - OTIMIZADO: Cache Universal para TUDO (incluindo imagens)
import { useState, useEffect, useCallback } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import { useCategories } from "../../../context/CategoriesContext.jsx";

// ✅ NOVO: Hooks com cache universal
import {
  usePartWithCache,
  usePartsCacheActions,
} from "../../../hooks/usePartsWithCache.js";
import { useCachedDocument } from "../../../hooks/useUniversalCache.js";

import {
  Loader2,
  ArrowLeft,
  Trash2,
  Edit2,
  AlertTriangle,
  Package,
  RefreshCw,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";

const PartDetail = () => {
  const { partId } = useParams();
  const navigate = useNavigate();

  const {
    getCategoryById,
    getSubcategoryById,
    isLoading: categoriesLoading,
  } = useCategories();

  // ✅ Hook principal para a peça com cache de 30 dias
  const {
    part,
    loading: partLoading,
    error: partError,
    refetch: refetchPart,
    exists,
  } = usePartWithCache(partId, {
    enabled: !!partId,
    onSuccess: (partData) => {
      console.log(`✅ Peça ${partId} carregada:`, partData.name);
    },
    onError: (error) => {
      console.error(`❌ Erro ao carregar peça ${partId}:`, error);
    },
  });

  // ✅ NOVO: Hook para imagem usando cache universal
  const {
    data: imageData,
    loading: imageLoading,
    error: imageError,
  } = useCachedDocument("image_library", part?.imageHash || null, {
    enabled: !!part?.imageHash, // Só buscar se tiver hash
  });

  // ✅ Hook para ações de cache
  const { invalidatePart } = usePartsCacheActions();

  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ OTIMIZADO: Processar imagem do cache
  const imagePreview = useCallback(() => {
    if (imageData?.data) {
      return imageData.data; // Do cache universal
    }
    if (part?.image) {
      return part.image; // Fallback para imagem direta
    }
    return ""; // Sem imagem
  }, [imageData, part]);

  // ✅ Effect para tratar erros
  useEffect(() => {
    if (partError) {
      setError(partError);
    }
    if (imageError) {
      console.warn("Erro ao carregar imagem:", imageError);
    }
  }, [partError, imageError]);

  // ✅ Effect para carregar categorias
  useEffect(() => {
    if (!part || categoriesLoading) return;

    if (part.categoryId) {
      const categoryData = getCategoryById(part.categoryId);
      setCategory(categoryData);
    }

    if (part.subcategoryId) {
      const subcategoryData = getSubcategoryById(part.subcategoryId);
      setSubcategory(subcategoryData);
    }
  }, [part, categoriesLoading, getCategoryById, getSubcategoryById]);

  // ✅ DELETE com navegação contextual
  const handleDeletePart = async () => {
    try {
      setIsSubmitting(true);

      // Delete no Firestore
      await deleteDoc(doc(db, "pecas", partId));

      // ✅ Invalidar cache da peça
      invalidatePart(partId);

      console.log(`🗑️ Peça ${partId} deletada e cache invalidado`);

      // ✅ NOVO: Navegar de volta para o contexto (categoria/subcategoria)
      const urlParams = new URLSearchParams(window.location.search);
      const returnCategoryId = urlParams.get("categoryId") || part?.categoryId;
      const returnSubcategoryId =
        urlParams.get("subcategoryId") || part?.subcategoryId;

      if (returnSubcategoryId && returnCategoryId) {
        navigate(
          `/app/parts-library?tab=categories&categoryId=${returnCategoryId}&subcategoryId=${returnSubcategoryId}`
        );
      } else if (returnCategoryId) {
        navigate(
          `/app/parts-library?tab=categories&categoryId=${returnCategoryId}`
        );
      } else {
        navigate("/app/parts-library");
      }
    } catch (err) {
      console.error("❌ Erro ao apagar peça:", err);
      setError("Erro ao apagar peça. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  // ✅ Loading combinado
  const isLoading = partLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // ✅ Verificar se peça existe
  if (!exists || !part) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Alert
          variant="destructive"
          className="border-red-500 bg-red-500/10 max-w-md"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            Peça não encontrada
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentImagePreview = imagePreview();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detalhes da Peça</h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie as informações da peça
            {/* ✅ Indicador de cache */}
            {process.env.NODE_ENV === "development" && (
              <span className="ml-2 text-green-400">
                • Cache 30d ativo {imageData ? "(img cached)" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {/* ✅ Botão para atualizar cache (dev) */}
          {process.env.NODE_ENV === "development" && (
            <Button
              variant="outline"
              size="icon"
              onClick={refetchPart}
              className="h-10 w-10 rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700"
              title="Atualizar cache"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/app/parts-library")}
            className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
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

      {/* ✅ Card Principal */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* ✅ OTIMIZADO: Imagem com cache universal */}
            <div className="relative">
              {currentImagePreview ? (
                <div className="h-24 w-24 rounded-lg overflow-hidden bg-zinc-700">
                  <img
                    src={currentImagePreview}
                    alt={part.name}
                    className="h-full w-full object-cover"
                  />
                  {/* Loading overlay para imagem */}
                  {imageLoading && (
                    <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg bg-zinc-700 flex items-center justify-center">
                  {imageLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  ) : (
                    <Package className="h-10 w-10 text-zinc-500" />
                  )}
                </div>
              )}

              {/* ✅ Indicador de cache de imagem */}
              {process.env.NODE_ENV === "development" && imageData && (
                <div className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-white text-xs px-1 py-0.5 rounded-b-lg text-center">
                  💾 IMG 30d
                </div>
              )}
            </div>

            {/* ✅ Informações da peça */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-white">
                  {part.name}
                </h3>
                <Badge className="bg-blue-500/10 text-blue-500">
                  {part.code}
                </Badge>
              </div>

              <p className="text-xl font-bold text-green-500 mt-1">
                {part.price > 0 ? (
                  new Intl.NumberFormat("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  }).format(part.price)
                ) : (
                  <span className="text-zinc-400 text-base">
                    Preço não definido
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ SEÇÃO DEDICADA PARA CATEGORIA E SUBCATEGORIA */}
          {(category || subcategory) && (
            <div className="bg-zinc-900/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">
                Classificação
              </h4>
              <div className="space-y-2">
                {category && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Categoria:</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {category.name}
                    </Badge>
                  </div>
                )}
                {subcategory && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Subcategoria:</span>
                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                      {subcategory.name}
                    </Badge>
                  </div>
                )}
                {/* ✅ Caminho completo da categoria */}
                {category && subcategory && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                    <span className="text-xs text-zinc-500">Caminho:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-blue-300">
                        {category.name}
                      </span>
                      <span className="text-zinc-500 text-xs">→</span>
                      <span className="text-xs text-green-300">
                        {subcategory.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {part.description && (
            <div className="bg-zinc-900/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">
                Descrição
              </h4>
              <p className="text-white whitespace-pre-line">
                {part.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Button
              onClick={() => navigate(`/app/edit-part/${partId}`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Peça
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Peça
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir a peça{" "}
              <span className="font-semibold text-white">{part?.name}</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePart}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartDetail;
