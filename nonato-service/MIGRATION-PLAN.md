# Plano de Migração — Funcionalidades da Especificação do Cliente

Branch: `feature/client-spec-merge`

Este documento lista as funcionalidades da versão de referência do cliente (backup Next.js 14 fornecido em Abr 2026) que precisam ser adaptadas e integradas na aplicação atual (Vite + React 19 + Firebase).

## Princípios

1. **A estética visual do projeto actual manda** — dark theme com accent verde glow, shadcn/ui + Tailwind, sidebar lateral, cards e dialogs Radix. Não trazer o glassmorphism aggressive do backup.
2. **Firebase como fonte única de dados** — nada de filesystem, nada de localStorage como fonte de verdade.
3. **Portar o "o quê" não o "como"** — mesma funcionalidade e fluxo, implementação idiomática para a stack actual.
4. **Manter organização por features** (`src/features/<nome>/`) — consistente com o padrão já existente.

## Cobertura já existente (validar e potencialmente enriquecer)

| Funcionalidade no cliente | Feature existente | Ação |
|---------------------------|-------------------|------|
| Orçamentos Avulso | `features/budgets` | Comparar campos, adicionar o que falta |
| Orçamento Serviço Técnico | `features/budgets` ou nova? | A decidir após deep-dive |
| Pedido/OS | `features/orders` | Comparar fluxo, status, confirmação |
| Despesas | `features/finances` | Comparar tipos, tipo cliente vs pessoal |
| Clientes | `features/clients` | Comparar campos (CEP, país, etc.) |
| Serviços/Cadastro | `features/services` | Comparar tipos de cobrança |
| Equipamentos | `features/equipments` | Comparar origem (cliente/armazém) |
| Agendamentos | `features/agendamentos` | Comparar tipos |
| Checklists | `features/checklists` | Comparar grupos e tipos |

## Funcionalidades NOVAS a criar

Priorizadas por impacto e independência (as primeiras desbloqueiam as seguintes):

### Prioridade 1 — Fundações

1. **Papel Timbrado Configurável** (`features/letterhead` ou `features/companyProfile`)
   - Upload de logo (Firebase Storage)
   - Campos empresa: nome, rua, CEP, cidade, freguesia, telefones, email, dados bancários
   - Toggles de visibilidade por componente
   - Serve de base a todos os PDFs abaixo

2. **Módulo de Geração de PDFs unificado** (`lib/pdf/`)
   - Já usas `pdf-lib` — bom
   - Helper central para header com papel timbrado + footer
   - Templates: confirmação orçamento, confirmação OS, comprovante despesas, despesa individual, pedido separação/envio, protocolo serviço, dados depósito

### Prioridade 2 — Funcionalidades de alto valor

3. **Solicitação de Serviço Técnico** (`features/serviceRequests`)
   - Formulário público para cliente (equipamento, descrição, tipo)
   - Captura de assinatura do cliente (canvas)
   - Gera PDF automático
   - Envio por email/WhatsApp
   - Tracking no dashboard interno

4. **Writing Assist Modal** (`components/shared/WritingAssistModal`)
   - Modal que abre em qualquer `<Textarea>` para traduzir
   - Integra MyMemory API (grátis)
   - Aplica tradução no campo

### Prioridade 3 — Utilitários

5. **Diário de Anotação Diária** (`features/dailyJournal`)
   - Notas rápidas por dia
   - Integrado no dashboard

6. **Modelos de PDF alternativos** para despesas (5 layouts do cliente)
   - Só depois de termos o base PDF pipeline a funcionar

### Prioridade 4 — Controlo de acesso

7. **Modo Demo com expiração** (já tens auth Firebase — avaliar se faz sentido)

## Não portar / descartar

- **Sistema de filesystem/Railway volumes** — incompatível com o modelo Firebase.
- **Ficheiro `app/page.tsx` de 3.6 MB** — é uma anti-pattern; já tens separação por features muito melhor.
- **Backup/Restore ZIP de código** — é uma ferramenta de deploy, não uma feature de produto.
- **Sync bidirecional manual** — Firebase já faz real-time sync nativamente.
- **IndexedDB para manuais** — usar Firestore ou Firebase Storage.

## Ordem de execução proposta

1. ✅ Criar branch, documentar plano (este documento)
2. 🚧 Papel Timbrado — `features/companyProfile`
3. ⏳ PDF helpers centralizados
4. ⏳ Solicitação de Serviço Técnico
5. ⏳ Writing Assist Modal
6. ⏳ Diário de Anotação
7. ⏳ Revisões e enriquecimentos a features existentes (cliente → CEP/país, despesas → tipo, serviços → tipos de cobrança adicionais)

Cada ponto é um commit (ou vários) separado(s). Nada é mergeado em `main` sem revisão.
