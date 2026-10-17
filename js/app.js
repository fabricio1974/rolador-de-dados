// ===== INTERFACE =====
// Liga os botões às funções de js/logica.js, desenha na tela e guarda tudo no
// localStorage. Organizado em seções numeradas, de cima para baixo.

// Versão do app: aumente a cada mudança (e o ?v= no index.html) para saber qual está aberta.
const VERSAO = '5';

// ---------- 1. Utilidades ----------
const $ = (id) => document.getElementById(id);

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// Ícones desenhados aqui mesmo (SVG), para ficarem iguais em qualquer celular
// (emojis mudam de cara de um aparelho para outro). Cada um é uma lista de traços
// numa grade de 24×24; o traço usa a cor do texto do botão.
const ICONES = {
  dado: ['M4 4h16v16H4z', 'M8 8h1v1H8z', 'M15 8h1v1h-1z', 'M11.5 11.5h1v1h-1z', 'M8 15h1v1H8z', 'M15 15h1v1h-1z'],
  ficha: ['M5 3h10l4 4v14H5z', 'M15 3v4h4', 'M8 11h8', 'M8 15h8', 'M8 19h5'],
  relogio: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7v5l3 3'],
  estrela: ['M12 3l2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.7z'],
  ajustes: ['M4 6h9', 'M19 6h1', 'M4 12h3', 'M13 12h7', 'M4 18h11', 'M13 4h6v4h-6z', 'M7 10h6v4H7z', 'M15 16h5v4h-5z'],
  voltar: ['M20 12H5', 'M11 5l-7 7 7 7'],
  lapis: ['M4 20h4L20 8l-4-4L4 16z', 'M13 7l4 4'],
  fechar: ['M6 6l12 12', 'M18 6L6 18'],
  camera: ['M3 7h4l2-3h6l2 3h4v13H3z', 'M12 9a4 4 0 1 0 0 8a4 4 0 1 0 0-8z'],
  seta: ['M6 9l6 6 6-6'],
};
function icone(nome) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ICONES[nome] || []) {
    const traco = document.createElementNS(ns, 'path');
    traco.setAttribute('d', d);
    svg.append(traco);
  }
  return svg;
}
// No HTML, <i data-icone="nome"></i> vira o desenho.
document.querySelectorAll('[data-icone]').forEach(i => i.replaceWith(icone(i.dataset.icone)));

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
} else {
  // Fichas de versões antigas não têm os campos novos (condições, PV temporário...):
  // limparFicha completa o que falta sem mexer no resto.
  fichas = fichas.map(limparFicha).filter(Boolean);
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

// Um grupo de dados: cada dado é um quadradinho com a cor do seu tipo (d6, d20...).
// "contador" numera os dados para a animação de entrada sair em sequência.
function desenharGrupo(grupo, contador) {
  const g = el('span', 'grupo');
  for (const d of grupo) {
    let classe = 'dado';
    if (d.valor === d.faces) classe += ' max';
    else if (d.valor === 1) classe += ' min';
    if (d.descartado) classe += ' fora';
    const dado = el('span', classe, String(d.valor));
    dado.dataset.f = d.faces;   // o CSS usa para pintar com a cor do dado
    dado.style.setProperty('--i', Math.min(contador.n++, 24));
    g.append(dado);
  }
  return g;
}

function desenharLinhas(alvo, res) {
  const contador = { n: 0 };
  let anterior = null;
  res.linhas.forEach((linha, i) => {
    // Constante depois da primeira parcela aparece com sinal ("+5") na mesma
    // linha dos dados de antes, para o resultado ocupar menos espaço.
    const sinal = i > 0 && !linha.grupos.length && !linha.texto.startsWith('−') ? '+' : '';
    if (anterior && !linha.grupos.length) {
      anterior.append(el('span', 'constante', sinal + linha.texto));
      return;
    }
    const div = el('div', 'linha');
    const repetida = linha.repeticoes && linha.repeticoes.length > 1;
    div.append(el('span', 'rotulo', sinal + linha.texto + (linha.grupos.length && !repetida ? ':' : '')));
    anterior = repetida ? null : div;
    if (repetida) {
      // Repetição: uma linha por vez, numerada, com o valor de cada uma.
      const lista = el('div', 'repeticoes');
      linha.repeticoes.forEach((r, k) => {
        const item = el('div', 'repeticao');
        item.append(el('span', 'ordem', `${k + 1}ª`));
        const dados = el('span', 'dados-rep');
        for (const grupo of r.grupos) dados.append(desenharGrupo(grupo, contador));
        item.append(dados, el('span', 'valor-rep', String(r.valor)));
        lista.append(item);
      });
      div.append(el('span', 'subtotal', '= ' + linha.subtotal), lista);
    } else {
      for (const grupo of linha.grupos) div.append(desenharGrupo(grupo, contador));
      if (linha.grupos.length) div.append(el('span', 'subtotal', '= ' + linha.subtotal));
    }
    alvo.append(div);
  });
}

// Reinicia a animação de entrada do resultado (transição suave, sem "dado rolando").
function animar(alvo) {
  alvo.classList.remove('anima');
  void alvo.offsetWidth; // força o navegador a "esquecer" a animação anterior
  alvo.classList.add('anima');
}

// Classe de cor do número: verde no 20 natural ou crítico, vermelha no 1 natural.
function classeNatural(parte) {
  if (parte.natural === 20 || parte.critico) return ' critico';
  if (parte.natural === 1) return ' falha';
  return '';
}

function desenharResumo(rolagem) {
  const faixa = el('div', 'resumo-topo');
  for (const item of resumoCompacto(rolagem)) {
    let classe = 'chip-resumo ' + item.tipo;
    if (item.natural === 20 || item.critico) classe += ' critico';
    else if (item.natural === 1) classe += ' falha';
    const chip = el('span', classe);
    chip.append(el('small', '', item.rotulo), el('b', '', String(item.valor)));
    faixa.append(chip);
  }
  return faixa;
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
    alvo.append(el('div', 'total' + classeNatural(p), String(p.res.total)), exp);
    if (config.stats) alvo.append(el('div', 'stats', textoStats(p.res.stats)));
    desenharLinhas(alvo, p.res);
  } else {
    // Várias partes: primeiro um resumo compacto ("Acerto 25 · Dano 19"), que fica
    // grudado no topo enquanto se rolam os detalhes; depois um bloco para cada parte.
    alvo.append(desenharResumo(rolagem));
    const somas = somasDeDano(rolagem);
    partes.forEach((p, i) => {
      const bloco = el('div', 'parte');
      const nome = el('span', 'nome', p.rotulo || 'Resultado');
      nome.append(...selos(p));
      const cabeca = el('div', 'parte-cabeca');
      cabeca.append(nome, el('span', 'valor' + classeNatural(p), String(p.res.total)));
      const stats = config.stats ? textoStats(p.res.stats) : '';
      bloco.append(cabeca, el('div', 'expr-rolada', p.res.expressao + (stats ? '  ·  ' + stats : '')));
      desenharLinhas(bloco, p.res);
      alvo.append(bloco);
      // Depois da última parte de dano seguida, a soma delas (ex.: Dano + Fogo).
      const soma = somas.find(s => s.fim === i);
      if (soma) {
        const linhaSoma = el('div', 'soma-dano');
        linhaSoma.append(el('span', 'nome', 'Total'), el('small', '', soma.rotulos.join(' + ')),
          el('span', 'valor', String(soma.total)));
        alvo.append(linhaSoma);
      }
    });
  }
  // A borda do resultado fica verde num 20 natural e vermelha num 1 natural.
  const algumCritico = partes.some(p => p.natural === 20);
  const algumaFalha = partes.some(p => p.natural === 1);
  const moldura = alvo.closest('.ficha-resultado') || alvo;
  moldura.classList.toggle('tem-critico', algumCritico);
  moldura.classList.toggle('tem-falha', algumaFalha && !algumCritico);
  animar(alvo);
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
  const moldura = alvo.closest('.ficha-resultado') || alvo;
  moldura.classList.remove('tem-critico', 'tem-falha');
  animar(alvo);
}

// Barra de atalhos: favoritos (★) e rolagens recentes (↻). Um toque já rola.
function desenharAtalhos() {
  const barra = $('atalhos');
  barra.replaceChildren();
  const atalhos = montarAtalhos(favoritos, historico);
  barra.hidden = !atalhos.length;
  for (const a of atalhos) {
    const b = el('button', 'atalho ' + a.tipo, (a.tipo === 'favorito' ? '★ ' : '↻ ') + a.nome);
    b.title = a.expr;
    b.addEventListener('click', () => {
      visor.value = a.expr;
      tituloVisor = a.tipo === 'favorito' || a.nome !== a.expr ? a.nome : '';
      executarRolagem();
    });
    barra.append(b);
  }
  barra.scrollLeft = 0;
}

// Expressão comprida: a letra do visor diminui para caber mais.
function ajustarVisor() {
  const n = visor.value.length;
  visor.classList.toggle('medio', n > 14 && n <= 22);
  visor.classList.toggle('longo', n > 22);
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
  ajustarVisor();
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
    desenharAtalhos();
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
  $('painel-titulo').textContent = { historico: 'Histórico', favoritos: 'Favoritos', config: 'Configurações' }[tipo];
  desenharPainel();
  if ($('painel').hidden) {
    $('painel').hidden = false;
    abrirCamada(() => { $('painel').hidden = true; painelAtual = null; desenharAtalhos(); });
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
  abrir.append(el('span', 'principal', principal));
  if (resumo) abrir.append(el('span', 'resumo', resumo));
  abrir.append(el('small', '', secundario));
  abrir.addEventListener('click', aoAbrir);
  const remover = el('button', 'remover');
  remover.append(icone('fechar'));
  remover.setAttribute('aria-label', 'Remover');
  remover.addEventListener('click', aoRemover);
  linha.append(abrir, remover);
  return linha;
}

function desenharHistorico(corpo) {
  if (!historico.length) { corpo.append(el('p', 'vazio', 'Nenhuma rolagem ainda.')); return; }
  historico.forEach((h, i) => {
    corpo.append(itemDeLista(h.titulo || nomeCurto(h.expr), h.detalhe || h.expr, h.resumo ?? String(h.total ?? ''),
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
    aplicarTema(); desenharPainel(); desenharListaFichas(); desenharAtalhos();
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

// Nomes curtos das condições marcadas (e da exaustão), para a lista e o cabeçalho.
function nomesDasCondicoes(f) {
  const nomes = CONDICOES.filter(c => f.condicoes.includes(c.id)).map(c => c.nome);
  if (f.exaustao) nomes.unshift(`Exaustão ${f.exaustao}`);
  return nomes;
}

function cartaoFicha(f) {
  const cartao = el('button', 'cartao-ficha ' + f.tipo + (f.pvMax && f.pv === 0 ? ' caido' : ''));
  const info = el('div', 'info');
  info.append(el('div', 'nome', f.nome), el('div', 'sub', f.subtitulo || (f.tipo === 'monstro' ? 'Monstro' : 'Personagem')));
  const numeros = el('div', 'numeros');
  if (f.ca !== null) numeros.append(el('span', 'num-ca', `CA ${f.ca}`));
  if (f.pvMax) {
    numeros.append(el('span', 'num-pv', `PV ${f.pv}/${f.pvMax}`));
    if (f.pvTemp) numeros.append(el('span', 'num-temp', `+${f.pvTemp} temp`));
  }
  numeros.append(el('span', 'num-rol', `${f.rolagens.length} rolagens`));
  info.append(numeros);
  if (f.pvMax) info.append(barraPV(f));
  const condicoes = nomesDasCondicoes(f);
  if (condicoes.length) {
    const tags = el('div', 'tags');
    for (const nome of condicoes) tags.append(el('span', 'tag', nome));
    info.append(tags);
  }
  cartao.append(retrato(f), info);
  cartao.addEventListener('click', () => abrirFicha(f.id));
  return cartao;
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
  // Em "Todos", personagens e monstros ficam em grupos separados, com título.
  const grupos = filtro === 'todos'
    ? [['Personagens', visiveis.filter(f => f.tipo === 'personagem')], ['Monstros', visiveis.filter(f => f.tipo === 'monstro')]]
    : [['', visiveis]];
  for (const [titulo, doGrupo] of grupos) {
    if (!doGrupo.length) continue;
    if (titulo) {
      const cabeca = el('h2', 'titulo-grupo', titulo);
      cabeca.append(el('span', '', String(doGrupo.length)));
      lista.append(cabeca);
    }
    for (const f of doGrupo) lista.append(cartaoFicha(f));
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
let escolhendoCondicao = false;  // a grade de condições está aberta?
let avisoPV = '';                // recado depois de dano/cura (ex.: teste de Concentração)
let resultadoRecolhido = false;  // painel de resultado mostrando só o resumo

const acharFicha = (id) => fichas.find(f => f.id === id);

function abrirFicha(id) {
  fichaAtual = id;
  modo = 'normal';
  escolhendoCondicao = false;
  avisoPV = '';
  $('ficha-resultado').hidden = true;
  desenharFicha();
  $('ficha').hidden = false;
  $('ficha-corpo').scrollTop = 0;
  abrirCamada(() => { $('ficha').hidden = true; fichaAtual = null; desenharListaFichas(); });
}

// Salva e redesenha mantendo a posição da rolagem da tela (para não "pular" ao tocar).
function mudouFicha() {
  salvarFichas();
  const corpo = $('ficha-corpo');
  const posicao = corpo.scrollTop;
  desenharFicha();
  corpo.scrollTop = posicao;
}

function caixa(rotulo, valor, classe) {
  const c = el('div', 'caixa' + (classe ? ' ' + classe : ''));
  c.append(el('div', 'rot', rotulo), el('div', 'num', valor));
  return c;
}

// PV: caixas de CA / PV / temporários e, embaixo, a quantidade com Dano, Cura e Temp.
function desenharPV(f, corpo) {
  const caixas = el('div', 'caixas');
  caixas.append(caixa('CA', f.ca !== null ? String(f.ca) : '—', 'caixa-ca'));
  if (!f.pvMax) {
    caixas.append(caixa('Pontos de Vida', '—'));
    corpo.append(caixas);
    return;
  }
  const pv = caixa('Pontos de Vida', '', 'caixa-pv');
  const numero = pv.querySelector('.num');
  numero.append(el('span', '', String(f.pv)), el('small', '', ' / ' + f.pvMax));
  pv.append(barraPV(f));
  caixas.append(pv, caixa('Temp.', f.pvTemp ? '+' + f.pvTemp : '0', 'caixa-temp' + (f.pvTemp ? ' tem' : '')));
  corpo.append(caixas);

  const controles = el('div', 'pv-controles');
  const qtd = el('input'); qtd.type = 'number'; qtd.inputMode = 'numeric'; qtd.min = '0'; qtd.placeholder = 'qtd';
  qtd.setAttribute('aria-label', 'Quantidade de dano, cura ou PV temporários');
  const mudar = (acao) => {
    const n = Math.abs(parseInt(qtd.value, 10)) || 0;
    if (!n) { qtd.focus(); return; }
    avisoPV = '';
    if (acao === 'dano') {
      const novo = aplicarDano(f.pv, f.pvTemp, n);
      const recados = [];
      if (novo.pvTemp < f.pvTemp) recados.push(`${f.pvTemp - novo.pvTemp} nos PV temporários.`);
      if (f.condicoes.includes('concentrando')) recados.push(`Concentração: salvaguarda de Constituição CD ${cdConcentracao(n)}.`);
      if (f.tipo === 'personagem' && novo.sobra >= f.pvMax) recados.push('Dano massivo: o que passou do 0 é igual ou maior que o PV máximo, morte instantânea.');
      else if (novo.pv === 0 && f.pv > 0) {
        recados.push(f.tipo === 'personagem' ? 'Chegou a 0 PV: fica Inconsciente e faz salvaguardas contra a morte.' : 'Chegou a 0 PV.');
      } else if (f.pv === 0 && novo.sobra > 0 && f.tipo === 'personagem') {
        recados.push('Dano com 0 PV: uma falha na salvaguarda contra a morte (duas se for crítico).');
      }
      avisoPV = recados.join(' ');
      f.pv = novo.pv; f.pvTemp = novo.pvTemp;
    } else if (acao === 'cura') {
      f.pv = aplicarCura(f.pv, f.pvMax, n);
    } else {
      f.pvTemp = ganharPVTemp(f.pvTemp, n);
    }
    mudouFicha();
  };
  for (const [acao, texto] of [['dano', '− Dano'], [null, ''], ['cura', '+ Cura'], ['temp', '+ Temp']]) {
    if (!acao) { controles.append(qtd); continue; }
    const b = el('button', acao, texto);
    b.addEventListener('click', () => mudar(acao));
    controles.append(b);
  }
  corpo.append(controles);
  if (avisoPV) corpo.append(el('p', 'aviso-pv', avisoPV));
}

// Condições (Caído, Envenenado...), Concentração e Exaustão: marcadas com um toque.
function desenharCondicoes(f, corpo) {
  const area = el('div', 'condicoes');
  const marcadas = el('div', 'tags');
  if (f.exaustao) marcadas.append(el('span', 'tag forte', `Exaustão ${f.exaustao}`));
  for (const c of CONDICOES) {
    if (!f.condicoes.includes(c.id)) continue;
    const tag = el('button', 'tag forte' + (c.marcador ? ' marcador' : ''), c.nome + ' ');
    tag.append(icone('fechar'));
    tag.setAttribute('aria-label', `Tirar ${c.nome}`);
    tag.addEventListener('click', () => { f.condicoes = f.condicoes.filter(x => x !== c.id); mudouFicha(); });
    marcadas.append(tag);
  }
  const alternar = el('button', 'tag adicionar' + (escolhendoCondicao ? ' aberto' : ''), escolhendoCondicao ? 'Pronto' : '+ Condição');
  alternar.setAttribute('aria-expanded', String(escolhendoCondicao));
  alternar.addEventListener('click', () => { escolhendoCondicao = !escolhendoCondicao; mudouFicha(); });
  marcadas.append(alternar);
  area.append(marcadas);

  if (escolhendoCondicao) {
    const grade = el('div', 'grade-condicoes');
    for (const c of CONDICOES) {
      const ligada = f.condicoes.includes(c.id);
      const b = el('button', 'opcao-condicao' + (ligada ? ' ligada' : '') + (c.marcador ? ' marcador' : ''), c.nome);
      b.setAttribute('aria-pressed', String(ligada));
      b.addEventListener('click', () => {
        // Guarda na ordem da lista de condições, sem repetir.
        const novas = new Set(f.condicoes);
        if (ligada) novas.delete(c.id); else novas.add(c.id);
        f.condicoes = CONDICOES.map(x => x.id).filter(id => novas.has(id));
        mudouFicha();
      });
      grade.append(b);
    }
    // Exaustão tem níveis (1 a 6): − nível +
    const exaustao = el('div', 'exaustao');
    const menos = el('button', '', '−'); menos.setAttribute('aria-label', 'Diminuir exaustão');
    const mais = el('button', '', '+'); mais.setAttribute('aria-label', 'Aumentar exaustão');
    menos.disabled = !f.exaustao;
    mais.disabled = f.exaustao >= MAX_EXAUSTAO;
    menos.addEventListener('click', () => { f.exaustao = Math.max(0, f.exaustao - 1); mudouFicha(); });
    mais.addEventListener('click', () => { f.exaustao = Math.min(MAX_EXAUSTAO, f.exaustao + 1); mudouFicha(); });
    const texto = el('span', '', 'Exaustão ');
    texto.append(el('b', '', String(f.exaustao)));
    exaustao.append(texto, menos, mais);
    area.append(grade, exaustao);
  }

  // Lembrete do efeito de cada condição marcada.
  const efeitos = el('ul', 'efeitos');
  if (f.exaustao) {
    efeitos.append(el('li', '', `Exaustão ${f.exaustao}: −${2 * f.exaustao} em todo teste de d20 (já descontado nas rolagens abaixo) e −${num(1.5 * f.exaustao)} m de deslocamento.` +
      (f.exaustao >= MAX_EXAUSTAO ? ' No nível 6, a criatura morre.' : '')));
  }
  for (const c of CONDICOES) {
    if (!f.condicoes.includes(c.id)) continue;
    const item = el('li');
    item.append(el('b', '', c.nome + ': '), c.efeito);
    efeitos.append(item);
  }
  if (efeitos.children.length) area.append(efeitos);
  corpo.append(area);
}

function desenharFicha() {
  const f = acharFicha(fichaAtual);
  if (!f) return;
  $('ficha-titulo').textContent = f.nome;
  const corpo = $('ficha-corpo');
  corpo.replaceChildren();

  // Cabeça: imagem + tipo + descrição
  const cabeca = el('div', 'ficha-cabeca' + (f.tipo === 'monstro' ? ' monstro' : ''));
  const textos = el('div', 'textos');
  textos.append(el('div', 'tipo', f.tipo === 'monstro' ? 'Monstro' : 'Personagem'), el('div', 'sub', f.subtitulo || ''));
  cabeca.append(retrato(f, true), textos);
  corpo.append(cabeca);

  desenharPV(f, corpo);
  desenharCondicoes(f, corpo);

  // Modo: normal / vantagem / desvantagem (vale para os d20 das rolagens)
  const modos = el('div', 'modo');
  for (const [id, nome] of [['normal', 'Normal'], ['vant', 'Vantagem'], ['desv', 'Desvantagem']]) {
    const b = el('button', modo === id ? 'ativo' : '', nome);
    b.dataset.modo = id;
    b.addEventListener('click', () => { modo = id; mudouFicha(); });
    modos.append(b);
  }
  corpo.append(el('h2', 'titulo-secao', 'Rolagens'), modos);

  // Rolagens
  const botoes = el('div', 'botoes-rolagem');
  for (const r of f.rolagens) {
    const b = el('button', 'botao-rolagem' + (/d20(?!\d)/.test(r.expr) ? ' teste' : ''));
    b.append(el('b', '', r.nome), el('small', '', r.expr));
    b.addEventListener('click', () => rolarDaFicha(f, r));
    botoes.append(b);
  }
  if (!f.rolagens.length) botoes.append(el('p', 'vazio', 'Sem rolagens. Toque no lápis para adicionar.'));
  corpo.append(botoes);

  if (f.notas) corpo.append(el('h2', 'titulo-secao', 'Notas'), el('div', 'notas', f.notas));
}

function rolarDaFicha(f, r) {
  const expr = aplicarExaustao(aplicarModo(r.expr, modo), f.exaustao);
  const extras = [];
  if (modo === 'vant') extras.push('Vantagem');
  if (modo === 'desv') extras.push('Desvantagem');
  if (f.exaustao && expr !== aplicarModo(r.expr, modo)) extras.push(`Exaustão −${2 * f.exaustao}`);
  const titulo = `${f.nome} — ${r.nome}` + (extras.length ? ` (${extras.join(', ')})` : '');
  const alvo = $('ficha-resultado-conteudo');
  try {
    const rolagem = fazerRolagem(expr);
    desenharRolagem(alvo, rolagem, titulo);
    registrar(titulo, expr, rolagem);
    desenharAtalhos();
  } catch (e) {
    mostrarErro(alvo, e.message);
  }
  $('ficha-resultado').hidden = false;
}

// Recolher: o painel de resultado mostra só o título e o resumo, liberando os botões.
function aplicarRecolhido() {
  $('ficha-resultado').classList.toggle('recolhido', resultadoRecolhido);
  $('recolher-resultado').setAttribute('aria-expanded', String(!resultadoRecolhido));
  $('recolher-resultado').setAttribute('aria-label', resultadoRecolhido ? 'Mostrar detalhes' : 'Recolher detalhes');
}

$('ficha-voltar').addEventListener('click', voltar);
$('ficha-editar').addEventListener('click', () => abrirEditor(fichaAtual));
$('fechar-resultado').addEventListener('click', () => { $('ficha-resultado').hidden = true; });
$('recolher-resultado').addEventListener('click', () => { resultadoRecolhido = !resultadoRecolhido; aplicarRecolhido(); });

// ---------- 11. Editor de ficha ----------
let edFicha = null;     // cópia sendo editada
let edNova = false;

function abrirEditor(id) {
  edNova = !id;
  edFicha = id
    ? structuredClone(acharFicha(id))
    : { id: 'f-' + Date.now().toString(36), tipo: 'personagem', nome: '', subtitulo: '', emoji: '', imagem: null,
        ca: null, pvMax: null, pv: null, pvTemp: 0, exaustao: 0, condicoes: [], notas: '',
        rolagens: [{ nome: 'Iniciativa', expr: '1d20+0' }] };
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
    const nome = el('input', 'rol-nome'); nome.placeholder = 'Nome (ex.: Espada)'; nome.value = r.nome;
    const expr = el('input', 'rol-expr'); expr.placeholder = 'Acerto: 1d20+5; Dano: 1d8+3'; expr.value = r.expr;
    expr.autocapitalize = 'off'; expr.spellcheck = false;
    const remover = el('button', 'remover'); remover.type = 'button'; remover.setAttribute('aria-label', 'Remover rolagem');
    remover.append(icone('fechar'));
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
aplicarRecolhido();
mostrarAba(config.aba === 'fichas' ? 'fichas' : 'dados');
desenharAtalhos();
atualizarPrevia();
