/* =========================================================
 * Minhas Candidaturas · App Inatel
 * Front-end do setor que reúne as candidaturas feitas no
 * site acadêmico. Os dados vêm de arquivos .json em /data.
 * ========================================================= */

/* ---------- Configuração dos status (enum StatusCandidatura) ---------- */
const STATUS = {
  COMECARA_EM_BREVE: {
    rotulo: "Começará em breve",
    icone: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  },
  EM_ANALISE: {
    rotulo: "Em análise",
    icone: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>',
  },
  ACEITO: {
    rotulo: "Aceito",
    icone: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  },
  REJEITADO: {
    rotulo: "Rejeitado",
    icone: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  },
  ENCERRADA: {
    rotulo: "Encerrada",
    icone: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  },
};

/* Ordem de exibição na lista: o que pede atenção vem primeiro */
const PRIORIDADE = { ACEITO: 0, EM_ANALISE: 1, COMECARA_EM_BREVE: 2, REJEITADO: 3, ENCERRADA: 4 };

const ICONES = {
  calendario: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/></svg>',
  local: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  externo: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  dinheiro: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  relogio: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  enviada: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
};

/* Regras do envio de currículo */
const CURRICULO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/* ---------- Estado da aplicação ---------- */
const estado = {
  aluno: null,
  candidaturas: [],
  vagas: [],
  notificacoes: [],
  ultimaSincronizacao: null,
  filtro: "TODAS",
  busca: "",
  filtroArea: "TODAS",
  buscaVagas: "",
  arquivoCurriculo: null, // PDF escolhido na tela da vaga aberta
  rotaVoltar: "#/",
};

/* ---------- Armazenamento local (estado só do front-end) ---------- */
const armazenamento = {
  ler(chave, padrao) {
    try {
      const valor = localStorage.getItem("mc:" + chave);
      return valor ? JSON.parse(valor) : padrao;
    } catch {
      return padrao;
    }
  },
  salvar(chave, valor) {
    try { localStorage.setItem("mc:" + chave, JSON.stringify(valor)); } catch { /* sem armazenamento: segue sem salvar */ }
  },
};

/* ---------- Utilidades ---------- */
const $ = (seletor) => document.querySelector(seletor);

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatarData(iso, comHora = false) {
  const data = new Date(iso);
  const opcoes = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (comHora) Object.assign(opcoes, { hour: "2-digit", minute: "2-digit" });
  return data.toLocaleString("pt-BR", opcoes);
}

function tempoRelativo(iso) {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ontem";
  if (diffD < 30) return `há ${diffD} dias`;
  return formatarData(iso);
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/* Dias até o fim do dia do prazo (0 = encerra hoje; negativo = já encerrou) */
function diasAtePrazo(prazoIso) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(prazoIso + "T00:00:00");
  return Math.round((prazo - hoje) / 86400000);
}

function seloStatus(status, grande = false) {
  const s = STATUS[status];
  return `<span class="status status-${status}${grande ? " grande" : ""}">${s.icone}${s.rotulo}</span>`;
}

function mostrarAviso(mensagem) {
  const toast = $("#toast");
  toast.textContent = mensagem;
  toast.hidden = false;
  clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = setTimeout(() => (toast.hidden = true), 2800);
}

/* =========================================================
 * Dados: lê os arquivos .json (simula a sincronização com o
 * site acadêmico — interface SiteAcademico do diagrama)
 * ========================================================= */
async function lerJson(caminho) {
  const resposta = await fetch(caminho, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`Falha ao ler ${caminho} (${resposta.status})`);
  return resposta.json();
}

async function sincronizar() {
  const indice = await lerJson("data/index.json");
  const candidaturas = await Promise.all(
    indice.candidaturas.map((arquivo) => lerJson(`data/candidaturas/${arquivo}`))
  );
  const vagas = await Promise.all(
    (indice.vagasDisponiveis || []).map((arquivo) => lerJson(`data/vagas/${arquivo}`))
  );
  const notificacoes = await lerJson("data/notificacoes.json");

  // Candidaturas enviadas pelo app (aba Vagas disponíveis). Sem back-end,
  // ficam guardadas no navegador e entram na lista junto com as do site acadêmico.
  const enviadas = armazenamento.ler("candidaturasEnviadas", []);
  enviadas.forEach((c) => {
    if (!candidaturas.some((x) => x.id === c.id)) candidaturas.push(c);
  });

  // Aplica o que o aluno fez no app (entrevistas confirmadas, notificações lidas)
  const confirmadas = armazenamento.ler("entrevistasConfirmadas", []);
  candidaturas.forEach((c) => {
    if (c.entrevista && confirmadas.includes(c.id)) c.entrevista.confirmada = true;
  });
  const lidas = armazenamento.ler("notificacoesLidas", []);
  notificacoes.forEach((n) => { if (lidas.includes(n.id)) n.lida = true; });

  estado.aluno = indice.aluno;
  estado.candidaturas = candidaturas;
  estado.vagas = vagas;
  estado.notificacoes = notificacoes;
  estado.ultimaSincronizacao = new Date().toISOString();
}

/* ---------- Preferências de notificação ---------- */
function preferencias() {
  return armazenamento.ler("preferencias", Object.keys(STATUS));
}
function deveNotificar(status) {
  return preferencias().includes(status);
}
function notificacoesVisiveis() {
  return estado.notificacoes
    .filter((n) => deveNotificar(n.status))
    .sort((a, b) => new Date(b.dataEnvio) - new Date(a.dataEnvio));
}
function temNovidade(idCandidatura) {
  return notificacoesVisiveis().some((n) => n.candidaturaId === idCandidatura && !n.lida);
}

/* =========================================================
 * Tela 1 — Lista (tarefas 1 e 2 da HTA)
 * ========================================================= */
function candidaturasFiltradas() {
  const termo = estado.busca.trim().toLowerCase();
  return estado.candidaturas
    .filter((c) => estado.filtro === "TODAS" || c.statusAtual === estado.filtro)
    .filter((c) =>
      !termo ||
      c.vaga.titulo.toLowerCase().includes(termo) ||
      c.vaga.empresa.nome.toLowerCase().includes(termo) ||
      c.vaga.area.toLowerCase().includes(termo)
    )
    .sort((a, b) =>
      PRIORIDADE[a.statusAtual] - PRIORIDADE[b.statusAtual] ||
      new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao)
    );
}

function renderizarFiltros() {
  const contagem = { TODAS: estado.candidaturas.length };
  Object.keys(STATUS).forEach((s) => (contagem[s] = estado.candidaturas.filter((c) => c.statusAtual === s).length));

  const opcoes = [["TODAS", "Todas"], ...Object.entries(STATUS).map(([chave, s]) => [chave, s.rotulo])];
  $("#filtros").innerHTML = opcoes
    .map(([chave, rotulo]) => `
      <button class="chip${estado.filtro === chave ? " ativo" : ""}" data-filtro="${chave}" aria-pressed="${estado.filtro === chave}">
        ${rotulo} <span class="contagem">${contagem[chave]}</span>
      </button>`)
    .join("");
}

function renderizarLista() {
  renderizarFiltros();
  const itens = candidaturasFiltradas();

  $("#texto-sync").textContent = `Sincronizado com o site acadêmico ${tempoRelativo(estado.ultimaSincronizacao)}`;

  const ativas = estado.candidaturas.filter((c) => ["COMECARA_EM_BREVE", "EM_ANALISE"].includes(c.statusAtual)).length;
  $("#resumo-lista").textContent = estado.filtro === "TODAS" && !estado.busca
    ? `${estado.candidaturas.length} candidaturas · ${ativas} em andamento`
    : `${itens.length} ${itens.length === 1 ? "resultado" : "resultados"}`;

  $("#lista-candidaturas").innerHTML = itens
    .map((c) => `
      <li>
        <button class="cartao" data-id="${c.id}">
          <div class="cartao-topo">
            <div>
              <h3>${escapar(c.vaga.titulo)}</h3>
              <p class="empresa">${escapar(c.vaga.empresa.nome)} · ${escapar(c.vaga.modalidade)}</p>
            </div>
          </div>
          <div class="cartao-rodape">
            ${seloStatus(c.statusAtual)}
            ${temNovidade(c.id) ? '<span class="novidade">Novidade</span>' : `<span>Atualizado ${tempoRelativo(c.ultimaAtualizacao)}</span>`}
          </div>
        </button>
      </li>`)
    .join("");

  const vazio = itens.length === 0;
  $("#estado-vazio").hidden = !vazio;
  if (vazio) {
    $("#vazio-texto").textContent = estado.candidaturas.length === 0
      ? "Você ainda não se candidatou a nenhuma vaga no site acadêmico."
      : "Tente outro filtro ou termo de busca.";
  }
}

/* =========================================================
 * Tela 2 — Detalhe (tarefa 3 da HTA e entrevista 4.2)
 * ========================================================= */
function renderizarDetalhe(c) {
  const historico = [...c.historico].sort((a, b) => new Date(b.data) - new Date(a.data));

  const blocoEntrevista = c.entrevista ? `
    <section class="bloco">
      <h2>Entrevista</h2>
      <div class="entrevista-linha">${ICONES.calendario}<span>${formatarData(c.entrevista.dataHora, true)}</span></div>
      <div class="entrevista-linha">${ICONES.local}<span>${escapar(c.entrevista.local)}</span></div>
      ${c.entrevista.confirmada
        ? `<p class="confirmada">${ICONES.check} Presença confirmada</p>`
        : `<div class="entrevista-acoes">
             <button class="botao" data-acao="confirmar">${ICONES.check} Confirmar presença</button>
             <button class="botao botao-secundario" data-acao="agenda">${ICONES.calendario} Adicionar à agenda</button>
           </div>`}
    </section>` : "";

  $("#tela-detalhe").innerHTML = `
    <section class="bloco detalhe-cabecalho">
      ${seloStatus(c.statusAtual, true)}
      <h2>${escapar(c.vaga.titulo)}</h2>
      <p class="empresa">${escapar(c.vaga.empresa.nome)}</p>
      <p class="atualizado">Última atualização: ${formatarData(c.ultimaAtualizacao, true)}</p>
    </section>

    <section class="bloco proximos status-borda-${c.statusAtual}">
      <h2>Próximos passos</h2>
      <p>${escapar(c.proximosPassos)}</p>
    </section>

    ${blocoEntrevista}

    <section class="bloco">
      <h2>Histórico do processo</h2>
      <ol class="timeline">
        ${historico.map((etapa, i) => `
          <li class="${i === 0 ? "atual" : ""}">
            <span class="ponto"></span>
            <p class="data">${formatarData(etapa.data, true)}</p>
            <p class="descricao">${escapar(etapa.descricao)}</p>
            ${seloStatus(etapa.status)}
          </li>`).join("")}
      </ol>
    </section>

    <section class="bloco">
      <h2>Sobre a vaga</h2>
      <dl class="info-grid">
        <div><dt>Área</dt><dd>${escapar(c.vaga.area)}</dd></div>
        <div><dt>Modalidade</dt><dd>${escapar(c.vaga.modalidade)}</dd></div>
        <div><dt>Cidade</dt><dd>${escapar(c.vaga.cidade)}</dd></div>
        <div><dt>Carga horária</dt><dd>${escapar(c.vaga.cargaHoraria)}</dd></div>
        <div><dt>Bolsa</dt><dd>${escapar(c.vaga.bolsa)}</dd></div>
        <div><dt>Inscrição feita em</dt><dd>${formatarData(c.dataInscricao)}</dd></div>
        ${c.curriculo ? `<div><dt>Currículo enviado</dt><dd>${escapar(c.curriculo.nome)}</dd></div>` : ""}
      </dl>
    </section>

    <section class="bloco">
      <h2>Contato</h2>
      <p class="contato">Dúvidas sobre o processo: <a href="mailto:${escapar(c.vaga.empresa.contato)}">${escapar(c.vaga.empresa.contato)}</a></p>
    </section>
  `;

  // Abrir a candidatura conta como ler as notificações dela
  marcarNotificacoesLidas((n) => n.candidaturaId === c.id);
}

/* ---------- Ações da entrevista ---------- */
function confirmarEntrevista(c) {
  c.entrevista.confirmada = true;
  const confirmadas = armazenamento.ler("entrevistasConfirmadas", []);
  if (!confirmadas.includes(c.id)) confirmadas.push(c.id);
  armazenamento.salvar("entrevistasConfirmadas", confirmadas);
  renderizarDetalhe(c);
  mostrarAviso("Presença confirmada. A empresa foi avisada.");
}

function baixarConvite(c) {
  // Gera um arquivo .ics que o celular abre na agenda
  const inicio = new Date(c.entrevista.dataHora);
  const fim = new Date(inicio.getTime() + 60 * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//App Inatel//Minhas Candidaturas//PT",
    "BEGIN:VEVENT",
    `UID:${c.id}@app.inatel`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(inicio)}`, `DTEND:${fmt(fim)}`,
    `SUMMARY:Entrevista - ${c.vaga.titulo} (${c.vaga.empresa.nome})`,
    `LOCATION:${c.entrevista.local}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Entrevista amanhã", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  link.download = `entrevista-${c.id}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
  mostrarAviso("Convite gerado. Abra o arquivo para salvar na agenda.");
}

/* =========================================================
 * Tela 3 — Vagas disponíveis
 * ========================================================= */
function candidaturaDaVaga(vaga) {
  return estado.candidaturas.find((c) => c.vagaId === vaga.id);
}

function vagasFiltradas() {
  const termo = estado.buscaVagas.trim().toLowerCase();
  return estado.vagas
    .filter((v) => estado.filtroArea === "TODAS" || v.area === estado.filtroArea)
    .filter((v) =>
      !termo ||
      [v.titulo, v.empresa.nome, v.cidade, v.area].some((campo) => campo.toLowerCase().includes(termo))
    )
    .sort((a, b) => {
      // Vagas abertas primeiro, pelo prazo mais próximo; encerradas no fim
      const da = diasAtePrazo(a.prazoInscricao), db = diasAtePrazo(b.prazoInscricao);
      if ((da < 0) !== (db < 0)) return da < 0 ? 1 : -1;
      return da - db;
    });
}

function tagDaVaga(v) {
  if (candidaturaDaVaga(v)) return `<span class="tag tag-enviada">${ICONES.enviada}Candidatura enviada</span>`;
  const dias = diasAtePrazo(v.prazoInscricao);
  if (dias < 0) return `<span class="tag tag-encerrada">Inscrições encerradas</span>`;
  if (dias === 0) return `<span class="tag tag-prazo">${ICONES.relogio}Encerra hoje</span>`;
  if (dias <= 7) return `<span class="tag tag-prazo">${ICONES.relogio}Encerra em ${dias} ${dias === 1 ? "dia" : "dias"}</span>`;
  return "";
}

function renderizarFiltrosArea() {
  const areas = [...new Set(estado.vagas.map((v) => v.area))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const opcoes = [["TODAS", "Todas", estado.vagas.length],
    ...areas.map((a) => [a, a, estado.vagas.filter((v) => v.area === a).length])];
  $("#filtros-area").innerHTML = opcoes
    .map(([chave, rotulo, n]) => `
      <button class="chip${estado.filtroArea === chave ? " ativo" : ""}" data-area="${escapar(chave)}" aria-pressed="${estado.filtroArea === chave}">
        ${escapar(rotulo)} <span class="contagem">${n}</span>
      </button>`)
    .join("");
}

function renderizarVagas() {
  renderizarFiltrosArea();
  const itens = vagasFiltradas();
  const abertas = estado.vagas.filter((v) => diasAtePrazo(v.prazoInscricao) >= 0).length;

  $("#intro-vagas").textContent = estado.aluno
    ? `Vagas de estágio para ${estado.aluno.curso}. Escolha uma vaga e envie seu currículo em PDF.`
    : "Escolha uma vaga e envie seu currículo em PDF.";
  $("#resumo-vagas").textContent = estado.filtroArea === "TODAS" && !estado.buscaVagas
    ? `${abertas} ${abertas === 1 ? "vaga aberta" : "vagas abertas"}`
    : `${itens.length} ${itens.length === 1 ? "resultado" : "resultados"}`;

  $("#lista-vagas").innerHTML = itens
    .map((v) => `
      <li>
        <button class="cartao" data-vaga="${v.id}">
          <div class="cartao-topo">
            <div>
              <h3>${escapar(v.titulo)}</h3>
              <p class="empresa">${escapar(v.empresa.nome)} · ${escapar(v.modalidade)}</p>
            </div>
          </div>
          <div class="vaga-meta">
            <span>${ICONES.local}${escapar(v.cidade)}</span>
            <span>${ICONES.dinheiro}<strong>${escapar(v.bolsa)}</strong></span>
          </div>
          <div class="cartao-rodape">
            <span>Inscrições até ${formatarData(v.prazoInscricao + "T00:00:00")}</span>
            ${tagDaVaga(v)}
          </div>
        </button>
      </li>`)
    .join("");

  $("#vagas-vazio").hidden = itens.length > 0;
}

/* =========================================================
 * Tela 4 — Detalhes da vaga e envio do currículo
 * ========================================================= */
function itens(lista) {
  return `<ul class="lista-itens">${lista.map((i) => `<li>${escapar(i)}</li>`).join("")}</ul>`;
}

function blocoEnvio(v) {
  const enviada = candidaturaDaVaga(v);
  if (enviada) {
    return `
      <section class="bloco bloco-envio" id="bloco-envio">
        <h2>Candidatura</h2>
        <div class="envio-ok">
          ${ICONES.enviada}
          <div>
            <p><strong>Currículo enviado</strong> em ${formatarData(enviada.dataInscricao, true)}.</p>
            <p>${escapar(enviada.curriculo?.nome || "")} · <a href="#/candidatura/${enviada.id}">Acompanhar em Minhas candidaturas</a></p>
          </div>
        </div>
      </section>`;
  }

  if (diasAtePrazo(v.prazoInscricao) < 0) {
    return `
      <section class="bloco" id="bloco-envio">
        <h2>Candidatura</h2>
        <p class="texto-bloco">As inscrições para esta vaga terminaram em ${formatarData(v.prazoInscricao + "T00:00:00")}.</p>
      </section>`;
  }

  const arq = estado.arquivoCurriculo;
  const seletor = arq
    ? `<div class="arquivo">
         <span class="arquivo-icone">PDF</span>
         <div class="arquivo-info">
           <p class="arquivo-nome">${escapar(arq.name)}</p>
           <p class="arquivo-tamanho">${formatarTamanho(arq.size)}</p>
           <div class="arquivo-acoes">
             <button class="link-btn" data-acao="ver-pdf">Visualizar</button>
             <button class="link-btn" data-acao="trocar-pdf">Trocar</button>
             <button class="link-btn" data-acao="remover-pdf">Remover</button>
           </div>
         </div>
       </div>`
    : `<input type="file" id="campo-curriculo" class="input-oculto" accept="application/pdf,.pdf" aria-describedby="erro-curriculo">
       <label for="campo-curriculo" class="area-upload" id="area-upload">
         ${ICONES.upload}
         <strong>Escolher currículo em PDF</strong>
         <span>Somente arquivos .pdf, até 5 MB</span>
       </label>`;

  return `
    <section class="bloco bloco-envio" id="bloco-envio">
      <h2>Candidatar-se</h2>
      <p class="ajuda-envio">Envie seu currículo para a ${escapar(v.empresa.nome)}. Você poderá acompanhar o processo em Minhas candidaturas.</p>
      ${seletor}
      ${arq ? '<input type="file" id="campo-curriculo" class="input-oculto" accept="application/pdf,.pdf" tabindex="-1" aria-hidden="true">' : ""}
      <p class="msg-erro" id="erro-curriculo" role="alert" hidden></p>
      <button class="botao botao-largo" data-acao="enviar-curriculo">${ICONES.upload} Enviar currículo</button>
    </section>`;
}

function renderizarVaga(v) {
  $("#tela-vaga").innerHTML = `
    <section class="bloco detalhe-cabecalho">
      ${tagDaVaga(v)}
      <h2>${escapar(v.titulo)}</h2>
      <p class="empresa">${escapar(v.empresa.nome)}</p>
      <div class="vaga-meta">
        <span>${ICONES.local}${escapar(v.cidade)}</span>
        <span>${ICONES.dinheiro}<strong>${escapar(v.bolsa)}</strong></span>
      </div>
    </section>

    <section class="bloco">
      <h2>Sobre a vaga</h2>
      <dl class="info-grid">
        <div><dt>Área</dt><dd>${escapar(v.area)}</dd></div>
        <div><dt>Modalidade</dt><dd>${escapar(v.modalidade)}</dd></div>
        <div><dt>Carga horária</dt><dd>${escapar(v.cargaHoraria)}</dd></div>
        <div><dt>Bolsa</dt><dd>${escapar(v.bolsa)}</dd></div>
        <div><dt>Período mínimo</dt><dd>${v.periodoMinimo}º período</dd></div>
        <div><dt>Inscrições até</dt><dd>${formatarData(v.prazoInscricao + "T00:00:00")}</dd></div>
      </dl>
    </section>

    <section class="bloco">
      <h2>O que você vai fazer</h2>
      <p class="texto-bloco">${escapar(v.descricao)}</p>
      <p class="subtitulo" style="margin-top:12px">Atividades</p>
      ${itens(v.atividades)}
    </section>

    <section class="bloco">
      <h2>Requisitos</h2>
      ${itens(v.requisitos)}
      <p class="subtitulo">Diferenciais</p>
      ${itens(v.diferenciais)}
      <p class="subtitulo">Cursos aceitos</p>
      ${itens(v.cursos)}
    </section>

    <section class="bloco">
      <h2>Benefícios</h2>
      ${itens(v.beneficios)}
    </section>

    <section class="bloco">
      <h2>Sobre a empresa</h2>
      <p class="texto-bloco">${escapar(v.empresa.sobre)}</p>
      <p class="contato" style="margin-top:8px">Contato: <a href="mailto:${escapar(v.empresa.contato)}">${escapar(v.empresa.contato)}</a></p>
    </section>

    ${blocoEnvio(v)}
  `;
}

function atualizarBlocoEnvio(v) {
  $("#bloco-envio").outerHTML = blocoEnvio(v);
}

function mostrarErroCurriculo(mensagem) {
  const erro = $("#erro-curriculo");
  if (!erro) return;
  erro.textContent = mensagem;
  erro.hidden = false;
  $("#area-upload")?.classList.add("erro");
}

/* Confere extensão, tipo, tamanho e o cabeçalho "%PDF" do arquivo */
async function validarPdf(arquivo) {
  const parecePdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
  if (!parecePdf) return "O currículo precisa estar em PDF. Escolha um arquivo .pdf.";
  if (arquivo.size === 0) return "Esse arquivo está vazio. Escolha outro PDF.";
  if (arquivo.size > CURRICULO_MAX_BYTES) return `O arquivo tem ${formatarTamanho(arquivo.size)}. O limite é 5 MB.`;
  const inicio = await arquivo.slice(0, 5).text();
  if (inicio !== "%PDF-") return "Esse arquivo não parece ser um PDF válido. Exporte o currículo como PDF e tente de novo.";
  return null;
}

async function escolherCurriculo(arquivo, vaga) {
  if (!arquivo) return;
  const erro = await validarPdf(arquivo);
  if (erro) {
    estado.arquivoCurriculo = null;
    atualizarBlocoEnvio(vaga);
    mostrarErroCurriculo(erro);
    return;
  }
  estado.arquivoCurriculo = arquivo;
  atualizarBlocoEnvio(vaga);
}

async function enviarCurriculo(vaga, botao) {
  const arq = estado.arquivoCurriculo;
  if (!arq) {
    mostrarErroCurriculo("Escolha seu currículo em PDF antes de enviar.");
    return;
  }

  botao.disabled = true;
  botao.textContent = "Enviando...";
  // Sem back-end: simula o tempo de envio. Em produção, aqui iria um fetch com FormData.
  await new Promise((r) => setTimeout(r, 900));

  const agora = new Date().toISOString();
  const candidatura = {
    id: `cand-app-${vaga.id}`,
    vagaId: vaga.id,
    vaga: {
      titulo: vaga.titulo, area: vaga.area, modalidade: vaga.modalidade, cidade: vaga.cidade,
      bolsa: vaga.bolsa, cargaHoraria: vaga.cargaHoraria, prazoInscricao: vaga.prazoInscricao,
      empresa: { nome: vaga.empresa.nome, contato: vaga.empresa.contato },
    },
    dataInscricao: agora,
    statusAtual: "COMECARA_EM_BREVE",
    ultimaAtualizacao: agora,
    historico: [{ status: "COMECARA_EM_BREVE", data: agora, descricao: `Currículo enviado pelo App Inatel (${arq.name}).` }],
    proximosPassos: `Aguarde o início do processo seletivo. As inscrições vão até ${formatarData(vaga.prazoInscricao + "T00:00:00")}, e você será avisada quando a empresa começar a análise.`,
    entrevista: null,
    curriculo: { nome: arq.name, tamanho: arq.size },
  };

  const enviadas = armazenamento.ler("candidaturasEnviadas", []);
  enviadas.push(candidatura);
  armazenamento.salvar("candidaturasEnviadas", enviadas);
  estado.candidaturas.push(candidatura);
  estado.arquivoCurriculo = null;

  renderizarVaga(vaga);
  mostrarAviso("Currículo enviado! A vaga já aparece em Minhas candidaturas.");
}

/* =========================================================
 * Notificações (tarefa 4.1 da HTA)
 * ========================================================= */
function marcarNotificacoesLidas(criterio = () => true) {
  const lidas = new Set(armazenamento.ler("notificacoesLidas", []));
  estado.notificacoes.filter(criterio).forEach((n) => { n.lida = true; lidas.add(n.id); });
  armazenamento.salvar("notificacoesLidas", [...lidas]);
  atualizarBadge();
}

function atualizarBadge() {
  const naoLidas = notificacoesVisiveis().filter((n) => !n.lida).length;
  const badge = $("#badge-notificacoes");
  badge.hidden = naoLidas === 0;
  badge.textContent = naoLidas;
  $("#btn-notificacoes").setAttribute("aria-label", naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações");
}

function renderizarNotificacoes() {
  const lista = notificacoesVisiveis();
  $("#lista-notificacoes").innerHTML = lista.length
    ? lista.map((n) => `
        <li>
          <button class="notificacao${n.lida ? "" : " nao-lida"}" data-candidatura="${n.candidaturaId}">
            <p>${escapar(n.mensagem)}</p>
            <div class="meta">${seloStatus(n.status)}<span>${tempoRelativo(n.dataEnvio)}</span></div>
          </button>
        </li>`).join("")
    : '<li class="vazio">Nenhuma notificação.</li>';

  const prefs = preferencias();
  $("#preferencias-status").innerHTML = Object.entries(STATUS)
    .map(([chave, s]) => `
      <label class="pref-item">
        <span>${s.rotulo}</span>
        <input type="checkbox" data-pref="${chave}" ${prefs.includes(chave) ? "checked" : ""}>
      </label>`).join("");
}

function abrirPainel() {
  renderizarNotificacoes();
  $("#overlay").hidden = false;
  $("#painel-notificacoes").hidden = false;
  $("#btn-fechar-painel").focus();
}
function fecharPainel() {
  $("#overlay").hidden = true;
  $("#painel-notificacoes").hidden = true;
}

/* =========================================================
 * Navegação entre telas
 *   #/                  Minhas candidaturas (lista)
 *   #/candidatura/<id>  Detalhes da candidatura
 *   #/vagas             Vagas disponíveis (lista)
 *   #/vaga/<id>         Detalhes da vaga + envio do currículo
 * ========================================================= */
function vagaAberta() {
  const [, rota, id] = location.hash.split("/");
  return rota === "vaga" ? estado.vagas.find((v) => v.id === id) : null;
}

function rotear() {
  const [, rota, id] = location.hash.split("/");
  const candidatura = rota === "candidatura" && estado.candidaturas.find((c) => c.id === id);
  const vaga = rota === "vaga" && estado.vagas.find((v) => v.id === id);

  let tela = "lista";
  if (candidatura) tela = "detalhe";
  else if (vaga) tela = "vaga";
  else if (rota === "vagas") tela = "vagas";

  const titulos = {
    lista: "Minhas Candidaturas",
    detalhe: "Detalhes da candidatura",
    vagas: "Vagas disponíveis",
    vaga: "Detalhes da vaga",
  };

  ["lista", "detalhe", "vagas", "vaga"].forEach((t) => ($(`#tela-${t}`).hidden = t !== tela));
  const emDetalhe = tela === "detalhe" || tela === "vaga";
  $("#btn-voltar").hidden = !emDetalhe;
  $("#abas").hidden = emDetalhe;
  $("#titulo-tela").textContent = titulos[tela];

  // A aba ativa acompanha a seção em que o aluno está
  const abaAtiva = tela === "vagas" || tela === "vaga" ? "vagas" : "candidaturas";
  document.querySelectorAll("#abas a").forEach((a) => {
    const ativa = a.dataset.aba === abaAtiva;
    a.classList.toggle("ativa", ativa);
    if (ativa) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const abertas = estado.vagas.filter((v) => diasAtePrazo(v.prazoInscricao) >= 0 && !candidaturaDaVaga(v)).length;
  $("#contagem-vagas").textContent = abertas || "";

  // Para onde o botão "voltar" leva
  estado.rotaVoltar = tela === "vaga" ? "#/vagas" : "#/";
  if (tela !== "vaga") estado.arquivoCurriculo = null;

  if (tela === "detalhe") renderizarDetalhe(candidatura);
  else if (tela === "vaga") renderizarVaga(vaga);
  else if (tela === "vagas") renderizarVagas();
  else renderizarLista();
  window.scrollTo(0, 0);
}

/* =========================================================
 * Eventos
 * ========================================================= */
function registrarEventos() {
  window.addEventListener("hashchange", rotear);

  $("#btn-voltar").addEventListener("click", () => (location.hash = estado.rotaVoltar));

  /* --- Vagas disponíveis --- */
  $("#filtros-area").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-area]");
    if (!chip) return;
    estado.filtroArea = chip.dataset.area;
    renderizarVagas();
  });

  $("#campo-busca-vagas").addEventListener("input", (e) => {
    estado.buscaVagas = e.target.value;
    renderizarVagas();
  });

  $("#lista-vagas").addEventListener("click", (e) => {
    const cartao = e.target.closest("[data-vaga]");
    if (cartao) location.hash = `#/vaga/${cartao.dataset.vaga}`;
  });

  /* --- Detalhes da vaga: escolher e enviar o currículo --- */
  $("#tela-vaga").addEventListener("change", (e) => {
    if (e.target.id === "campo-curriculo") escolherCurriculo(e.target.files[0], vagaAberta());
  });

  $("#tela-vaga").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const vaga = vagaAberta();
    const acao = botao.dataset.acao;
    if (acao === "enviar-curriculo") enviarCurriculo(vaga, botao);
    if (acao === "trocar-pdf") $("#campo-curriculo").click();
    if (acao === "remover-pdf") { estado.arquivoCurriculo = null; atualizarBlocoEnvio(vaga); }
    if (acao === "ver-pdf") {
      const url = URL.createObjectURL(estado.arquivoCurriculo);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });

  // Arrastar e soltar o PDF na área de envio
  $("#tela-vaga").addEventListener("dragover", (e) => {
    if (e.target.closest("#area-upload")) e.preventDefault();
  });
  $("#tela-vaga").addEventListener("drop", (e) => {
    if (!e.target.closest("#area-upload")) return;
    e.preventDefault();
    escolherCurriculo(e.dataTransfer.files[0], vagaAberta());
  });

  $("#filtros").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filtro]");
    if (!chip) return;
    estado.filtro = chip.dataset.filtro;
    renderizarLista();
  });

  $("#campo-busca").addEventListener("input", (e) => {
    estado.busca = e.target.value;
    renderizarLista();
  });

  $("#lista-candidaturas").addEventListener("click", (e) => {
    const cartao = e.target.closest("[data-id]");
    if (cartao) location.hash = `#/candidatura/${cartao.dataset.id}`;
  });

  $("#tela-detalhe").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (!botao) return;
    const id = location.hash.split("/")[2];
    const c = estado.candidaturas.find((x) => x.id === id);
    if (botao.dataset.acao === "confirmar") confirmarEntrevista(c);
    if (botao.dataset.acao === "agenda") baixarConvite(c);
  });

  $("#btn-sincronizar").addEventListener("click", async (e) => {
    const botao = e.currentTarget;
    botao.classList.add("girando");
    botao.disabled = true;
    try {
      await sincronizar();
      renderizarLista();
      atualizarBadge();
      mostrarAviso("Lista atualizada com o site acadêmico.");
    } catch {
      mostrarAviso("Não foi possível atualizar agora. Tente de novo em instantes.");
    } finally {
      botao.classList.remove("girando");
      botao.disabled = false;
    }
  });

  $("#btn-notificacoes").addEventListener("click", abrirPainel);
  $("#btn-fechar-painel").addEventListener("click", fecharPainel);
  $("#overlay").addEventListener("click", fecharPainel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPainel(); });

  $("#btn-marcar-lidas").addEventListener("click", () => {
    marcarNotificacoesLidas();
    renderizarNotificacoes();
    if (!$("#tela-lista").hidden) renderizarLista();
  });

  $("#lista-notificacoes").addEventListener("click", (e) => {
    const item = e.target.closest("[data-candidatura]");
    if (!item) return;
    fecharPainel();
    location.hash = `#/candidatura/${item.dataset.candidatura}`;
  });

  $("#preferencias-status").addEventListener("change", (e) => {
    const marcados = [...document.querySelectorAll("[data-pref]:checked")].map((el) => el.dataset.pref);
    armazenamento.salvar("preferencias", marcados);
    renderizarNotificacoes();
    atualizarBadge();
    if (!$("#tela-lista").hidden) renderizarLista();
  });
}

/* =========================================================
 * Início
 * ========================================================= */
async function iniciar() {
  registrarEventos();
  try {
    await sincronizar();
    atualizarBadge();
    rotear();
  } catch (erro) {
    console.error(erro);
    $("#texto-sync").textContent = "Não foi possível carregar as candidaturas.";
    $("#estado-vazio").hidden = false;
    $("#vazio-texto").innerHTML =
      "Abra o projeto por um servidor local (por exemplo, a extensão Live Server do VS Code). " +
      "Abrindo o <code>index.html</code> direto do disco, o navegador bloqueia a leitura dos arquivos .json.";
  }
}

iniciar();
