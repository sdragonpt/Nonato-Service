// ManageTechnicianSkills.jsx - Matriz de Competências dos Técnicos
// Grelha técnico × área de competência, com nível 0-4, editável inline.
import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { comparePtPt } from "../../utils/sortHelpers.js";
import {
  GraduationCap,
  Loader2,
  AlertTriangle,
  Wrench,
  Zap,
  Code2,
  Cpu,
  Check,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Badge } from "@/components/ui/badge.jsx";

import { isStaffRole, getRoleLabel, getRoleBadgeStyle } from "../../config/roles.js";
import { PageHeader } from "../../components/app";

export const SKILL_AREAS = [
  { key: "mecanico", label: "Mecânico", icon: Wrench },
  { key: "eletrico", label: "Elétrico", icon: Zap },
  { key: "software", label: "Software", icon: Code2 },
  { key: "programacao", label: "Programação/CNC", icon: Cpu },
];

export const LEVEL_META = {
  0: { label: "Sem conhecimento", short: "0", className: "bg-muted text-muted-foreground border-border" },
  1: { label: "Básico", short: "1", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  2: { label: "Intermédio", short: "2", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  3: { label: "Avançado", short: "3", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  4: { label: "Especialista", short: "4", className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const initials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
};

const ManageTechnicianSkills = () => {
  const { ensureUsers } = useUsers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [skillsMap, setSkillsMap] = useState({});
  const [savingCell, setSavingCell] = useState(null);
  const [savedCell, setSavedCell] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allUsers, skillsSnap] = await Promise.all([
        ensureUsers(),
        getDocs(collection(db, "competenciasTecnicos")),
      ]);

      const staff = allUsers
        .filter((u) => isStaffRole(u.role))
        .sort((a, b) => comparePtPt(a.displayName, b.displayName));
      setStaffUsers(staff);

      const sMap = {};
      skillsSnap.docs.forEach((d) => {
        sMap[d.id] = d.data();
      });
      setSkillsMap(sMap);
    } catch (err) {
      console.error("Erro ao carregar matriz de competências:", err);
      setError("Erro ao carregar matriz de competências.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLevel = (userId, areaKey) => skillsMap[userId]?.[areaKey] ?? 0;

  const cycleLevel = async (userId, areaKey) => {
    const current = getLevel(userId, areaKey);
    const next = current >= 4 ? 0 : current + 1;
    const cellKey = `${userId}_${areaKey}`;

    setSkillsMap((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [areaKey]: next },
    }));

    try {
      setSavingCell(cellKey);
      await setDoc(
        doc(db, "competenciasTecnicos", userId),
        { [areaKey]: next, updatedAt: new Date() },
        { merge: true }
      );
      setSavedCell(cellKey);
      setTimeout(() => setSavedCell((c) => (c === cellKey ? null : c)), 1200);
    } catch (err) {
      console.error("Erro ao guardar competência:", err);
      setError("Erro ao guardar alteração. Por favor, tente novamente.");
    } finally {
      setSavingCell(null);
    }
  };

  const averages = useMemo(() => {
    const result = {};
    SKILL_AREAS.forEach(({ key }) => {
      const values = staffUsers.map((u) => skillsMap[u.id]?.[key] ?? 0);
      const sum = values.reduce((a, b) => a + b, 0);
      result[key] = values.length ? (sum / values.length).toFixed(1) : "0.0";
    });
    return result;
  }, [staffUsers, skillsMap]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Matriz de Competências dos Técnicos"
        description="Clique num nível para o alterar (0 = sem conhecimento, 4 = especialista)"
        icon={GraduationCap}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(LEVEL_META).map(([level, meta]) => (
          <Badge key={level} className={`${meta.className} border`}>
            {level} · {meta.label}
          </Badge>
        ))}
      </div>

      {staffUsers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/70 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum utilizador com papel de equipa interna (gestor/técnico) encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grelha de Competências</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">
                    Técnico
                  </th>
                  {SKILL_AREAS.map(({ key, label, icon: Icon }) => (
                    <th
                      key={key}
                      className="text-center text-xs font-medium text-muted-foreground pb-3 px-2"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {initials(user.displayName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {user.displayName || "Sem nome"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-0.5 text-[10px] ${getRoleBadgeStyle(user.role)}`}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    {SKILL_AREAS.map(({ key }) => {
                      const level = getLevel(user.id, key);
                      const meta = LEVEL_META[level];
                      const cellKey = `${user.id}_${key}`;
                      const isSaving = savingCell === cellKey;
                      const isSaved = savedCell === cellKey;
                      return (
                        <td key={key} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => cycleLevel(user.id, key)}
                            disabled={isSaving}
                            title={meta.label}
                            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-transform hover:scale-110 ${meta.className}`}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isSaved ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              meta.short
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-3 pr-4 text-xs text-muted-foreground">Média da equipa</td>
                  {SKILL_AREAS.map(({ key }) => (
                    <td key={key} className="pt-3 px-2 text-center text-xs text-muted-foreground">
                      {averages[key]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageTechnicianSkills;
