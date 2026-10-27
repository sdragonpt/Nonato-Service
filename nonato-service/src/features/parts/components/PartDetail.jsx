// PartDetail.jsx
// Detalhe de uma peça do catálogo HOMAG. Todas as peças vêm do catálogo
// estático (ver useCatalogParts.js). Nome, descrição e imagem podem ser
// editados (EditPartDialog → coleção "pecasEditadas"), e a categoria/
// subcategoria é atribuída à parte (AssignPartCategoryDialog). Não há
// exclusão: a peça continua sempre no catálogo.

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCatalogParts } from "../../../hooks/useCatalogParts.js";
import AssignPartCategoryDialog from "./AssignPartCategoryDialog.jsx";
import EditPartDialog from "./EditPartDialog.jsx";

import {
  Loader2,
  Tag,
  AlertTriangle,
  Package,
  Pencil,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { PageHeader } from "../../../components/app";

const PartDetail = () => {
  const { partId } = useParams();

  const {
    parts,
    loading: catalogLoading,
    error: catalogError,
    refresh: refreshCatalog,
  } = useCatalogParts();

  const [imageFailed, setImageFailed] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const part = parts.find((p) => p.id === partId);

  if (catalogLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (catalogError || !part) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Alert
          variant="destructive"
          className="max-w-md"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {catalogError || "Peça não encontrada no catálogo."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Package}
        title="Detalhes da Peça"
        description="Catálogo HOMAG"
        back="/app/parts-library"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {part.image && !imageFailed ? (
                <img
                  src={part.image}
                  alt={part.name}
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Package className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {part.name}
                </h3>
                <Badge className="bg-blue-500/10 text-blue-500">
                  {part.code}
                </Badge>
                {part.editada && (
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Editada
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {part.categoryName ? (
                  <>
                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                      {part.categoryName}
                    </Badge>
                    {part.subcategoryName && (
                      <>
                        <span className="text-muted-foreground text-xs">→</span>
                        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {part.subcategoryName}
                        </Badge>
                      </>
                    )}
                  </>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">
                    Sem categoria
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {part.descricao && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-foreground/90 whitespace-pre-line">{part.descricao}</p>
            </div>
          )}

          {part.relatedCodes?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Códigos relacionados
              </p>
              <div className="flex flex-wrap gap-2">
                {part.relatedCodes.map((c) => (
                  <Badge key={c} className="bg-muted text-foreground/90">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="w-4 h-4" />
              Editar Peça
            </Button>
            <Button
              onClick={() => setAssignDialogOpen(true)}
              className="bg-muted hover:bg-accent"
            >
              <Tag className="w-4 h-4" />
              {part.categoryName ? "Editar Categoria" : "Atribuir Categoria"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssignPartCategoryDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        part={part}
        onSaved={refreshCatalog}
      />

      <EditPartDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        part={part}
        onSaved={() => {
          setImageFailed(false);
          refreshCatalog();
        }}
      />
    </div>
  );
};

export default PartDetail;
