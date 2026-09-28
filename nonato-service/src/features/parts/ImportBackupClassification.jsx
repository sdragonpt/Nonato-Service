// ImportBackupClassification.jsx
// Ferramenta de administração (uso pontual) para trazer as categorias,
// subcategorias e a classificação das peças a partir de um backup da app
// antiga (ex.: nonato-pecas-backup-2026-09-05.json).
//
// O que faz:
// 1. Lê o backup no browser (nada é enviado para lado nenhum até carregar
//    em "Importar").
// 2. Compara com as categorias que já existem: reaproveita uma
//    categoria se já existir com o mesmo ID ou com o mesmo nome, e só cria
//    as que faltam (com o ID do backup). O mesmo para as subcategorias,
//    dentro da categoria-mãe.
// 3. Grava a categoria/subcategoria de cada peça através de
//    services/partCategoryAssignments.js (o mesmo que o diálogo "Atribuir
//    Categoria" usa). Por omissão não mexe em peças que já tenham
//    categoria atribuída.
// 4. Opcionalmente ("Apagar todas as categorias atuais"), apaga antes todas
//    as categorias, subcategorias e classificações de peças que existam, e
//    importa o backup do zero.
// 5. Migra o que ainda esteja nas coleções antigas ("categorias", um
//    documento por categoria, e "atribuicoesPecas", um por peça) para o
//    formato novo e apaga-as.
//
// Pode ser corrida mais do que uma vez sem duplicar nada.

import { useState } from "react";
import { writeBatch } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  loadCategories,
  loadLegacyCategories,
  replaceAllCategories,
} from "../../services/categoriesStore.js";
import { loadPartsCatalog } from "../../utils/partsCatalogLoader.js";
import {
  loadPartAssignments,
  bulkApplyAssignments,
  clearAllAssignments,
  loadLegacyAssignments,
} from "../../services/partCategoryAssignments.js";
import {
  Loader2,
  FolderTree,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";

const normName = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

/** Apaga uma lista de documentos, em lotes. */
async function deleteRefs(refs, onProgress) {
  for (let i = 0; i < refs.length; i += 450) {
    onProgress?.(i, refs.length);
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim();

/** Nome mais frequente para cada ID (o backup às vezes tem nomes antigos). */
function mostCommonNames(entries) {
  const counts = new Map(); // id -> Map(nome -> n)
  for (const [id, nome] of entries) {
    if (!id || !cleanName(nome)) continue;
    if (!counts.has(id)) counts.set(id, new Map());
    const m = counts.get(id);
    const n = cleanName(nome);
    m.set(n, (m.get(n) || 0) + 1);
  }
  const result = new Map();
  for (const [id, m] of counts) {
    result.set(id, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return result;
}

/**
 * Constrói o plano de importação. Não escreve nada.
 */
function buildPlan(backup, existingDocs, catalogCodes, assignments, overwrite) {
  const pecas = Array.isArray(backup.pecas) ? backup.pecas : [];

  // ── Categorias do backup: as declaradas + as que só aparecem nas peças ──
  const declaredCats = new Map(
    (backup.categorias || []).map((c) => [String(c.id), cleanName(c.nome || c.name)])
  );
  const usedCatNames = mostCommonNames(
    pecas.map((p) => [String(p.categoriaId || ""), p.categoria])
  );
  const backupCats = new Map(usedCatNames);
  for (const [id, nome] of declaredCats) if (nome) backupCats.set(id, nome);

  // ── Subcategorias: declaradas + usadas, com a categoria-mãe ──
  const backupSubs = new Map(); // id -> { nome, parentId }
  const usedSubNames = mostCommonNames(
    pecas.map((p) => [String(p.subcategoriaId || ""), p.subcategoria])
  );
  for (const p of pecas) {
    const id = String(p.subcategoriaId || "");
    if (id && p.categoriaId && !backupSubs.has(id)) {
      backupSubs.set(id, {
        nome: usedSubNames.get(id),
        parentId: String(p.categoriaId),
      });
    }
  }
  for (const s of backup.subcategorias || []) {
    const id = String(s.id);
    if (!s.categoriaId || !cleanName(s.nome || s.name)) continue;
    backupSubs.set(id, {
      nome: cleanName(s.nome || s.name),
      parentId: String(s.categoriaId),
    });
  }

  // ── O que já existe na Firestore ──
  const existingById = new Map(existingDocs.map((d) => [d.id, d]));
  const existingMainByName = new Map();
  const existingSubByName = new Map(); // `${parentId}|${NOME}` -> id
  for (const d of existingDocs) {
    if (d.parentId === null || d.parentId === undefined) {
      existingMainByName.set(normName(d.name), d.id);
    } else {
      existingSubByName.set(`${d.parentId}|${normName(d.name)}`, d.id);
    }
  }

  // ── Mapear categorias ──
  const catMap = new Map(); // id do backup -> id final
  const toCreate = [];
  let reusedCats = 0;
  for (const [id, nome] of backupCats) {
    const key = normName(nome);
    if (existingById.has(id) && existingById.get(id).parentId == null) {
      catMap.set(id, id);
      reusedCats++;
    } else if (existingMainByName.has(key)) {
      catMap.set(id, existingMainByName.get(key));
      reusedCats++;
    } else {
      // Se o ID do backup já estiver ocupado por uma subcategoria, gera um novo.
      const newId = existingById.has(id) ? `${id}-cat` : id;
      catMap.set(id, newId);
      existingMainByName.set(key, newId); // duplicados no próprio backup
      toCreate.push({ id: newId, name: nome, parentId: null });
    }
  }

  // ── Mapear subcategorias ──
  const subMap = new Map(); // id do backup -> id final
  let reusedSubs = 0;
  let newSubs = 0;
  for (const [id, { nome, parentId }] of backupSubs) {
    const parent = catMap.get(parentId);
    if (!parent) continue;
    const key = `${parent}|${normName(nome)}`;
    const existing = existingById.get(id);
    if (existing && existing.parentId === parent) {
      subMap.set(id, id);
      reusedSubs++;
    } else if (existingSubByName.has(key)) {
      subMap.set(id, existingSubByName.get(key));
      reusedSubs++;
    } else {
      // Se o ID do backup já estiver ocupado por outra coisa, gera um novo.
      const newId = existingById.has(id) ? `${id}-${parent}` : id;
      subMap.set(id, newId);
      existingSubByName.set(key, newId);
      toCreate.push({ id: newId, name: nome, parentId: parent });
      newSubs++;
    }
  }

  // Nomes finais (para gravar nas atribuições)
  const finalNames = new Map(existingDocs.map((d) => [d.id, d.name]));
  for (const c of toCreate) finalNames.set(c.id, c.name);

  // ── Atribuições por peça ──
  const matches = [];
  let notInCatalog = 0;
  let keptExisting = 0;
  for (const p of pecas) {
    const codigo = String(p.codigo || "").trim();
    const catId = catMap.get(String(p.categoriaId || ""));
    if (!codigo || !catId) continue;
    if (!catalogCodes.has(codigo)) {
      notInCatalog++;
      continue;
    }
    if (!overwrite && assignments.get(codigo)?.categoryId) {
      keptExisting++;
      continue;
    }
    const subId = subMap.get(String(p.subcategoriaId || "")) || "";
    matches.push({
      codigo,
      categoryId: catId,
      categoryName: finalNames.get(catId) || "",
      subcategoryId: subId,
      subcategoryName: subId ? finalNames.get(subId) || "" : "",
    });
  }

  return {
    toCreate,
    newCats: toCreate.length - newSubs,
    newSubs,
    reusedCats,
    reusedSubs,
    matches,
    notInCatalog,
    keptExisting,
  };
}

const ImportBackupClassification = () => {
  const [backup, setBackup] = useState(null);
  const [fileName, setFileName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [plan, setPlan] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async (data, { overwriteExisting, replace }) => {
    try {
      setAnalyzing(true);
      setError(null);
      setDone(null);
      const [currentCats, legacyCats, catalog, assignments, legacy] = await Promise.all([
        loadCategories(),
        loadLegacyCategories(),
        loadPartsCatalog(),
        loadPartAssignments({ force: true }),
        loadLegacyAssignments(),
      ]);
      // Categorias atuais = formato novo + o que ainda está na coleção antiga.
      const existingDocs = [
        ...new Map(
          [...legacyCats.list, ...currentCats].map((c) => [c.id, c])
        ).values(),
      ];
      const codes = new Set(catalog.pecas.map((p) => p.codigo));
      // Classificação atual = formato novo + o que ainda está na coleção antiga.
      const current = new Map([...legacy.map, ...assignments]);

      let next;
      if (replace) {
        // Tudo o que existe vai ser apagado: o plano parte do zero.
        next = buildPlan(data, [], codes, new Map(), true);
        next.toDelete = {
          categorias: existingDocs.length,
          atribuicoes: current.size,
        };
        next.migrate = [];
        next.keepCategories = [];
      } else {
        next = buildPlan(data, existingDocs, codes, current, overwriteExisting);
        // Peças classificadas só na coleção antiga que o backup não toca:
        // passam para o formato novo tal como estão.
        const touched = new Set(next.matches.map((m) => m.codigo));
        next.migrate = [...legacy.map.values()].filter(
          (a) => !assignments.has(a.codigo) && !touched.has(a.codigo)
        );
        next.keepCategories = existingDocs;
      }
      next.legacyRefs = [...legacy.refs, ...legacyCats.refs];
      setPlan(next);
    } catch (err) {
      console.error("Erro ao analisar backup:", err);
      setError("Não foi possível ler as categorias atuais. Verifique a ligação.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setError(null);
      setPlan(null);
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data?.pecas)) {
        setError("Este ficheiro não tem uma lista \"pecas\". Escolha o backup da app antiga.");
        return;
      }
      setBackup(data);
      setFileName(file.name);
      await analyze(data, { overwriteExisting: overwrite, replace: replaceAll });
    } catch {
      setError("O ficheiro não é um JSON válido.");
    }
  };

  const runImport = async () => {
    if (!plan) return;
    if (
      plan.toDelete &&
      !window.confirm(
        `Vão ser apagadas ${plan.toDelete.categorias} categorias/subcategorias e ` +
          `${plan.toDelete.atribuicoes} classificações de peças. Não é possível desfazer. Continuar?`
      )
    ) {
      return;
    }
    try {
      setImporting(true);
      setError(null);

      if (plan.toDelete) {
        setProgress("A apagar classificações atuais…");
        await clearAllAssignments();
      }

      // Lista final de categorias num único documento: as que ficam + as novas
      // (com "Apagar todas", só as novas).
      setProgress("A gravar categorias…");
      const now = new Date();
      await replaceAllCategories([
        ...plan.keepCategories,
        ...plan.toCreate.map((c) => ({
          id: c.id,
          name: c.name,
          createdAt: now,
          parentId: c.parentId,
        })),
      ]);

      setProgress(`A classificar ${plan.matches.length} peças…`);
      await bulkApplyAssignments([...plan.migrate, ...plan.matches]);

      // As coleções antigas (um documento por categoria e por peça) já não
      // são lidas pela app. Só se apagam depois de o formato novo estar gravado.
      await deleteRefs(plan.legacyRefs, (i, n) =>
        setProgress(`A limpar o formato antigo (${i}/${n})…`)
      );

      setDone({
        categorias: plan.toCreate.length,
        pecas: plan.matches.length,
      });
      setPlan(null);
      setBackup(null);
      setFileName("");
    } catch (err) {
      console.error("Erro na importação:", err);
      setError(
        "A importação parou a meio. Pode voltar a escolher o ficheiro e importar de novo — o que já foi gravado não é duplicado."
      );
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <FolderTree className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Importar categorias do backup
          </h1>
          <p className="text-zinc-400">
            Traz as categorias, subcategorias e a classificação das peças de um
            backup da app antiga.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {done && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            Importação concluída: {done.categorias} categorias e subcategorias
            criadas, {done.pecas} peças classificadas.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">1. Escolher o backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="inline-flex">
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
              disabled={analyzing || importing}
            />
            <span className="inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {fileName ? "Escolher outro ficheiro" : "Escolher ficheiro .json"}
            </span>
          </label>
          {fileName && <p className="text-sm text-zinc-400">{fileName}</p>}

          <label className="flex items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={overwrite || replaceAll}
              disabled={analyzing || importing || replaceAll}
              onChange={(e) => {
                setOverwrite(e.target.checked);
                if (backup) {
                  analyze(backup, { overwriteExisting: e.target.checked, replace: replaceAll });
                }
              }}
              className="mt-1"
            />
            <span>
              Substituir a categoria de peças que já foram classificadas na app
              <span className="block text-zinc-500">
                Desligado: essas peças ficam como estão.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={replaceAll}
              disabled={analyzing || importing}
              onChange={(e) => {
                setReplaceAll(e.target.checked);
                if (backup) {
                  analyze(backup, { overwriteExisting: overwrite, replace: e.target.checked });
                }
              }}
              className="mt-1"
            />
            <span>
              Apagar todas as categorias atuais antes de importar
              <span className="block text-zinc-500">
                Apaga todas as categorias, subcategorias e classificações de peças
                que existem hoje e fica só com as do backup. Não é possível desfazer.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {analyzing && (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />A comparar com as
          categorias atuais…
        </div>
      )}

      {plan && !analyzing && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">2. Rever e importar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {plan.toDelete && (
                <>
                  <dt className="text-red-400">A apagar: categorias e subcategorias</dt>
                  <dd className="text-red-300">{plan.toDelete.categorias}</dd>
                  <dt className="text-red-400">A apagar: classificações de peças</dt>
                  <dd className="text-red-300">{plan.toDelete.atribuicoes}</dd>
                </>
              )}
              <dt className="text-zinc-400">Categorias novas</dt>
              <dd className="text-white">{plan.newCats}</dd>
              <dt className="text-zinc-400">Subcategorias novas</dt>
              <dd className="text-white">{plan.newSubs}</dd>
              <dt className="text-zinc-400">Já existiam (reaproveitadas)</dt>
              <dd className="text-white">
                {plan.reusedCats + plan.reusedSubs}
              </dd>
              <dt className="text-zinc-400">Peças a classificar</dt>
              <dd className="text-white">{plan.matches.length}</dd>
              {plan.keptExisting > 0 && (
                <>
                  <dt className="text-zinc-400">Peças que ficam como estão</dt>
                  <dd className="text-white">{plan.keptExisting}</dd>
                </>
              )}
              {plan.notInCatalog > 0 && (
                <>
                  <dt className="text-zinc-400">Peças fora do catálogo (ignoradas)</dt>
                  <dd className="text-white">{plan.notInCatalog}</dd>
                </>
              )}
            </dl>

            {plan.toCreate.length > 0 && (
              <details className="text-sm">
                <summary className="text-zinc-400 cursor-pointer">
                  Ver o que vai ser criado
                </summary>
                <ul className="mt-2 space-y-1 text-zinc-300 max-h-64 overflow-auto">
                  {plan.toCreate.map((c) => (
                    <li key={c.id} className={c.parentId ? "pl-4 text-zinc-400" : ""}>
                      {c.name}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <Button
              onClick={runImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {progress || "A importar…"}
                </>
              ) : (
                "Importar"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportBackupClassification;
