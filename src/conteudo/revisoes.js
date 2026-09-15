import { embaralhar } from "./desafios.js";

// Revisões do aprendizado, sem prescrever metas de saúde ou avaliar o usuário.
// Cada questão retoma conteúdo dos módulos da sessão indicada. A abertura de cada
// protocolo pergunta pelo que o módulo "como usar" dele diz, e não pelo app.
const treino = [
  ["Como termina cada sessão do protocolo?", ["Com uma prova que exige nota mínima para seguir", "Com o card Faça isto hoje: a menor ação concreta do mesmo dia", "Com uma lista de leituras obrigatórias"], 1, "Se você só fizer o que está nesses cards, o protocolo já está funcionando."],
  ["O que anotar para comparar suas próximas sessões?", ["Só se o treino cansou", "Peso usado e repetições de cada série", "A carga de outra pessoa"], 1, "O registro do próprio treino permite comparar as próximas sessões."],
  ["O que permite comparar sua evolução?", ["Trocar todos os exercícios", "Usar a dor como placar", "Repetir exercícios e registrar os números"], 2, "A comparação começa com exercícios fixos e números registrados."],
  ["Quando mudar a fase do programa?", ["Nas transições e condições previstas no programa", "Sempre que surgir um treino novo no feed", "A cada sessão"], 0, "Consulte as fases e as condições do programa antes de mudar."],
  ["Onde consultar a execução de um exercício?", ["Somente depois de concluir toda a trilha", "Nos guias do Kit, inclusive durante o treino", "Apenas nas fontes bibliográficas"], 1, "Os guias de execução ficam acessíveis pelo Kit."],
  ["O que orienta a próxima carga?", ["A carga de outra pessoa", "Só a vontade de aumentar", "Os registros e a regra de progressão do protocolo"], 2, "A regra usa repetições e qualidade da execução registradas."],
  ["Com quem comparar seus registros?", ["Com seu próprio histórico", "Com o mais forte da academia", "Com qualquer vídeo recente"], 0, "Seu histórico é a referência do caderno de vitórias."],
  ["Depois de uma pausa, qual é o próximo passo?", ["Apagar os registros", "Consultar as regras de retorno e planejar a volta", "Compensar tudo de uma vez"], 1, "A pausa não apaga o histórico. O Kit mantém as regras de retorno disponíveis."],
  ["O que ajuda a sustentar o processo?", ["Esperar motivação perfeita", "Recomeçar do zero toda segunda", "Uma rotina possível e registros do que aconteceu"], 2, "Planeje um próximo passo que caiba na sua rotina."],
  ["O que continua disponível ao terminar?", ["O Kit, os registros e a revisão das sessões", "Somente a tela final", "Apenas o primeiro treino"], 0, "A trilha termina; suas ferramentas continuam disponíveis."],
];
const dieta = [
  ["Como termina cada sessão do protocolo?", ["Com uma prova que exige nota mínima para seguir", "Com uma lista de alimentos proibidos", "Com o card Faça isto hoje: a menor ação alimentar concreta do mesmo dia"], 2, "Só de seguir os cards, o protocolo já está rodando."],
  ["Como começar a registrar a alimentação no app?", ["Registrar os blocos da refeição", "Inventar valores para preencher o painel", "Comparar seu prato com o de outra pessoa"], 0, "Registre o que aconteceu usando o método de blocos do protocolo."],
  ["Como o protocolo organiza o aprendizado?", ["Começando por suplementos", "Priorizando o básico da alimentação", "Mudando todas as refeições a cada dia"], 1, "A hierarquia do protocolo coloca o básico antes dos detalhes."],
  ["De onde deve vir sua meta de blocos?", ["De um número aleatório", "Da meta de outro usuário", "Da tabela do protocolo e da sua confirmação"], 2, "Consulte a tabela antes de confirmar a meta. O dashboard não inventa um valor."],
  ["Como adaptar o prato da casa?", ["Negociar mudanças possíveis com quem cozinha", "Exigir um cardápio totalmente separado", "Esperar condições perfeitas"], 0, "O plano precisa caber no prato e na rotina da casa."],
  ["O que considerar ao escolher refeições?", ["Só a foto do prato", "A rotina, as opções do protocolo e o orçamento", "O suplemento mais caro"], 1, "As escolhas precisam funcionar na rotina real."],
  ["Como consultar a orientação sobre suplementos?", ["Pela popularidade no feed", "Pelo preço mais alto", "Pelo conteúdo e pelas ressalvas do protocolo"], 2, "As fontes e ressalvas continuam acessíveis no Kit."],
  ["Depois de um sábado diferente, o que fazer?", ["Retomar usando as regras do protocolo", "Apagar os dias anteriores", "Considerar o programa perdido"], 0, "O histórico continua; planeje a retomada."],
  ["Como acompanhar o processo?", ["Comparando seu prato com terceiros", "Registrando sua rotina e revendo suas escolhas", "Esperando um dia perfeito"], 1, "Use seus registros para rever escolhas possíveis."],
  treino[9],
];
const sono = [
  ["Como termina cada sessão do protocolo?", ["Com o card Faça isto hoje à noite: a menor ação concreta", "Com um horário fixo obrigatório para dormir", "Com uma prova que exige nota mínima para seguir"], 0, "Toda sessão termina com o card Faça isto hoje à noite: a menor ação concreta."],
  ["O que registrar sobre a sua noite?", ["Apenas uma nota inventada", "A rotina de outra pessoa", "Os horários reais e como você acordou"], 2, "O diário usa seus horários e sua percepção ao acordar."],
  ["Onde conferir as referências do protocolo?", ["No Kit, com as fontes disponíveis offline", "Somente depois de concluir tudo", "Nos registros de outro usuário"], 0, "As fontes podem ser consultadas a qualquer momento."],
  ["Como o plano de sono introduz mudanças?", ["Todas de uma vez", "Por etapas previstas no protocolo", "Uma rotina diferente toda noite"], 1, "O plano organiza mudanças por etapas."],
  ["O que o procedimento de descida organiza?", ["Uma obrigação de parar de jogar para sempre", "Um placar de produtividade", "A transição da atividade da noite para a cama"], 2, "Planeje a transição com as ações do protocolo."],
  ["Como escolher o hábito a observar?", ["Usando seu diário e as orientações do protocolo", "Mudando tudo sem observar", "Comparando com uma rotina de influencer"], 0, "O diário ajuda a reconhecer o que aconteceu na sua noite."],
  ["Como o protocolo trata o fim de semana?", ["Como motivo para zerar tudo", "Como uma exceção a planejar", "Como uma semana independente sem retorno"], 1, "O fim de semana entra no planejamento."],
  ["Deitar às 23h e levantar às 7h informa diretamente o quê?", ["Oito horas efetivamente dormidas", "Uma nota clínica de sono", "Oito horas na cama"], 2, "Tempo na cama não mede sozinho o tempo efetivamente dormido."],
  ["Qual comparação faz sentido no diário?", ["Sua rotina atual com suas próprias semanas", "Sua noite com a de um influencer", "Só a noite mais perfeita"], 0, "A comparação é com seu próprio histórico."],
  treino[9],
];
/** A ordem das opções é embaralhada por sessão, sempre igual: a certa não segue um rodízio de posição. */
export function revisao(pilar, numero) {
  const [pergunta, opcoes, correta, retorno] = ({ hipertrofia: treino, dieta, sono })[pilar][numero];
  const ordem = embaralhar(opcoes.map((_, i) => i), "revisao:" + pilar + ":" + numero);
  return { pergunta, opcoes: ordem.map((i) => opcoes[i]), correta: ordem.indexOf(correta), retorno };
}
