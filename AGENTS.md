# Instruções para o Codex

Leia `../projetos/CLAUDE.md` como arquivo de instruções deste projeto. Ele é a fonte normativa pedida pelo usuário; não mantenha uma cópia aqui. O nome encontrado em disco é `CLAUDE.md`.

Leia também `../projetos/OPERATION.md` para o contexto do ferramental. Skills portáveis podem ser lidas pelo Codex; hooks e comandos exclusivos do Claude não se tornam ativos por essa referência. Persona, voz, requisitos e mestre visual da base têm precedência sobre recomendações de skills.

O conteúdo do app é derivado. Não edite `src/conteudo/*.json` para corrigir a apresentação; eles são regenerados pelo build. Use componentes e metadados de apresentação. Preserve trabalho existente e dados locais dos usuários.

Após mudanças nos cards, execute `npm run build`, `npm run verificar` e `node scripts/verificar-aprendizagem.mjs`. O último comando gera capturas em `test-results/aprendizagem/`. Registre o encerramento em `../projetos/_checkpoints/` conforme o modelo canônico.
