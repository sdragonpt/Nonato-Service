// src/features/manual/ManageManual.jsx
// Manual do Programa — ajuda estática, descrevendo os módulos desta app
// (Nonato Service, construída de raiz — não é uma cópia do sistema do cliente).
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";

// Conteúdo do manual, organizado pelas mesmas secções da barra lateral.
// Cada módulo tem uma descrição curta (o quê) e, quando útil, notas de
// utilização (como). Escrito de raiz a partir do que foi construído nesta app.
const MANUAL_SECTIONS = [
  {
    title: "Cadastro",
    items: [
      {
        label: "Biblioteca de Peças",
        path: "/app/parts-library",
        description:
          "Catálogo de peças de substituição, organizado por categorias e subcategorias. Cada peça tem nome, código/número e, quando disponível, uma imagem de referência.",
        notes:
          "A importação em massa (a partir de ficheiros CSV do fornecedor HOMAG) suporta múltiplos ficheiros ou uma pasta inteira de uma vez — não é preciso juntar os ficheiros manualmente antes de importar.",
      },
      {
        label: "Clientes",
        path: "/app/manage-clients",
        description:
          "Registo central de clientes. A ficha de cada cliente reúne os equipamentos, ordens de serviço, anexos, inspeções realizadas e a situação financeira (pago/pendente/em atraso).",
      },
      {
        label: "Fornecedores",
        path: "/app/manage-suppliers",
        description: "Registo de fornecedores de peças e materiais.",
      },
      {
        label: "Orçamentos",
        path: "/app/manage-budgets",
        description:
          "Orçamentos de serviço propostos a clientes, antes de se tornarem ordens de serviço.",
      },
      {
        label: "Serviços",
        path: "/app/manage-services",
        description: "Catálogo dos tipos de serviço prestados pela Nonato Service.",
      },
    ],
  },
  {
    title: "Bíblia",
    items: [
      {
        label: "Bíblia de Máquinas",
        path: "/app/documents",
        description:
          "Repositório de documentação técnica (manuais, esquemas, notas) organizado por marca e modelo de máquina.",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Agenda",
        path: "/app/manage-agenda",
        description:
          "Calendário de agendamentos da equipa técnica. Mostra conflitos de horário e permite marcar visitas a clientes.",
      },
      {
        label: "Check List",
        path: "/app/manage-checklist",
        description:
          "Modelos (tipos) de checklist técnico, organizados por categoria de equipamento — incluindo checklists de manutenção e o Pré-Checklist (verificação preliminar antes da operação principal).",
      },
      {
        label: "Finanças",
        path: "/app/manage-finances",
        description:
          "Visão financeira global da empresa: total faturado, pago, pendente e em atraso, com detalhe por orçamento de peças e fechamento.",
      },
      {
        label: "Comprovantes de Despesas",
        path: "/app/manage-expenses",
        description: "Registo de despesas da empresa com o respetivo comprovativo.",
      },
      {
        label: "Inspeções",
        path: "/app/manage-inspection",
        description:
          "Registos reais de inspeção/checklist preenchidos em equipamentos de clientes — o \"relatório\" de cada visita técnica, com estado de cada característica verificada (Bom/Reparar/Substituir/N-D), fotos e conclusão geral.",
        notes:
          "A partir da ficha de um equipamento ou de um cliente é possível ver só as inspeções desse equipamento/cliente (filtro automático por URL).",
      },
      {
        label: "Ordem de Serviço",
        path: "/app/manage-orders",
        description:
          "Ordens de serviço abertas e fechadas, com dias de trabalho associados. É o documento principal de cada intervenção.",
      },
      {
        label: "Orçamento de Peças",
        path: "/app/parts-budgets",
        description: "Orçamentos focados especificamente em peças de substituição.",
      },
      {
        label: "Relatório",
        path: "/app/manage-report",
        description: "Painel de relatórios/análises agregadas da atividade da empresa.",
      },
      {
        label: "Protocolos de Serviço",
        path: "/app/protocols",
        description: "Procedimentos-padrão documentados para tipos de serviço recorrentes.",
      },
      {
        label: "Biblioteca de Relatórios",
        path: "/app/biblioteca-relatorios",
        description:
          "Arquivo consolidado de ordens de serviço e fechamentos, organizado por cliente e depois por equipamento — útil para encontrar rapidamente o histórico documental de um cliente.",
      },
      {
        label: "Almoxarifado / Armazém",
        path: "/app/warehouse",
        description: "Pedidos internos de material do armazém da empresa.",
      },
      {
        label: "Central de Alertas",
        path: "/app/alerts",
        description:
          "Agrega num só sítio o que precisa de atenção: clientes devedores, agendamentos de hoje, pedidos de armazém pendentes e orçamentos online por responder.",
      },
      {
        label: "Estado Visual do Técnico",
        path: "/app/technician-status",
        description:
          "Quadro em tempo real de disponibilidade da equipa (Livre / Em Serviço / Próximo Agendamento), calculado a partir da agenda do dia.",
      },
      {
        label: "Matriz de Competências",
        path: "/app/technician-skills",
        description:
          "Grelha de competências de cada elemento da equipa por área (Mecânico, Elétrico, Software, Programação/CNC), com nível de 0 (sem conhecimento) a 4 (especialista).",
        notes: "Clique num círculo de nível para o avançar — a alteração é guardada automaticamente.",
      },
      {
        label: "Equipamentos do Armazém",
        path: "/app/warehouse-equipment",
        description:
          "Inventário de equipamentos próprios da Nonato Service (ferramentas, máquinas, veículos) — diferente dos equipamentos dos clientes.",
      },
      {
        label: "Peças Desmontadas",
        path: "/app/disassembled-parts",
        description:
          "Peças retiradas de equipamentos de clientes que ainda estão em bom estado e podem ser reaproveitadas, com a respetiva localização em prateleira.",
      },
      {
        label: "Reciclagem",
        path: "/app/recycle-bin",
        description:
          "Ordens de serviço e relatórios de inspeção excluídos ficam aqui, organizados por cliente, antes de serem apagados de vez. Podem ser restaurados a qualquer momento.",
        notes: "Eliminar aqui é definitivo e não pode ser desfeito.",
      },
      {
        label: "Ordens de Preparação",
        path: "/app/ordens-preparacao",
        description:
          "Formulário técnico completo para preparar material antes da produção (folheado, cor, dimensões, tipologia de borda, cola, ferramentas, etc.), com geração de PDF para impressão.",
      },
      {
        label: "Formulários para Técnicos",
        path: "/app/formularios-tecnicos",
        description:
          "Fila de formulários gerados a partir de ordens de preparação ou checklists, com estado (pendente / em andamento / concluído).",
      },
    ],
  },
  {
    title: "Comunicação",
    items: [
      {
        label: "Hub de Comunicação",
        path: "/app/hub-comunicacao",
        description:
          "Mensagens internas entre gestores e técnicos (internos e externos), separadas do contacto com clientes.",
      },
    ],
  },
  {
    title: "Loja Online",
    items: [
      {
        label: "Gerenciar Acessos",
        path: "/app/manage-shop-access",
        description: "Controla que clientes têm acesso à loja online e a que preços.",
      },
      {
        label: "Gestão de Orçamentos Online",
        path: "/app/orcamento-online",
        description: "Pedidos de orçamento submetidos pelos clientes através da loja online.",
      },
      {
        label: "Visitar Loja",
        path: "/loja",
        description: "Abre a loja online pública, visível pelos clientes.",
        external: true,
      },
    ],
  },
  {
    title: "Administração",
    items: [
      {
        label: "Cadastro da Nonato Service",
        path: "/app/company-profile",
        description:
          "Dados da própria empresa (morada, contactos, logótipo) usados nos PDFs e documentos gerados pela app.",
      },
      {
        label: "Exportar Peças CSV",
        path: "/app/parts-export",
        description: "Exporta o catálogo de peças para um ficheiro CSV.",
      },
    ],
  },
];

const ManageManual = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.title, true]))
  );

  const toggleSection = (title) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return MANUAL_SECTIONS;

    return MANUAL_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term)
      ),
    })).filter((section) => section.items.length > 0);
  }, [searchTerm]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Manual do Programa</h1>
          <p className="text-sm text-zinc-400">
            O que faz cada módulo desta app e onde o encontrar
          </p>
        </div>
      </div>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar um módulo (ex: peças, agenda, reciclagem...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
            />
          </div>
        </CardContent>
      </Card>

      {filteredSections.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <p className="text-zinc-400">Nenhum módulo corresponde à pesquisa.</p>
          </CardContent>
        </Card>
      ) : (
        filteredSections.map((section) => {
          const isOpen = searchTerm.trim() ? true : openSections[section.title];
          return (
            <Card key={section.title} className="bg-zinc-800 border-zinc-700">
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleSection(section.title)}
              >
                <CardTitle className="text-lg text-white flex items-center justify-between">
                  <span>{section.title}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  )}
                </CardTitle>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.path}
                      className="p-3 bg-zinc-900 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() =>
                            item.external ? window.open(item.path, "_blank") : navigate(item.path)
                          }
                          className="text-white font-medium hover:text-green-400 transition-colors flex items-center gap-1.5 text-left"
                        >
                          {item.label}
                          {item.external && <ExternalLink className="h-3.5 w-3.5" />}
                        </button>
                        {item.adminOnly && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-purple-500/30 text-purple-400"
                          >
                            Apenas Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">{item.description}</p>
                      {item.notes && (
                        <p className="text-xs text-zinc-500 mt-1.5 italic">Nota: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ManageManual;
