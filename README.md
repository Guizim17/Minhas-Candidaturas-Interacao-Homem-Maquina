# Minhas Candidaturas — App Inatel

Front-end do setor de estágios do App Inatel, com duas abas:

- **Minhas candidaturas:** reúne as vagas em que o aluno se candidatou e mostra a etapa de cada processo.
- **Vagas disponíveis:** lista as vagas abertas. O aluno abre uma vaga, vê os detalhes e envia o currículo em PDF.

## Como rodar

Os dados são lidos com `fetch`, então o projeto precisa de um servidor local. Abrir o `index.html` direto do disco não funciona.

- **VS Code:** clique com o botão direito em `index.html` e escolha **Open with Live Server**.
- **Terminal:** na pasta do projeto, rode `python -m http.server 8000` e acesse http://localhost:8000.
- **GitHub Pages:** funciona sem nenhuma mudança.

## Estrutura

```
index.html                 abas, telas e painel de notificações
css/style.css              estilos (layout de celular)
js/app.js                  lógica: leitura dos .json, filtros, busca, telas, envio do currículo
data/index.json            dados do aluno e lista dos arquivos de candidaturas e de vagas
data/candidaturas/*.json   uma candidatura por arquivo
data/vagas/*.json          uma vaga disponível por arquivo
data/notificacoes.json     avisos de mudança de status
```

## Telas e endereços

| Endereço | Tela |
| --- | --- |
| `#/` | Minhas candidaturas |
| `#/candidatura/<id>` | Detalhes da candidatura |
| `#/vagas` | Vagas disponíveis |
| `#/vaga/<id>` | Detalhes da vaga e envio do currículo |

## Adicionar uma vaga ou uma candidatura

1. Crie o arquivo seguindo o formato dos outros: `data/vagas/vaga-106.json` ou `data/candidaturas/cand-009.json`.
2. Inclua o nome do arquivo no `data/index.json`, na lista `vagasDisponiveis` ou na lista `candidaturas`.
3. Recarregue o app.

Status aceitos em `statusAtual`: `COMECARA_EM_BREVE`, `EM_ANALISE`, `ACEITO`, `REJEITADO`, `ENCERRADA`.

Datas de prazo (`prazoInscricao`) usam o formato `AAAA-MM-DD`. Quando o prazo passa, a vaga aparece como "Inscrições encerradas" e o envio fica bloqueado.

## Envio do currículo

- Aceita apenas PDF de até 5 MB. O app confere a extensão, o tamanho e se o arquivo começa com `%PDF-`, ou seja, se é mesmo um PDF.
- O aluno pode escolher o arquivo ou arrastá-lo para a área de envio, e depois visualizar, trocar ou remover antes de enviar.
- Depois do envio, a vaga ganha o selo "Candidatura enviada" e passa a aparecer em Minhas candidaturas com o status "Começará em breve".

Como o projeto é só front-end, o PDF não sai do navegador: o envio é simulado e a candidatura fica salva no `localStorage`. Para enviar de verdade, a função `enviarCurriculo` em `js/app.js` teria que mandar o arquivo para um servidor com `fetch` e `FormData`.

## Relação com a HTA

| Tarefa | Onde está no código |
| --- | --- |
| 1. Acessar Minhas Candidaturas | aba Minhas candidaturas (`renderizarLista`) |
| 2.1 Filtrar por status | chips de filtro com contagem (`renderizarFiltros`) |
| 2.2 Buscar por vaga ou empresa | campo de busca (`candidaturasFiltradas`) |
| 2.3 Vaga não aparece | botão Atualizar (`sincronizar`) e o bloco de ajuda |
| 3.1 / 3.2 / 3.3 Consultar processo | tela de detalhe: status, histórico e próximos passos (`renderizarDetalhe`) |
| 4.1 Receber notificação | sino com contador e painel, com preferências por status |
| 4.2 Confirmar entrevista | botões Confirmar presença e Adicionar à agenda (gera um .ics) |
| 5. Inscrever-se na vaga | aba Vagas disponíveis (`renderizarVagas`, `renderizarVaga`, `enviarCurriculo`) |

O que o aluno faz no app (candidaturas enviadas, entrevista confirmada, notificação lida, preferências) fica salvo no `localStorage` do navegador. Os arquivos .json não são alterados. Para começar do zero, limpe os dados do site no navegador.
