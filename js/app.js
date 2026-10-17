// ===== INTERFACE =====
// Liga os botões às funções de js/logica.js, desenha na tela e guarda tudo no
// localStorage. Organizado em seções numeradas, de cima para baixo.

// Versão do app: aumente a cada mudança (e o ?v= no index.html) para saber qual está aberta.
const VERSAO = '3';

// ---------- 1. Utilidades ----------
const $ = (id) => document.getElementById(id);

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// localStorage pode falhar (modo anônimo, memória cheia), então sempre com try/catch.
function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave));
    return v === null ? padrao : v;
  } catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
  catch { return false; }
}

const num = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- 2. Estado (o que fica salvo) ----------
const CONFIG_PADRAO = { tema: 'classico', fundo: 'carvao', vibrar: true, stats: true, critico: true, agitar: false, aba: 'dados' };
let config = { ...CONFIG_PADRAO, ...ler('rolador.config', {}) };
let historico = ler('rolador.historico', []);
let favoritos = ler('rolador.favoritos', []);
let fichas = ler('rolador.fichas', null);
if (!Array.isArray(fichas)) {
  // Primeira vez: começa com os 10 monstros padrão.
  fichas = MONSTROS_PADRAO.map(limparFicha);
  gravar('rolador.fichas', fichas);
}

const salvarConfig = () => gravar('rolador.config', config);
const salvarFichas = () => gravar('rolador.fichas', fichas);

// ---------- 3. Tema ----------
function aplicarTema() {
  const tema = TEMAS.find(t => t.id === config.tema) || TEMAS[0];
  const fundo = FUNDOS.find(f => f.id === config.fundo) || FUNDOS[1];
  const raiz = document.documentElement.style;
  ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].forEach((nome, i) => {
    raiz.setProperty(`--${nome}`, tema.dados[i]);
    raiz.setProperty(`--${nome}-txt`, corDoTexto(tema.dados[i]));
  });
  raiz.setProperty('--acento', tema.acento);
  raiz.setProperty('--acento-txt', corDoTexto(tema.acento));
  for (const prop of ['fundo', 'superficie', 'tecla', 'borda']) raiz.setProperty(`--${prop}`, fundo[prop]);
  raiz.setProperty('--tecla-op', fundo.teclaOp);
  document.querySelector('meta[name="theme-color"]').content = fundo.fundo;
}

// ---------- 4. Navegação: abas e o botão "voltar" do celular ----------
// Cada tela por cima (ficha, editor, painel) é uma "camada". Abrir uma camada cria
// uma entrada no histórico do navegador; assim o botão voltar do Android a fecha.
const camadas = [];
let depoisDeVoltar = null;

function abrirCamada(fechar) {
  camadas.push(fechar);
  history.pushState({ camada: camadas.length }, '');
}
const voltar = () => history.back();

window.addEventListener('popstate', (ev) => {
  const nivel = (ev.state && ev.state.camada) || 0;
  while (camadas.length > nivel) camadas.pop()();
  if (depoisDeVoltar) { const f = depoisDeVoltar; depoisDeVoltar = null; f(); }
});

function mostrarAba(aba) {
  config.aba = aba;
  salvarConfig();
  document.querySelectorAll('.abas button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  $('tela-dados').hidden = aba !== 'dados';
  $('tela-fichas').hidden = aba !== 'fichas';
  if (aba === 'fichas') desenharListaFichas();
}
document.querySelector('.abas').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (b) mostrarAba(b.dataset.aba);
});

// ---------- 5. Rolar e desenhar o resultado ----------
function fazerRolagem(expr) {
  return rolarPartes(expr, rolarDadoCripto, { critico: config.critico });
}

function textoStats(s) {
  const media = s.media === null ? '' : ` · média ${num(s.media)}`;
  return s.min === s.max ? '' : `mín ${num(s.min)}${media} · máx ${num(s.max)}`;
}

function selos(parte) {
  const lista = [];
  if (parte.natural === 20) lista.push(['critico', '20 NATURAL']);
  if (parte.natural === 1) lista.push(['falha', '1 NATURAL']);
  if (parte.critico) lista.push(['critico', 'CRÍTICO · DADOS ×2']);
  return lista.map(([classe, texto]) => el('span', 'selo ' + classe, texto));
}

function desenharLinhas(alvo, res) {
  res.linhas.forEach((linha, i) => {
    const div = el('div', 'linha');
    // Constante depois da primeira parcela aparece com sinal: "+5"
    const sinal = i > 0 && !linha.grupos.length && !linha.texto.startsWith('−') ? '+' : '';
    div.append(el('span', 'rotulo', sinal + linha.texto + (linha.grupos.length ? ':' : '')));
    for (const grupo of linha.grupos) {
      const g = el('span', 'grupo');
      for (const d of grupo) {
        let classe = 'dado';
        if (d.valor === d.faces) classe += ' max';
        else if (d.valor === 1) classe += ' min';
        if (d.descartado) classe += ' fora';
        g.append(el('span', classe, String(d.valor)));
      }
      div.append(g);
    }
    if (linha.grupos.length) div.append(el('span', 'subtotal', '= ' + linha.subtotal));
    alvo.append(div);
  });
}

function desenharRolagem(alvo, rolagem, titulo) {
  alvo.replaceChildren();
  if (titulo) alvo.append(el('div', 'titulo-rolagem', titulo));
  const partes = rolagem.partes;
  if (partes.length === 1 && !partes[0].rotulo) {
    // Uma parte só: total grande no meio.
    const p = partes[0];
    const exp = el('div', 'expr-rolada', p.res.expressao);
    exp.append(...selos(p));
    alvo.append(el('div', 'total', String(p.res.total)), exp);
    if (config.stats) alvo.append(el('div', 'stats', textoStats(p.res.stats)));
    desenharLinhas(alvo, p.res);
  } else {
    // Várias partes (Acerto / Dano...): um bloco para cada.
    for (const p of partes) {
      const bloco = el('div', 'parte');
      const nome = el('span', 'nome', p.rotulo || 'Resultado');
      nome.append(...selos(p));
      const cabeca = el('div', 'parte-cabeca');
      cabeca.append(nome, el('span', 'valor', String(p.res.total)));
      const stats = config.stats ? textoStats(p.res.stats) : '';
      bloco.append(cabeca, el('div', 'expr-rolada', p.res.expressao + (stats ? '  ·  ' + stats : '')));
      desenharLinhas(bloco, p.res);
      alvo.append(bloco);
    }
  }
  alvo.scrollTop = 0;
}

function registrar(titulo, expr, rolagem) {
  const detalhe = rolagem.partes
    .map(p => `${p.rotulo ? p.rotulo + ': ' : ''}${p.res.expressao} → ${p.res.total}${p.critico ? ' (crítico)' : ''}`)
    .join('\n');
  historico.unshift({ titulo, expr, resumo: resumir(rolagem), detalhe });
  historico = historico.slice(0, 50);
  gravar('rolador.historico', historico);
  if (config.vibrar && navigator.vibrate) {
    const critico = rolagem.partes.some(p => p.natural === 20);
    navigator.vibrate(critico ? [40, 60, 40, 60, 80] : 15);
  }
}

// ---------- 6. Aba Dados ----------
const visor = $('expr');
const areaResultado = $('resultado');
let tituloVisor = ''; // nome da rolagem quando ela veio de um favorito/histórico

function mostrarErro(alvo, msg) {
  alvo.replaceChildren(el('p', 'erro', '⚠ ' + msg));
}

function atualizarPrevia() {
  let texto = '';
  if (config.stats) {
    try {
      const partes = validar(visor.value);
      texto = partes.length === 1 ? textoStats(estatisticas(partes[0].arvore)) : `${partes.length} partes`;
    } catch { /* expressão incompleta: sem prévia */ }
  }
  $('previa').textContent = texto;
}

function executarRolagem() {
  // Visor vazio: repete a última rolagem do histórico.
  if (!visor.value.trim() && historico.length) {
    visor.value = historico[0].expr;
    tituloVisor = historico[0].titulo || '';
  }
  const expr = visor.value.trim();
  try {
    const rolagem = fazerRolagem(expr);
    desenharRolagem(areaResultado, rolagem, tituloVisor);
    registrar(tituloVisor, expr, rolagem);
  } catch (e) {
    mostrarErro(areaResultado, e.message);
  }
  atualizarPrevia();
}

document.querySelector('.teclado').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  let v = visor.value;
  if (d.dado) v = apertarDado(v, Number(d.dado));
  else if (d.tecla) v = v + d.tecla;
  else if (d.op) v = apertarOperador(v, d.op);
  else if (d.abre) v = apertarAbre(v, d.abre);
  else if (d.fecha) v = apertarFecha(v, d.fecha);
  else if (d.acao === 'd') v = apertarD(v);
  else if (d.acao === 'vantagem') v = alternarVantagem(v, true);
  else if (d.acao === 'desvantagem') v = alternarVantagem(v, false);
  else if (d.acao === 'apagar') v = v.slice(0, -1);
  else if (d.acao === 'limpar') v = '';
  visor.value = v;
  tituloVisor = '';
  atualizarPrevia();
});

$('rolar').addEventListener('click', executarRolagem);
visor.addEventListener('input', () => { tituloVisor = ''; atualizarPrevia(); });
visor.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); visor.blur(); executarRolagem(); }
});

// "Agitar para rolar" (opcional, em Configurações).
let ultimoAgito = 0;
window.addEventListener('devicemotion', (ev) => {
  if (!config.agitar || camadas.length || $('tela-dados').hidden) return;
  const a = ev.accelerationIncludingGravity;
  if (!a) return;
  const forca = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  if (forca > 30 && Date.now() - ultimoAgito > 1200) {
    ultimoAgito = Date.now();
    executarRolagem();
  }
});

// ---------- 7. Painel: Histórico, Favoritos, Configurações ----------
let painelAtual = null;

function abrirPainel(tipo) {
  painelAtual = tipo;
  $('painel-titulo').textContent = { historico: '🕘 Histórico', favoritos: '★ Favoritos', config: '⚙ Configurações' }[tipo];
  desenharPainel();
  if ($('painel').hidden) {
    $('painel').hidden = false;
    abrirCamada(() => { $('painel').hidden = true; painelAtual = null; });
  }
}

function desenharPainel() {
  const corpo = $('painel-corpo');
  corpo.replaceChildren();
  if (painelAtual === 'historico') desenharHistorico(corpo);
  else if (painelAtual === 'favoritos') desenharFavoritos(corpo);
  else if (painelAtual === 'config') desenharConfig(corpo);
}

// Rola algo vindo do painel: volta para a aba Dados e mostra lá.
function rolarNoVisor(expr, titulo) {
  depoisDeVoltar = () => {
    mostrarAba('dados');
    visor.value = expr;
    tituloVisor = titulo || '';
    executarRolagem();
  };
  history.go(-camadas.length);
}

function itemDeLista(principal, secundario, resumo, aoAbrir, aoRemover) {
  const linha = el('div', 'item');
  const abrir = el('button', 'abrir');
  if (resumo) abrir.append(el('span', 'resumo', resumo));
  abrir.append(principal, el('small', '', secundario));
  abrir.addEventListener('click', aoAbrir);
  const remover = el('button', 'remover', '✕');
  remover.setAttribute('aria-label', 'Remover');
  remover.addEventListener('click', aoRemover);
  linha.append(abrir, remover);
  return linha;
}

function desenharHistorico(corpo) {
  if (!historico.length) { corpo.append(el('p', 'vazio', 'Nenhuma rolagem ainda.')); return; }
  historico.forEach((h, i) => {
    corpo.append(itemDeLista(h.titulo || h.expr, h.detalhe || h.expr, h.resumo ?? String(h.total ?? ''),
      () => rolarNoVisor(h.expr, h.titulo),
      () => { historico.splice(i, 1); gravar('rolador.historico', historico); desenharPainel(); }));
  });
}

function desenharFavoritos(corpo) {
  const form = el('form', 'form-linha');
  const nome = el('input'); nome.placeholder = 'Nome (ex.: Ataque espada)';
  const expr = el('input'); expr.placeholder = '1d20+5'; expr.value = visor.value.trim();
  expr.autocapitalize = 'off'; expr.spellcheck = false;
  const salvar = el('button', 'botao destaque', 'Salvar');
  const aviso = el('p', 'aviso');
  form.append(nome, expr, salvar);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!nome.value.trim()) { aviso.textContent = 'Dê um nome ao favorito.'; return; }
    try { validar(expr.value); } catch (e) { aviso.textContent = e.message; return; }
    favoritos.push({ nome: nome.value.trim(), expr: expr.value.trim() });
    gravar('rolador.favoritos', favoritos);
    desenharPainel();
  });
  corpo.append(form, aviso);
  if (!favoritos.length) corpo.append(el('p', 'vazio', 'Nenhum favorito ainda.'));
  favoritos.forEach((f, i) => {
    corpo.append(itemDeLista(f.nome, f.expr, '',
      () => rolarNoVisor(f.expr, f.nome),
      () => { favoritos.splice(i, 1); gravar('rolador.favoritos', favoritos); desenharPainel(); }));
  });
  if (!expr.value) nome.focus();
}

function secao(corpo, titulo) {
  const s = el('section', 'secao');
  s.append(el('h2', '', titulo));
  corpo.append(s);
  return s;
}

function desenharConfig(corpo) {
  // Temas
  const grade = el('div', 'temas');
  for (const t of TEMAS) {
    const b = el('button', 'tema' + (t.id === config.tema ? ' ativo' : ''));
    b.append(el('b', '', t.nome));
    const amostras = el('div', 'amostras');
    for (const cor of [...t.dados, t.acento]) {
      const s = el('span'); s.style.background = cor; amostras.append(s);
    }
    b.append(amostras);
    b.addEventListener('click', () => { config.tema = t.id; salvarConfig(); aplicarTema(); desenharPainel(); });
    grade.append(b);
  }
  secao(corpo, 'Tema de cores').append(grade);

  // Fundo
  const fundos = el('div', 'fundos');
  for (const f of FUNDOS) {
    const b = el('button', 'fundo-opcao' + (f.id === config.fundo ? ' ativo' : ''), f.nome);
    b.style.background = f.fundo;
    b.addEventListener('click', () => { config.fundo = f.id; salvarConfig(); aplicarTema(); desenharPainel(); });
    fundos.append(b);
  }
  secao(corpo, 'Fundo').append(fundos);

  // Opções liga/desliga
  const opcoes = secao(corpo, 'Opções');
  const chave = (campo, titulo, ajuda, aoLigar) => {
    const rot = el('label', 'opcao');
    const txt = el('span', '', titulo);
    txt.append(el('small', '', ajuda));
    const cx = el('input'); cx.type = 'checkbox'; cx.checked = !!config[campo];
    cx.addEventListener('change', async () => {
      config[campo] = cx.checked;
      if (cx.checked && aoLigar) await aoLigar();
      salvarConfig(); atualizarPrevia();
    });
    rot.append(txt, cx);
    opcoes.append(rot);
  };
  chave('critico', 'Crítico automático', 'Com 20 natural no acerto, os dados do dano dobram.');
  chave('stats', 'Mostrar mínimo, média e máximo', 'Na prévia e no resultado.');
  chave('vibrar', 'Vibrar ao rolar', 'Vibração mais longa num 20 natural.');
  chave('agitar', 'Agitar para rolar', 'Na aba Dados, chacoalhe o celular para rolar.', async () => {
    // iPhone pede permissão para ler o movimento.
    if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) {
      try { await DeviceMotionEvent.requestPermission(); } catch { /* recusou */ }
    }
  });

  // Dados salvos
  const acoes = el('div', 'acoes-dados');
  const botao = (texto, fn, classe = '') => {
    const b = el('button', 'botao ' + classe, texto);
    b.addEventListener('click', fn);
    acoes.append(b);
  };
  const aviso = el('p', 'aviso');
  botao('⬇ Exportar backup', exportarBackup);
  botao('⬆ Importar backup', () => $('arquivo-backup').click());
  botao('↺ Restaurar monstros', () => {
    if (!confirm('Restaurar os 10 monstros padrão? Mudanças feitas neles serão perdidas. Suas outras fichas continuam.')) return;
    for (const m of MONSTROS_PADRAO.map(limparFicha)) {
      const i = fichas.findIndex(f => f.id === m.id);
      if (i >= 0) fichas[i] = m; else fichas.push(m);
    }
    salvarFichas();
    aviso.className = 'aviso ok'; aviso.textContent = 'Monstros restaurados.';
  });
  botao('🗑 Apagar histórico', () => {
    if (!confirm('Apagar todo o histórico de rolagens?')) return;
    historico = []; gravar('rolador.historico', historico);
    aviso.className = 'aviso ok'; aviso.textContent = 'Histórico apagado.';
  }, 'perigo');
  const s = secao(corpo, 'Seus dados');
  s.append(el('p', 'ajuda', 'Tudo fica salvo só neste aparelho. Faça backup de vez em quando, principalmente das fichas com imagens.'), acoes, aviso);
  corpo.append(el('p', 'ajuda', `Rolador de Dados · versão ${VERSAO}`));
}

$('abrir-historico').addEventListener('click', () => abrirPainel('historico'));
$('abrir-favoritos').addEventListener('click', () => abrirPainel('favoritos'));
$('abrir-config').addEventListener('click', () => abrirPainel('config'));
$('salvar-favorito').addEventListener('click', () => abrirPainel('favoritos'));
$('fechar-painel').addEventListener('click', voltar);
$('painel').addEventListener('click', (ev) => { if (ev.target.id === 'painel') voltar(); });

// ---------- 8. Backup ----------
function exportarBackup() {
  const dados = { app: 'rolador-de-dados', versao: 1, criadoEm: new Date().toISOString(), config, favoritos, fichas, historico };
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rolador-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('arquivo-backup').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!dados || dados.app !== 'rolador-de-dados' || !Array.isArray(dados.fichas)) throw new Error();
    if (!confirm(`Importar ${dados.fichas.length} fichas e ${(dados.favoritos || []).length} favoritos? Isso SUBSTITUI os dados atuais.`)) return;
    fichas = dados.fichas.map(limparFicha).filter(Boolean);
    favoritos = (dados.favoritos || []).filter(f => f && typeof f.nome === 'string' && typeof f.expr === 'string');
    config = { ...CONFIG_PADRAO, ...(dados.config || {}) };
    salvarFichas(); gravar('rolador.favoritos', favoritos); salvarConfig();
    aplicarTema(); desenharPainel(); desenharListaFichas();
    alert('Backup importado!');
  } catch {
    alert('Esse arquivo não é um backup válido do Rolador.');
  }
});

// ---------- 9. Aba Fichas: lista ----------
let filtro = 'todos';

function retrato(f, grande) {
  const r = el('div', 'retrato' + (grande ? ' grande' : ''));
  if (f.imagem) {
    const img = el('img'); img.src = f.imagem; img.alt = '';
    r.append(img);
  } else {
    r.textContent = f.emoji || (f.nome || '?').trim().charAt(0).toUpperCase();
  }
  return r;
}

function barraPV(f) {
  const barra = el('div', 'barra-pv');
  const pct = f.pvMax ? Math.max(0, Math.min(1, f.pv / f.pvMax)) : 0;
  if (pct <= 0.25) barra.classList.add('critico');
  else if (pct <= 0.5) barra.classList.add('ferido');
  const cheio = el('div'); cheio.style.width = (pct * 100) + '%';
  barra.append(cheio);
  return barra;
}

function desenharListaFichas() {
  const lista = $('lista-fichas');
  lista.replaceChildren();
  const busca = semAcento($('busca').value.trim());
  const visiveis = fichas.filter(f =>
    (filtro === 'todos' || f.tipo === filtro) &&
    (!busca || semAcento(f.nome + ' ' + (f.subtitulo || '')).includes(busca)));
  if (!visiveis.length) {
    lista.append(el('p', 'vazio', fichas.length
      ? 'Nenhuma ficha encontrada.'
      : 'Nenhuma ficha ainda. Toque em "+ Nova" para criar seu personagem.'));
    if (filtro === 'personagem' && !busca) lista.lastChild.textContent = 'Nenhum personagem ainda. Toque em "+ Nova" para criar o seu, com imagem e rolagens.';
    return;
  }
  for (const f of visiveis) {
    const cartao = el('button', 'cartao-ficha');
    const info = el('div', 'info');
    info.append(el('div', 'nome', f.nome), el('div', 'sub', f.subtitulo || (f.tipo === 'monstro' ? 'Monstro' : 'Personagem')));
    const numeros = [f.ca !== null ? `CA ${f.ca}` : '', f.pvMax ? `PV ${f.pv}/${f.pvMax}` : '', `${f.rolagens.length} rolagens`]
      .filter(Boolean).join(' · ');
    info.append(el('div', 'numeros', numeros));
    if (f.pvMax) info.append(barraPV(f));
    cartao.append(retrato(f), info);
    cartao.addEventListener('click', () => abrirFicha(f.id));
    lista.append(cartao);
  }
}

$('busca').addEventListener('input', desenharListaFichas);
$('filtros').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  filtro = b.dataset.filtro;
  document.querySelectorAll('#filtros button').forEach(x => x.classList.toggle('ativo', x === b));
  desenharListaFichas();
});
$('nova-ficha').addEventListener('click', () => abrirEditor(null));

// ---------- 10. Ficha aberta ----------
let fichaAtual = null;
let modo = 'normal';

const acharFicha = (id) => fichas.find(f => f.id === id);

function abrirFicha(id) {
  fichaAtual = id;
  modo = 'normal';
  $('ficha-resultado').hidden = true;
  desenharFicha();
  $('ficha').hidden = false;
  abrirCamada(() => { $('ficha').hidden = true; fichaAtual = null; desenharListaFichas(); });
}

function desenharFicha() {
  const f = acharFicha(fichaAtual);
  if (!f) return;
  $('ficha-titulo').textContent = f.nome;
  const corpo = $('ficha-corpo');
  corpo.replaceChildren();

  // Cabeça: imagem + descrição
  const cabeca = el('div', 'ficha-cabeca');
  const textos = el('div');
  textos.append(el('div', 'tipo', f.tipo === 'monstro' ? 'Monstro' : 'Personagem'), el('div', 'sub', f.subtitulo || ''));
  cabeca.append(retrato(f, true), textos);
  corpo.append(cabeca);

  // CA e PV
  const caixas = el('div', 'caixas');
  const ca = el('div', 'caixa');
  ca.append(el('div', 'rot', 'CA'), el('div', 'num', f.ca !== null ? String(f.ca) : '—'));
  const pv = el('div', 'caixa');
  pv.append(el('div', 'rot', 'Pontos de Vida'), el('div', 'num', f.pvMax ? `${f.pv} / ${f.pvMax}` : '—'));
  if (f.pvMax) {
    pv.append(barraPV(f));
    const controles = el('div', 'pv-controles');
    const qtd = el('input'); qtd.type = 'number'; qtd.inputMode = 'numeric'; qtd.min = '0'; qtd.placeholder = 'qtd';
    qtd.setAttribute('aria-label', 'Quantidade de dano ou cura');
    const dano = el('button', 'dano', '− Dano');
    const cura = el('button', 'cura', '+ Cura');
    const mudar = (sinal) => {
      const n = Math.abs(parseInt(qtd.value, 10)) || 0;
      if (!n) { qtd.focus(); return; }
      f.pv = Math.max(0, Math.min(f.pvMax, f.pv + sinal * n));
      salvarFichas();
      desenharFicha();
    };
    dano.addEventListener('click', () => mudar(-1));
    cura.addEventListener('click', () => mudar(+1));
    controles.append(dano, qtd, cura);
    pv.append(controles);
  }
  caixas.append(ca, pv);
  corpo.append(caixas);

  // Modo: normal / vantagem / desvantagem (vale para os d20 das rolagens)
  const modos = el('div', 'modo');
  for (const [id, nome] of [['normal', 'Normal'], ['vant', 'Vantagem'], ['desv', 'Desvantagem']]) {
    const b = el('button', modo === id ? 'ativo' : '', nome);
    b.dataset.modo = id;
    b.addEventListener('click', () => { modo = id; desenharFicha(); });
    modos.append(b);
  }
  corpo.append(modos);

  // Rolagens
  const botoes = el('div', 'botoes-rolagem');
  for (const r of f.rolagens) {
    const b = el('button', 'botao-rolagem');
    b.append(el('b', '', r.nome), el('small', '', r.expr));
    b.addEventListener('click', () => rolarDaFicha(f, r));
    botoes.append(b);
  }
  if (!f.rolagens.length) botoes.append(el('p', 'vazio', 'Sem rolagens. Toque em ✎ para adicionar.'));
  corpo.append(botoes);

  if (f.notas) corpo.append(el('div', 'notas', f.notas));
}

function rolarDaFicha(f, r) {
  const expr = aplicarModo(r.expr, modo);
  const titulo = `${f.nome} — ${r.nome}` + (modo === 'vant' ? ' (Vantagem)' : modo === 'desv' ? ' (Desvantagem)' : '');
  const alvo = $('ficha-resultado-conteudo');
  try {
    const rolagem = fazerRolagem(expr);
    desenharRolagem(alvo, rolagem, titulo);
    registrar(titulo, expr, rolagem);
  } catch (e) {
    mostrarErro(alvo, e.message);
  }
  $('ficha-resultado').hidden = false;
  $('ficha-resultado').scrollTop = 0;
}

$('ficha-voltar').addEventListener('click', voltar);
$('ficha-editar').addEventListener('click', () => abrirEditor(fichaAtual));
$('fechar-resultado').addEventListener('click', () => { $('ficha-resultado').hidden = true; });

// ---------- 11. Editor de ficha ----------
let edFicha = null;     // cópia sendo editada
let edNova = false;

function abrirEditor(id) {
  edNova = !id;
  edFicha = id
    ? structuredClone(acharFicha(id))
    : { id: 'f-' + Date.now().toString(36), tipo: 'personagem', nome: '', subtitulo: '', emoji: '', imagem: null,
        ca: null, pvMax: null, pv: null, notas: '', rolagens: [{ nome: 'Iniciativa', expr: '1d20+0' }] };
  $('editor-titulo').textContent = edNova ? 'Nova ficha' : 'Editar ficha';
  $('ed-nome').value = edFicha.nome;
  $('ed-tipo').value = edFicha.tipo;
  $('ed-subtitulo').value = edFicha.subtitulo || '';
  $('ed-emoji').value = edFicha.emoji || '';
  $('ed-ca').value = edFicha.ca ?? '';
  $('ed-pv').value = edFicha.pvMax ?? '';
  $('ed-notas').value = edFicha.notas || '';
  $('ed-aviso').textContent = '';
  $('ed-duplicar').hidden = edNova;
  $('ed-apagar').hidden = edNova;
  desenharRetratoEditor();
  desenharLinhasRolagem();
  $('editor').hidden = false;
  $('editor').querySelector('.editor-corpo').scrollTop = 0;
  abrirCamada(() => { $('editor').hidden = true; edFicha = null; });
}

function desenharRetratoEditor() {
  const caixa = $('ed-retrato');
  caixa.replaceWith(Object.assign(retrato({ ...edFicha, emoji: $('ed-emoji').value }, true), { id: 'ed-retrato' }));
}

function desenharLinhasRolagem() {
  const caixa = $('ed-rolagens');
  caixa.replaceChildren();
  edFicha.rolagens.forEach((r, i) => {
    const linha = el('div', 'linha-rolagem');
    const nome = el('input'); nome.placeholder = 'Nome (ex.: Espada)'; nome.value = r.nome;
    const expr = el('input'); expr.placeholder = 'Acerto: 1d20+5; Dano: 1d8+3'; expr.value = r.expr;
    expr.autocapitalize = 'off'; expr.spellcheck = false;
    const remover = el('button', '', '✕'); remover.type = 'button'; remover.setAttribute('aria-label', 'Remover rolagem');
    nome.addEventListener('input', () => { r.nome = nome.value; });
    expr.addEventListener('input', () => { r.expr = expr.value; linha.classList.remove('invalida'); });
    remover.addEventListener('click', () => { edFicha.rolagens.splice(i, 1); desenharLinhasRolagem(); });
    linha.append(nome, expr, remover);
    caixa.append(linha);
  });
}

$('ed-adicionar').addEventListener('click', () => {
  edFicha.rolagens.push({ nome: '', expr: '' });
  desenharLinhasRolagem();
  const linhas = $('ed-rolagens').querySelectorAll('.linha-rolagem input');
  linhas[linhas.length - 2].focus();
});
$('ed-emoji').addEventListener('input', desenharRetratoEditor);

// Imagem: corta no meio em quadrado e reduz para 256×256 (JPEG), para caber no armazenamento.
function lerImagem(arquivo) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const lado = 256;
      const menor = Math.min(img.naturalWidth, img.naturalHeight);
      const tela = document.createElement('canvas');
      tela.width = tela.height = lado;
      tela.getContext('2d').drawImage(img,
        (img.naturalWidth - menor) / 2, (img.naturalHeight - menor) / 2, menor, menor, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      ok(tela.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

$('ed-arquivo').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo) return;
  try {
    edFicha.imagem = await lerImagem(arquivo);
    desenharRetratoEditor();
  } catch (e) {
    $('ed-aviso').textContent = e.message;
  }
});
$('ed-remover-imagem').addEventListener('click', () => { edFicha.imagem = null; desenharRetratoEditor(); });

function salvarEditor() {
  const aviso = $('ed-aviso');
  aviso.className = 'aviso';
  const nome = $('ed-nome').value.trim();
  if (!nome) { aviso.textContent = 'A ficha precisa de um nome.'; $('ed-nome').focus(); return; }

  // Confere as rolagens (linhas totalmente vazias são ignoradas).
  const rolagens = [];
  const linhas = $('ed-rolagens').children;
  for (let i = 0; i < edFicha.rolagens.length; i++) {
    const r = { nome: edFicha.rolagens[i].nome.trim(), expr: edFicha.rolagens[i].expr.trim() };
    if (!r.nome && !r.expr) continue;
    try {
      if (!r.nome) throw new Error('falta o nome da rolagem.');
      validar(r.expr);
    } catch (e) {
      linhas[i].classList.add('invalida');
      aviso.textContent = `Rolagem ${i + 1}${r.nome ? ` (${r.nome})` : ''}: ${e.message}`;
      return;
    }
    rolagens.push(r);
  }

  const antiga = acharFicha(edFicha.id);
  const ficha = limparFicha({
    ...edFicha, nome, rolagens,
    tipo: $('ed-tipo').value,
    subtitulo: $('ed-subtitulo').value.trim(),
    emoji: $('ed-emoji').value.trim(),
    ca: $('ed-ca').value,
    pvMax: $('ed-pv').value,
    notas: $('ed-notas').value.trim(),
    // PV atual: mantém o que estava (ou começa cheio)
    pv: antiga && antiga.pvMax ? antiga.pv : $('ed-pv').value,
  });
  const i = fichas.findIndex(f => f.id === ficha.id);
  const copiaAnterior = fichas.slice();
  if (i >= 0) fichas[i] = ficha; else fichas.unshift(ficha);
  if (!salvarFichas()) {
    fichas = copiaAnterior;
    aviso.textContent = 'Sem espaço para salvar. Remova imagens de outras fichas ou faça backup e apague algumas.';
    return;
  }
  if (edNova) depoisDeVoltar = () => abrirFicha(ficha.id);
  voltar();
  if (fichaAtual) desenharFicha();
  desenharListaFichas();
}

$('editor-salvar').addEventListener('click', salvarEditor);
$('editor-form').addEventListener('submit', (ev) => { ev.preventDefault(); salvarEditor(); });
$('editor-cancelar').addEventListener('click', voltar);

$('ed-duplicar').addEventListener('click', () => {
  const original = acharFicha(edFicha.id);
  const copia = { ...structuredClone(original), id: 'f-' + Date.now().toString(36), nome: original.nome + ' (cópia)' };
  fichas.splice(fichas.indexOf(original) + 1, 0, copia);
  if (!salvarFichas()) { fichas.splice(fichas.indexOf(copia), 1); $('ed-aviso').textContent = 'Sem espaço para duplicar.'; return; }
  depoisDeVoltar = () => abrirFicha(copia.id);
  history.go(-camadas.length);
});

$('ed-apagar').addEventListener('click', () => {
  if (!confirm(`Apagar a ficha "${edFicha.nome}"? Não dá para desfazer.`)) return;
  fichas = fichas.filter(f => f.id !== edFicha.id);
  salvarFichas();
  history.go(-camadas.length);
});

// ---------- 12. Início ----------
aplicarTema();
mostrarAba(config.aba === 'fichas' ? 'fichas' : 'dados');
atualizarPrevia();
