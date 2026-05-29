// ManageDocuments.jsx — Bíblia de Máquinas
// Família → Tipo de Máquina → (Manuais / Imagens / Procedimentos)

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

import {
  FolderOpen, Cpu, BookOpen, Image, ListChecks, Upload, Plus,
  ChevronRight, ArrowLeft, X, Download, Trash2, Loader2,
  FileText, AlertTriangle, Search, Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "manuais",       label: "Manuais",      icon: BookOpen,   color: "#3b82f6" },
  { id: "imagens",       label: "Imagens",       icon: Image,      color: "#22c55e" },
  { id: "procedimentos", label: "Procedimentos", icon: ListChecks, color: "#f59e0b" },
];

const PALETTE = ["#22c55e","#3b82f6","#a855f7","#f59e0b","#ec4899","#14b8a6"];

const IMAGE_EXTS = ["jpg","jpeg","png","webp","gif"];

function isImage(fileName) {
  return IMAGE_EXTS.includes(fileName?.split(".").pop()?.toLowerCase());
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFamilyColor(families, familyId) {
  const idx = families.findIndex((f) => f.id === familyId);
  return PALETTE[idx % PALETTE.length] || PALETTE[0];
}

function loadRecentlyOpened() {
  try { return JSON.parse(localStorage.getItem("biblia_recently_opened") || "[]"); }
  catch { return []; }
}

function saveRecentlyOpened(list) {
  try { localStorage.setItem("biblia_recently_opened", JSON.stringify(list)); } catch {}
}

// ─── MINI DOC CARD (reused in recents) ───────────────────────────────────────

const MiniDocCard = ({ d, onClick }) => {
  const cat = CATEGORIES.find((c) => c.id === d.category);
  const isImg = isImage(d.fileName);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="group bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all hover:-translate-y-0.5"
      onClick={() => onClick(d)}
    >
      <div className="h-[68px] flex items-center justify-center relative overflow-hidden"
        style={{ background: (cat?.color || "#fff") + "0d" }}>
        {isImg && d.fileUrl
          ? <img src={d.fileUrl} alt={d.name} className="h-full w-full object-cover opacity-80" />
          : <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center">
              {cat ? <cat.icon className="w-4 h-4" style={{ color: cat.color }} /> : <FileText className="w-4 h-4 text-zinc-400" />}
            </div>
        }
        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1 py-0.5 rounded"
          style={{ background: (cat?.color || "#fff") + "25", color: cat?.color || "#fff" }}>
          {d.fileName?.split(".").pop()?.toUpperCase() || "—"}
        </span>
      </div>
      <div className="p-2.5">
        <div className="text-[11px] font-semibold text-white truncate mb-0.5" title={d.name}>{d.name}</div>
        <div className="text-[10px] text-zinc-500 truncate">{d.familyName} › {d.machineTypeName}</div>
      </div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ManageDocuments = () => {
  const { user } = useAuth();

  const [view, setView]                   = useState("home");
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [activeCategory, setActiveCategory] = useState("manuais");
  const [search, setSearch]               = useState("");

  const [families, setFamilies]           = useState([]);
  const [machineTypes, setMachineTypes]   = useState([]);
  const [documents, setDocuments]         = useState([]);
  const [recentDocs, setRecentDocs]       = useState([]);
  const [recentlyOpened, setRecentlyOpened] = useState(loadRecentlyOpened);

  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [viewerDoc, setViewerDoc]         = useState(null);
  const [showUpload, setShowUpload]       = useState(false);
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [showNewMachine, setShowNewMachine] = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);

  const [uploadFamily, setUploadFamily]   = useState("");
  const [uploadMachine, setUploadMachine] = useState("");
  const [uploadCat, setUploadCat]         = useState("");
  const [uploadName, setUploadName]       = useState("");
  const [uploadFile, setUploadFile]       = useState(null);
  const [uploadMachineOptions, setUploadMachineOptions] = useState([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineFamilyId, setNewMachineFamilyId] = useState("");
  const fileInputRef = useRef(null);

  // ── FETCH ────────────────────────────────────────────────────────────────────

  const fetchFamilies = useCallback(async () => {
    setLoadingFamilies(true);
    try {
      const snap = await getDocs(query(collection(db, "doc_families"), orderBy("createdAt", "asc")));
      setFamilies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoadingFamilies(false); }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "doc_files"), orderBy("createdAt", "desc")));
      setRecentDocs(snap.docs.slice(0, 12).map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }, []);

  const fetchMachines = useCallback(async (familyId) => {
    setLoadingMachines(true);
    try {
      const snap = await getDocs(query(collection(db, "doc_machine_types"), where("familyId", "==", familyId), orderBy("createdAt", "asc")));
      setMachineTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoadingMachines(false); }
  }, []);

  const fetchDocuments = useCallback(async (machineTypeId) => {
    setLoadingDocs(true);
    try {
      const snap = await getDocs(query(collection(db, "doc_files"), where("machineTypeId", "==", machineTypeId), orderBy("createdAt", "desc")));
      setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoadingDocs(false); }
  }, []);

  const fetchMachinesForUpload = useCallback(async (famId) => {
    const snap = await getDocs(query(collection(db, "doc_machine_types"), where("familyId", "==", famId)));
    setUploadMachineOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, []);

  useEffect(() => { fetchFamilies(); fetchRecent(); }, [fetchFamilies, fetchRecent]);

  // ── OPEN DOC (tracks recently opened) ───────────────────────────────────────

  const openDoc = useCallback((d) => {
    setViewerDoc(d);
    setRecentlyOpened((prev) => {
      const updated = [d, ...prev.filter((x) => x.id !== d.id)].slice(0, 12);
      saveRecentlyOpened(updated);
      return updated;
    });
  }, []);

  // ── NAVIGATION ───────────────────────────────────────────────────────────────

  const goHome = () => {
    setView("home"); setSelectedFamily(null); setSelectedMachine(null); setSearch("");
  };

  const goFamily = (family) => {
    setSelectedFamily(family); setSelectedMachine(null);
    setView("family"); fetchMachines(family.id); setSearch("");
  };

  const goMachine = (machine) => {
    setSelectedMachine(machine); setView("machine");
    setActiveCategory("manuais"); fetchDocuments(machine.id); setSearch("");
  };

  // ── CREATE ───────────────────────────────────────────────────────────────────

  const createFamily = async () => {
    const name = newFamilyName.trim();
    if (!name) return;
    try {
      const docRef = await addDoc(collection(db, "doc_families"), { name, createdAt: serverTimestamp(), createdBy: user?.uid || "" });
      const newFam = { id: docRef.id, name };
      // Close modal first, update list after — avoids Framer Motion / React 19 DOM conflict
      setNewFamilyName("");
      setShowNewFamily(false);
      setTimeout(() => {
        setFamilies((prev) => [...prev, newFam]);
        if (showUpload) { setUploadFamily(docRef.id); setUploadMachineOptions([]); setUploadMachine(""); }
      }, 50);
    } catch (e) { console.error(e); }
  };

  const createMachineType = async () => {
    const name = newMachineName.trim();
    const famId = newMachineFamilyId || selectedFamily?.id || uploadFamily;
    if (!name || !famId) return;
    const fam = families.find((f) => f.id === famId);
    try {
      const docRef = await addDoc(collection(db, "doc_machine_types"), { name, familyId: famId, familyName: fam?.name || "", createdAt: serverTimestamp(), createdBy: user?.uid || "" });
      const newM = { id: docRef.id, name, familyId: famId };
      // Close modal first, update list after — avoids Framer Motion / React 19 DOM conflict
      setNewMachineName("");
      setShowNewMachine(false);
      setTimeout(() => {
        setMachineTypes((prev) => [...prev, newM]);
        if (showUpload) { setUploadMachineOptions((prev) => [...prev, newM]); setUploadMachine(docRef.id); }
      }, 50);
    } catch (e) { console.error(e); }
  };

  // ── UPLOAD ───────────────────────────────────────────────────────────────────

  const openUpload = () => {
    setUploadFamily(selectedFamily?.id || "");
    setUploadMachine(selectedMachine?.id || "");
    setUploadCat(view === "machine" ? activeCategory : "");
    setUploadName(""); setUploadFile(null);
    if (selectedFamily?.id) fetchMachinesForUpload(selectedFamily.id);
    setShowUpload(true);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadFamily || !uploadMachine || !uploadCat) return;
    const fam = families.find((f) => f.id === uploadFamily);
    const mac = uploadMachineOptions.find((m) => m.id === uploadMachine) || machineTypes.find((m) => m.id === uploadMachine);
    const ext = uploadFile.name.split(".").pop();
    const safeName = (uploadName.trim() || uploadFile.name.replace(`.${ext}`, "")).replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    const storagePath = `documents/${uploadFamily}/${uploadMachine}/${uploadCat}/${Date.now()}_${safeName}.${ext}`;
    const storageRef = ref(storage, storagePath);
    setUploading(true); setUploadProgress(0);
    const task = uploadBytesResumable(storageRef, uploadFile);
    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, "doc_files"), {
          name: uploadName.trim() || safeName,
          familyId: uploadFamily, familyName: fam?.name || "",
          machineTypeId: uploadMachine, machineTypeName: mac?.name || "",
          category: uploadCat, fileUrl: url, storagePath,
          fileName: uploadFile.name, fileSize: uploadFile.size, fileType: uploadFile.type,
          createdAt: serverTimestamp(), uploadedBy: user?.uid || "",
        });
        // Close modal first, refresh data after — avoids Framer Motion / React 19 DOM conflict
        setUploading(false);
        setShowUpload(false);
        setUploadFile(null); setUploadName(""); setUploadCat("");
        setTimeout(() => {
          if (selectedMachine?.id === uploadMachine) fetchDocuments(uploadMachine);
          fetchRecent();
        }, 50);
      }
    );
  };

  // ── DELETE ───────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "doc") {
        await deleteDoc(doc(db, "doc_files", deleteTarget.id));
        if (deleteTarget.storagePath) { try { await deleteObject(ref(storage, deleteTarget.storagePath)); } catch (_) {} }
        setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        if (viewerDoc?.id === deleteTarget.id) setViewerDoc(null);
      } else if (deleteTarget.type === "family") {
        await deleteDoc(doc(db, "doc_families", deleteTarget.id));
        setFamilies((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        if (selectedFamily?.id === deleteTarget.id) goHome();
      } else if (deleteTarget.type === "machine") {
        await deleteDoc(doc(db, "doc_machine_types", deleteTarget.id));
        setMachineTypes((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        if (selectedMachine?.id === deleteTarget.id) { setSelectedMachine(null); setView("family"); }
      }
    } catch (e) { console.error(e); }
    finally { setDeleteTarget(null); }
  };

  // ── FILTERED DOCS ─────────────────────────────────────────────────────────────

  const filteredDocs = documents.filter((d) => {
    const matchCat = d.category === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredFamilies  = families.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMachines  = machineTypes.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const filteredRecent    = recentDocs.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.familyName || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.machineTypeName || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────

  const familyColor = getFamilyColor(families, selectedFamily?.id);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {view !== "home" && (
            <Button variant="ghost" size="icon"
              onClick={view === "machine" ? () => { setView("family"); setSelectedMachine(null); setSearch(""); } : goHome}
              className="text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {view === "home"    ? "Bíblia"               :
               view === "family"  ? selectedFamily?.name   :
               selectedMachine?.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {view === "home"    ? "Manuais, imagens e procedimentos das máquinas"   :
               view === "family"  ? `Família: ${selectedFamily?.name}`                :
               `${selectedFamily?.name} › ${selectedMachine?.name}`}
            </p>
          </div>
        </div>
        <Button onClick={openUpload} className="bg-green-600 hover:bg-green-500 text-white flex-shrink-0">
          <Upload className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <Input
          placeholder={view === "home" ? "Pesquisar famílias ou documentos..." : view === "family" ? "Pesquisar tipos de máquina..." : "Pesquisar documentos..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-8 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-green-500/50"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── HOME ── */}
      {view === "home" && (
        <div className="space-y-8">

          {/* Families */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">Famílias</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowNewFamily(true); setNewMachineFamilyId(""); }}
                className="text-zinc-400 hover:text-green-400 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova família
              </Button>
            </div>
            {loadingFamilies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-green-500 animate-spin" />
              </div>
            ) : !filteredFamilies.length ? (
              <EmptyState icon={FolderOpen}
                title={search ? "Nenhuma família encontrada" : "Sem famílias ainda"}
                description={search ? `Sem resultados para "${search}"` : "Cria a primeira família para começar"}
                action={!search ? { label: "Criar família", onClick: () => setShowNewFamily(true) } : null}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFamilies.map((fam, i) => {
                  const color = PALETTE[families.indexOf(fam) % PALETTE.length];
                  return (
                    <motion.div key={fam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 cursor-pointer hover:border-zinc-600/50 transition-all hover:bg-zinc-800/80"
                      onClick={() => goFamily(fam)}>
                      <div className="relative w-10 h-10 mb-4">
                        <div className="absolute inset-0 rounded-full blur-lg opacity-60" style={{ background: color }} />
                        <div className="relative w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                          <FolderOpen className="w-5 h-5" style={{ color }} />
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-white mb-1">{fam.name}</div>
                      <div className="flex items-center text-xs text-zinc-500">
                        <ChevronRight className="w-3 h-3 mr-1" /> Ver tipos
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "family", id: fam.id }); }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-dashed border-zinc-700/50 rounded-xl p-5 cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 flex flex-col items-center justify-center gap-2 text-zinc-600 hover:text-green-400 transition-all min-h-[120px]"
                  onClick={() => setShowNewFamily(true)}>
                  <Plus className="w-6 h-6" /><span className="text-xs">Nova família</span>
                </motion.div>
              </div>
            )}
          </div>

          {/* Abertos Recentemente */}
          {!search && recentlyOpened.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Abertos Recentemente</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {recentlyOpened.map((d) => <MiniDocCard key={d.id + "-opened"} d={d} onClick={openDoc} />)}
              </div>
            </div>
          )}

          {/* Adicionados Recentemente */}
          {!search && recentDocs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Adicionados Recentemente</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {recentDocs.map((d) => <MiniDocCard key={d.id} d={d} onClick={openDoc} />)}
              </div>
            </div>
          )}

          {/* Global search results */}
          {search && filteredRecent.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Documentos encontrados</h2>
                <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-400">{filteredRecent.length}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {filteredRecent.map((d) => <MiniDocCard key={d.id} d={d} onClick={openDoc} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAMILY ── */}
      {view === "family" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Tipos de Máquina</h2>
            <Button variant="ghost" size="sm"
              onClick={() => { setNewMachineFamilyId(selectedFamily?.id); setShowNewMachine(true); }}
              className="text-zinc-400 hover:text-green-400 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo tipo
            </Button>
          </div>
          {loadingMachines ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 text-green-500 animate-spin" />
            </div>
          ) : !filteredMachines.length ? (
            <EmptyState icon={Cpu}
              title={search ? "Nenhum tipo encontrado" : "Sem tipos de máquina"}
              description={search ? `Sem resultados para "${search}"` : "Adiciona o primeiro tipo desta família"}
              action={!search ? { label: "Adicionar tipo", onClick: () => { setNewMachineFamilyId(selectedFamily?.id); setShowNewMachine(true); } } : null}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMachines.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 cursor-pointer hover:border-zinc-600/50 transition-all hover:bg-zinc-800/80"
                  onClick={() => goMachine(m)}>
                  <div className="relative w-10 h-10 mb-4">
                    <div className="absolute inset-0 rounded-full blur-lg opacity-50" style={{ background: familyColor }} />
                    <div className="relative w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      <Cpu className="w-5 h-5" style={{ color: familyColor }} />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white mb-2">{m.name}</div>
                  {CATEGORIES.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-xs text-zinc-500 py-0.5">
                      <span className="flex items-center gap-1">
                        <cat.icon className="w-3 h-3" style={{ color: cat.color }} />{cat.label}
                      </span>
                    </div>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "machine", id: m.id }); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border-2 border-dashed border-zinc-700/50 rounded-xl p-5 cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 flex flex-col items-center justify-center gap-2 text-zinc-600 hover:text-green-400 transition-all min-h-[140px]"
                onClick={() => { setNewMachineFamilyId(selectedFamily?.id); setShowNewMachine(true); }}>
                <Plus className="w-6 h-6" /><span className="text-xs">Novo tipo</span>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* ── MACHINE ── */}
      {view === "machine" && (
        <div className="space-y-5">
          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => {
              const count = documents.filter((d) => d.category === c.id).length;
              return (
                <button key={c.id}
                  onClick={() => { setActiveCategory(c.id); setSearch(""); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${activeCategory === c.id ? "border-transparent text-white" : "border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600"}`}
                  style={activeCategory === c.id ? { background: c.color + "22", borderColor: c.color + "60", color: c.color } : {}}>
                  <c.icon className="w-4 h-4" />
                  {c.label}
                  <Badge variant="secondary" className="text-xs px-1.5"
                    style={activeCategory === c.id ? { background: c.color + "30", color: c.color } : {}}>
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Docs grid */}
          {loadingDocs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-green-500 animate-spin" />
            </div>
          ) : !filteredDocs.length ? (
            <EmptyState
              icon={CATEGORIES.find((c) => c.id === activeCategory)?.icon || FileText}
              title={search ? "Nenhum documento encontrado" : `Sem ${CATEGORIES.find((c) => c.id === activeCategory)?.label?.toLowerCase()} ainda`}
              description={search ? `Sem resultados para "${search}"` : "Adiciona documentos para esta máquina"}
              action={!search ? { label: "Adicionar", onClick: openUpload } : null}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredDocs.map((d, i) => {
                const cat = CATEGORIES.find((c) => c.id === d.category);
                const isImg = isImage(d.fileName);
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all hover:-translate-y-0.5"
                    onClick={() => openDoc(d)}>
                    <div className="h-[80px] flex items-center justify-center relative overflow-hidden"
                      style={{ background: (cat?.color || "#fff") + "0d" }}>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 70%, ${cat?.color || "#fff"}18 0%, transparent 70%)` }} />
                      {isImg && d.fileUrl
                        ? <img src={d.fileUrl} alt={d.name} className="h-full w-full object-cover opacity-80" />
                        : <div className="relative w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center">
                            {cat ? <cat.icon className="w-5 h-5" style={{ color: cat.color }} /> : <FileText className="w-5 h-5 text-zinc-400" />}
                          </div>
                      }
                      <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: (cat?.color || "#fff") + "25", color: cat?.color || "#fff" }}>
                        {d.fileName?.split(".").pop()?.toUpperCase() || "—"}
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-semibold text-white truncate mb-1" title={d.name}>{d.name}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{formatSize(d.fileSize)}</span>
                        <span>{d.createdAt?.toDate?.()?.toLocaleDateString("pt-PT") || "—"}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openDoc(d); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "doc", id: d.id, storagePath: d.storagePath }); }}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEWER ── */}
      <AnimatePresence>
        {viewerDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
            onClick={(e) => e.target === e.currentTarget && setViewerDoc(null)}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/95 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  {(() => { const cat = CATEGORIES.find((c) => c.id === viewerDoc.category); return cat ? <cat.icon className="w-4 h-4" style={{ color: cat.color }} /> : <FileText className="w-4 h-4 text-zinc-400" />; })()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{viewerDoc.name}</div>
                  <div className="text-xs text-zinc-400">{viewerDoc.familyName} › {viewerDoc.machineTypeName} › {CATEGORIES.find((c) => c.id === viewerDoc.category)?.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <a href={viewerDoc.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-400 hover:text-white transition-colors">
                  <Download className="w-3.5 h-3.5" /> Descarregar
                </a>
                <Button variant="ghost" size="icon" onClick={() => setViewerDoc(null)}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              {isImage(viewerDoc.fileName)
                ? <img src={viewerDoc.fileUrl} alt={viewerDoc.name} className="max-w-full max-h-full object-contain rounded-xl" />
                : <iframe src={viewerDoc.fileUrl} title={viewerDoc.name} className="w-full h-full rounded-xl border border-zinc-800" />
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── UPLOAD DIALOG ── */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-zinc-900 border-zinc-700/50 text-white max-w-md">
          <DialogHeader><DialogTitle>Adicionar Documento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-zinc-700 hover:border-green-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-green-500/5 group"
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
              {uploadFile
                ? <div className="flex items-center justify-center gap-2 text-green-400">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium truncate max-w-[200px]">{uploadFile.name}</span>
                    <span className="text-xs text-zinc-400">({formatSize(uploadFile.size)})</span>
                  </div>
                : <>
                    <Upload className="w-8 h-8 text-zinc-600 group-hover:text-green-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm text-zinc-400"><span className="text-green-400 font-medium">Clique para selecionar</span> ou arraste aqui</p>
                    <p className="text-xs text-zinc-600 mt-1">PDF, JPG, PNG — máx. 50 MB</p>
                  </>
              }
            </div>
            <div className="flex gap-2">
              <Select value={uploadFamily} onValueChange={(v) => { setUploadFamily(v); setUploadMachine(""); if (v) fetchMachinesForUpload(v); }}>
                <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Família..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => { setShowUpload(false); setShowNewFamily(true); }}
                className="border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500/50"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Select value={uploadMachine} onValueChange={setUploadMachine} disabled={!uploadFamily}>
                <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Tipo de máquina..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {uploadMachineOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon"
                onClick={() => { if (!uploadFamily) return; setNewMachineFamilyId(uploadFamily); setShowUpload(false); setShowNewMachine(true); }}
                disabled={!uploadFamily}
                className="border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500/50"><Plus className="w-4 h-4" /></Button>
            </div>
            <Select value={uploadCat} onValueChange={setUploadCat}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Categoria..." /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-2"><c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />{c.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Nome do documento (opcional)" value={uploadName} onChange={(e) => setUploadName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400"><span>A enviar...</span><span>{uploadProgress}%</span></div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}
                className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">Cancelar</Button>
              <Button onClick={handleUpload}
                disabled={!uploadFile || !uploadFamily || !uploadMachine || !uploadCat || uploading}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "A enviar..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── NEW FAMILY ── */}
      <Dialog open={showNewFamily} onOpenChange={setShowNewFamily}>
        <DialogContent className="bg-zinc-900 border-zinc-700/50 text-white max-w-sm">
          <DialogHeader><DialogTitle>Nova Família</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="Ex: Selecionadora, Maggi, Biesse..." value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFamily()}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewFamily(false)} className="border-zinc-700 text-zinc-400 hover:text-white">Cancelar</Button>
              <Button onClick={createFamily} className="bg-green-600 hover:bg-green-500">Criar Família</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── NEW MACHINE ── */}
      <Dialog open={showNewMachine} onOpenChange={setShowNewMachine}>
        <DialogContent className="bg-zinc-900 border-zinc-700/50 text-white max-w-sm">
          <DialogHeader><DialogTitle>Novo Tipo de Máquina</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-zinc-400">Família: <span className="text-green-400 font-medium">{families.find((f) => f.id === (newMachineFamilyId || selectedFamily?.id))?.name}</span></p>
            <Input placeholder="Ex: HP 230, Rover B, Modelo A..." value={newMachineName}
              onChange={(e) => setNewMachineName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMachineType()}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewMachine(false)} className="border-zinc-700 text-zinc-400 hover:text-white">Cancelar</Button>
              <Button onClick={createMachineType} className="bg-green-600 hover:bg-green-500">Criar Tipo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Confirmar eliminação
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteTarget?.type === "doc" && "O documento será eliminado permanentemente."}
              {deleteTarget?.type === "family" && "A família será eliminada permanentemente."}
              {deleteTarget?.type === "machine" && "Este tipo de máquina será eliminado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="relative w-14 h-14 mb-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-zinc-800 rounded-2xl" />
      <Icon className="relative w-7 h-7 text-zinc-600" />
    </div>
    <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
    <p className="text-xs text-zinc-600 mb-4">{description}</p>
    {action && (
      <Button size="sm" onClick={action.onClick} className="bg-green-600 hover:bg-green-500 text-white">
        <Plus className="w-3.5 h-3.5 mr-1.5" />{action.label}
      </Button>
    )}
  </div>
);

export default ManageDocuments;
