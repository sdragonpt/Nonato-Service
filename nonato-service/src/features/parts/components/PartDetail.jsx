import { useState, useEffect } from "react";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Trash2,
  Edit2,
  Plus,
  AlertTriangle,
  Package,
  Tag,
  DollarSign,
  FileText,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";

const PartDetail = () => {
  const { partId } = useParams();
  const navigate = useNavigate();
  const [part, setPart] = useState(null);
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [, setPhotoChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setPhotoLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch part data
        const partDoc = doc(db, "pecas", partId);
        const partData = await getDoc(partDoc);

        if (!partData.exists()) {
          setError("Peça não encontrada");
          return;
        }

        const partInfo = { id: partData.id, ...partData.data() };
        setPart(partInfo);
        setNewPhotoURL(partInfo.image);

        // Fetch category if exists
        if (partInfo.categoryId) {
          const categoryDoc = doc(db, "categorias", partInfo.categoryId);
          const categoryData = await getDoc(categoryDoc);
          if (categoryData.exists()) {
            setCategory({ id: categoryData.id, ...categoryData.data() });
          }
        }

        // Fetch subcategory if exists
        if (partInfo.subcategoryId) {
          const subcategoryDoc = doc(db, "categorias", partInfo.subcategoryId);
          const subcategoryData = await getDoc(subcategoryDoc);
          if (subcategoryData.exists()) {
            setSubcategory({ id: subcategoryData.id, ...subcategoryData.data() });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados da peça. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [partId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter menos de 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoURL(reader.result);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      setPhotoChanged(true);
    }
  };

  const handleDeletePart = async () => {
    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "pecas", partId));
      navigate("/app/parts-library");
    } catch (err) {
      console.error("Erro ao apagar peça:", err);
      setError("Erro ao apagar peça. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!part) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detalhes da Peça</h1>
          <p className="text-sm text-zinc-400">
            Visualize e gerencie as informações da peça
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

      {/* Part Info Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative group">
              {part.image ? (
                <div className="h-24 w-24 rounded-lg overflow-hidden bg-zinc-700">
                  <img
                    src={part.image}
                    alt={part.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg bg-zinc-700 flex items-center justify-center">
                  <Package className="h-10 w-10 text-zinc-500" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-white">{part.name}</h3>
                <Badge className="bg-blue-500/10 text-blue-500">{part.code}</Badge>
              </div>
              <p className="text-xl font-bold text-green-500 mt-1">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(part.price || 0)}
              </p>
              {category && (
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                    {category.name}
                  </Badge>
                  {subcategory && (
                    <>
                      <span className="text-zinc-500">&gt;</span>
                      <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                        {subcategory.name}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {part.description && (
            <div className="bg-zinc-900/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Descrição</h4>
              <p className="text-white whitespace-pre-line">{part.description}</p>
            </div>
          )}

          {/* Details List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Package className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="text-zinc-500">Código:</span>
              <span className="text-white">{part.code}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <DollarSign className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="text-zinc-500">Preço:</span>
              <span className="text-white">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(part.price || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Tag className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="text-zinc-500">Categoria:</span>
              <span className="text-white">{category?.name || "Nenhuma"}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Tag className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="text-zinc-500">Subcategoria:</span>
              <span className="text-white">{subcategory?.name || "Nenhuma"}</span>
            </div>
            {part.createdAt && (
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="text-zinc-500">Cadastrado em:</span>
                <span className="text-white">
                  {new Date(part.createdAt.toDate()).toLocaleDateString('pt-PT')}
                </span>
              </div>
            )}
            {part.lastUpdate && (
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="text-zinc-500">Última atualização:</span>
                <span className="text-white">
                  {new Date(part.lastUpdate.toDate()).toLocaleDateString('pt-PT')}
                </span>
              </div>
            )}
          </div>

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

      {/* Delete Confirmation Dialog */}
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