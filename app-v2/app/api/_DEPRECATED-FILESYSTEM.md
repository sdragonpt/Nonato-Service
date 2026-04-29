# API routes herdadas — a substituir por Firebase

Estas pastas vieram da versão original do cliente e usavam filesystem
local (Railway volumes ou pasta `data/`) para persistência. **Não vão
funcionar tal como estão na app-v2** porque a base de dados é agora
Firebase.

## Estado actual

| Pasta | Funcionalidade original | Plano na app-v2 |
|-------|--------------------------|------------------|
| `data/` | CRUD genérico de "ficheiros JSON" para qualquer chave (load/save/sync). | **Eliminar.** Cada feature passa a usar Firestore directamente via SDK no cliente. |
| `backup-code/` | Backup/restore do código fonte em ZIP. | **Eliminar.** Não é uma feature de produto, é deploy. |
| `import-from-url/` | Importar dados a partir de URL externo. | Avaliar caso a caso. |
| `demo/` | Modo demo com expiração 15 dias (cookies + filesystem). | **A reavaliar** — Firebase Auth + claims pode resolver isto. |
| `health/` | Health-check simples. | Manter. |
| `pdf/` | Geração de PDFs (orçamentos, OS, despesas, manual). | **Manter** mas ler papel timbrado e dados do Firestore (não do filesystem). |
| `video/` | Vídeos de logo/dashboard. | Avaliar — provável manter (são assets estáticos). |

## Importante

As routes em `data/` e `backup-code/` **não foram apagadas neste commit**
para tornar o diff mais legível. Vão ser eliminadas no commit seguinte
após verificarmos que nada na UI depende delas (a UI ainda chama
`/api/data/load` e `/api/data/save` — vamos substituir essas chamadas
por leituras/escritas Firestore directamente).

## Como saber o que ainda usa estas routes

```bash
cd app-v2
grep -r "/api/data\|/api/backup-code\|/api/import-from-url" app/
```
