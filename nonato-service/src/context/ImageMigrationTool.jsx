// ImageMigrationTool.jsx - Ferramenta para migrar imagens existentes para a biblioteca

import { useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  Loader2,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileImage,
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

const ImageMigrationTool = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [error, setError] = useState(null);

  // Função para gerar hash da imagem
  const generateImageHash = (imageData) => {
    const size = imageData.length;
    const sample =
      imageData.substring(0, 100) + imageData.substring(imageData.length - 100);
    return `img_${size}_${btoa(sample).substring(0, 20).replace(/[/+=]/g, "")}`;
  };

  // Analisar imagens duplicadas
  const analyzeImages = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      console.log("🔍 Analisando peças com imagens...");

      // Buscar todas as peças
      const partsSnapshot = await getDocs(collection(db, "pecas"));
      const parts = partsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`📊 Total de peças encontradas: ${parts.length}`);

      // Filtrar peças com imagens
      const partsWithImages = parts.filter(
        (part) => part.image && part.image.length > 100
      );
      console.log(`🖼️ Peças com imagens: ${partsWithImages.length}`);

      // Agrupar por hash de imagem
      const imageGroups = {};
      let totalImageSize = 0;

      partsWithImages.forEach((part) => {
        const hash = generateImageHash(part.image);
        const imageSize = part.image.length;
        totalImageSize += imageSize;

        if (!imageGroups[hash]) {
          imageGroups[hash] = {
            hash,
            image: part.image,
            size: imageSize,
            parts: [],
          };
        }

        imageGroups[hash].parts.push({
          id: part.id,
          name: part.name,
          code: part.code,
        });
      });

      const uniqueImages = Object.keys(imageGroups).length;
      const duplicatedImages = Object.values(imageGroups).filter(
        (group) => group.parts.length > 1
      );
      const duplicatedSize = duplicatedImages.reduce((total, group) => {
        return total + group.size * (group.parts.length - 1);
      }, 0);

      const analysisResult = {
        totalParts: parts.length,
        partsWithImages: partsWithImages.length,
        totalImageSize: Math.round((totalImageSize / 1024 / 1024) * 100) / 100, // MB
        uniqueImages,
        duplicatedImages: duplicatedImages.length,
        duplicatedSize: Math.round((duplicatedSize / 1024 / 1024) * 100) / 100, // MB
        imageGroups: Object.values(imageGroups),
        canSaveMB: Math.round((duplicatedSize / 1024 / 1024) * 100) / 100,
      };

      setAnalysis(analysisResult);
      console.log("✅ Análise completa:", analysisResult);
    } catch (err) {
      console.error("❌ Erro na análise:", err);
      setError("Erro ao analisar imagens: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Migrar imagens para a biblioteca
  const migrateImages = async () => {
    try {
      setIsMigrating(true);
      setError(null);

      if (!analysis?.imageGroups) {
        throw new Error("Execute a análise primeiro");
      }

      console.log("🚀 Iniciando migração...");

      const batch = writeBatch(db);
      let migratedImages = 0;
      let updatedParts = 0;

      for (const group of analysis.imageGroups) {
        const { hash, image, parts } = group;

        // 1. Salvar imagem na biblioteca (se não existir)
        const imageRef = doc(db, "image_library", hash);
        const imageDoc = await getDoc(imageRef);

        if (!imageDoc.exists()) {
          batch.set(imageRef, {
            hash,
            data: image,
            createdAt: new Date(),
            usageCount: parts.length,
            migratedAt: new Date(),
          });
          migratedImages++;
          console.log(
            `💾 Imagem salva na biblioteca: ${hash} (${parts.length} usos)`
          );
        } else {
          // Atualizar contador se já existir
          batch.update(imageRef, {
            usageCount: increment(parts.length),
            lastMigration: new Date(),
          });
          console.log(
            `♻️ Contador atualizado para: ${hash} (+${parts.length} usos)`
          );
        }

        // 2. Atualizar peças para usar imageHash
        for (const part of parts) {
          const partRef = doc(db, "pecas", part.id);
          batch.update(partRef, {
            imageHash: hash,
            image: null, // Remover campo legacy
            migratedAt: new Date(),
          });
          updatedParts++;
        }
      }

      // Executar todas as operações em lote
      await batch.commit();

      const result = {
        migratedImages,
        updatedParts,
        savedSpaceMB: analysis.canSaveMB,
        totalImages: analysis.imageGroups.length,
      };

      setMigrationResult(result);
      console.log("✅ Migração concluída:", result);

      // Limpar análise para forçar nova
      setAnalysis(null);
    } catch (err) {
      console.error("❌ Erro na migração:", err);
      setError("Erro na migração: " + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // Exportar relatório
  const exportReport = () => {
    if (!analysis) return;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalParts: analysis.totalParts,
        partsWithImages: analysis.partsWithImages,
        totalImageSizeMB: analysis.totalImageSize,
        uniqueImages: analysis.uniqueImages,
        duplicatedImages: analysis.duplicatedImages,
        potentialSavingsMB: analysis.canSaveMB,
      },
      duplicatedImages: analysis.imageGroups
        .filter((group) => group.parts.length > 1)
        .map((group) => ({
          hash: group.hash,
          sizeMB: Math.round((group.size / 1024 / 1024) * 100) / 100,
          duplicates: group.parts.length,
          parts: group.parts.map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
          })),
        })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-analysis-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Migração de Imagens</h1>
        <p className="text-sm text-zinc-400">
          Ferramenta para otimizar e migrar imagens para a biblioteca
          centralizada
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
              onClick={analyzeImages}
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
                  <Database className="w-4 h-4 mr-2" />
                  Analisar Imagens
                </>
              )}
            </Button>

            {analysis && (
              <>
                <Button
                  onClick={migrateImages}
                  disabled={isMigrating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Migrando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Migrar para Biblioteca
                    </>
                  )}
                </Button>

                <Button
                  onClick={exportReport}
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado da Análise */}
      {analysis && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <FileImage className="w-5 h-5 mr-2" />
              Resultado da Análise
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

              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <h4 className="text-zinc-400 text-sm">Com Imagens</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.partsWithImages}
                </p>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-lg">
                <h4 className="text-zinc-400 text-sm">Tamanho Total</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.totalImageSize} MB
                </p>
              </div>

              <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                <h4 className="text-green-400 text-sm">Imagens Únicas</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.uniqueImages}
                </p>
              </div>

              <div className="bg-amber-900/30 p-4 rounded-lg border border-amber-700">
                <h4 className="text-amber-400 text-sm">Duplicadas</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.duplicatedImages}
                </p>
              </div>

              <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
                <h4 className="text-red-400 text-sm">Economia Possível</h4>
                <p className="text-white text-2xl font-bold">
                  {analysis.canSaveMB} MB
                </p>
              </div>
            </div>

            {/* Imagens Duplicadas */}
            {analysis.duplicatedImages > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">
                  Imagens Duplicadas:
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {analysis.imageGroups
                    .filter((group) => group.parts.length > 1)
                    .slice(0, 10) // Mostrar apenas as 10 primeiras
                    .map((group) => (
                      <div
                        key={group.hash}
                        className="bg-zinc-900/50 p-3 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-amber-500/10 text-amber-500">
                            {group.parts.length} duplicatas
                          </Badge>
                          <span className="text-zinc-400 text-sm">
                            {Math.round(group.size / 1024)} KB cada
                          </span>
                        </div>
                        <div className="text-sm text-zinc-300">
                          Peças:{" "}
                          {group.parts
                            .map((p) => `${p.name} (${p.code})`)
                            .join(", ")}
                        </div>
                      </div>
                    ))}
                </div>
                {analysis.imageGroups.filter((g) => g.parts.length > 1).length >
                  10 && (
                  <p className="text-zinc-400 text-sm mt-2">
                    E mais{" "}
                    {analysis.imageGroups.filter((g) => g.parts.length > 1)
                      .length - 10}{" "}
                    grupos...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado da Migração */}
      {migrationResult && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
              Migração Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                <h4 className="text-green-400 text-sm">Imagens Migradas</h4>
                <p className="text-white text-2xl font-bold">
                  {migrationResult.migratedImages}
                </p>
              </div>

              <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                <h4 className="text-green-400 text-sm">Peças Atualizadas</h4>
                <p className="text-white text-2xl font-bold">
                  {migrationResult.updatedParts}
                </p>
              </div>

              <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                <h4 className="text-blue-400 text-sm">Espaço Economizado</h4>
                <p className="text-white text-2xl font-bold">
                  {migrationResult.savedSpaceMB} MB
                </p>
              </div>

              <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-700">
                <h4 className="text-purple-400 text-sm">Taxa de Otimização</h4>
                <p className="text-white text-2xl font-bold">
                  {Math.round(
                    (migrationResult.savedSpaceMB /
                      (migrationResult.savedSpaceMB +
                        analysis?.uniqueImages * 0.1)) *
                      100
                  )}
                  %
                </p>
              </div>
            </div>

            <Alert className="border-green-500 bg-green-500/10 mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                ✅ Migração concluída com sucesso! As imagens agora são
                reutilizadas automaticamente e ocupam{" "}
                {migrationResult.savedSpaceMB} MB menos de espaço no banco de
                dados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-300">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">1.</span>
            <span>
              Execute a <strong>Análise</strong> para identificar imagens
              duplicadas
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">2.</span>
            <span>Revise o relatório de duplicatas e economia de espaço</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">3.</span>
            <span>
              Execute a <strong>Migração</strong> para otimizar as imagens
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 font-mono">4.</span>
            <span>Novas peças automaticamente evitarão duplicações</span>
          </div>

          <Alert className="border-amber-500 bg-amber-500/10 mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-amber-400">
              ⚠️ <strong>Importante:</strong> Faça backup da base de dados antes
              de executar a migração. Esta operação é irreversível e modifica as
              peças existentes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageMigrationTool;
