import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { db } from "../../firebase.jsx";
import {
  ArrowLeft,
  Upload,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Save,
  XCircle,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const ImportParts = () => {
  const navigate = useNavigate();

  // Excel file data
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [previewData, setPreviewData] = useState([]);

  // Mapping configuration
  const [fieldMapping, setFieldMapping] = useState({
    name: "",
    code: "",
    price: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
  });

  // Categories and subcategories
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("none");
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("none");

  // Import status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importStats, setImportStats] = useState({
    total: 0,
    success: 0,
    errors: 0,
    updated: 0,
  });
  const [progressPercent, setProgressPercent] = useState(0);
  const [importedItems, setImportedItems] = useState([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Sample data for template
  const sampleData = [
    {
      name: "Filtro de Óleo Premium",
      code: "FO-123",
      price: "29.99",
      description: "Filtro de óleo de alta qualidade para motores a diesel",
      category: "Filtros",
      subcategory: "Filtros de Óleo",
    },
    {
      name: "Pastilha de Freio Dianteira",
      code: "PF-456",
      price: "89.90",
      description:
        "Jogo de pastilhas para freios dianteiros de veículos de passeio",
      category: "Freios",
      subcategory: "Pastilhas",
    },
  ];

  // Required fields for import
  const requiredFields = ["name", "code", "price"];

  // Field labels for mapping
  const fieldLabels = {
    name: "Nome da Peça",
    code: "Código",
    price: "Preço",
    description: "Descrição",
    categoryId: "Categoria",
    subcategoryId: "Subcategoria",
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
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
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        setError("Não foi possível carregar as categorias.");
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories when selected category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (selectedCategory === "none") {
        setSubcategories([]);
        return;
      }

      try {
        const q = query(
          collection(db, "categorias"),
          where("parentId", "==", selectedCategory)
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
  }, [selectedCategory]);

  // Generate a template Excel file
  const generateTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_importacao_pecas.xlsx");
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setSheetNames([]);
      setSelectedSheet("");
      setHeaders([]);
      setData([]);
      setPreviewData([]);
      setFieldMapping({
        name: "",
        code: "",
        price: "",
        description: "",
        categoryId: "",
        subcategoryId: "",
      });

      analyzeFile(selectedFile);
    }
  };

  // Analyze the uploaded Excel file
  const analyzeFile = async (file) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: true,
            cellText: false,
            cellStyles: true,
          });

          const sheets = workbook.SheetNames;
          setSheetNames(sheets);

          if (sheets.length > 0) {
            const firstSheet = sheets[0];
            setSelectedSheet(firstSheet);
            loadSheetData(workbook, firstSheet);
          }

          setIsAnalyzing(false);
        } catch (err) {
          console.error("Erro ao analisar o arquivo:", err);
          setError(
            "O arquivo não pôde ser lido. Verifique se é um arquivo Excel válido."
          );
          setIsAnalyzing(false);
        }
      };

      reader.onerror = () => {
        setError("Erro ao ler o arquivo. Tente novamente.");
        setIsAnalyzing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Erro ao processar o arquivo.");
      setIsAnalyzing(false);
    }
  };

  // Load data from a specific sheet
  const loadSheetData = (workbook, sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (jsonData.length > 0) {
        const headers = jsonData[0].map((h) => h.toString().trim());
        setHeaders(headers);

        // Auto-map fields based on header names
        const newMapping = { ...fieldMapping };
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();

          if (lowerHeader.includes("nome") || lowerHeader.includes("name")) {
            newMapping.name = index;
          } else if (
            lowerHeader.includes("código") ||
            lowerHeader.includes("code")
          ) {
            newMapping.code = index;
          } else if (
            lowerHeader.includes("preço") ||
            lowerHeader.includes("price")
          ) {
            newMapping.price = index;
          } else if (lowerHeader.includes("desc")) {
            newMapping.description = index;
          } else if (lowerHeader.includes("categ")) {
            newMapping.categoryId = index;
          } else if (lowerHeader.includes("subcat")) {
            newMapping.subcategoryId = index;
          }
        });

        setFieldMapping(newMapping);

        // Remove header row and store data
        const dataRows = jsonData.slice(1);
        setData(dataRows);

        // Set preview data (first 5 rows)
        setPreviewData(dataRows.slice(0, 5));
      } else {
        setError("A planilha está vazia ou não contém dados válidos.");
        setHeaders([]);
        setData([]);
        setPreviewData([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da planilha:", err);
      setError("Não foi possível carregar os dados da planilha.");
    }
  };

  // Handle sheet selection change
  const handleSheetChange = (value) => {
    setSelectedSheet(value);
    setHeaders([]);
    setData([]);
    setPreviewData([]);
    setFieldMapping({
      name: "",
      code: "",
      price: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
    });

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        loadSheetData(workbook, value);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle field mapping change
  const handleFieldMappingChange = (field, index) => {
    setFieldMapping((prev) => ({
      ...prev,
      [field]: index,
    }));
  };

  // Handle category selection
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedSubcategory("none");
  };

  // Handle subcategory selection
  const handleSubcategoryChange = (value) => {
    setSelectedSubcategory(value);
  };

  // Check if all required fields are mapped
  const isValidMapping = () => {
    return requiredFields.every(
      (field) => fieldMapping[field] !== "" && fieldMapping[field] !== undefined
    );
  };

  // Get next part ID
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

  // Import data to Firestore
  const handleImport = async () => {
    if (!isValidMapping()) {
      setError(
        "Por favor, mapeie todos os campos obrigatórios (Nome, Código e Preço)."
      );
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);
    setImportStats({
      total: data.length,
      success: 0,
      errors: 0,
      updated: 0,
    });
    setProgressPercent(0);
    setImportedItems([]);

    try {
      // Find category and subcategory names if selected
      let categoryName = "";
      let subcategoryName = "";

      if (selectedCategory !== "none") {
        const category = categories.find((cat) => cat.id === selectedCategory);
        if (category) {
          categoryName = category.name;
        }
      }

      if (selectedSubcategory !== "none") {
        const subcategory = subcategories.find(
          (sub) => sub.id === selectedSubcategory
        );
        if (subcategory) {
          subcategoryName = subcategory.name;
        }
      }

      // Map column headers to Firestore fields
      const importResults = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        try {
          // Skip empty rows
          if (row.every((cell) => !cell)) {
            continue;
          }

          // Extract values from row based on mapping
          const name =
            fieldMapping.name !== "" ? row[fieldMapping.name] || "" : "";
          const code =
            fieldMapping.code !== "" ? row[fieldMapping.code] || "" : "";
          const priceRaw =
            fieldMapping.price !== "" ? row[fieldMapping.price] : "";
          const description =
            fieldMapping.description !== ""
              ? row[fieldMapping.description] || ""
              : "";

          // Skip rows with missing required fields
          if (!name || !code || !priceRaw) {
            importResults.push({
              row: i + 2, // +2 because of 0-indexing and header row
              name,
              code,
              status: "error",
              error: "Campos obrigatórios faltando",
            });
            setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
            continue;
          }

          // Process price: handle different formats
          let price = 0;
          if (priceRaw) {
            if (typeof priceRaw === "number") {
              price = priceRaw;
            } else {
              // Remove currency symbols and replace commas with dots
              const priceStr = priceRaw
                .toString()
                .replace(/[€$]/g, "")
                .replace(/\./g, "")
                .replace(",", ".");
              price = parseFloat(priceStr);
            }

            if (isNaN(price)) {
              price = 0;
            }
          }

          // Process category and subcategory from file or selected values
          let partCategoryId =
            selectedCategory !== "none" ? selectedCategory : "";
          let partCategoryName = categoryName;
          let partSubcategoryId =
            selectedSubcategory !== "none" ? selectedSubcategory : "";
          let partSubcategoryName = subcategoryName;

          // If column mapping exists for category and subcategory, try to use those values
          if (fieldMapping.categoryId !== "" && row[fieldMapping.categoryId]) {
            const categoryValue = row[fieldMapping.categoryId];

            // Try to find the category by name
            const foundCategory = categories.find(
              (cat) =>
                cat.name.toLowerCase() ===
                categoryValue.toString().toLowerCase()
            );

            if (foundCategory) {
              partCategoryId = foundCategory.id;
              partCategoryName = foundCategory.name;
            }
          }

          if (
            fieldMapping.subcategoryId !== "" &&
            row[fieldMapping.subcategoryId] &&
            partCategoryId
          ) {
            const subcategoryValue = row[fieldMapping.subcategoryId];

            // Get all subcategories for the selected category
            const q = query(
              collection(db, "categorias"),
              where("parentId", "==", partCategoryId)
            );
            const snapshot = await getDocs(q);
            const availableSubcategories = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Try to find the subcategory by name
            const foundSubcategory = availableSubcategories.find(
              (sub) =>
                sub.name.toLowerCase() ===
                subcategoryValue.toString().toLowerCase()
            );

            if (foundSubcategory) {
              partSubcategoryId = foundSubcategory.id;
              partSubcategoryName = foundSubcategory.name;
            }
          }

          // Generate new ID and create document
          const newPartId = await getNextPartId();
          await setDoc(doc(db, "pecas", newPartId.toString()), {
            name,
            code,
            price,
            description,
            categoryId: partCategoryId,
            categoryName: partCategoryName,
            subcategoryId: partSubcategoryId,
            subcategoryName: partSubcategoryName,
            image: "",
            createdAt: new Date(),
            lastUpdate: new Date(),
          });

          importResults.push({
            row: i + 2,
            name,
            code,
            price,
            status: "success",
          });

          setImportStats((prev) => ({ ...prev, success: prev.success + 1 }));
        } catch (err) {
          console.error(`Erro ao importar linha ${i + 2}:`, err);
          importResults.push({
            row: i + 2,
            name: row[fieldMapping.name] || "N/A",
            code: row[fieldMapping.code] || "N/A",
            status: "error",
            error: err.message,
          });
          setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
        }

        // Update progress
        const progress = Math.round(((i + 1) / data.length) * 100);
        setProgressPercent(progress);
        setImportedItems(importResults);
      }

      setSuccess(
        `Importação concluída: ${importStats.success} peças importadas com sucesso.`
      );
      setShowResultsDialog(true);
    } catch (err) {
      console.error("Erro durante a importação:", err);
      setError(`Erro durante a importação: ${err.message}`);
    } finally {
      setIsImporting(false);
      setProgressPercent(100);
    }
  };

  // Clear all data and start over
  const handleReset = () => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaders([]);
    setData([]);
    setPreviewData([]);
    setFieldMapping({
      name: "",
      code: "",
      price: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
    });
    setError(null);
    setSuccess(null);
    setImportStats({
      total: 0,
      success: 0,
      errors: 0,
      updated: 0,
    });
    setProgressPercent(0);
    setImportedItems([]);
    setShowResultsDialog(false);

    // Reset file input by clearing its value
    const fileInput = document.getElementById("file-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Importar Peças
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Importe peças a partir de uma planilha Excel
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/parts-library")}
            className="bg-zinc-700 hover:bg-zinc-600 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Peças
          </Button>
          <Button
            onClick={generateTemplate}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger
            value="import"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Importar Peças
          </TabsTrigger>
          <TabsTrigger
            value="instructions"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Instruções
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          {/* Upload Card */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                1. Selecione o Arquivo Excel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg p-6 bg-zinc-900">
                  <FileSpreadsheet className="h-12 w-12 text-zinc-500 mb-2" />
                  <p className="text-zinc-400 mb-4 text-center">
                    {file
                      ? `Arquivo selecionado: ${file.name}`
                      : "Arraste e solte um arquivo Excel aqui ou clique para selecionar"}
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    onClick={() =>
                      document.getElementById("file-upload").click()
                    }
                    className={
                      file ? "bg-zinc-700" : "bg-green-600 hover:bg-green-700"
                    }
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {file ? "Trocar Arquivo" : "Selecionar Arquivo"}
                  </Button>
                </div>

                {isAnalyzing && (
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                    <span className="ml-2 text-zinc-400">
                      Analisando arquivo...
                    </span>
                  </div>
                )}

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

                {success && (
                  <Alert className="border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-400">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sheet Selection */}
          {sheetNames.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  2. Selecione a Planilha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-400 block mb-2">
                        Planilha
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Field Mapping */}
          {headers.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  3. Mapeie os Campos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(fieldLabels).map((field) => (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400 flex items-center">
                          {fieldLabels[field]}
                          {requiredFields.includes(field) && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <select
                          value={fieldMapping[field]}
                          onChange={(e) =>
                            handleFieldMappingChange(field, e.target.value)
                          }
                          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                        >
                          <option value="">Não mapear</option>
                          {headers.map((header, index) => (
                            <option key={index} value={index}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4">
                    <h3 className="text-green-400 font-medium mb-2">Dica</h3>
                    <p className="text-zinc-400 text-sm">
                      Se suas colunas não incluírem categorias ou se quiser
                      aplicar as mesmas categorias a todas as peças, você pode
                      selecionar manualmente:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Categoria para Todas as Peças
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => handleCategoryChange(e.target.value)}
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

                      {selectedCategory !== "none" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-400">
                            Subcategoria para Todas as Peças
                          </label>
                          <select
                            value={selectedSubcategory}
                            onChange={(e) =>
                              handleSubcategoryChange(e.target.value)
                            }
                            disabled={subcategories.length === 0}
                            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
                          >
                            <option value="none">Nenhuma</option>
                            {subcategories.map((subcategory) => (
                              <option
                                key={subcategory.id}
                                value={subcategory.id}
                              >
                                {subcategory.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Preview */}
          {previewData.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  4. Pré-visualização dos Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-zinc-800/50 border-zinc-700">
                        {headers.map((header, index) => (
                          <TableHead key={index} className="text-zinc-400">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow
                          key={rowIndex}
                          className="hover:bg-zinc-700/50 border-zinc-700"
                        >
                          {headers.map((_, colIndex) => (
                            <TableCell key={colIndex} className="text-white">
                              {row[colIndex] !== undefined
                                ? row[colIndex].toString()
                                : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-sm text-zinc-400 italic">
                  Mostrando as primeiras {previewData.length} linhas de{" "}
                  {data.length} no total.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          {headers.length > 0 && data.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  5. Importar Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Importando...</span>
                        <span className="text-zinc-400">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-2.5">
                        <div
                          className="bg-green-600 h-2.5 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>
                          Processadas:{" "}
                          {importStats.success + importStats.errors}/
                          {importStats.total}
                        </span>
                        <span>Sucesso: {importStats.success}</span>
                        <span>Erros: {importStats.errors}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-between">
                    <Button
                      onClick={handleReset}
                      className="bg-zinc-700 hover:bg-zinc-600"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recomeçar
                    </Button>

                    <div className="flex gap-2">
                      {importedItems.length > 0 && (
                        <Button
                          onClick={() => setShowResultsDialog(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Ver Resultados
                        </Button>
                      )}

                      <Button
                        onClick={handleImport}
                        disabled={isImporting || !isValidMapping()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Importar {data.length} Peças
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="instructions">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Instruções para Importação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-zinc-200 font-medium mb-2">
                  Como preparar seu arquivo
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    Use o template fornecido ou crie uma planilha Excel com
                    cabeçalhos nas colunas.
                  </li>
                  <li>
                    Os campos obrigatórios são:{" "}
                    <span className="text-green-400">Nome, Código e Preço</span>
                    .
                  </li>
                  <li>
                    Certifique-se de que o preço esteja em formato numérico (ex:
                    29.90).
                  </li>
                  <li>
                    Adicione uma coluna para Categoria e Subcategoria se desejar
                    atribuí-las durante a importação.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-zinc-200 font-medium mb-2">
                  Processo de Importação
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-zinc-400">
                  <li>
                    Selecione o arquivo Excel que contém os dados das peças.
                  </li>
                  <li>
                    Escolha a planilha específica dentro do arquivo que contém
                    os dados.
                  </li>
                  <li>
                    Mapeie as colunas da planilha para os campos do sistema.
                  </li>
                  <li>
                    Verifique a pré-visualização dos dados para confirmar o
                    mapeamento.
                  </li>
                  <li>Clique em "Importar" para iniciar o processo.</li>
                </ol>
              </div>

              <div>
                <h3 className="text-zinc-200 font-medium mb-2">
                  Sobre Categorias e Subcategorias
                </h3>
                <p className="text-zinc-400 mb-2">
                  Você tem duas opções para atribuir categorias e subcategorias:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    <span className="text-green-400">Opção 1:</span> Inclua
                    colunas de "Categoria" e "Subcategoria" na sua planilha com
                    os nomes exatos das categorias e subcategorias já existentes
                    no sistema.
                  </li>
                  <li>
                    <span className="text-green-400">Opção 2:</span> Selecione
                    uma categoria e subcategoria durante a importação para
                    aplicar a todas as peças importadas.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-zinc-200 font-medium mb-2">Dicas</h3>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    Se estiver importando muitas peças, este processo pode levar
                    algum tempo.
                  </li>
                  <li>
                    Certifique-se de que seus códigos de peças sejam únicos para
                    evitar duplicações.
                  </li>
                  <li>
                    Mantenha seu arquivo Excel limpo e organizado para melhores
                    resultados.
                  </li>
                  <li>
                    Após a importação, verifique algumas peças para confirmar
                    que foram importadas corretamente.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={generateTemplate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="bg-zinc-800 border-zinc-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Resultados da Importação
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Resumo e detalhes das peças importadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-green-500 text-2xl font-bold">
                  {importStats.success}
                </div>
                <div className="text-zinc-400 text-sm">Sucesso</div>
              </div>
              <div className="text-center">
                <div className="text-red-500 text-2xl font-bold">
                  {importStats.errors}
                </div>
                <div className="text-zinc-400 text-sm">Erros</div>
              </div>
              <div className="text-center">
                <div className="text-blue-500 text-2xl font-bold">
                  {importStats.total}
                </div>
                <div className="text-zinc-400 text-sm">Total</div>
              </div>
            </div>

            {importedItems.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-zinc-800/50 border-zinc-700">
                      <TableHead className="text-zinc-400">Linha</TableHead>
                      <TableHead className="text-zinc-400">Nome</TableHead>
                      <TableHead className="text-zinc-400">Código</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedItems.map((item, index) => (
                      <TableRow
                        key={index}
                        className={`hover:bg-zinc-700/50 border-zinc-700 ${
                          item.status === "error" ? "bg-red-900/10" : ""
                        }`}
                      >
                        <TableCell className="text-zinc-300">
                          {item.row}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.code}
                        </TableCell>
                        <TableCell>
                          {item.status === "success" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Sucesso
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500">
                              <XCircle className="w-3 h-3 mr-1" />
                              Erro
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {item.status === "error" && (
                            <span className="text-red-400">{item.error}</span>
                          )}
                          {item.status === "success" && (
                            <span className="text-green-400">
                              Importado com sucesso
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowResultsDialog(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowResultsDialog(false);
                navigate("/app/parts-library");
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Ir para Biblioteca de Peças
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportParts;
