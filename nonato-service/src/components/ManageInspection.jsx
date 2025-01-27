import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import generateInspectionPDF from "./generateInspectionPDF";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const InspectionCard = ({
  inspection,
  onDelete,
  onEdit,
  onGeneratePDF,
  isGeneratingPDF,
}) => (
  <Card
    onClick={() => navigate(`/app/inspection-detail/${inspection.id}`)}
    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white truncate">
                {inspection.clientName}
              </h3>
              <span className="text-xs text-zinc-400 ml-2">
                {inspection.createdAt?.toDate().toLocaleDateString()}
              </span>
            </div>
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
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-zinc-800 text-white hover:text-white/50"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-800 border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={onGeneratePDF}
              disabled={isGeneratingPDF}
              className="text-white hover:bg-zinc-700"
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
              onClick={onEdit}
              className="text-white hover:bg-zinc-700"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 hover:bg-zinc-700 focus:text-red-400"
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

const ManageInspection = () => {
  const [inspections, setInspections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInspections = async () => {
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
    };

    fetchInspections();
  }, []);

  const handleDelete = async (inspectionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja deletar esta inspeção?"))
      return;

    try {
      await deleteDoc(doc(db, "inspections", inspectionId));
      setInspections((prev) =>
        prev.filter((inspection) => inspection.id !== inspectionId)
      );
    } catch (error) {
      console.error("Erro ao deletar inspeção:", error);
      setError("Erro ao deletar inspeção. Por favor, tente novamente.");
    }
  };

  const handleGeneratePDF = async (inspection) => {
    try {
      setIsGeneratingPDF(true);
      const [clientDoc, equipmentDoc, checklistDoc] = await Promise.all([
        getDoc(doc(db, "clientes", inspection.clientId)),
        getDoc(doc(db, "equipamentos", inspection.equipmentId)),
        getDoc(doc(db, "checklist_machines", inspection.checklistTypeId)),
      ]);

      if (
        !clientDoc.exists() ||
        !equipmentDoc.exists() ||
        !checklistDoc.exists()
      ) {
        throw new Error("Dados necessários não encontrados");
      }

      const pdfBlob = await generateInspectionPDF(
        inspection,
        { id: clientDoc.id, ...clientDoc.data() },
        { id: equipmentDoc.id, ...equipmentDoc.data() },
        { id: checklistDoc.id, ...checklistDoc.data() }
      );

      const fileName = `Checklist_${clientDoc.data().name}_${
        inspection.id
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
      console.error("Erro ao gerar PDF:", error);
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <Card className="mb-8 bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Inspeções
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente, equipamento ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
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

          <div className="flex justify-between items-center">
            <span className="text-zinc-400 text-sm">
              {filteredInspections.length} inspeção(ões)
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-24">
        {filteredInspections.length > 0 ? (
          filteredInspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              isGeneratingPDF={isGeneratingPDF}
              onDelete={(e) => handleDelete(inspection.id, e)}
              onEdit={(e) => {
                e.stopPropagation();
                navigate(`/app/edit-inspection/${inspection.id}`);
              }}
              onGeneratePDF={(e) => {
                e.stopPropagation();
                handleGeneratePDF(inspection);
              }}
            />
          ))
        ) : (
          <Card className="py-12 bg-zinc-800 border-zinc-700">
            <CardContent className="text-center">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhuma inspeção encontrada
              </p>
              <p className="text-zinc-400">
                Tente ajustar sua busca ou adicione uma nova inspeção
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => navigate("/app/add-inspection")}
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-5 h-5 md:mr-2" />
          <span className="hidden md:inline">Nova Inspeção</span>
        </Button>
      </div>
    </div>
  );
};

export default ManageInspection;
