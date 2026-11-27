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
    n: 36,
    versao: "1.23.1",
    data: "2026-11-27",
    titulo: "Gestores também enviam e-mails",
    itens: [
      { tipo: "melhoria", texto: "Os gestores passam a ter acesso à página “E-mails para Clientes” e podem enviar e-mails aos clientes." },
    ],
  },
  {
    n: 35,
    versao: "1.23.0",
    data: "2026-11-27",
    titulo: "E-mails para clientes",
    itens: [
      { tipo: "novo", texto: "Nova página “E-mails para Clientes” (em Clientes & Fornecedores, só administradores): escrever um aviso, promoção ou máquina à venda, ver como fica, enviar um teste para si e depois enviar a todos os clientes com e-mail — ou só a um grupo." },
      { tipo: "novo", texto: "Já vem preparado o primeiro e-mail: o lançamento do novo website nonatoservice.pt." },
      { tipo: "novo", texto: "Cada e-mail leva um link para o cliente deixar de receber; quem carregar fica marcado na ficha e não volta a receber." },
      { tipo: "novo", texto: "A ficha do cliente tem agora o campo E-mail e a opção “Não quer receber e-mails de divulgação”. O Importar Contactos também traz os e-mails." },
    ],
  },
  {
    n: 34,
    versao: "1.22.0",
    data: "2026-11-23",
    titulo: "Propostas de orçamento de peças avulsas",
    itens: [
      { tipo: "novo", texto: "No Orçamento de Peças há o botão “Peça fora do catálogo”: nome, marca, referência, fotografia e preço de custo. A margem de lucro aplica-se igual e não aparece ao cliente." },
      { tipo: "novo", texto: "No Pedido de Orçamento Avulso, o botão “Criar proposta para o cliente” abre um Orçamento de Peças já com o cliente, as peças e o nº do pedido — é só pôr os preços que o fornecedor deu." },
      { tipo: "novo", texto: "Com peças fora do catálogo, o PDF chama-se “Proposta de Orçamento de Peças Avulsas” e leva o nº do pedido (POA-…) e a validade de 15 dias." },
      { tipo: "melhoria", texto: "Quando o cliente pagar, a Solicitar fatura → Orçamento de peças usa o mesmo nº da proposta e o valor com margem, portes e IVA." },
    ],
  },
  {
    n: 33,
    versao: "1.21.0",
    data: "2026-11-19",
    titulo: "Pedidos de Orçamento Avulsos",
    itens: [
      { tipo: "novo", texto: "Novo item Pedidos de Orçamento Avulsos no menu Orçamentos & Financeiro: pedidos de orçamento de peças que não são do nosso catálogo." },
      { tipo: "novo", texto: "Escolhe-se o cliente (registado, com os dados preenchidos, ou não registado, com os dados escritos à mão), as peças com nome, marca, referência, quantidade, nota e fotografia, e as observações." },
      { tipo: "novo", texto: "Gera o PDF “Pedido de Orçamento Avulso” no design da app, sem preços. Cada pedido fica guardado com número próprio (POA-…) para abrir, alterar e voltar a gerar." },
    ],
  },
  {
    n: 32,
    versao: "1.20.0",
    data: "2026-11-19",
    titulo: "Pedidos de Fatura no menu, também para clientes não registados",
    itens: [
      { tipo: "novo", texto: "Novo item Pedidos de Fatura no menu Orçamentos & Financeiro, com todos os pedidos de fatura de todos os clientes (gerar de novo, apagar, pesquisar)." },
      { tipo: "novo", texto: "Botão “Novo pedido de fatura”: escolhe-se um cliente registado ou “Cliente não registado” e escrevem-se os dados à mão. Funciona com os três tipos (avulsa, orçamento de peças e ordem de serviço)." },
      { tipo: "melhoria", texto: "Os pedidos feitos nos Detalhes do Cliente continuam lá e aparecem também na lista geral." },
    ],
  },
  {
    n: 31,
    versao: "1.19.2",
    data: "2026-11-19",
    titulo: "Margem de lucro no PDF do orçamento de peças",
    itens: [
      { tipo: "correcao", texto: "O PDF do orçamento de peças passa a contar a margem de lucro: os preços unitários, subtotais e totais já saem com a margem, sem a mostrar ao cliente — igual às contas do ecrã." },
      { tipo: "melhoria", texto: "Nos orçamentos de peças, os campos Portes, Margem de lucro e Preço unitário já não vêm com \"0\" escrito — ficam vazios, é só escrever." },
    ],
  },
  {
    n: 30,
    versao: "1.19.1",
    data: "2026-11-19",
    titulo: "Portes nos orçamentos de peças",
    itens: [
      { tipo: "melhoria", texto: "Nos orçamentos de peças o antigo \"Preço do Envio\" passa a chamar-se Portes, com um campo opcional para o tipo de portes (ex.: CTT Expresso). Também nas ordens de serviço e nos PDFs." },
      { tipo: "correcao", texto: "O total no detalhe do orçamento de peças passa a incluir os portes, a margem e o IVA (antes mostrava só as peças)." },
      { tipo: "correcao", texto: "Ao solicitar a fatura de um orçamento de peças, o valor já inclui os portes e o IVA do orçamento." },
    ],
  },
  {
    n: 29,
    versao: "1.19.0",
    data: "2026-11-19",
    titulo: "Criar peças novas na Biblioteca de Peças",
    itens: [
      { tipo: "novo", texto: "Botão \"Nova peça\" na Biblioteca de Peças: código, nome, descrição, códigos relacionados e imagem (fotografia ou endereço). O código tem de ser único." },
      { tipo: "novo", texto: "As peças novas ficam guardadas na base de dados da app (não no catálogo HOMAG) e aparecem em todo o lado: biblioteca, pesquisa nos orçamentos, ordens e documentos, PDFs e loja." },
      { tipo: "melhoria", texto: "As peças criadas na app têm a etiqueta \"Criada na app\", podem ser editadas e ter categoria como as outras, e podem ser apagadas no detalhe da peça." },
    ],
  },
  {
    n: 28,
    versao: "1.18.0",
    data: "2026-11-12",
    titulo: "Novo documento: Peças para Manutenção",
    itens: [
      { tipo: "novo", texto: "Em Peças & Armazém → Peças para Manutenção cria-se a lista de peças necessárias para a manutenção de um equipamento: cliente, equipamento (do cliente, do Armazém ou escrito à mão), assunto e observações." },
      { tipo: "novo", texto: "As peças escolhem-se do catálogo pelo código ou nome (com imagem) ou escrevem-se à mão se não estiverem no catálogo; cada uma tem quantidade e nota." },
      { tipo: "novo", texto: "Gera um PDF com o design da app — imagem, nome, código, quantidade e nota de cada peça, sem preços. Cada documento fica guardado com número próprio (PM-…) para abrir, alterar e voltar a gerar." },
    ],
  },
  {
    n: 27,
    versao: "1.17.0",
    data: "2026-11-03",
    titulo: "Pedidos de fatura guardados no cliente e equipamentos da OS",
    itens: [
      { tipo: "novo", texto: "Cada pedido de fatura gerado fica guardado no cliente (separador Documentos → Pedidos de fatura), com um botão para gerar o mesmo PDF outra vez. Guardam-se só os dados, não o PDF." },
      { tipo: "novo", texto: "Se o orçamento de peças ou a ordem de serviço de um pedido tiver sido apagado, ao tentar gerá-lo aparece um aviso e o pedido é removido do histórico." },
      { tipo: "novo", texto: "No pedido de fatura de uma ordem de serviço, o PDF mostra o(s) equipamento(s) dessa OS, com nome e número." },
      { tipo: "melhoria", texto: "Orçamento de peças: se o cliente não tiver nenhum orçamento ligado, a lista mostra todos os orçamentos de peças." },
    ],
  },
  {
    n: 26,
    versao: "1.16.0",
    data: "2026-11-03",
    titulo: "Solicitar fatura: avulsa, orçamento de peças ou ordem de serviço",
    itens: [
      { tipo: "novo", texto: "Ao solicitar a fatura escolhe-se o tipo: Avulsa (serviços por mensagem, documentos por e-mail…), Orçamento de peças ou Ordem de serviço." },
      { tipo: "novo", texto: "Orçamento de peças: o pedido leva o mesmo número do orçamento (ORP-…) e o valor das peças. Aparecem os orçamentos deste cliente e os mais recentes de todos, porque muitos são criados sem cliente ligado." },
      { tipo: "novo", texto: "Ordem de serviço: o pedido leva o número da OS e, se a OS já tiver fechamento, o valor e o IVA vêm de lá." },
      { tipo: "melhoria", texto: "O número aparece no topo do PDF; se o documento não estiver na lista, escreve-se o número à mão." },
    ],
  },
  {
    n: 25,
    versao: "1.15.0",
    data: "2026-11-02",
    titulo: "Relatório Especial com vários clientes e equipamentos",
    itens: [
      { tipo: "novo", texto: "O Relatório Especial deixa de estar preso a um cliente: escolhe-se o cliente principal e adicionam-se equipamentos de qualquer cliente registado ou do Armazém (equipamentos da própria empresa)." },
      { tipo: "novo", texto: "Cada dia de trabalho fica ligado a um equipamento/cliente, com ida, início e fim do trabalho, retorno, km, pausa e descrição. Dois equipamentos no mesmo dia = dois registos com a mesma data." },
      { tipo: "novo", texto: "PDF novo com tabela de horas, totais (trabalho, viagem de ida e retorno, km, diárias), uma secção por cliente/equipamento e o \"Total de tudo\"." },
      { tipo: "novo", texto: "Antes de gerar escolhe-se o que sai na impressão: só horas, horas + clientes e equipamentos, clientes e equipamentos separados ou tudo num só." },
      { tipo: "melhoria", texto: "Botão \"Copiar para o dia seguinte\" e totais em tempo real enquanto se preenchem os dias." },
    ],
  },
  {
    n: 24,
    versao: "1.14.0",
    data: "2026-11-02",
    titulo: "Solicitar fatura a partir do cliente",
    itens: [
      { tipo: "novo", texto: "Nos Detalhes do Cliente (e no menu ⋮ de cada cliente na lista) há o botão Solicitar fatura: escreve-se o valor e sai o PDF do pedido de fatura com os dados do cliente, o texto do pedido e a nota." },
      { tipo: "novo", texto: "Pode acrescentar-se IVA (23% por defeito, a taxa muda-se) — o PDF mostra o valor sem IVA, o IVA e o total numa caixa discreta, à direita." },
      { tipo: "melhoria", texto: "Os dados do cliente vêm preenchidos e podem ser acertados só para esse PDF (ex.: acrescentar o e-mail), sem mexer na ficha." },
    ],
  },
  {
    n: 23,
    versao: "1.13.0",
    data: "2026-10-27",
    titulo: "Clientes nos grupos de Serviços e Valores",
    itens: [
      { tipo: "novo", texto: "O grupo do cliente escolhe-se diretamente nos Detalhes do Cliente (grava logo) ou ao criar um cliente novo — são os mesmos grupos de Serviços e Valores (ex.: HOMAG)." },
      { tipo: "novo", texto: "Nos orçamentos, ao escolher o cliente, o grupo dele fica escolhido sozinho e os valores dos serviços entram já preenchidos — pode sempre trocar à mão." },
      { tipo: "melhoria", texto: "Em Clientes filtra-se por esses grupos. Os grupos de clientes antigos passaram para Serviços e Valores com o mesmo nome, e cada cliente ficou no grupo correspondente." },
    ],
  },
  {
    n: 22,
    versao: "1.12.1",
    data: "2026-10-27",
    titulo: "Pesquisas, confirmações e ecrãs vazios iguais em toda a app",
    itens: [
      { tipo: "melhoria", texto: "As caixas de pesquisa das listas são todas iguais e têm um botão × para limpar." },
      { tipo: "melhoria", texto: "Apagar no Stock, retirar acessos em Utilizadores e as importações pedem confirmação na janela da app, em vez da caixa simples do browser." },
      { tipo: "melhoria", texto: "Os ecrãs de “a carregar” e de “nada encontrado” têm o mesmo aspeto em todas as páginas." },
      { tipo: "melhoria", texto: "Protocolo, Ordem de Preparação e Equipamento do Armazém usam o cabeçalho novo, com o estado ao lado do título e a foto do equipamento." },
    ],
  },
  {
    n: 21,
    versao: "1.12.0",
    data: "2026-10-27",
    titulo: "Grupos de serviços com valores próprios",
    itens: [
      { tipo: "novo", texto: "Em Serviços e Valores › Grupos e valores cria-se um grupo (ex.: HOMAG) e dentro dele adicionam-se os serviços e despesas com o valor desse grupo — hora, dia, km, despesa ou valor base." },
      { tipo: "novo", texto: "Os serviços criados num grupo ficam no catálogo e podem ser reaproveitados noutros grupos com outro valor; ao adicionar, mostra os valores que já têm nos outros grupos." },
      { tipo: "novo", texto: "Botão Duplicar para criar um grupo novo a partir de outro, com os mesmos serviços e valores, e depois só acertar o que muda." },
      { tipo: "melhoria", texto: "Nos orçamentos escolhe-se o grupo de preços e o valor do serviço aparece já preenchido (pode ser alterado). A app lembra-se do último grupo usado." },
      { tipo: "melhoria", texto: "Os serviços que já tinham grupo passam automaticamente para esse grupo, ainda sem valor." },
    ],
  },
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
