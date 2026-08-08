// src/config/roles.js
// Papéis de utilizador da app. Estende o modelo original (admin/client) com
// os papéis internos que o Hub de Comunicação precisa para distinguir
// gestores de técnicos (internos/externos), sem inventar entidades novas
// paralelas ao "users" já existente — é só mais um valor no campo `role`.

export const ROLES = {
  ADMIN: "admin",
  GESTOR: "gestor",
  TECNICO_INTERNO: "tecnico_interno",
  TECNICO_EXTERNO: "tecnico_externo",
  CLIENT: "client",
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Administrador" },
  { value: ROLES.GESTOR, label: "Gestor" },
  { value: ROLES.TECNICO_INTERNO, label: "Técnico Interno" },
  { value: ROLES.TECNICO_EXTERNO, label: "Técnico Externo" },
  { value: ROLES.CLIENT, label: "Cliente" },
];

export const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, { value, label }) => {
  acc[value] = label;
  return acc;
}, {});

export const ROLE_BADGE_STYLES = {
  [ROLES.ADMIN]: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  [ROLES.GESTOR]: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  [ROLES.TECNICO_INTERNO]: "bg-green-500/10 text-green-400 border-green-500/20",
  [ROLES.TECNICO_EXTERNO]: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  [ROLES.CLIENT]: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || "Cliente";
}

export function getRoleBadgeStyle(role) {
  return ROLE_BADGE_STYLES[role] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

/** Papéis considerados "equipa interna" (aparecem no Hub de Comunicação). */
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO_INTERNO, ROLES.TECNICO_EXTERNO];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}
