# Cards de aprendizado

## Diagnóstico e direção

Os 194 módulos dos três protocolos chegavam a um renderizador de texto único. A jornada já tinha revisão e persistência, mas o miolo repetia a composição de uma página de leitura.

A mudança usa o conteúdo existente para escolher uma interação. Mantém a ordem, todas as ressalvas e os links das fontes. Não muda os documentos canônicos nem os JSON gerados.

Referências: `fluor-landing/src/sections/Semanas.jsx` (sequência e escala), `Leva.jsx` (exploração de itens) e o mestre visual da base. Preto `#09090b`, superfície `#121215`, superfície elevada `#1b1b20`, osso `#ededf0`, prata `#8e8e9a`, sempre pelos tokens existentes. Big Shoulders organiza títulos; IBM Plex Sans explica. Conteúdo alinhado à esquerda. Os temas Sigilo e Cartaz usam a mesma estrutura.

## Formatos

| Conteúdo | Experiência |
| --- | --- |
| Avisos e sinais de parada | Dossiê aberto, assuntos separados, condições em grade, sem coleta de dados de saúde |
| Mitos | Afirmação original e revelação voluntária da explicação completa |
| Tabelas | Seletor de linhas com fichas detalhadas e comparação integral disponível |
| Passos e fases | Sequência navegável com posição e conteúdos originais |
| Narrativas | Cenas com composição editorial e leitura por trechos |
| Conceitos | Painéis curtos, navegação por trechos e mapas visuais nos conceitos selecionados |
| Prática | Missões numeradas, estado explícito e contador de ações feitas |
| Revisão | Desafio de fechamento com alternativas identificadas e retorno já existente |

Alternativas avaliadas: uma camada apenas decorativa manteria o problema; transformar tudo em quiz inventaria perguntas e reduziria nuances. A família de formatos conserva a essência e cria variedade de interação. Conteúdo integral fica a um toque. Explorar um trecho não conta como compreender nem como executar uma ação.

## Plano de implementação

- [x] Criar `src/conteudo/experiencias.js`: classificação, divisão sem perda de conteúdo e parsing de tabelas.
- [x] Criar `src/componentes/CardAprendizado.jsx` e `MapaConceito.jsx`: formatos compartilhados por Sessão e Kit, estado local reiniciado por módulo.
- [x] Integrar Sessão e Kit; realçar prática e revisão sem alterar persistência nem regras de desbloqueio.
- [x] Criar `src/styles/aprendizagem.css`: composição responsiva, foco, temas, alvos de 48px e movimento reduzido.
- [x] Verificar integridade dos 194 módulos, fluxo no navegador, todos os formatos em 320/390/768/1440px, temas e operação offline. Inspecionar capturas.

## Limites

Avisos de saúde ficam abertos por inteiro. A interface não oferece triagem, diagnóstico ou liberação. Interações de exploração são locais à visita; conclusão de atividade, ações e revisão continuam usando o repositório existente. Fontes continuam em lista pesquisável com âncoras. Nenhuma dependência de runtime foi adicionada.

## Cobertura implementada

- 5 módulos de cuidados com todo o conteúdo aberto.
- 56 módulos com tabelas exploráveis.
- 74 módulos de conceitos em trechos.
- 8 sequências e checklists; 7 narrativas em cenas.
- 10 mitos com explicação revelável.
- 24 atividades práticas com estados persistidos e progresso de ações.
- 10 módulos de consulta preservam listas de fontes e navegação.
- Diagramas e pequenos desafios próprios em três conceitos: gatilho, três andares e prato ajustado.

## Desafios do módulo (15/09/2026)

A jornada seguia repetitiva: todo módulo terminava em "Entendi, continuar". Agora cada módulo de leitura fecha num desafio gerado do próprio texto por `src/conteudo/desafios.js` e jogado em `src/componentes/Desafio.jsx`.

| Jogo | Fonte no texto |
| --- | --- |
| Complete a ideia | termo em negrito, ou a palavra mais longa, some da frase |
| Crave o número | número com unidade some da frase |
| Detector de troca | frases do módulo, algumas com um termo trocado por outro da sessão |
| Ponha em ordem | lista numerada de 3 a 6 itens |
| Remonte a frase | uma frase do módulo em 3 ou 4 blocos |
| Ligue os pares | as 4 primeiras linhas de uma tabela, primeira coluna com a seguinte |

Regras: nunca o mesmo jogo do módulo anterior; entre os possíveis vence o menos usado na sessão. Cuidados, fontes e missões não viram jogo. Marcas: 3 de primeira, 2 com um erro, 1 depois; guarda a melhor partida em `dominio`, jogar de novo não tira marca e marca não bloqueia conclusão. Nos mitos, a explicação abre com a aposta do leitor. Cobertura: 152 de 155 módulos de leitura.

## Pente fino (15/09/2026)

Correções do pente fino de design e experiência, validadas contra o canon da base.

- **Leitura.** A capa decorativa ("Monte a ideia."), a faixa de termos rolando e a moldura saíram: o módulo começa no texto. Nenhum parágrafo fica apagado esperando a rolagem. No celular a régua grudada sai e cada parte mantém o rótulo. A unidade de leitura é sempre "parte".
- **Vocabulário.** Protocolo, sessão, atividade e parte, como no conteúdo gerado ("00 Abertura"). "Etapa" e "módulo" deixaram a interface. A aba do protocolo 01 é Hipertrofia, não Treino.
- **Diagramas.** A pergunta vem antes das peças, que abrem com qualquer resposta. Tabela de diagramação (colunas Esquerda e Direita) vira lista, sem virar "itens para explorar" nem par de desafio.
- **Desafios.** Lacuna e detector de troca só usam termos em negrito, na resposta e nas alternativas: palavra comum trocada por outra podia continuar verdadeira.
- **Revisão.** Escolher não é responder: a resposta conta depois de "Conferir resposta". A ordem das opções é embaralhada por sessão, e a abertura pergunta pelo conteúdo, não pelo app.
- **Acento.** Um por tela (mestre visual, RNF-I07): no card, só o fio do desafio. Marcas, selo, régua, vaga e placar passaram ao osso. Nada pisca em laço.
- **Composição.** O justificado ficou só no texto corrido do protocolo (D-7, RF-P10), com hifenização de no mínimo 3 letras de cada lado; interface, tabela e lista de referências seguem à esquerda. Texto de apoio subiu de 13 para 14px, e nenhum rótulo fica abaixo de 12px.

## Ferramental

`AGENTS.md` aponta para o `CLAUDE.md` canônico. Foram instaladas as skills `frontend-design` (anthropics/skills), `playwright` e `screenshot` (openai/skills). O plugin Product Design foi oferecido pela interface, mas sua instalação não foi confirmada. Hooks do Claude não foram apresentados como ativos no Codex.

## Verificação

Execute `npm run build`, `npm run verificar` e `node scripts/verificar-aprendizagem.mjs`. As capturas ficam em `test-results/aprendizagem/`. A verificação específica cobre integridade do texto, montagem de todos os módulos da jornada, carregamento após recarga, teclado, acerto e tentativa nos diagramas, comparação de tabelas, persistência de ações, quatro larguras, dois temas, movimento reduzido e recarga offline.
