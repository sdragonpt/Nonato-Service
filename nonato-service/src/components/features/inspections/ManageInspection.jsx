import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";

import generateInspectionPDF from "./components/pdf/generateInspectionPDF.jsx";
import LanguageDialog from "../../shared/LanguageDialog.jsx";

// Lucide Icons
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  ClipboardCheck,
  AlertTriangle,
  Package,
  CheckSquare,
  FileText,
  RefreshCw,
  ChartBarIcon,
  GraduationCap,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const InspectionCard = ({
  inspection,
  onDelete,
  onEdit,
  onGeneratePDF,
  isGeneratingPDF,
}) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors">
      <CardContent className="p-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-700 flex items-center justify-center transform transition-all duration-200 hover:scale-105 cursor-help"
            title={
              inspection.type === "training"
                ? "Training Inspection"
                : "Standard Inspection"
            }
          >
            {inspection.type === "training" ? (
              <GraduationCap className="w-5 h-5 text-white" />
            ) : (
              <ClipboardCheck className="w-5 h-5 text-white" />
            )}
          </div>

          <div
            className="flex-1 min-w-0"
            onClick={(e) => {
              if (!e.defaultPrevented) {
                navigate(`/app/inspection-detail/${inspection.id}`);
              }
            }}
          >
            <h3 className="font-semibold text-lg text-white truncate">
              {inspection.clientName}
            </h3>
            <div className="flex flex-col text-sm text-zinc-400">
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                <span className="truncate">{inspection.equipmentType}</span>
              </div>
              <div className="flex items-center">
                <CheckSquare className="w-4 h-4 mr-1" />
                <span className="truncate">{inspection.checklistType}</span>
              </div>
            </div>
            <p className="text-zinc-400 text-sm mt-1">
              {inspection.createdAt?.toDate().toLocaleDateString()}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-zinc-700 text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-800 border-zinc-700"
            >
              <DropdownMenuItem
                onClick={() => onGeneratePDF(inspection)}
                disabled={isGeneratingPDF}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar PDF
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(inspection.id)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(inspection)}
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const ManageInspection = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState(null);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [inspectionToGenerate, setInspectionToGenerate] = useState(null);

  const fetchInspections = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "inspections"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      const inspectionPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = { id: docSnapshot.id, ...docSnapshot.data() };
        const [clientDoc, equipmentDoc, checklistDoc] = await Promise.all([
          getDoc(doc(db, "clientes", data.clientId)),
          getDoc(doc(db, "equipamentos", data.equipmentId)),
          getDoc(doc(db, "checklist_machines", data.checklistTypeId)),
        ]);

        return {
          ...data,
          clientName: clientDoc.exists()
            ? clientDoc.data().name
            : "Cliente não encontrado",
          equipmentType: equipmentDoc.exists()
            ? equipmentDoc.data().type
            : "Equipamento não encontrado",
          checklistType: checklistDoc.exists()
            ? checklistDoc.data().type
            : "Tipo não encontrado",
        };
      });

      const inspectionsData = await Promise.all(inspectionPromises);
      setInspections(inspectionsData);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar inspeções:", err);
      setError("Erro ao carregar inspeções. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleDelete = async (inspectionId) => {
    try {
      await deleteDoc(doc(db, "inspections", inspectionId));
      setInspections((prev) =>
        prev.filter((inspection) => inspection.id !== inspectionId)
      );
      setDeleteDialogOpen(false);
      setInspectionToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar inspeção:", error);
      setError("Erro ao deletar inspeção. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (inspection) => {
    setInspectionToDelete(inspection);
    setDeleteDialogOpen(true);
  };

  const handleGeneratePDF = (inspection) => {
    setInspectionToGenerate(inspection);
    setLanguageDialogOpen(true);
  };

  const generatePDFWithLanguage = async (language) => {
    try {
      setIsGeneratingPDF(true);
      const [clientDoc, equipmentDoc, checklistDoc] = await Promise.all([
        getDoc(doc(db, "clientes", inspectionToGenerate.clientId)), // corrigido
        getDoc(doc(db, "equipamentos", inspectionToGenerate.equipmentId)),
        getDoc(
          doc(db, "checklist_machines", inspectionToGenerate.checklistTypeId)
        ),
      ]);

      if (
        !clientDoc.exists() ||
        !equipmentDoc.exists() ||
        !checklistDoc.exists()
      ) {
        throw new Error("Dados necessários não encontrados");
      }

      const pdfBlob = await generateInspectionPDF(
        inspectionToGenerate,
        { id: clientDoc.id, ...clientDoc.data() },
        { id: equipmentDoc.id, ...equipmentDoc.data() },
        { id: checklistDoc.id, ...checklistDoc.data() },
        language // Passar o idioma selecionado
      );

      const fileName = `Checklist_${clientDoc.data().name}_${
        inspectionToGenerate.id
      }.pdf`;

      if (window?.Capacitor?.isNative) {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });

        const { uri } = await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName,
        });

        await FileOpener.open({
          filePath: uri,
          contentType: "application/pdf",
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
      setLanguageDialogOpen(false);
      setInspectionToGenerate(null);
    }
  };

  const filteredInspections = inspections.filter(
    (inspection) =>
      inspection.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.equipmentType
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      inspection.checklistType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: inspections.length,
    inspections: inspections.filter(
      (inspection) => inspection.type !== "training"
    ).length,
    trainings: inspections.filter(
      (inspection) => inspection.type === "training"
    ).length,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Inspeções
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todas as suas inspeções em um só lugar
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-inspection")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Inspeção
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Inspeções</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.inspections}
              </h3>
            </div>
            <ClipboardCheck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Treinamentos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.trainings}
              </h3>
            </div>
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente, equipamento ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <span className="text-sm text-zinc-400">
              {filteredInspections.length} inspeção(ões) encontrada(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Desktop Only */}
      <div className="hidden sm:flex gap-2">
        <Button
          variant="outline"
          onClick={fetchInspections}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>
      </div>

      {/* Inspections Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredInspections.length > 0 ? (
          filteredInspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              isGeneratingPDF={isGeneratingPDF}
              onDelete={() => confirmDelete(inspection)}
              onEdit={(id) => navigate(`/app/edit-inspection/${id}`)}
              onGeneratePDF={handleGeneratePDF}
            />
          ))
        ) : (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhuma inspeção encontrada
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar sua busca ou adicione uma nova inspeção
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Componente de seleção de idioma */}
      <LanguageDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        onSelectLanguage={generatePDFWithLanguage}
        isGeneratingPDF={isGeneratingPDF}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir esta inspeção de{" "}
              <span className="font-semibold text-white">
                {inspectionToDelete?.clientName}
              </span>
              ? Esta ação não pode ser desfeita.
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
              onClick={() => handleDelete(inspectionToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={fetchInspections}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-inspection")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageInspection;
