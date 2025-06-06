// RollbackTool.jsx - Ferramenta para fazer rollback da migração de imagens

import { useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  Loader2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Trash2,
  Eye,
  RefreshCw,
  Shield,
  Clock,
  Database,
  XCircle,
  Download,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const RollbackTool = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isCleaningLibrary, setIsCleaningLibrary] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [rollbackResult, setRollbackResult] = useState(null);
  const [error, setError] = useState(null);

  // Estados para modais de confirmação
  const [showPartialRollbackDialog, setShowPartialRollbackDialog] =
    useState(false);
  const [showCompleteRollbackDialog, setShowCompleteRollbackDialog] =
    useState(false);
  const [showCleanLibraryDialog, setShowCleanLibraryDialog] = useState(false);

  // Confiração de segurança
  const [confirmationText, setConfirmationText] = useState("");
  const [selectedParts, setSelectedParts] = useState([]);

  // Analisar estado atual do sistema
  const analyzeSystemState = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      console.log("🔍 Analisando estado do sistema...");

      // Buscar todas as peças
      const partsSnapshot = await getDocs(collection(db, "pecas"));
      const parts = partsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Buscar biblioteca de imagens
      const imageLibrarySnapshot = await getDocs(
        collection(db, "image_library")
      );
      const imageLibrary = imageLibrarySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Classificar peças
      const migratedParts = parts.filter(
        (part) => part.imageHash && part.migratedAt
      );
      const legacyParts = parts.filter((part) => part.image && !part.imageHash);
      const hybridParts = parts.filter((part) => part.image && part.imageHash);
      const emptyParts = parts.filter((part) => !part.image && !part.imageHash);

      // Calcular estatísticas
      const totalImageSize = parts.reduce((total, part) => {
        if (part.image) {
          return total + part.image.length;
        }
        return total;
      }, 0);

      const librarySize = imageLibrary.reduce((total, img) => {
        return total + (img.data ? img.data.length : 0);
      }, 0);

      // Verificar integridade
      const orphanedLibraryImages = [];
      const brokenReferences = [];

      for (const img of imageLibrary) {
        const referencingParts = parts.filter(
          (part) => part.imageHash === img.hash
        );
        if (referencingParts.length === 0) {
          orphanedLibraryImages.push(img);
        }
        if (referencingParts.length !== img.usageCount) {
          img.actualUsage = referencingParts.length;
          brokenReferences.push(img);
        }
      }

      // Verificar peças com referências quebradas
      const partsWithBrokenRefs = [];
      for (const part of migratedParts) {
        const libraryImage = imageLibrary.find(
          (img) => img.hash === part.imageHash
        );
        if (!libraryImage) {
          partsWithBrokenRefs.push(part);
        }
      }

      const analysisResult = {
        totalParts: parts.length,
        migratedParts: migratedParts.length,
        legacyParts: legacyParts.length,
        hybridParts: hybridParts.length,
        emptyParts: emptyParts.length,

        imageLibraryImages: imageLibrary.length,
        orphanedLibraryImages: orphanedLibraryImages.length,
        brokenReferences: brokenReferences.length,
        partsWithBrokenRefs: partsWithBrokenRefs.length,

        totalImageSizeMB:
          Math.round((totalImageSize / 1024 / 1024) * 100) / 100,
        librarySizeMB: Math.round((librarySize / 1024 / 1024) * 100) / 100,

        canRollback: migratedParts.length > 0,
        hasIssues:
          orphanedLibraryImages.length > 0 ||
          brokenReferences.length > 0 ||
          partsWithBrokenRefs.length > 0,

        // Detalhes para exibição
        migratedPartsDetails: migratedParts.slice(0, 10),
        orphanedImagesDetails: orphanedLibraryImages,
        brokenReferencesDetails: brokenReferences,
        partsWithBrokenRefsDetails: partsWithBrokenRefs,
      };

      setAnalysis(analysisResult);
      console.log("✅ Análise do sistema completa:", analysisResult);
    } catch (err) {
      console.error("❌ Erro na análise:", err);
      setError("Erro ao analisar estado do sistema: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Rollback parcial (peças selecionadas)
  const partialRollback = async () => {
    try {
      setIsRollingBack(true);
      setError(null);

      if (selectedParts.length === 0) {
        throw new Error("Selecione pelo menos uma peça para rollback");
      }

      console.log(
        `🔄 Iniciando rollback parcial de ${selectedParts.length} peças...`
      );

      const batch = writeBatch(db);
      let rolledBackCount = 0;

      for (const partId of selectedParts) {
        const partRef = doc(db, "pecas", partId);
        const partDoc = await getDoc(partRef);

        if (partDoc.exists() && partDoc.data().imageHash) {
          // Decrementar uso na biblioteca
          const imageHash = partDoc.data().imageHash;
          const imageRef = doc(db, "image_library", imageHash);
          const imageDoc = await getDoc(imageRef);

          if (imageDoc.exists()) {
            const currentUsage = imageDoc.data().usageCount || 1;
            batch.update(imageRef, {
              usageCount: Math.max(0, currentUsage - 1),
              lastUnused: new Date(),
            });
          }

          // Remover referência da peça
          batch.update(partRef, {
            imageHash: null,
            migratedAt: null,
            rolledBackAt: new Date(),
          });

          rolledBackCount++;
        }
      }

      await batch.commit();

      const result = {
        type: "partial",
        rolledBackParts: rolledBackCount,
        selectedParts: selectedParts.length,
      };

      setRollbackResult(result);
      setShowPartialRollbackDialog(false);
      setSelectedParts([]);

      // Atualizar análise
      setTimeout(() => analyzeSystemState(), 1000);
    } catch (err) {
      console.error("❌ Erro no rollback parcial:", err);
      setError("Erro no rollback parcial: " + err.message);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Rollback completo
  const completeRollback = async () => {
    try {
      setIsRollingBack(true);
      setError(null);

      console.log("🔄 Iniciando rollback completo...");

      // Buscar todas as peças migradas
      const migratedPartsQuery = query(
        collection(db, "pecas"),
        where("migratedAt", "!=", null)
      );

      const migratedPartsSnapshot = await getDocs(migratedPartsQuery);

      if (migratedPartsSnapshot.empty) {
        throw new Error("Nenhuma peça migrada encontrada");
      }

      const batch = writeBatch(db);
      let rolledBackCount = 0;

      // Rollback de todas as peças migradas
      migratedPartsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          imageHash: null,
          migratedAt: null,
          rolledBackAt: new Date(),
        });
        rolledBackCount++;
      });

      await batch.commit();

      const result = {
        type: "complete",
        rolledBackParts: rolledBackCount,
        totalParts: rolledBackCount,
      };

      setRollbackResult(result);
      setShowCompleteRollbackDialog(false);

      // Atualizar análise
      setTimeout(() => analyzeSystemState(), 1000);
    } catch (err) {
      console.error("❌ Erro no rollback completo:", err);
      setError("Erro no rollback completo: " + err.message);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Limpar biblioteca de imagens órfãs
  const cleanOrphanedImages = async () => {
    try {
      setIsCleaningLibrary(true);
      setError(null);

      console.log("🧹 Limpando imagens órfãs da biblioteca...");

      // Buscar todas as imagens da biblioteca
      const imageLibrarySnapshot = await getDocs(
        collection(db, "image_library")
      );
      const partsSnapshot = await getDocs(collection(db, "pecas"));

      const parts = partsSnapshot.docs.map((doc) => doc.data());
      const usedImageHashes = new Set(
        parts.filter((part) => part.imageHash).map((part) => part.imageHash)
      );

      let deletedCount = 0;
      const batch = writeBatch(db);

      imageLibrarySnapshot.docs.forEach((doc) => {
        const imageData = doc.data();
        if (!usedImageHashes.has(imageData.hash)) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      setRollbackResult({
        type: "cleanup",
        deletedImages: deletedCount,
      });

      setShowCleanLibraryDialog(false);

      // Atualizar análise
      setTimeout(() => analyzeSystemState(), 1000);
    } catch (err) {
      console.error("❌ Erro na limpeza:", err);
      setError("Erro ao limpar biblioteca: " + err.message);
    } finally {
      setIsCleaningLibrary(false);
    }
  };

  // Exportar relatório do estado atual
  const exportSystemReport = () => {
    if (!analysis) return;

    const report = {
      timestamp: new Date().toISOString(),
      systemState: {
        totalParts: analysis.totalParts,
        migratedParts: analysis.migratedParts,
        legacyParts: analysis.legacyParts,
        hybridParts: analysis.hybridParts,
        emptyParts: analysis.emptyParts,
      },
      imageLibrary: {
        totalImages: analysis.imageLibraryImages,
        orphanedImages: analysis.orphanedLibraryImages,
        brokenReferences: analysis.brokenReferences,
        librarySizeMB: analysis.librarySizeMB,
      },
      integrity: {
        hasIssues: analysis.hasIssues,
        partsWithBrokenRefs: analysis.partsWithBrokenRefs,
        canRollback: analysis.canRollback,
      },
      details: {
        orphanedImages: analysis.orphanedImagesDetails,
        brokenReferences: analysis.brokenReferencesDetails,
        partsWithBrokenRefs: analysis.partsWithBrokenRefsDetails,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-state-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rollback de Migração</h1>
        <p className="text-sm text-zinc-400">
          Ferramenta para reverter migrações e limpar dados órfãos
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Controles */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Controles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={analyzeSystemState}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Analisar Estado
                </>
              )}
            </Button>

            {analysis?.canRollback && (
              <>
                <Button
                  onClick={() => setShowPartialRollbackDialog(true)}
                  disabled={isRollingBack}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rollback Parcial
                </Button>

                <Button
                  onClick={() => setShowCompleteRollbackDialog(true)}
                  disabled={isRollingBack}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rollback Completo
                </Button>
              </>
            )}

            {analysis?.orphanedLibraryImages > 0 && (
              <Button
                onClick={() => setShowCleanLibraryDialog(true)}
                disabled={isCleaningLibrary}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Biblioteca
              </Button>
            )}

            {analysis && (
              <Button
                onClick={exportSystemReport}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Relatório
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estado do Sistema */}
      {analysis && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Estado Atual do Sistema
              {analysis.hasIssues && (
                <Badge className="ml-2 bg-red-500/20 text-red-400">
                  Problemas Detectados
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <h4 className="text-zinc-400 text-sm">Total de Peças</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.totalParts}
                </p>
              </div>

              <div
                className={`bg-zinc-900/50 p-4 rounded-lg ${
                  analysis.migratedParts > 0 ? "border border-blue-700" : ""
                }`}
              >
                <h4 className="text-zinc-400 text-sm">Peças Migradas</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.migratedParts}
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <h4 className="text-zinc-400 text-sm">Peças Legacy</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.legacyParts}
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <h4 className="text-zinc-400 text-sm">Biblioteca de Imagens</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.imageLibraryImages}
                </p>
              </div>

              <div
                className={`bg-zinc-900/50 p-4 rounded-lg ${
                  analysis.orphanedLibraryImages > 0
                    ? "border border-amber-700"
                    : ""
                }`}
              >
                <h4 className="text-zinc-400 text-sm">Imagens Órfãs</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.orphanedLibraryImages}
                </p>
              </div>

              <div
                className={`bg-zinc-900/50 p-4 rounded-lg ${
                  analysis.partsWithBrokenRefs > 0
                    ? "border border-red-700"
                    : ""
                }`}
              >
                <h4 className="text-zinc-400 text-sm">Referências Quebradas</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.partsWithBrokenRefs}
                </p>
              </div>
            </div>

            {/* Status da Integridade */}
            <div className="mb-4">
              <h4 className="text-white font-medium mb-3">
                Status da Integridade:
              </h4>
              <div className="flex items-center gap-4">
                {analysis.hasIssues ? (
                  <div className="flex items-center text-red-400">
                    <XCircle className="h-5 w-5 mr-2" />
                    <span>Problemas detectados - Recomenda-se correção</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-400">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span>Sistema íntegro - Nenhum problema detectado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capacidade de Rollback */}
            <div className="mb-4">
              <h4 className="text-white font-medium mb-3">Rollback:</h4>
              <div className="flex items-center gap-4">
                {analysis.canRollback ? (
                  <div className="flex items-center text-blue-400">
                    <RotateCcw className="h-5 w-5 mr-2" />
                    <span>
                      {analysis.migratedParts} peças podem ser revertidas
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center text-zinc-400">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>Nenhuma migração detectada para rollback</span>
                  </div>
                )}
              </div>
            </div>

            {/* Peças Migradas (amostra) */}
            {analysis.migratedParts > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">
                  Peças Migradas (primeiras 10):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysis.migratedPartsDetails.map((part) => (
                    <div
                      key={part.id}
                      className="bg-zinc-900/50 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="text-white font-medium">
                          {part.name}
                        </span>
                        <span className="text-zinc-400 text-sm ml-2">
                          ({part.code})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {part.imageHash?.substring(0, 8)}...
                        </Badge>
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParts([...selectedParts, part.id]);
                            } else {
                              setSelectedParts(
                                selectedParts.filter((id) => id !== part.id)
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {analysis.migratedParts > 10 && (
                  <p className="text-zinc-400 text-sm mt-2">
                    E mais {analysis.migratedParts - 10} peças migradas...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado do Rollback */}
      {rollbackResult && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
              {rollbackResult.type === "partial" &&
                "Rollback Parcial Concluído"}
              {rollbackResult.type === "complete" &&
                "Rollback Completo Concluído"}
              {rollbackResult.type === "cleanup" &&
                "Limpeza da Biblioteca Concluída"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rollbackResult.type !== "cleanup" && (
                <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                  <h4 className="text-green-400 text-sm">Peças Revertidas</h4>
                  <p className="text-white text-2xl font-bold">
                    {rollbackResult.rolledBackParts}
                  </p>
                </div>
              )}

              {rollbackResult.type === "cleanup" && (
                <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-700">
                  <h4 className="text-purple-400 text-sm">Imagens Removidas</h4>
                  <p className="text-white text-2xl font-bold">
                    {rollbackResult.deletedImages}
                  </p>
                </div>
              )}
            </div>

            <Alert className="border-green-500 bg-green-500/10 mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                ✅ Operação concluída com sucesso!
                {rollbackResult.type === "complete" &&
                  " Todas as peças foram revertidas para o sistema legacy."}
                {rollbackResult.type === "partial" &&
                  " As peças selecionadas foram revertidas para o sistema legacy."}
                {rollbackResult.type === "cleanup" &&
                  " Imagens órfãs foram removidas da biblioteca."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Guia de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-300">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">1.</span>
            <span>
              Execute <strong>Analisar Estado</strong> para verificar o status
              atual
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">2.</span>
            <span>
              <strong>Rollback Parcial:</strong> Selecione peças específicas e
              reverta individualmente
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">3.</span>
            <span>
              <strong>Rollback Completo:</strong> Reverte TODAS as peças
              migradas de uma vez
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">4.</span>
            <span>
              <strong>Limpar Biblioteca:</strong> Remove imagens órfãs não
              utilizadas
            </span>
          </div>

          <Alert className="border-amber-500 bg-amber-500/10 mt-4">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-amber-400">
              🛡️ <strong>Seguro:</strong> Rollback preserva dados originais
              (campo 'image'). As peças continuam funcionando normalmente após
              rollback.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Modais de Confirmação */}

      {/* Modal Rollback Parcial */}
      <Dialog
        open={showPartialRollbackDialog}
        onOpenChange={setShowPartialRollbackDialog}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <RotateCcw className="h-5 w-5 mr-2 text-orange-500" />
              Confirmar Rollback Parcial
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Você está prestes a reverter {selectedParts.length} peças
              selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-orange-500/10 p-4 rounded-md border border-orange-500/30 mb-4">
              <p className="text-sm text-orange-400 mb-2">⚠️ Esta ação irá:</p>
              <ul className="text-sm text-zinc-300 space-y-1 ml-4">
                <li>• Remover referências imageHash das peças selecionadas</li>
                <li>• Decrementar contadores na biblioteca de imagens</li>
                <li>• Fazer peças usarem sistema legacy (campo 'image')</li>
                <li>
                  • Operação é <strong>reversível</strong>
                </li>
              </ul>
            </div>

            <p className="text-sm text-zinc-400">
              Peças selecionadas: <strong>{selectedParts.length}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPartialRollbackDialog(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={partialRollback}
              disabled={isRollingBack || selectedParts.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revertendo...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Confirmar Rollback Parcial
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rollback Completo */}
      <Dialog
        open={showCompleteRollbackDialog}
        onOpenChange={setShowCompleteRollbackDialog}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <RotateCcw className="h-5 w-5 mr-2 text-red-500" />
              Confirmar Rollback Completo
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta é uma operação crítica que afetará TODAS as peças migradas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-500/10 p-4 rounded-md border border-red-500/30 mb-4">
              <p className="text-sm text-red-400 mb-2">
                🚨 <strong>ATENÇÃO:</strong> Esta ação irá:
              </p>
              <ul className="text-sm text-zinc-300 space-y-1 ml-4">
                <li>
                  • Reverter <strong>TODAS</strong> as {analysis?.migratedParts}{" "}
                  peças migradas
                </li>
                <li>
                  • Remover todas as referências para biblioteca de imagens
                </li>
                <li>• Voltar completamente ao sistema legacy</li>
                <li>
                  • Operação é <strong>reversível</strong>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Digite "ROLLBACK COMPLETO" para confirmar:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
                placeholder="ROLLBACK COMPLETO"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteRollbackDialog(false);
                setConfirmationText("");
              }}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={completeRollback}
              disabled={
                isRollingBack || confirmationText !== "ROLLBACK COMPLETO"
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revertendo...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Executar Rollback Completo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Limpeza da Biblioteca */}
      <Dialog
        open={showCleanLibraryDialog}
        onOpenChange={setShowCleanLibraryDialog}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-purple-500" />
              Limpar Biblioteca de Imagens
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Remover imagens órfãs que não são mais utilizadas por nenhuma
              peça.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-purple-500/10 p-4 rounded-md border border-purple-500/30 mb-4">
              <p className="text-sm text-purple-400 mb-2">🧹 Esta ação irá:</p>
              <ul className="text-sm text-zinc-300 space-y-1 ml-4">
                <li>
                  • Remover <strong>{analysis?.orphanedLibraryImages}</strong>{" "}
                  imagens órfãs
                </li>
                <li>• Liberar espaço no banco de dados</li>
                <li>• Manter apenas imagens em uso</li>
                <li>
                  • Operação é <strong>irreversível</strong>
                </li>
              </ul>
            </div>

            <p className="text-sm text-zinc-400">
              Imagens a serem removidas:{" "}
              <strong>{analysis?.orphanedLibraryImages}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCleanLibraryDialog(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={cleanOrphanedImages}
              disabled={isCleaningLibrary}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCleaningLibrary ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirmar Limpeza
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RollbackTool;
