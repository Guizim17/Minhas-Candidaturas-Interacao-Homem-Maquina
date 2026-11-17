# Minhas Candidaturas — App Inatel

Front-end do setor que reúne as vagas em que o aluno se candidatou pelo site acadêmico e mostra a etapa de cada processo.

## Como rodar

Os dados são lidos com `fetch`, então o projeto precisa de um servidor local. Abrir o `index.html` direto do disco não funciona.

- **VS Code:** clique com o botão direito em `index.html` e escolha **Open with Live Server**.
- **Terminal:** na pasta do projeto, rode `python -m http.server 8000` e acesse http://localhost:8000.

## Estrutura

```
index.html                 telas e painel de notificações
css/style.css              estilos (layout de celular)
js/app.js                  lógica: leitura dos .json, filtros, busca, detalhe, notificações
data/index.json            dados do aluno e lista dos arquivos de candidatura
data/candidaturas/*.json   uma candidatura por arquivo
data/notificacoes.json     avisos de mudança de status
```

## Adicionar ou alterar uma candidatura

1. Crie `data/candidaturas/cand-009.json` seguindo o formato dos outros arquivos.
2. Inclua `"cand-009.json"` na lista `candidaturas` do `data/index.json`.
3. Toque em **Atualizar** no app.

Status aceitos em `statusAtual`: `COMECARA_EM_BREVE`, `EM_ANALISE`, `ACEITO`, `REJEITADO`, `ENCERRADA`.

## Relação com a HTA

| Tarefa | Onde está no código |
| --- | --- |
| 1. Acessar Minhas Candidaturas | tela de lista (`renderizarLista`) |
| 2.1 Filtrar por status | chips de filtro com contagem (`renderizarFiltros`) |
| 2.2 Buscar por vaga ou empresa | campo de busca (`candidaturasFiltradas`) |
| 2.3 Vaga não aparece | botão Atualizar (`sincronizar`) e o bloco de ajuda |
| 3.1 / 3.2 / 3.3 Consultar processo | tela de detalhe: status, histórico e próximos passos (`renderizarDetalhe`) |
| 4.1 Receber notificação | sino com contador e painel, com preferências por status |
| 4.2 Confirmar entrevista | botões Confirmar presença e Adicionar à agenda (gera um .ics) |

O que o aluno faz no app (entrevista confirmada, notificação lida, preferências) fica salvo no `localStorage` do navegador. Os arquivos .json não são alterados.
