// src/config/navigationItems.jsx
// Config partilhada entre a Sidebar (App.jsx) e o sistema de Abas (TabsContext).
// Fica fora do App.jsx para evitar import circular com o TabsContext.

import {
  Users,
  Wrench,
  Book,
  ClipboardList,
  BarChart,
  CheckSquare,
  Calendar,
  FileText,
  ClipboardCheck,
  Settings,
  User,
  UserCog,
  ShoppingBag,
  Store,
  Shield,
  Calculator,
  Euro,
  FileSpreadsheet,
  FolderOpen,
  Home,
  Truck,
  Building2,
  MessageCircle,
  Package,
  Bell,
  PackageOpen,
  GraduationCap,
  Trash2,
  HelpCircle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 Registo de ícones — permite guardar só uma "chave" (string) em vez do
// componente, para as abas abertas poderem ser persistidas em localStorage.
// ═══════════════════════════════════════════════════════════════════════════════

export const ICON_MAP = {
  Users,
  Wrench,
  Book,
  ClipboardList,
  BarChart,
  CheckSquare,
  Calendar,
  FileText,
  ClipboardCheck,
  Settings,
  User,
  UserCog,
  ShoppingBag,
  Store,
  Shield,
  Calculator,
  Euro,
  FileSpreadsheet,
  FolderOpen,
  Home,
  Truck,
  Building2,
  MessageCircle,
  Package,
  Bell,
  PackageOpen,
  GraduationCap,
  Trash2,
  HelpCircle,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Itens de navegação da sidebar (organizados por secção)
// ═══════════════════════════════════════════════════════════════════════════════

export const NAVIGATION_ITEMS = [
  {
    title: "Agenda & Ordens de Serviço",
    icon: ClipboardList,
    items: [
      { path: "/app/manage-agenda", icon: Calendar, iconKey: "Calendar", label: "Agenda Técnica" },
      { path: "/app/manage-orders", icon: ClipboardList, iconKey: "ClipboardList", label: "Ordem de Serviço" },
      { path: "/app/protocols", icon: ClipboardCheck, iconKey: "ClipboardCheck", label: "Protocolos de Serviço" },
      { path: "/app/manage-checklist", icon: CheckSquare, iconKey: "CheckSquare", label: "Checklist" },
      { path: "/app/checklist-families", icon: FolderOpen, iconKey: "FolderOpen", label: "Cadastro de Famílias e Grupos para Checklist" },
      { path: "/app/formularios-tecnicos", icon: CheckSquare, iconKey: "CheckSquare", label: "Formulários e Checklist p/ Técnicos" },
      { path: "/app/manage-inspection", icon: ClipboardCheck, iconKey: "ClipboardCheck", label: "Inspeção Final p/ Aprovação" },
    ],
  },
  {
    title: "Clientes & Fornecedores",
    icon: Users,
    items: [
      { path: "/app/manage-clients", icon: Users, iconKey: "Users", label: "Cadastro de Clientes" },
      { path: "/app/manage-suppliers", icon: Truck, iconKey: "Truck", label: "Cadastro de Fornecedores" },
    ],
  },
  {
    title: "Orçamentos & Financeiro",
    icon: Euro,
    items: [
      { path: "/app/manage-budgets", icon: FileText, iconKey: "FileText", label: "Orçamentos" },
      { path: "/app/parts-budgets", icon: Calculator, iconKey: "Calculator", label: "Orçamentos de Peças Especiais" },
      { path: "/app/manage-services", icon: Wrench, iconKey: "Wrench", label: "Cadastro de Serviços / Valores" },
      { path: "/app/manage-finances", icon: Euro, iconKey: "Euro", label: "Painel de Gestão Financeira" },
      { path: "/app/clientes-devedores", icon: Euro, iconKey: "Euro", label: "Clientes / Financeiro" },
      { path: "/app/manage-expenses", icon: FileSpreadsheet, iconKey: "FileSpreadsheet", label: "Registro de Despesas" },
    ],
  },
  {
    title: "Peças & Armazém",
    icon: Package,
    items: [
      { path: "/app/parts-library", icon: Book, iconKey: "Book", label: "Biblioteca de Peças" },
      { path: "/app/ordens-preparacao", icon: ClipboardCheck, iconKey: "ClipboardCheck", label: "Mapa Visual de Separação de Peças / Cliente" },
      { path: "/app/warehouse", icon: Package, iconKey: "Package", label: "Almoxarifado / Armazém" },
      { path: "/app/warehouse-equipment", icon: Wrench, iconKey: "Wrench", label: "Cadastrar Equipamentos e Visualizar Equipamentos do Armazém" },
      { path: "/app/equipment-families", icon: FolderOpen, iconKey: "FolderOpen", label: "Cadastro de Famílias e Grupos para os Equipamentos" },
      { path: "/app/disassembled-parts", icon: PackageOpen, iconKey: "PackageOpen", label: "Cadastro de Grupos de Equipamentos Desmontados" },
    ],
  },
  {
    title: "Documentos & Relatórios",
    icon: FileText,
    items: [
      { path: "/app/manage-report", icon: BarChart, iconKey: "BarChart", label: "Relatório de Serviço" },
      { path: "/app/biblioteca-relatorios", icon: FolderOpen, iconKey: "FolderOpen", label: "Biblioteca de Relatórios" },
      { path: "/app/recycle-bin", icon: Trash2, iconKey: "Trash2", label: "Relatórios Excluídos / Clientes" },
      { path: "/app/manual", icon: HelpCircle, iconKey: "HelpCircle", label: "Manual do Programa" },
      { path: "/app/documents", icon: FolderOpen, iconKey: "FolderOpen", label: "Manuais e Informações Técnica dos Equipamentos" },
    ],
  },
  {
    title: "Equipa & Comunicação",
    icon: UserCog,
    items: [
      { path: "/app/technician-status", icon: UserCog, iconKey: "UserCog", label: "Estado Visual do Técnico" },
      { path: "/app/technician-skills", icon: GraduationCap, iconKey: "GraduationCap", label: "Matriz de Competências" },
      { path: "/app/hub-comunicacao", icon: MessageCircle, iconKey: "MessageCircle", label: "Hub de Comunicação" },
      { path: "/app/alerts", icon: Bell, iconKey: "Bell", label: "Alerta de Mensagens" },
    ],
  },
  {
    title: "Loja Online",
    icon: Store,
    items: [
      { path: "/app/manage-shop-access", icon: Shield, iconKey: "Shield", label: "Gerenciar Acessos" },
      { path: "/app/orcamento-online", icon: Store, iconKey: "Store", label: "Gestão de Orçamentos Online" },
      { path: "/loja", icon: ShoppingBag, iconKey: "ShoppingBag", label: "Visitar Loja", external: true },
    ],
  },
  {
    title: "Sistema",
    icon: Settings,
    items: [
      { path: "/app/company-profile", icon: Building2, iconKey: "Building2", label: "Cadastro da Nonato Service", adminOnly: true },
      { path: "/app/parts-export", icon: FileSpreadsheet, iconKey: "FileSpreadsheet", label: "Exportar Peças CSV", adminOnly: true },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🗂️ Mapa de rotas → título/ícone da aba, para TODAS as rotas de "/app/*"
// (inclui as que não aparecem na sidebar: detalhe, adicionar, editar, perfil...)
// Padrão de path: segmentos fixos ou ":param" (qualquer valor).
// ═══════════════════════════════════════════════════════════════════════════════

export const ROUTE_META = [
  { pattern: "/app/dashboard", label: "Dashboard", iconKey: "Home", closable: false },

  { pattern: "/app/documents", label: "Bíblia de Máquinas", iconKey: "FolderOpen" },
  { pattern: "/app/company-profile", label: "Cadastro da Nonato Service", iconKey: "Building2" },
  { pattern: "/app/hub-comunicacao", label: "Hub de Comunicação", iconKey: "MessageCircle" },

  { pattern: "/app/profile", label: "Perfil", iconKey: "User" },
  { pattern: "/app/settings", label: "Configurações", iconKey: "Settings" },

  // Clientes
  { pattern: "/app/manage-clients", label: "Clientes", iconKey: "Users" },
  { pattern: "/app/add-client", label: "Novo Cliente", iconKey: "Users" },
  { pattern: "/app/client/:clientId", label: "Cliente", iconKey: "Users" },
  { pattern: "/app/edit-client/:clientId", label: "Editar Cliente", iconKey: "Users" },
  { pattern: "/app/client/:clientId/add-equipment", label: "Novo Equipamento", iconKey: "Wrench" },

  // Fornecedores
  { pattern: "/app/manage-suppliers", label: "Fornecedores", iconKey: "Truck" },
  { pattern: "/app/add-supplier", label: "Novo Fornecedor", iconKey: "Truck" },
  { pattern: "/app/supplier/:supplierId", label: "Fornecedor", iconKey: "Truck" },
  { pattern: "/app/edit-supplier/:supplierId", label: "Editar Fornecedor", iconKey: "Truck" },

  // Equipamentos
  { pattern: "/app/add-equipment", label: "Novo Equipamento", iconKey: "Wrench" },
  { pattern: "/app/equipment/:equipmentId", label: "Equipamento", iconKey: "Wrench" },
  { pattern: "/app/edit-equipment/:equipmentId", label: "Editar Equipamento", iconKey: "Wrench" },

  // Ordens de Serviço
  { pattern: "/app/manage-orders", label: "Ordens de Serviço", iconKey: "ClipboardList" },
  { pattern: "/app/add-order", label: "Nova Ordem de Serviço", iconKey: "ClipboardList" },
  { pattern: "/app/order-detail/:orderId", label: "Ordem de Serviço", iconKey: "ClipboardList" },
  { pattern: "/app/edit-service-order/:orderId", label: "Editar Ordem de Serviço", iconKey: "ClipboardList" },
  { pattern: "/app/order/:orderId/add-workday", label: "Novo Dia de Trabalho", iconKey: "Calendar" },
  { pattern: "/app/edit-workday/:workdayId", label: "Editar Dia de Trabalho", iconKey: "Calendar" },

  // Serviços
  { pattern: "/app/manage-services", label: "Serviços", iconKey: "Wrench" },
  { pattern: "/app/add-service", label: "Novo Serviço", iconKey: "Wrench" },
  { pattern: "/app/edit-service/:serviceId", label: "Editar Serviço", iconKey: "Wrench" },

  // Orçamentos
  { pattern: "/app/manage-budgets", label: "Orçamentos", iconKey: "FileText" },
  { pattern: "/app/add-budget", label: "Novo Orçamento", iconKey: "FileText" },
  { pattern: "/app/add-simple-budget", label: "Novo Orçamento Simples", iconKey: "FileText" },
  { pattern: "/app/edit-budget/:budgetId", label: "Editar Orçamento", iconKey: "FileText" },
  { pattern: "/app/edit-simple-budget/:budgetId", label: "Editar Orçamento Simples", iconKey: "FileText" },

  // Finanças
  { pattern: "/app/manage-finances", label: "Finanças", iconKey: "Euro" },
  { pattern: "/app/clientes-devedores", label: "Clientes Devedores & IVA", iconKey: "Euro" },
  { pattern: "/app/manage-expenses", label: "Comprovantes de Despesas", iconKey: "FileSpreadsheet" },
  { pattern: "/app/add-expense", label: "Nova Despesa", iconKey: "FileSpreadsheet" },

  // Almoxarifado / Armazém
  { pattern: "/app/warehouse", label: "Almoxarifado / Armazém", iconKey: "Package" },
  { pattern: "/app/add-warehouse-request", label: "Novo Pedido de Armazém", iconKey: "Package" },
  { pattern: "/app/alerts", label: "Central de Alertas", iconKey: "Bell" },
  { pattern: "/app/technician-status", label: "Estado Visual do Técnico", iconKey: "UserCog" },
  { pattern: "/app/technician-skills", label: "Matriz de Competências", iconKey: "GraduationCap" },
  { pattern: "/app/warehouse-equipment", label: "Equipamentos do Armazém", iconKey: "Wrench" },
  { pattern: "/app/add-warehouse-equipment", label: "Novo Equipamento de Armazém", iconKey: "Wrench" },
  { pattern: "/app/edit-warehouse-equipment/:equipmentId", label: "Editar Equipamento de Armazém", iconKey: "Wrench" },
  { pattern: "/app/equipment-families", label: "Famílias e Grupos de Equipamentos", iconKey: "FolderOpen" },
  { pattern: "/app/disassembled-parts", label: "Peças Desmontadas", iconKey: "PackageOpen" },
  { pattern: "/app/add-disassembled-part", label: "Nova Peça Desmontada", iconKey: "PackageOpen" },
  { pattern: "/app/edit-disassembled-part/:partId", label: "Editar Peça Desmontada", iconKey: "PackageOpen" },
  { pattern: "/app/recycle-bin", label: "Reciclagem", iconKey: "Trash2" },
  { pattern: "/app/ordens-preparacao", label: "Ordens de Preparação", iconKey: "ClipboardCheck" },
  { pattern: "/app/add-ordem-preparacao", label: "Nova Ordem de Preparação", iconKey: "ClipboardCheck" },
  { pattern: "/app/ordem-preparacao/:orderId", label: "Ordem de Preparação", iconKey: "ClipboardCheck" },
  { pattern: "/app/formularios-tecnicos", label: "Formulários para Técnicos", iconKey: "CheckSquare" },
  { pattern: "/app/biblioteca-relatorios", label: "Biblioteca de Relatórios", iconKey: "FolderOpen" },

  // Orçamento de Peças
  { pattern: "/app/parts-budgets", label: "Orçamento de Peças", iconKey: "Calculator" },
  { pattern: "/app/add-part-budget", label: "Novo Orçamento de Peças", iconKey: "Calculator" },
  { pattern: "/app/part-budget-detail/:quoteId", label: "Orçamento de Peças", iconKey: "Calculator" },
  { pattern: "/app/edit-part-budget/:quoteId", label: "Editar Orçamento de Peças", iconKey: "Calculator" },

  // Agenda
  { pattern: "/app/manage-agenda", label: "Agenda", iconKey: "Calendar" },
  { pattern: "/app/add-agendamento", label: "Novo Agendamento", iconKey: "Calendar" },
  { pattern: "/app/add-pre-agendamento", label: "Novo Pré-Agendamento", iconKey: "Calendar" },
  { pattern: "/app/edit-agendamento/:agendamentoId", label: "Editar Agendamento", iconKey: "Calendar" },

  // Checklists
  { pattern: "/app/manage-checklist", label: "Check List", iconKey: "CheckSquare" },
  { pattern: "/app/add-checklist-type", label: "Novo Tipo de Checklist", iconKey: "CheckSquare" },
  { pattern: "/app/edit-checklist-type/:typeId", label: "Editar Tipo de Checklist", iconKey: "CheckSquare" },
  { pattern: "/app/checklist-families", label: "Famílias e Grupos de Checklist", iconKey: "FolderOpen" },

  // Inspeções
  { pattern: "/app/manage-inspection", label: "Inspeções", iconKey: "ClipboardCheck" },
  { pattern: "/app/add-inspection", label: "Nova Inspeção", iconKey: "ClipboardCheck" },
  { pattern: "/app/edit-inspection/:inspectionId", label: "Editar Inspeção", iconKey: "ClipboardCheck" },
  { pattern: "/app/inspection-detail/:inspectionId", label: "Inspeção", iconKey: "ClipboardCheck" },

  // Biblioteca de Peças
  { pattern: "/app/parts-library", label: "Biblioteca de Peças", iconKey: "Book" },
  { pattern: "/app/part/:partId", label: "Peça", iconKey: "Book" },
  { pattern: "/app/add-category", label: "Nova Categoria", iconKey: "Book" },
  { pattern: "/app/add-subcategory/:categoryId", label: "Nova Subcategoria", iconKey: "Book" },
  { pattern: "/app/edit-category/:categoryId", label: "Editar Categoria", iconKey: "Book" },
  { pattern: "/app/manage-categories", label: "Categorias de Peças", iconKey: "Book" },
  { pattern: "/app/parts-classification-rules", label: "Regras de Classificação", iconKey: "Book" },

  // Protocolos de Serviço
  { pattern: "/app/protocols", label: "Protocolos de Serviço", iconKey: "ClipboardCheck" },
  { pattern: "/app/add-protocol", label: "Novo Protocolo", iconKey: "ClipboardCheck" },
  { pattern: "/app/edit-protocol/:protocolId", label: "Editar Protocolo", iconKey: "ClipboardCheck" },
  { pattern: "/app/protocol/:protocolId", label: "Protocolo de Serviço", iconKey: "ClipboardCheck" },

  // Loja Online
  { pattern: "/app/orcamento-online", label: "Orçamentos Online", iconKey: "Store" },
  { pattern: "/app/manage-shop-access", label: "Gerenciar Acessos", iconKey: "Shield" },

  // Administração
  { pattern: "/app/manage-users", label: "Utilizadores", iconKey: "UserCog" },
  { pattern: "/app/parts-export", label: "Exportar Peças CSV", iconKey: "FileSpreadsheet" },
  { pattern: "/app/manual", label: "Manual do Programa", iconKey: "HelpCircle" },
];

/** Compara um pathname real com um pattern tipo "/app/client/:clientId". */
function matchPattern(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(":") || part === pathParts[i]);
}

/**
 * Resolve o título/ícone de aba para um pathname de "/app/...".
 * Faz fallback para um título genérico (último segmento) se a rota não
 * estiver mapeada — para nunca rebentar quando adicionarmos rotas novas.
 */
export function getTabMetaForPath(pathname) {
  const found = ROUTE_META.find((r) => matchPattern(r.pattern, pathname));
  if (found) return found;

  const lastSegment = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const label = lastSegment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { pattern: pathname, label, iconKey: "FileText", closable: true };
}
