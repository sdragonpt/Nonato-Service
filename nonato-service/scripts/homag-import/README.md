# Importador HOMAG

Ferramenta local (corre no teu PC, fora da aplicação web) para trazer peças
da loja HOMAG (`shop.homag.com`) para a Biblioteca de Peças da Nonato Service.

## Porque é preciso um script à parte

A loja da HOMAG é feita em Salesforce B2B Commerce: a página só mostra os
produtos depois de correr JavaScript no browser, e só depois de teres sessão
iniciada com a tua conta. Por isso:

- A aplicação web (ou qualquer pedido feito a partir dela) não consegue ir
  buscar esses dados diretamente — recebe sempre a "casca" da página, vazia.
- Não há também nenhuma API pública da HOMAG que possamos usar.

A única forma fiável é abrir um browser a sério, tu iniciares sessão nele
como fazes normalmente, e um script ler os produtos já carregados na página.
É isso que este script faz — e é também a abordagem que o protótipo que o
cliente te enviou tinha desenhado (script local + `HOMAG_MANUAL=1` para
login manual), só que sem o código incluído no que recebeste. Este é esse
código, escrito de raiz.

**Este script nunca vê nem guarda a tua palavra-passe.** Tu logas-te à mão
na janela do browser que ele abre; ele só guarda a sessão (cookies) para não
teres de repetir o login todas as vezes.

## Instalação (só uma vez)

```bash
npm install
```

Isto instala o Puppeteer (o Chrome que o script controla) — já está
adicionado ao `package.json`.

## Configuração

```bash
cp scripts/homag-import/config.example.json scripts/homag-import/config.json
```

Depois abre `config.json` e ajusta:

- `startUrl` — o URL da categoria/listagem de peças na HOMAG que queres
  importar (abre a página normalmente no browser, com sessão iniciada, e
  copia o URL de lá).
- `selectors` — **isto é o único passo manual mais chato**: como não tenho
  acesso a uma sessão HOMAG, não consigo saber os nomes exatos das classes
  CSS que a loja usa. Precisas de:
  1. Abrir a página da listagem no Chrome, com sessão iniciada.
  2. Clicar com o botão direito num produto → "Inspecionar".
  3. Ver que classe/atributo envolve cada produto (`productItem`), o nome, o
     código/SKU, o preço e a imagem, e copiar esses seletores para o
     `config.json`.
  4. Fazer o mesmo para o botão "página seguinte" (`nextPage`), se a
     listagem tiver paginação.

Os valores que vêm no `config.example.json` são só palpites genéricos —
quase de certeza vais ter de os ajustar.

## Como correr

**Primeira vez (login manual):**

```bash
HOMAG_MANUAL=1 npm run homag:import
```

Abre uma janela do Chrome. Inicia sessão na HOMAG normalmente. Quando
estiveres com sessão iniciada, volta ao terminal e prime ENTER — o script
continua sozinho a partir daí.

**Vezes seguintes** (enquanto a sessão guardada ainda for válida):

```bash
npm run homag:import
```

Corre sem abrir janela visível (mais rápido). Se a sessão tiver expirado,
volta a correr com `HOMAG_MANUAL=1`.

## Resultado

O script escreve `scripts/homag-import/out/export.json` com as peças
encontradas, já no formato que a app espera (`name`, `code`, `price`,
`description`, `category`, `subcategory`).

Depois é só ir à aplicação, **Biblioteca de Peças → Importar Peças**,
carregar esse ficheiro `export.json`, rever a pré-visualização (podes
corrigir categorias linha a linha, ou usar "Classificar Automaticamente" se
já tiveres regras criadas) e confirmar a importação.

## Limitações a ter em conta

- Os preços que a HOMAG mostra podem incluir IVA ou ser preços de tabela
  diferentes dos teus — confirma antes de confiares neles cegamente.
- As imagens não são descarregadas automaticamente por este script (só o
  URL, que costuma exigir sessão para abrir) — o campo `image` fica
  disponível no scraping mas não é usado na importação atual.
- Se a HOMAG mudar o design do site, os seletores em `config.json` deixam
  de funcionar e é preciso repetir o passo de inspecionar e ajustar.
