# Nonato Service — App v2

Versão 2 da plataforma Nonato Service. Pega na **versão funcional fornecida
pelo cliente** (Next.js 14, originalmente baseada em filesystem) e adapta-a
para correr sobre o **Firebase** já em uso pelo projeto principal, mantendo
o **design visual** do `nonato-service/` actual (dark theme, sidebar verde,
shadcn/ui).

> Esta pasta coexiste com `nonato-service/` (a app actual em Vite + React +
> Firebase). As duas podem correr em paralelo durante a transição.

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Dados**: Firebase (Firestore + Auth + Storage) — mesmo projeto da app
  actual, ver [`lib/firebase.ts`](./lib/firebase.ts)
- **UI**: a chegar — Tailwind + shadcn/ui (com a estética do nonato-service)
- **PDFs**: pdf-lib + templates próprios

## Correr em desenvolvimento

```bash
cd app-v2
npm install
npm run dev
```

A aplicação abre em [http://localhost:3000](http://localhost:3000).

> Em paralelo podes manter o nonato-service original a correr noutra porta:
>
> ```bash
> cd ../nonato-service
> npm run dev -- --port 5173
> ```

## Configuração Firebase

Por defeito aponta para o projeto **nonato-service** (mesmo da app actual)
— ver `lib/firebase.ts`. Para apontar para um projecto Firebase de
**staging** sem mexer em produção, cria um `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Colecções Firestore actuais

Documentadas em [`lib/firestoreSchema.ts`](./lib/firestoreSchema.ts).
Os nomes estão em **português** (`clientes`, `pecas`, `categorias`,
`image_library`, `counters`, `ordens`, `orcamentos`, `servicos`,
`equipamentos`, `agendamentos`, `checklists`, `inspecoes`, `workdays`).

A app-v2 usa estas colecções existentes (sem migração) e introduz novas
quando necessário (ex.: `config/companyProfile`, `serviceRequests`).

## Estado da migração

Plano de trabalho (cada item é um lote de commits):

1. ✅ Esqueleto do projecto, Firebase wired
2. 🚧 **Stub** das API routes que dependiam de filesystem (a próxima
   tarefa) — substituir por chamadas Firestore. Lista: `app/api/data/*`,
   `app/api/backup-code/*`, `app/api/import-from-url/*`.
3. ⏳ Login Firebase Auth + página inicial restilizada
4. ⏳ Migração feature a feature: clientes → orçamentos → ordens →
   despesas → checklists → agendamentos → equipamentos
5. ⏳ PDFs com papel timbrado central
6. ⏳ Funcionalidades distintivas: solicitação de serviço técnico
   (formulário público + assinatura), writing assist (tradução),
   diário de anotação

## Notas

- O ficheiro `app/page.tsx` herdado tem ~3.6 MB num único ficheiro. Vai
  ser progressivamente partido em rotas/components à medida que cada
  feature é portada.
- O ficheiro `app/translations.ts` (~1 MB, 6+ idiomas) é mantido tal
  qual por agora; pode ser dividido por módulo no futuro.
- O modelo de "demo com expiração" da versão original do cliente foi
  pensado para venda externa do código; aqui só fará sentido se quiseres
  usar para clientes finais.
