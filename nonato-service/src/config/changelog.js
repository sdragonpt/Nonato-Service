// src/config/changelog.js
// Histórico de atualizações da app — é o que aparece em "O que há de novo"
// (ver components/layout/VersionBadge.jsx) e de onde sai a versão mostrada
// no canto da barra lateral.
//
// COMO ACRESCENTAR UMA ATUALIZAÇÃO: nova entrada NO TOPO da lista, com
// - n:       número de ordem, sempre o anterior + 1 (é por ele que a app sabe
//            o que cada utilizador já viu — nunca reutilizar nem reordenar);
// - versao:  último número sobe em correções/acertos (1.8.0 → 1.8.1), o do
//            meio em funcionalidades novas (1.8.1 → 1.9.0);
// - data:    "AAAA-MM-DD";
// - titulo:  uma linha, em linguagem de quem usa a app;
// - itens:   [{ tipo: "novo" | "melhoria" | "correcao", texto }];
// - interna: true para mudanças técnicas que não interessam a quem usa
//            (não aparecem na janela automática de novidades, só na lista
//            completa).

export const CHANGELOG = [
  {
    n: 20,
    versao: "1.11.0",
    data: "2026-10-27",
    titulo: "Novo visual da app e confirmação de leitura no chat",
    itens: [
      { tipo: "novo", texto: "A app tem um visual novo em todas as páginas: tema escuro uniforme, barra lateral e topo em vidro, e os mesmos cabeçalhos, cartões de números e janelas em todo o lado." },
      { tipo: "novo", texto: "No Hub de Comunicação já se vê o estado de cada mensagem enviada: ✓ enviada, ✓✓ entregue (chegou à app do colega) e ✓✓ azul quando foi vista, com a hora." },
      { tipo: "melhoria", texto: "O topo mostra o nome da página em que está, e o menu lateral tem pesquisa." },
      { tipo: "melhoria", texto: "O botão do chat ficou mais discreto e pulsa quando há mensagens por ler." },
      { tipo: "melhoria", texto: "Novo e Editar Cliente mais arrumados, com aviso claro de cliente repetido; apagar pede confirmação numa janela própria." },
      { tipo: "correcao", texto: "No Hub de Comunicação a caixa de escrever já não fica cortada em ecrãs mais baixos." },
    ],
  },
  {
    n: 19,
    versao: "1.10.1",
    data: "2026-10-15",
    titulo: "Segurança: dados da empresa e lista de acessos",
    interna: true,
    itens: [
      { tipo: "correcao", texto: "Os dados da empresa (incluindo os bancários) e a lista de emails com acesso só podem ser alterados por administradores também na base de dados — antes isso só estava garantido no ecrã." },
    ],
  },
  {
    n: 18,
    versao: "1.10.0",
    data: "2026-10-15",
    titulo: "Ficha Cadastral e Dados para Pagamento em PDF",
    itens: [
      { tipo: "novo", texto: "Em Sistema → Cadastro da Nonato Service geram-se dois PDFs com a imagem da Nonato: a Ficha Cadastral e os Dados para Pagamento (com IBAN, banco, SWIFT/BIC e NIF)." },
      { tipo: "novo", texto: "Novos campos da empresa: denominação social, atividade, CAE, data de constituição, código postal, localidade, concelho, distrito, país, telemóvel e website." },
      { tipo: "melhoria", texto: "O email da empresa passou a ser info@nonatoservice.pt e o website nonatoservice.pt." },
      { tipo: "melhoria", texto: "Os gestores passam a ter acesso ao Cadastro da Nonato Service: consultam os dados e geram os PDFs (editar continua a ser só para administradores)." },
    ],
  },
  {
    n: 17,
    versao: "1.9.1",
    data: "2026-10-12",
    titulo: "Imagens das peças HOMAG no PDF dos orçamentos",
    itens: [
      { tipo: "correcao", texto: "As peças cuja imagem vem do site da HOMAG apareciam como \"N/A\" no PDF do orçamento de peças. Agora a imagem é descarregada na primeira vez que a peça entra num PDF e fica guardada na app para as vezes seguintes." },
    ],
  },
  {
    n: 16,
    versao: "1.9.0",
    data: "2026-10-12",
    titulo: "Serviço realizado ou não, à parte do estado da marcação",
    itens: [
      { tipo: "melhoria", texto: "A pergunta \"O serviço foi realizado?\" passou a ser um registo à parte: a marcação mantém o seu estado (agendado, confirmado, cancelado) e a resposta fica guardada no agendamento." },
      { tipo: "melhoria", texto: "A pergunta só aparece a partir do dia seguinte ao agendamento, na Agenda e na Dashboard." },
      { tipo: "novo", texto: "Na Agenda, cada marcação mostra um ícone próprio: serviço realizado, não realizado ou por confirmar. Pode ser corrigido no menu da marcação." },
      { tipo: "melhoria", texto: "Marcação rápida: em vez de 30/60/90/120 minutos escolhe-se Manhã, Tarde ou Dia todo." },
      { tipo: "correcao", texto: "Marcação rápida: com \"Mais opções\" aberto a janela já tem scroll e deixou de ficar cortada." },
    ],
  },
  {
    n: 15,
    versao: "1.8.2",
    data: "2026-10-12",
    titulo: "Atualizações também no sino de notificações",
    itens: [
      { tipo: "novo", texto: "Cada atualização da app aparece como notificação no sino. Clicar nela abre a lista do que mudou." },
    ],
  },
  {
    n: 14,
    versao: "1.8.1",
    data: "2026-10-12",
    titulo: "Acertos na confirmação de trabalhos",
    itens: [
      { tipo: "correcao", texto: "A janela \"O trabalho foi realizado?\" já não fica cortada com nomes de cliente compridos: os botões passam para baixo do nome." },
      { tipo: "melhoria", texto: "Quando há várias marcações para o mesmo cliente, dia e hora, aparecem numeradas (\"2 de 3\") e com o equipamento e as observações, para se distinguirem." },
      { tipo: "melhoria", texto: "Quando um agendamento está gravado com um ano diferente do atual, o ano aparece em destaque para se confirmar a data." },
    ],
  },
  {
    n: 13,
    versao: "1.8.0",
    data: "2026-10-12",
    titulo: "Versão da app e novidades",
    itens: [
      { tipo: "novo", texto: "A versão da app aparece no canto da barra lateral; ao clicar vê-se a lista de todas as atualizações." },
      { tipo: "novo", texto: "Ao abrir a app aparecem as novidades desde a última visita de cada utilizador." },
      { tipo: "novo", texto: "Aviso \"Nova versão disponível\" com botão para atualizar, sem ser preciso Ctrl+F5." },
    ],
  },
  {
    n: 12,
    versao: "1.7.1",
    data: "2026-10-12",
    titulo: "Imagens das peças no PDF dos orçamentos",
    itens: [
      { tipo: "correcao", texto: "Peças com imagem na Biblioteca apareciam como \"N/A\" no PDF do orçamento de peças. Corrigido para as imagens guardadas na app." },
      { tipo: "melhoria", texto: "O PDF usa sempre a imagem atual da peça, incluindo fotos trocadas em \"Editar Peça\"." },
    ],
  },
  {
    n: 11,
    versao: "1.7.0",
    data: "2026-10-12",
    titulo: "Confirmar se o trabalho foi realizado",
    itens: [
      { tipo: "novo", texto: "Depois da hora de um agendamento, a Agenda e a Dashboard perguntam se o trabalho foi realizado ou não." },
      { tipo: "novo", texto: "Novo estado \"Não realizado\" nos agendamentos." },
      { tipo: "melhoria", texto: "A Agenda deixou de marcar sozinha como terminados os agendamentos de dias passados." },
    ],
  },
  {
    n: 10,
    versao: "1.6.1",
    data: "2026-10-12",
    titulo: "Diárias dentro da Ordem de Serviço",
    itens: [
      { tipo: "novo", texto: "Cartão \"Diárias\" em cada Ordem de Serviço: ligar/desligar, valor por diária e nº de diárias (automático ou escrito à mão)." },
      { tipo: "novo", texto: "Opção \"Mostrar no PDF\": as diárias podem ficar só como registo interno." },
    ],
  },
  {
    n: 9,
    versao: "1.6.0",
    data: "2026-10-12",
    titulo: "Agenda, abas e diárias no fechamento",
    itens: [
      { tipo: "correcao", texto: "Agenda: as marcações apareciam um dia depois do dia marcado (e os cliques no calendário gravavam o dia anterior). Corrigido." },
      { tipo: "novo", texto: "Agenda: ao clicar num dia já se podem marcar vários dias seguidos, com ou sem fins de semana." },
      { tipo: "melhoria", texto: "Abas: as Ordens de Serviço abertas já não se acumulam — a aba fecha ao sair da página." },
      { tipo: "novo", texto: "Fechar Ordem: opção de cobrar diárias (dias no cliente, incluindo fins de semana)." },
    ],
  },
  {
    n: 8,
    versao: "1.5.0",
    data: "2026-09-29",
    titulo: "Gestão de acessos na própria app",
    itens: [
      { tipo: "novo", texto: "Qualquer Administrador pode dar e retirar acesso a utilizadores, sem mexer no código." },
      { tipo: "novo", texto: "Convites com função: quem entra com Google fica logo com a função escolhida." },
      { tipo: "novo", texto: "Lista de convites pendentes em Gerir Utilizadores." },
    ],
  },
  {
    n: 7,
    versao: "1.4.2",
    data: "2026-09-29",
    titulo: "Biblioteca de Peças mais clara",
    itens: [
      { tipo: "melhoria", texto: "Botões \"Todas / Com categoria / Sem categoria\" em destaque, com contagens." },
      { tipo: "melhoria", texto: "O zoom da imagem só acontece em peças que têm imagem." },
      { tipo: "melhoria", texto: "Stock: botões + e − com cores mais suaves." },
    ],
  },
  {
    n: 6,
    versao: "1.4.1",
    data: "2026-09-28",
    titulo: "Stock com categoria e fotografia",
    itens: [
      { tipo: "novo", texto: "Artigos de stock com categoria/subcategoria e foto própria (tirada ou carregada)." },
      { tipo: "novo", texto: "Filtro por categoria no Stock Interno." },
    ],
  },
  {
    n: 5,
    versao: "1.4.0",
    data: "2026-09-28",
    titulo: "Grupos de serviços e de clientes",
    itens: [
      { tipo: "novo", texto: "Cadastro de Serviços organizado por grupos." },
      { tipo: "novo", texto: "Clientes podem pertencer a um ou vários grupos, com filtro na lista." },
      { tipo: "novo", texto: "Novo utilizador com \"Entra com Google (sem senha)\"." },
    ],
  },
  {
    n: 4,
    versao: "1.3.0",
    data: "2026-09-28",
    titulo: "Stock Interno de Peças",
    itens: [
      { tipo: "novo", texto: "Novo módulo de stock: entradas, saídas, acerto de inventário, stock mínimo, prateleira e histórico de movimentos." },
    ],
  },
  {
    n: 3,
    versao: "1.2.0",
    data: "2026-09-28",
    titulo: "Biblioteca de Peças e importação de contactos",
    itens: [
      { tipo: "novo", texto: "Pesquisar só peças com categoria ou só sem categoria." },
      { tipo: "melhoria", texto: "Imagens das peças maiores, com zoom ao passar o rato." },
      { tipo: "novo", texto: "Importar contactos do telemóvel, Google ou Excel como clientes." },
    ],
  },
  {
    n: 2,
    versao: "1.1.1",
    data: "2026-09-28",
    titulo: "App mais leve",
    interna: true,
    itens: [
      { tipo: "melhoria", texto: "Categorias e classificação das peças guardadas de forma compacta: a loja e a biblioteca gastam muito menos leituras da base de dados." },
    ],
  },
  {
    n: 1,
    versao: "1.1.0",
    data: "2026-09-28",
    titulo: "Catálogo único de peças",
    itens: [
      { tipo: "novo", texto: "Catálogo único com 21 mil peças, nomes em inglês e imagens guardadas na app." },
      { tipo: "novo", texto: "Editar nome, descrição e imagem de uma peça." },
      { tipo: "novo", texto: "Importar categorias e subcategorias do backup." },
    ],
  },
];

export const LATEST = CHANGELOG[0];

export const TIPO_META = {
  novo: { label: "Novo", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  melhoria: { label: "Melhoria", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  correcao: { label: "Correção", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};
