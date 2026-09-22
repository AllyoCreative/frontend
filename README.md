# Allyo Space — Frontend

MVP navegável da operação criativa Allyo. A aplicação usa React, TypeScript e Vite, com dados inteiramente mockados e rotas carregadas sob demanda.

## Rodar localmente

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run lint
npm run build
npm run preview
```

Na tela de acesso, use **Explorar a versão de demonstração**. Nenhuma credencial é enviada ou armazenada; apenas uma flag local mantém a sessão do protótipo.

## Fluxos disponíveis

- Acesso por e-mail/celular e código de seis dígitos.
- Dashboard com Allyo Brain, indicadores, prioridades e atividades.
- Projetos em grade/lista, busca, filtros e status.
- Detalhe do projeto com visão geral, tarefas, mensagens, designs, arquivos e aprovação.
- Brand Kit com logos, cores, tipografia, arquivos e acessos.
- Catálogo criativo e briefing inteligente para criação de projeto.
- Conta e preferências do workspace.

## Brand Brain

O Brand Brain não faz parte da experiência inicial do cliente. Enquanto a Allyo entrega os primeiros projetos, o sistema pode organizar o acervo aprovado — diretrizes, fontes, cores, imagens, briefings, feedbacks e decisões criativas — sem expor a funcionalidade no workspace.

O acesso só poderá ser liberado depois de pelo menos dois meses de histórico com a Allyo e mediante validação da equipe de que existe contexto suficiente para gerar respostas e materiais realmente alinhados à marca. Até essa liberação, o item não aparece na navegação e a rota direta permanece indisponível.

Quando elegível, o Brand Brain poderá apoiar briefings contextualizados, consulta de aprendizados da marca, insights sobre projetos e geração de materiais coerentes com o acervo aprovado. A elegibilidade deverá vir dos acessos do workspace no backend; neste protótipo, ela está desabilitada em `src/config/productAccess.ts`.

## Preparação para o backend

Os tipos centrais estão em `src/types.ts`, os dados substituíveis em `src/data/mock.ts` e o estado temporário em `src/AppContext.tsx`. Na fase seguinte, essa camada pode ser trocada por endpoints sem alterar os componentes visuais. Domínios sugeridos para o backend: autenticação, organizações, usuários/equipes, projetos, tarefas, mensagens, assets/versões, aprovações, Brand Kit, Brand Brain, catálogo, orçamento e notificações.

## Referências de produto

O escopo combina o layout Allyo do Figma com os princípios públicos do Superspace: briefings, progresso, revisão, feedback, assets, orçamento, equipes e inteligência de marca no mesmo ambiente. Os playbooks privados da Faster precisam de uma sessão Google autorizada e não foram copiados para o repositório.
