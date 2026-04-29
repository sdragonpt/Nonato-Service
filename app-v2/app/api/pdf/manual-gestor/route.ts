import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual do Gestor - Nonato Service</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.5; font-size: 11pt; }
    .pdf-header { background: linear-gradient(135deg, #000 0%, #1a2a1a 50%, #0d1a0d 100%); border-bottom: 3px solid #00ff00; padding: 16px 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,255,0,0.15); }
    .pdf-header h1 { margin: 0; font-size: 22pt; font-weight: 700; color: #00ff00; letter-spacing: 2px; text-shadow: 0 0 20px rgba(0,255,0,0.3); }
    .pdf-header .subtitle { margin: 6px 0 0 0; font-size: 12pt; color: rgba(255,255,255,0.9); letter-spacing: 1px; }
    .pdf-footer { text-align: center; font-size: 7pt; color: #666; padding: 6px 16px; border-top: 1px solid #ddd; }
    .pdf-content { padding: 24px 32px 32px; max-width: 210mm; margin: 0 auto; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .pdf-header { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; padding: 10px 20px; } .pdf-header h1 { font-size: 16pt; } .pdf-header .subtitle { font-size: 9pt; } .pdf-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; font-size: 6pt; padding: 4px; } .pdf-content { padding-top: 90px; padding-bottom: 28px; } .page-break { page-break-before: always; } .no-break { page-break-inside: avoid; } }
    h2 { color: #00aa00; font-size: 14pt; margin: 28px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid rgba(0,255,0,0.4); }
    h3 { font-size: 12pt; margin: 20px 0 8px 0; color: #1a5a1a; }
    h4 { font-size: 11pt; margin: 14px 0 6px 0; color: #2a4a2a; }
    p { margin: 0 0 10px 0; text-align: justify; }
    ul, ol { margin: 8px 0 12px 20px; }
    li { margin-bottom: 4px; }
    .figura { margin: 16px 0; border: 2px dashed #00ff00; background: #f5f5f5; min-height: 80px; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 20px; border-radius: 8px; }
    .figura .caption { font-size: 9pt; color: #555; margin-top: 10px; font-style: italic; }
    .figura .placeholder { font-size: 10pt; color: #888; }
    .passo { background: #f9fff9; border-left: 4px solid #00ff00; padding: 12px 16px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .passo strong { color: #006600; }
    .indice { background: #f0f8f0; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .indice ul { list-style: none; margin-left: 0; }
    .indice li { margin: 6px 0; padding-left: 0; }
    .indice a { color: #006600; text-decoration: none; }
    .aviso { background: #fff8e6; border: 1px solid #e6c200; padding: 10px 14px; border-radius: 6px; margin: 10px 0; font-size: 10pt; }
    .dica { background: #e6f7ff; border-left: 4px solid #0099cc; padding: 10px 14px; margin: 10px 0; border-radius: 0 6px 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #e8f5e8; color: #1a5a1a; font-weight: 600; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 10pt; }
    .campo { font-weight: 600; color: #1a5a1a; }
  </style>
</head>
<body>
  <header class="pdf-header">
    <h1>MANUAL DO GESTOR</h1>
    <p class="subtitle">Gestão Técnica Nonato Service — Manual completo e detalhado</p>
  </header>

  <div class="pdf-content">
    <h2 id="indice">1. Índice</h2>
    <div class="indice no-break">
      <ul>
        <li>1. Índice</li>
        <li>2. Introdução</li>
        <li>3. Acesso ao sistema (login)</li>
        <li>4. Barra lateral e navegação</li>
        <li>5. Gestão Técnica</li>
        <li>5.1. Cadastro de Gestores e Técnicos</li>
        <li>5.2. Cadastro de Clientes</li>
        <li>5.3. Fornecedores</li>
        <li>5.4. Relatório de Serviço</li>
        <li>5.5. Biblioteca de Peças</li>
        <li>5.6. Agenda Técnica</li>
        <li>6. Gestão Industrial</li>
        <li>6.1. Equipamentos no Armazém</li>
        <li>6.2. Famílias e Grupos</li>
        <li>6.3. Desmontados</li>
        <li>6.4. Manuais e Informações Técnicas</li>
        <li>7. Gestão de Custos</li>
        <li>7.1. Cadastro de Serviços</li>
        <li>7.2. Orçamentos Avulso</li>
        <li>7.3. Mapa Visual de Separação</li>
        <li>8. Checklists e Manutenção</li>
        <li>8.1. Pré-Checklist</li>
        <li>8.2. Checklist</li>
        <li>8.3. Gestão de Grupos para Checklist</li>
        <li>8.4. Ordem de Preparação</li>
        <li>8.5. Verificação Final Entrega</li>
        <li>9. Comunicação interna</li>
        <li>10. Administrador e configurações</li>
        <li>11. Scripts e servidor</li>
        <li>12. Solução de problemas</li>
      </ul>
    </div>

    <h2 id="intro">2. Introdução</h2>
    <p>Este manual descreve o uso <strong>completo e detalhado</strong> do sistema <strong>Gestão Técnica Nonato Service</strong>. O sistema é uma solução integrada para gestão de serviços técnicos, manutenção, equipamentos, clientes, fornecedores, relatórios, checklists, comunicação interna e orçamentos.</p>
    <p><strong>Pré-requisitos:</strong> Navegador atualizado (Chrome, Edge ou Firefox recomendados). O servidor deve estar em execução em <code>http://localhost:3000</code>.</p>
    <p><strong>Idiomas:</strong> O sistema está disponível em Português (PT-BR), Espanhol, Francês, Italiano, Alemão e Inglês. O idioma é alterado em Extras → Configurações gerais → Selecionar idioma.</p>
    <p><strong>Armazenamento:</strong> Os dados são guardados localmente no navegador (localStorage) e, opcionalmente, podem ser sincronizados com o servidor. O backup do código é automático diariamente.</p>

    <h2 id="login">3. Acesso ao sistema (login)</h2>
    <h3>3.1. Primeiro acesso</h3>
    <div class="passo"><strong>Passo 1.</strong> Abra o navegador e aceda a <code>http://localhost:3000</code>.</div>
    <div class="passo"><strong>Passo 2.</strong> Na tela inicial, clique em <strong>«Acessar Sistema»</strong>.</div>
    <div class="passo"><strong>Passo 3.</strong> Se não existir nenhum utilizador cadastrado, use uma senha do Gestor de Senhas do Windows. Em seguida, no Administrador, cadastre os utilizadores.</div>
    <div class="passo"><strong>Passo 4.</strong> Introduza o e-mail ou nome de utilizador e a senha. Se o login estiver configurado apenas com senha, deixe o campo de utilizador em branco.</div>
    <div class="passo"><strong>Passo 5.</strong> Clique em <strong>«Entrar»</strong>. Será redirecionado para o dashboard com a barra lateral.</div>
    <div class="aviso no-break"><strong>Importante:</strong> As permissões (gestores, equipamentos, clientes, fornecedores, relatório de serviço, biblioteca de peças, agenda, desmontados, cadastro de serviços, extras) são definidas no Administrador por utilizador.</div>

    <h2 id="sidebar">4. Barra lateral e navegação</h2>
    <p>A barra lateral à esquerda contém todos os módulos, agrupados por área:</p>
    <table class="no-break">
      <thead><tr><th>Grupo</th><th>Módulos</th></tr></thead>
      <tbody>
        <tr><td>GESTÃO TÉCNICA</td><td>Gestores, Clientes, Fornecedores, Relatório de Serviço, Biblioteca de Peças, Agenda, Estado Visual do Técnico, Conhecimento dos Técnicos</td></tr>
        <tr><td>GESTÃO INDUSTRIAL</td><td>Famílias e Grupos (Checklist e Equipamentos), Equipamentos no Armazém, Desmontados</td></tr>
        <tr><td>GESTÃO DE CUSTOS</td><td>Cadastro de Serviços, Orçamentos Avulso, Mapa Visual de Separação</td></tr>
        <tr><td>CHECKLIST</td><td>Pré-Checklist, Checklist, Gestão de Grupos, Ordem de Preparação, Formulários para Técnicos, Verificação Final Entrega</td></tr>
        <tr><td>COMUNICAÇÃO</td><td>Mensagens Internas, Alerta de Mensagens, Mensagens Técnicos</td></tr>
        <tr><td>GESTÃO FINANCEIRA</td><td>Clientes / Financeiro, orçamentos</td></tr>
        <tr><td>EXTRAS</td><td>Idioma, Tradutor, Manual do Gestor, Administrador</td></tr>
      </tbody>
    </table>
    <p>Clique num grupo para expandir ou recolher. Clique num botão para abrir o módulo numa nova aba no centro do ecrã. Pode reorganizar os botões no Organizador de Botões (Administrador).</p>

    <h2 id="gestao-tecnica">5. Gestão Técnica</h2>

    <h3 id="gestores">5.1. Cadastro de Gestores e Técnicos</h3>
    <p><strong>Gestores:</strong> Cadastro de gestores técnicos internos e externos. Campos: nome, e-mail, telefone, endereço, área (Assistência Técnica, Industrial, Armazém). Pode adicionar foto. Pode gerir tipos de gestores (nome, cor, ícone, ordem).</p>
    <div class="passo"><strong>Adicionar gestor:</strong> Expandir GESTÃO TÉCNICA → Cadastro de Gestores → Aba Gestores → Adicionar Gestor → preencher campos → Salvar.</div>
    <p><strong>Técnicos:</strong> Cadastro de técnicos internos, externos e de armazém. Campos: nome, e-mail, telefone, endereço, tipo (interno/externo/armazém), foto. Pode configurar <strong>conhecimento por tipo de equipamento</strong> (mecânico, elétrico, software, programação) com níveis 0 a 4 e descrições por área.</p>
    <div class="passo"><strong>Informações de conhecimento:</strong> Use o módulo «Informações de Conhecimento dos Técnicos» para associar cada técnico aos tipos de equipamento e definir níveis de conhecimento (0=nenhum, 1=básico, 2=médio, 3=avançado, 4=especialista).</div>

    <h3 id="clientes">5.2. Cadastro de Clientes</h3>
    <p>Cadastro completo de clientes com: nome da empresa, morada, conselho, país, código postal, freguesia, número de contribuinte fiscal, telefones, e-mail, contacto, foto. Opção de Cliente Prioritário (ex.: NONATO SERVICE) e status devedor.</p>
    <div class="passo"><strong>Adicionar cliente:</strong> Cadastro de Clientes → Adicionar Cliente → preencher todos os campos → Salvar. Pode associar equipamentos e consultar relatórios de serviço a partir do perfil do cliente. O botão de mapa abre a localização no Google Maps.</div>

    <h3 id="fornecedores">5.3. Fornecedores</h3>
    <p>Cadastro de fornecedores com os mesmos campos de cliente mais IBAN. Gestão de faturas: número, mês, valor, cliente associado, data de vencimento, status. As faturas podem ser associadas a clientes e fornecedores.</p>
    <div class="passo"><strong>Fluxo:</strong> Fornecedores → Adicionar Fornecedor → preencher dados (incluindo IBAN) → Salvar. Depois pode adicionar faturas ao fornecedor e gerir faturas a pagar.</div>

    <h3 id="relatorio">5.4. Relatório de Serviço</h3>
    <p>Relatórios com numeração automática no formato <strong>NÚMERO-MÊS/ANO</strong>. Associação a cliente e equipamento. Campos principais: técnico, cidade, telefone, data, máquina/modelo, número da máquina, tipo de serviço, dias de trabalho, horas de trabalho, KM percorridos, horas de viagem, serviço concluído, retorno necessário, entrega documentação, liberação produção, instrução funcionários, necessidade de troca de peças, observações.</p>
    <p><strong>Dias de trabalho:</strong> Cada dia pode ter ida/volta, KM, pausa. As peças de substituição podem ser buscadas na Biblioteca de Peças, no PDF do equipamento ou inseridas manualmente por código.</p>
    <div class="passo"><strong>Gerar pedido de orçamento:</strong> Ao preencher as peças no relatório, use «Gerar Pedido de Orçamento» para criar um pedido em Gestão de Custos. O pedido aparece com status Pendente e pode ser enviado, recebido, aprovado ou rejeitado.</div>
    <p>Existem modelos de PDF para impressão: clássico e Ferwood.</p>

    <h3 id="biblioteca">5.5. Biblioteca de Peças</h3>
    <p>Cadastro de peças com: código, nome, preço, descrição, categoria, subcategoria, imagem, data de criação. A Biblioteca tem abas: Cadastro, Biblioteca (visualização em grelha ou lista), Gerenciar Categorias, Importação.</p>
    <p><strong>Importação:</strong> Pode importar peças por URL ou colando dados. Defina categorias e subcategorias em Gerenciar Categorias antes de importar em massa.</p>
    <p>As peças são utilizadas em relatórios de serviço, orçamentos e checklists.</p>

    <h3 id="agenda">5.6. Agenda Técnica</h3>
    <p>Calendário com agendamentos e pré-agendamentos por técnico. Tipos: pré-agendamento, agendamento técnico, folga, doente, férias. Status: pendente, confirmado, em andamento, concluído, cancelado.</p>
    <p>Campos: tipo, técnico, cliente, equipamento, data, hora, duração estimada, tipo de serviço, observações técnicas, necessidade de peças, código nota fiscal, peças anexadas, telefone, endereço, cidade.</p>
    <p>Pode marcar dias do técnico como folga, doente ou férias directamente no calendário. Filtre por técnico e por tipo para uma visão organizada.</p>

    <h2 id="gestao-industrial" class="page-break">6. Gestão Industrial</h2>

    <h3 id="equipamentos">6.1. Equipamentos no Armazém</h3>
    <p>Cadastro de equipamentos com: ID, tipo, modelo, marca, número de série, família, grupo, peso, se é uma única peça ou tem várias partes, foto, fotos adicionais, manual PDF, documentos PDF, itens incluídos, histórico.</p>
    <p><strong>Status:</strong> Ativo ou Baixado. Equipamentos baixados permanecem no histórico. Pode associar a famílias e grupos (definidos em Famílias e Grupos para Equipamentos).</p>
    <p><strong>Histórico:</strong> Registe eventos (manutenção, reparo, inspeção, transferência, baixa). Documentos PDF e fotos podem ser anexados. Itens incluídos: lista de peças/acessórios que vêm com o equipamento.</p>
    <p><strong>Busca:</strong> Localize equipamentos por ID ou número de série.</p>

    <h3 id="familias-grupos">6.2. Famílias e Grupos</h3>
    <p>Existem <strong>dois módulos separados</strong>:</p>
    <ul>
      <li><strong>Famílias e Grupos para Checklist</strong> — usados na criação e execução de checklists. Estrutura: Família → Parente (tipo/modelo) → Grupos.</li>
      <li><strong>Famílias e Grupos para Equipamentos</strong> — usados na categorização dos equipamentos no armazém.</li>
    </ul>
    <p>Em cada módulo: adicione famílias à esquerda, selecione uma família e gerencie os grupos à direita. Os grupos têm número, nome e imagem.</p>

    <h3 id="desmontados">6.3. Desmontados</h3>
    <p>Gestão de grupos e peças desmontadas. <strong>Grupos:</strong> número, família, ID fabricante, imagem, localização (rua, número do espaço, número do grupo na prateleira), nome, descrição. <strong>Peças:</strong> número, família, grupo, nome, código, marca, modelo, tipo de equipamento, observações, quantidade, imagens, status funcional (funciona/não funciona/não testado), foi recuperada, foi testada, técnico do teste, descrição do teste, localização.</p>
    <p>Use para inventariar peças retiradas de equipamentos desmontados, com rastreio de localização física no armazém.</p>

    <h3 id="manuais">6.4. Manuais e Informações Técnicas</h3>
    <p>Estrutura hierárquica: Famílias → Grupos → Modelos. Cada modelo pode ter: documentos PDF, imagens, informações técnicas, informações mecânicas, informações elétricas. Associe equipamentos aos modelos via <code>modeloManuaisId</code> para que os técnicos acedam aos manuais ao trabalhar no equipamento.</p>

    <h2 id="gestao-custos" class="page-break">7. Gestão de Custos</h2>

    <h3 id="cadastro-servicos">7.1. Cadastro de Serviços</h3>
    <p>Serviços e despesas com: nome, descrição, valor, tipo de cobrança (unidade, km, hora, valor fixo, diárias, extras), categoria (serviço ou despesa). Usados em orçamentos e precificação de checklists.</p>

    <h3 id="orcamentos">7.2. Orçamentos Avulso</h3>
    <p>Criação de orçamentos por: dados fixos, cliente cadastrado, orçamento-relatório, cliente prioritário. Campos: número, data, validade, descrição, observações. Itens: descrição, quantidade, preço unitário, tipo, IVA. Pode adicionar itens da Biblioteca ou manualmente.</p>
    <p><strong>Documentos PDF gerados:</strong> Confirmação de orçamento, Confirmação de pedido OS, Pedido de separação e envio. Pode enviar por e-mail ou WhatsApp.</p>

    <h3 id="mapa-separacao">7.3. Mapa Visual de Separação</h3>
    <p>Visualização e gestão das peças a separar para ordens. Integrado com pedidos de orçamento e separação.</p>

    <h2 id="checklists" class="page-break">8. Checklists e Manutenção</h2>

    <h3 id="pre-checklist">8.1. Pré-Checklist</h3>
    <p>Preparação prévia à execução do checklist. Busque o equipamento por ID ou número de série, selecione os grupos a incluir e inicie o pré-checklist. Defina data, técnico responsável e observações.</p>

    <h3 id="checklist-exec">8.2. Checklist</h3>
    <p>Execução do checklist de manutenção. <strong>Acesso pode exigir senha</strong> do Gestor de Senhas (configurável). Busque equipamento, selecione grupos, escolha as manutenções e guarde. Os grupos podem ser do tipo: básico, equipamentos aprovados, verificação geral entrega.</p>

    <h3 id="gestao-grupos-checklist">8.3. Gestão de Grupos para Checklist (Criação por Grupos)</h3>
    <p>Estrutura: Famílias → Parentes → Grupos. Cada grupo tem: número, nome, família, parente, tipo, imagem, trabalhos a serem executados. Adicione <strong>manutenções</strong> e <strong>itens de trabalho</strong> (tipo: manutenção ou outro). Para cada item pode definir: necessita peças? Como obter peças? — Biblioteca de Peças, PDF do equipamento, ou código manual. Opções e perguntas podem ser configuradas por grupo.</p>
    <div class="dica no-break"><strong>Dica:</strong> Configure primeiro as Famílias e Parentes em «Famílias e Grupos para Checklist», depois crie os grupos e adicione os serviços em «Gestão de Grupos para Checklist».</div>

    <h3 id="ordem-preparacao">8.4. Ordem de Preparação</h3>
    <p>Gestão de ordens de preparação para técnicos. Defina o que deve ser preparado antes da deslocação.</p>

    <h3 id="verificacao-final">8.5. Verificação Final Antes da Entrega</h3>
    <p>Checklist final antes da entrega do equipamento ao cliente. Garante que todos os pontos críticos foram verificados.</p>

    <h2 id="comunicacao" class="page-break">9. Comunicação interna</h2>
    <p><strong>Mensagens Internas (Gestores):</strong> Envie e receba mensagens entre gestores. Filtre por todas, não lidas ou lidas. O remetente e destinatário podem ser gestores (por área: assistência técnica, industrial, armazém) ou técnicos.</p>
    <p><strong>Mensagens Internas (Técnicos):</strong> Canal de comunicação entre gestores e técnicos. Os técnicos podem enviar mensagens e solicitar peças (tipo <code>solicitacao-pecas</code>) com lista de peças. O gestor pode aceitar, enviar ao armazém (status: pendente → aceite → enviado-armazem).</p>
    <p><strong>Alerta de Mensagens:</strong> Mostra quantas mensagens não lidas existem. Acesse rapidamente as mensagens pendentes.</p>

    <h2 id="administrador" class="page-break">10. Administrador e configurações</h2>
    <p>No botão <strong>ADMINISTRADOR</strong> (ou EXTRAS) na barra lateral:</p>
    <ul>
      <li><strong>Configurações gerais:</strong> idioma do sistema (PT-BR, ES, FR, IT, DE, EN), alteração de logo (imagem ou vídeo MP4).</li>
      <li><strong>Gestão de utilizadores:</strong> adicionar, editar, excluir; definir papel (administrador geral ou utilizador); permissões por módulo (gestores, equipamentos, clientes, fornecedores, relatório de serviço, biblioteca de peças, agenda, desmontados, cadastro de serviços, extras).</li>
      <li><strong>Gestor de Senhas:</strong> senhas dos técnicos e gestores; criar senhas para acesso ao checklist e ao sistema.</li>
      <li><strong>Organizador de botões:</strong> reordenar e agrupar os botões da barra lateral (arrastar e soltar); atribuir cada botão a um grupo (gestão técnica, custos, industrial, checklist, outros).</li>
      <li><strong>Backup do código:</strong> fazer backup manual; listar e restaurar backups anteriores.</li>
      <li><strong>Tradutor:</strong> ferramenta de tradução entre idiomas; biblioteca de termos para manter consistência.</li>
    </ul>
    <p><strong>Contador de relatórios:</strong> O formato de numeração (NÚMERO-MÊS/ANO) pode ser configurado no Administrador.</p>

    <h2 id="scripts" class="page-break">11. Scripts e servidor</h2>
    <p>Na pasta do projeto existem scripts para Windows:</p>
    <table class="no-break">
      <thead><tr><th>Script</th><th>Função</th></tr></thead>
      <tbody>
        <tr><td><strong>start-server.bat</strong></td><td>Iniciar o servidor Next.js (npm run dev)</td></tr>
        <tr><td><strong>stop-server.bat</strong></td><td>Parar o servidor</td></tr>
        <tr><td><strong>restart-server.bat</strong></td><td>Reiniciar o servidor</td></tr>
        <tr><td><strong>restore-code.bat</strong></td><td>Restaurar código a partir de um backup</td></tr>
        <tr><td><strong>list-backups.bat</strong></td><td>Listar backups na pasta backups/</td></tr>
        <tr><td><strong>create-shortcuts.bat</strong></td><td>Criar atalhos na área de trabalho</td></tr>
      </tbody>
    </table>
    <div class="passo"><strong>Iniciar:</strong> Execute <code>start-server.bat</code>. Aguarde «Ready on http://localhost:3000» e abra o navegador.</div>
    <div class="dica no-break"><strong>Dica:</strong> Backup automático diário. Backups manuais no Administrador → Fazer Backup do Código.</div>

    <h2 id="solucao" class="page-break">12. Solução de problemas</h2>
    <ul>
      <li><strong>Servidor não inicia / porta 3000 em uso:</strong> Execute <code>stop-server.bat</code> e depois <code>start-server.bat</code>.</li>
      <li><strong>Alterações não aparecem:</strong> Refresh forçado (Ctrl+Shift+R) ou reinicie o servidor.</li>
      <li><strong>Erro EPERM ao guardar:</strong> Feche o servidor e programas que usem a pasta; execute scripts de resolução de EPERM se existirem.</li>
      <li><strong>Restaurar código:</strong> <code>list-backups.bat</code> para ver backups; <code>restore-code.bat</code> para restaurar (escolha pelo número). O script cria backup do estado atual antes de restaurar.</li>
      <li><strong>Dados perdidos:</strong> Os dados são guardados no localStorage do navegador. Se mudar de navegador ou limpar dados, perde-se o acesso. Use a opção de exportar/importar dados se disponível no Administrador.</li>
    </ul>
  </div>

  <footer class="pdf-footer">
    Manual completo — Criado por Nonato da Nonato Service
  </footer>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
