// PartsExportTool.jsx - Ferramenta para exportar todas as peças em formato CSV

import { useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  Loader2,
  Database,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  Package,
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
import { Separator } from "@/components/ui/separator.jsx";

const PartsExportTool = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);

  // Função para buscar dados da biblioteca de imagens
  const getImageLibraryData = async (imageHash) => {
    if (!imageHash) return null;

    try {
      // ✅ CORREÇÃO: Coleção chama-se "image_library" não "imageLibrary"
      const imageDoc = await getDoc(doc(db, "image_library", imageHash));
      if (imageDoc.exists()) {
        const data = imageDoc.data();
        // ✅ CORREÇÃO: Imagem está no campo "data" não "image"
        return {
          ...data,
          image: data.data, // Mapear "data" para "image" para compatibilidade
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar imagem:", error);
      return null;
    }
  };

  // Analisar dados antes da exportação
  const analyzePartsData = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setExportResult(null);

      // Buscar todas as peças
      const partsSnapshot = await getDocs(collection(db, "pecas"));
      const parts = partsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Analisar estrutura dos dados
      const analysis = {
        totalParts: parts.length,
        partsWithCode: parts.filter((part) => part.code && part.code.trim())
          .length,
        partsWithName: parts.filter((part) => part.name && part.name.trim())
          .length,
        partsWithCategory: parts.filter(
          (part) => part.categoryName || part.categoryId
        ).length,
        partsWithSubcategory: parts.filter(
          (part) => part.subcategoryName || part.subcategoryId
        ).length,
        partsWithCost: parts.filter((part) => {
          const price = parseFloat(part.price);
          return !isNaN(price) && price > 0;
        }).length,
        partsWithImage: parts.filter((part) => part.imageHash || part.image)
          .length,
        partsWithImageHash: parts.filter((part) => part.imageHash).length,
        partsWithImageDirect: parts.filter(
          (part) => part.image && !part.imageHash
        ).length,
        partsWithGroup: parts.filter((part) => part.group && part.group.trim())
          .length,
        samplePart: parts[0] || null,
        // Estatísticas de preços
        pricesStats: {
          zero: parts.filter(
            (part) => parseFloat(part.price) === 0 || !part.price
          ).length,
          above_zero: parts.filter((part) => {
            const price = parseFloat(part.price);
            return !isNaN(price) && price > 0;
          }).length,
          invalid: parts.filter((part) => {
            const price = parseFloat(part.price);
            return (
              isNaN(price) && part.price !== undefined && part.price !== null
            );
          }).length,
        },
        // Debug das imagens
        imageAnalysis: {
          firstPartWithImageHash: parts.find((part) => part.imageHash),
          firstPartWithImage: parts.find(
            (part) => part.image && !part.imageHash
          ),
          allImageFields: parts.slice(0, 3).map((part) => ({
            code: part.code,
            hasImageHash: !!part.imageHash,
            hasImage: !!part.image,
            imageHashValue: part.imageHash || null,
            imageType: part.image
              ? part.image.startsWith("data:")
                ? "data-url"
                : "base64"
              : null,
            imageLength: part.image ? part.image.length : 0,
          })),
        },
      };

      setAnalysis(analysis);
    } catch (err) {
      console.error("Erro na análise:", err);
      setError("Erro ao analisar dados das peças: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Exportar peças para CSV
  const exportPartsToCSV = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // Buscar todas as peças
      const partsSnapshot = await getDocs(collection(db, "pecas"));
      const parts = partsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Processar cada peça para o formato CSV
      const csvData = [];
      let imagesProcessed = 0;

      for (const part of parts) {
        // Obter URL da imagem se existir
        let imageUrl = "";
        try {
          if (part.imageHash) {
            const imageData = await getImageLibraryData(part.imageHash);

            if (imageData?.image) {
              // Verificar se já tem prefixo data:
              imageUrl = imageData.image.startsWith("data:")
                ? imageData.image
                : `data:image/jpeg;base64,${imageData.image}`;
              imagesProcessed++;
            }
          } else if (part.image) {
            // Verificar se já tem prefixo data:
            imageUrl = part.image.startsWith("data:")
              ? part.image
              : `data:image/jpeg;base64,${part.image}`;
            imagesProcessed++;
          }
        } catch (imgError) {
          console.warn(
            `⚠️ Erro ao processar imagem da peça ${part.code}:`,
            imgError
          );
        }

        // Limpar e formatar dados
        const cleanString = (str) => {
          if (!str) return "";
          return str
            .toString()
            .trim()
            .replace(/[\r\n]+/g, " ");
        };

        // Formatar preço
        const formatPrice = (price) => {
          const numPrice = parseFloat(price);
          return isNaN(numPrice) ? 0 : numPrice;
        };

        // Montar linha CSV
        const csvRow = {
          partCode: cleanString(part.code),
          name: cleanString(part.name),
          category: cleanString(part.categoryName),
          subcategory: cleanString(part.subcategoryName),
          group: cleanString(part.group),
          cost: formatPrice(part.price),
          imageUrl: imageUrl,
        };

        csvData.push(csvRow);
      }

      // Gerar conteúdo CSV com encoding UTF-8 BOM
      const csvHeaders = [
        "partCode",
        "name",
        "category",
        "subcategory",
        "group",
        "cost",
        "imageUrl",
      ];
      const csvRows = csvData.map((row) =>
        csvHeaders
          .map((header) => {
            const value = row[header];
            // Sempre envolver strings em aspas duplas para evitar problemas
            if (typeof value === "string") {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      );

      // Adicionar BOM UTF-8 para caracteres portugueses
      const BOM = "\uFEFF";
      const csvContent = BOM + [csvHeaders.join(","), ...csvRows].join("\n");

      // Fazer download do arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const filename = `pecas-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Resultado da exportação
      const result = {
        totalExported: csvData.length,
        filename: filename,
        timestamp: new Date().toLocaleString("pt-PT"),
        withImages: imagesProcessed,
        withoutImages: csvData.length - imagesProcessed,
        encoding: "UTF-8 com BOM",
      };

      setExportResult(result);
    } catch (err) {
      console.error("Erro na exportação:", err);
      setError("Erro ao exportar peças: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Exportação CSV de Peças
            </h1>
            <p className="text-zinc-400">
              Exportar todas as peças da base de dados em formato CSV
            </p>
          </div>
        </div>
      </div>

      {/* Formato da Exportação */}
      <Card className="bg-zinc-900/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Formato da Exportação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-zinc-300">
            <p className="mb-2">
              O arquivo CSV será gerado com as seguintes colunas:
            </p>
            <div className="bg-zinc-800/50 p-4 rounded-lg font-mono text-sm">
              <div className="text-green-400">
                partCode | name | category | subcategory | group | cost |
                imageUrl
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-white">partCode:</strong>
              <span className="text-zinc-400 ml-2">Código da peça</span>
            </div>
            <div>
              <strong className="text-white">name:</strong>
              <span className="text-zinc-400 ml-2">Nome da peça</span>
            </div>
            <div>
              <strong className="text-white">category:</strong>
              <span className="text-zinc-400 ml-2">Categoria</span>
            </div>
            <div>
              <strong className="text-white">subcategory:</strong>
              <span className="text-zinc-400 ml-2">Subcategoria</span>
            </div>
            <div>
              <strong className="text-white">group:</strong>
              <span className="text-zinc-400 ml-2">Grupo (se disponível)</span>
            </div>
            <div>
              <strong className="text-white">cost:</strong>
              <span className="text-zinc-400 ml-2">Custo/Preço</span>
            </div>
          </div>
          <Alert className="border-yellow-500/50 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              As imagens serão exportadas como URLs base64. Ficheiros grandes
              podem demorar mais tempo.
              <br />
              <strong>Encoding:</strong> UTF-8 com BOM para suporte completo a
              caracteres portugueses (ç, ã, õ, etc.)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={analyzePartsData}
          disabled={isAnalyzing || isExporting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />A analisar...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Analisar Dados
            </>
          )}
        </Button>

        <Button
          onClick={exportPartsToCSV}
          disabled={isExporting || isAnalyzing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />A exportar...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </>
          )}
        </Button>
      </div>

      {/* Resultados da Análise */}
      {analysis && (
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-green-400" />
              Análise dos Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {analysis.totalParts}
                </div>
                <div className="text-sm text-zinc-400">Total de Peças</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {analysis.partsWithCode}
                </div>
                <div className="text-sm text-zinc-400">Com Código</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {analysis.partsWithCategory}
                </div>
                <div className="text-sm text-zinc-400">Com Categoria</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {analysis.partsWithImage}
                </div>
                <div className="text-sm text-zinc-400">Com Imagem</div>
              </div>
            </div>

            {/* Estatísticas de Preços */}
            <div className="bg-zinc-800/30 p-4 rounded-lg">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span>📊</span> Análise de Preços
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-red-400">
                    {analysis.pricesStats.zero}
                  </div>
                  <div className="text-xs text-zinc-400">Preço = 0</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {analysis.pricesStats.above_zero}
                  </div>
                  <div className="text-xs text-zinc-400">Preço &gt; 0</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-yellow-400">
                    {analysis.pricesStats.invalid}
                  </div>
                  <div className="text-xs text-zinc-400">Preço Inválido</div>
                </div>
              </div>
            </div>

            {/* Debug das Imagens */}
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h4 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                <span>🔍</span> Debug de Imagens
              </h4>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-blue-300 font-medium">
                      Com imageHash:
                    </span>
                    <span className="ml-2 text-white">
                      {analysis.partsWithImageHash}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-300 font-medium">
                      Com image direto:
                    </span>
                    <span className="ml-2 text-white">
                      {analysis.partsWithImageDirect}
                    </span>
                  </div>
                </div>

                {analysis.imageAnalysis.firstPartWithImageHash && (
                  <div className="bg-zinc-800/50 p-3 rounded text-xs">
                    <div className="text-green-300 font-medium">
                      Primeira peça com imageHash:
                    </div>
                    <div className="text-zinc-300 font-mono">
                      {analysis.imageAnalysis.firstPartWithImageHash.code} -
                      Hash:{" "}
                      {analysis.imageAnalysis.firstPartWithImageHash.imageHash}
                    </div>
                  </div>
                )}

                {analysis.imageAnalysis.firstPartWithImage && (
                  <div className="bg-zinc-800/50 p-3 rounded text-xs">
                    <div className="text-purple-300 font-medium">
                      Primeira peça com image direto:
                    </div>
                    <div className="text-zinc-300 font-mono">
                      {analysis.imageAnalysis.firstPartWithImage.code} -
                      Tamanho:{" "}
                      {analysis.imageAnalysis.firstPartWithImage.image
                        ?.length || 0}{" "}
                      chars
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-zinc-700" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Badge
                  variant="outline"
                  className="text-green-400 border-green-400/50"
                >
                  {(
                    (analysis.partsWithName / analysis.totalParts) *
                    100
                  ).toFixed(1)}
                  %
                </Badge>
                <span className="ml-2 text-zinc-300">têm nome</span>
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="text-blue-400 border-blue-400/50"
                >
                  {(
                    (analysis.partsWithCost / analysis.totalParts) *
                    100
                  ).toFixed(1)}
                  %
                </Badge>
                <span className="ml-2 text-zinc-300">têm preço</span>
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="text-purple-400 border-purple-400/50"
                >
                  {(
                    (analysis.partsWithSubcategory / analysis.totalParts) *
                    100
                  ).toFixed(1)}
                  %
                </Badge>
                <span className="ml-2 text-zinc-300">têm subcategoria</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado da Exportação */}
      {exportResult && (
        <Card className="bg-green-500/10 border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Exportação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-lg font-bold text-green-400">
                  {exportResult.totalExported}
                </div>
                <div className="text-sm text-zinc-300">Peças exportadas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {exportResult.withImages}
                </div>
                <div className="text-sm text-zinc-300">Com imagens</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-400">
                  {exportResult.withoutImages}
                </div>
                <div className="text-sm text-zinc-300">Sem imagens</div>
              </div>
            </div>

            <Separator className="bg-green-500/20" />

            <div className="space-y-2 text-sm">
              <div>
                <strong className="text-white">Arquivo:</strong>
                <span className="ml-2 text-zinc-300 font-mono">
                  {exportResult.filename}
                </span>
              </div>
              <div>
                <strong className="text-white">Data/Hora:</strong>
                <span className="ml-2 text-zinc-300">
                  {exportResult.timestamp}
                </span>
              </div>
              <div>
                <strong className="text-white">Encoding:</strong>
                <span className="ml-2 text-green-300">
                  {exportResult.encoding}
                </span>
                <span className="ml-2 text-xs text-zinc-400">
                  (Suporte completo para caracteres portugueses)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erros */}
      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PartsExportTool;
