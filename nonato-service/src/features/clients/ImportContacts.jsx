// ImportContacts.jsx
// Importa contactos (do telemóvel, Google Contactos, Outlook ou Excel) como
// clientes. Ver utils/contactsImport.js para os formatos aceites.
//
// 1. Lê o ficheiro no browser — nada é gravado até carregar em "Importar".
// 2. Mostra a lista com os contactos que já existem como clientes (mesmo
//    telefone ou mesmo nome) desmarcados, para não criar duplicados.
// 3. Grava os marcados como clientes novos, com os mesmos campos que o
//    formulário "Novo Cliente". Os IDs vêm do mesmo contador
//    (counters/clientsCounter), reservados de uma vez numa transação.

import { useState, useMemo } from "react";
import { doc, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import {
  readContactsFile,
  parseContacts,
  contactKeys,
} from "../../utils/contactsImport.js";
import { Loader2, Upload, Contact, CheckCircle2, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";

/** Reserva `count` IDs seguidos no contador de clientes. Devolve o primeiro. */
async function reserveClientIds(count) {
  const counterRef = doc(db, "counters", "clientsCounter");
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? snap.data().count || 0 : 0;
    tx.set(counterRef, { count: current + count }, { merge: true });
    return current + 1;
  });
}

const ImportContacts = () => {
  const { ensureClients } = useClients();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]); // { ...cliente, duplicateOf, selected }
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const duplicateCount = useMemo(() => rows.filter((r) => r.duplicateOf).length, [rows]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      setDone(null);
      setRows([]);

      const [text, existing] = await Promise.all([readContactsFile(file), ensureClients()]);
      const contacts = parseContacts(text, file.name);
      if (contacts.length === 0) {
        setError(
          "Não foram encontrados contactos neste ficheiro. Use um ficheiro .vcf (exportado do telemóvel) ou .csv com uma coluna de nome."
        );
        return;
      }

      // Índices dos clientes que já existem, por telefone e por nome.
      const byPhone = new Map();
      const byName = new Map();
      for (const c of existing) {
        const k = contactKeys(c);
        if (k.phone) byPhone.set(k.phone, c);
        if (k.name) byName.set(k.name, c);
      }

      // Repetidos dentro do próprio ficheiro também contam como duplicados.
      const seen = new Set();
      setRows(
        contacts.map((c) => {
          const k = contactKeys(c);
          const dup =
            (k.phone && byPhone.get(k.phone)) ||
            byName.get(k.name) ||
            (seen.has(`p:${k.phone}`) && k.phone ? { name: "(repetido no ficheiro)" } : null) ||
            (seen.has(`n:${k.name}`) ? { name: "(repetido no ficheiro)" } : null);
          if (k.phone) seen.add(`p:${k.phone}`);
          seen.add(`n:${k.name}`);
          return { ...c, duplicateOf: dup ? dup.name : "", selected: !dup };
        })
      );
      setFileName(file.name);
    } catch (err) {
      console.error("Erro ao ler contactos:", err);
      setError("Não foi possível ler o ficheiro.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (index) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));

  const setAll = (selected) =>
    setRows((prev) => prev.map((r) => ({ ...r, selected })));

  const runImport = async () => {
    const toImport = rows.filter((r) => r.selected);
    if (toImport.length === 0) return;
    if (!window.confirm(`Criar ${toImport.length} clientes novos?`)) return;

    try {
      setImporting(true);
      setError(null);
      setProgress("A reservar números de cliente…");
      const firstId = await reserveClientIds(toImport.length);
      const now = new Date();

      for (let i = 0; i < toImport.length; i += 450) {
        setProgress(`A gravar clientes (${i}/${toImport.length})…`);
        const batch = writeBatch(db);
        toImport.slice(i, i + 450).forEach((c, j) => {
          const id = String(firstId + i + j);
          batch.set(doc(db, "clientes", id), {
            name: c.name,
            phone: c.phone,
            company: c.company,
            address: c.address,
            postalCode: c.postalCode,
            nif: c.nif,
            type: c.type,
            createdAt: now,
            lastUpdate: now,
            profilePic: "",
            profilePicStoragePath: "",
          });
        });
        await batch.commit();
      }

      // A lista de clientes atualiza-se sozinha (onSnapshot no ClientsContext).
      setDone(toImport.length);
      setRows([]);
      setFileName("");
    } catch (err) {
      console.error("Erro ao importar contactos:", err);
      setError(
        "A importação parou a meio. Os clientes já gravados ficam; volte a escolher o ficheiro — esses aparecem como duplicados e ficam desmarcados."
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
          <Contact className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Importar contactos</h1>
          <p className="text-zinc-400">
            Cria clientes a partir dos contactos do telemóvel, Google, Outlook ou Excel.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {done !== null && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">
            {done} clientes criados.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">1. Escolher o ficheiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300">
          <ul className="list-disc pl-5 space-y-1 text-zinc-400">
            <li>
              <span className="text-zinc-200">Android:</span> Contactos → Gerir contactos →
              Exportar para ficheiro (.vcf).
            </li>
            <li>
              <span className="text-zinc-200">iPhone:</span> em icloud.com/contacts, selecionar
              todos → Exportar vCard (.vcf).
            </li>
            <li>
              <span className="text-zinc-200">Google Contactos:</span> Exportar → Google CSV.
            </li>
            <li>
              <span className="text-zinc-200">Excel:</span> uma linha por contacto, com colunas
              Nome, Telefone, Empresa, Morada, Código Postal, NIF (as que tiver) → Guardar como
              CSV.
            </li>
          </ul>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard"
              className="hidden"
              onChange={handleFile}
              disabled={loading || importing}
            />
            <span className="inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white cursor-pointer">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {fileName ? "Escolher outro ficheiro" : "Escolher ficheiro .vcf ou .csv"}
            </span>
          </label>
          {fileName && <p className="text-zinc-400">{fileName}</p>}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">2. Rever e importar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-300">
              {rows.length} contactos no ficheiro
              {duplicateCount > 0 &&
                ` — ${duplicateCount} já existem como clientes ou estão repetidos (desmarcados)`}
              .
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAll(true)}
                className="border-zinc-600 text-white bg-zinc-900 hover:bg-zinc-700"
              >
                Marcar todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAll(false)}
                className="border-zinc-600 text-white bg-zinc-900 hover:bg-zinc-700"
              >
                Desmarcar todos
              </Button>
            </div>

            <div className="max-h-[28rem] overflow-auto rounded-md border border-zinc-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="p-2 w-8" />
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Telefone</th>
                    <th className="p-2 text-left hidden md:table-cell">Empresa</th>
                    <th className="p-2 text-left hidden lg:table-cell">Morada</th>
                    <th className="p-2 text-left hidden lg:table-cell">NIF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => toggle(i)}
                      className={`border-t border-zinc-700 cursor-pointer hover:bg-zinc-700/50 ${
                        r.selected ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggle(i)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-2">
                        {r.name}
                        {r.duplicateOf && (
                          <span className="block text-xs text-amber-400">
                            Já existe: {r.duplicateOf}
                          </span>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap">{r.phone}</td>
                      <td className="p-2 hidden md:table-cell">{r.company}</td>
                      <td className="p-2 hidden lg:table-cell">
                        {[r.address, r.postalCode].filter(Boolean).join(" ")}
                      </td>
                      <td className="p-2 hidden lg:table-cell">{r.nif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={runImport}
              disabled={importing || selectedCount === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {progress || "A importar…"}
                </>
              ) : (
                `Importar ${selectedCount} contactos`
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportContacts;
