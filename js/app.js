// ===== INTERFACE =====
// Liga os botões às funções de js/logica.js, desenha na tela e guarda tudo no
// localStorage. Organizado em seções numeradas, de cima para baixo.

// Versão do app: aumente a cada mudança (e o ?v= no index.html) para saber qual está aberta.
const VERSAO = '8';

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
  // Engrenagem (Configurações): 8 dentes em volta de um furo redondo.
  engrenagem: ['M9.8 4.7L10 1.8L14 1.8L14.2 4.7L15.6 5.3L17.8 3.4L20.6 6.2L18.7 8.4L19.3 9.8L22.2 10L22.2 14L19.3 14.2L18.7 15.6L20.6 17.8L17.8 20.6L15.6 18.7L14.2 19.3L14 22.2L10 22.2L9.8 19.3L8.4 18.7L6.2 20.6L3.4 17.8L5.3 15.6L4.7 14.2L1.8 14L1.8 10L4.7 9.8L5.3 8.4L3.4 6.2L6.2 3.4L8.4 5.3z',
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z'],
  baixar: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16'],
  enviar: ['M12 15V3', 'M7 8l5-5 5 5', 'M4 20h16'],
  lixeira: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  restaurar: ['M4 12a8 8 0 1 0 2.3-5.7', 'M4 3v5h5'],
  lua: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  ampulheta: ['M6 3h12', 'M6 21h12', 'M7 3v3l5 6-5 6v3', 'M17 3v3l-5 6 5 6v3'],
  celular: ['M7 2h10v20H7z', 'M11 18h2'],
  coracao: ['M12 20l-7.5-7.5a4.6 4.6 0 0 1 7.5-5.3 4.6 4.6 0 0 1 7.5 5.3z'],
  voltar: ['M20 12H5', 'M11 5l-7 7 7 7'],
  lapis: ['M4 20h4L20 8l-4-4L4 16z', 'M13 7l4 4'],
  fechar: ['M6 6l12 12', 'M18 6L6 18'],
  camera: ['M3 7h4l2-3h6l2 3h4v13H3z', 'M12 9a4 4 0 1 0 0 8a4 4 0 1 0 0-8z'],
  seta: ['M6 9l6 6 6-6'],
  espadas: ['M4 4l12 12', 'M20 4L8 16', 'M13 19l6-6', 'M5 13l6 6', 'M16 16l4 4', 'M8 16l-4 4'],
  mais: ['M12 5v14', 'M5 12h14'],
  subir: ['M12 20V5', 'M5 11l7-7 7 7'],
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
// Sem espaço: avisa uma vez (senão a mudança some ao fechar o app sem ninguém saber).
// "avisar = false" quando quem chama já mostra o próprio aviso (editor de ficha).
let avisouSemEspaco = false;
function gravar(chave, valor, avisar = true) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
  catch {
    if (avisar && !avisouSemEspaco) {
      avisouSemEspaco = true;
      setTimeout(() => alert('Sem espaço para salvar no aparelho: as últimas mudanças podem se perder ao fechar o app. Faça um backup e remova imagens de algumas fichas.'), 0);
    }
    return false;
  }
}

const num = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- 2. Estado (o que fica salvo) ----------
const CONFIG_PADRAO = { tema: 'classico', fundo: 'carvao', vibrar: true, stats: true, critico: true, agitar: false, aba: 'dados', recolhido: false };
// Tudo passa por uma conferência: dado estragado (ou de versão antiga) não quebra a tela.
let config = limparConfig(ler('rolador.config', {}), CONFIG_PADRAO);
let historico = limparHistorico(ler('rolador.historico', []));
let favoritos = limparFavoritos(ler('rolador.favoritos', []));
let fichas = ler('rolador.fichas', null);
if (!Array.isArray(fichas)) {
  // Primeira vez: começa com os 10 monstros padrão.
  fichas = MONSTROS_PADRAO.map(limparFicha);
  gravar('rolador.fichas', fichas);
} else {
  // Fichas de versões antigas não têm os campos novos (condições, PV temporário...):
  // limparFicha completa o que falta sem mexer no resto. Os monstros padrão salvos
  // antes da versão 7 ganham os usos novos e perdem a rolagem "Recarga do Sopro (5–6)".
  fichas = fichas.map(f => limparFicha(migrarFicha(f, MONSTROS_PADRAO))).filter(Boolean);
  gravar('rolador.fichas', fichas);
}

// Combate em andamento (versão 6). Sem nada salvo ou com dado estragado: combate vazio.
let combate = limparCombate(ler('rolador.combate', null));

const salvarConfig = () => gravar('rolador.config', config);
const salvarFichas = (avisar = true) => gravar('rolador.fichas', fichas, avisar);
const salvarCombate = () => gravar('rolador.combate', combate);

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

// Recarregou a página com uma camada aberta: o navegador ainda tem as entradas das
// camadas, mas elas não existem mais. Volta até a entrada de base, senão o botão
// voltar deixaria de fechar as próximas camadas abertas.
if (history.state && history.state.camada > 0) history.go(-history.state.camada);

function mostrarAba(aba) {
  config.aba = aba;
  salvarConfig();
  document.querySelectorAll('.abas button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  $('tela-dados').hidden = aba !== 'dados';
  $('tela-fichas').hidden = aba !== 'fichas';
  $('tela-combate').hidden = aba !== 'combate';
  if (aba === 'fichas') desenharListaFichas();
  if (aba === 'combate') desenharCombate();
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

// Texto do veredito contra a CA/CD do alvo: "ACERTOU", "ERROU", "PASSOU", "FALHOU".
function textoVeredito(v) {
  if (v.tipo === 'ataque') return v.sucesso ? 'ACERTOU' : 'ERROU';
  return v.sucesso ? 'PASSOU' : 'FALHOU';
}

function desenharResumo(rolagem, vereditos) {
  const faixa = el('div', 'resumo-topo');
  let errou = false;  // o dano depois de um ataque que errou fica apagado
  for (const item of resumoCompacto(rolagem)) {
    let classe = 'chip-resumo ' + item.tipo;
    if (item.natural === 20 || item.critico) classe += ' critico';
    else if (item.natural === 1) classe += ' falha';
    if (item.tipo === 'dano' && errou) classe += ' apagado';
    const chip = el('span', classe);
    chip.append(el('small', '', item.rotulo), el('b', '', String(item.valor)));
    faixa.append(chip);
    const v = item.tipo === 'ataque' && vereditos ? vereditos[item.parte] : null;
    if (item.tipo === 'ataque') errou = Boolean(v && !v.sucesso);
    if (v) faixa.append(el('span', 'chip-veredito ' + (v.sucesso ? 'sucesso' : 'fracasso'), textoVeredito(v)));
  }
  return faixa;
}

// "valorAlvo" (opcional) é a CA ou CD do alvo: mostra se acertou/passou.
function desenharRolagem(alvo, rolagem, titulo, valorAlvo = null) {
  alvo.replaceChildren();
  if (titulo) alvo.append(el('div', 'titulo-rolagem', titulo));
  const partes = rolagem.partes;
  const vereditos = compararComAlvo(rolagem, valorAlvo);
  if (partes.length === 1 && !partes[0].rotulo) {
    // Uma parte só: total grande no meio.
    const p = partes[0];
    const exp = el('div', 'expr-rolada', p.res.expressao);
    exp.append(...selos(p));
    alvo.append(el('div', 'total' + classeNatural(p), String(p.res.total)));
    const v = vereditos[0];
    if (v) {
      alvo.append(el('div', 'veredito ' + (v.sucesso ? 'sucesso' : 'fracasso'),
        `${textoVeredito(v)} · ${v.tipo === 'ataque' ? 'CA' : 'CD'} ${valorAlvo}`));
    }
    alvo.append(exp);
    if (config.stats) alvo.append(el('div', 'stats', textoStats(p.res.stats)));
    desenharLinhas(alvo, p.res);
  } else {
    // Várias partes: primeiro um resumo compacto ("Acerto 25 · Dano 19"), que fica
    // grudado no topo enquanto se rolam os detalhes; depois um bloco para cada parte.
    alvo.append(desenharResumo(rolagem, vereditos));
    const somas = somasDeDano(rolagem);
    partes.forEach((p, i) => {
      const bloco = el('div', 'parte');
      const nome = el('span', 'nome', p.rotulo || 'Resultado');
      nome.append(...selos(p));
      const v = vereditos[i];
      if (v) nome.append(el('span', 'selo ' + (v.sucesso ? 'acerto' : 'erro'), `${textoVeredito(v)} ${v.tipo === 'ataque' ? 'CA' : 'CD'} ${valorAlvo}`));
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
  // "quando" (versão 7): a hora da rolagem, para agrupar o histórico por dia.
  historico.unshift({ titulo, expr, resumo: resumir(rolagem), detalhe, quando: Date.now() });
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
  $('painel-titulo').textContent = { historico: 'Histórico', favoritos: 'Favoritos', config: 'Configurações', adicionar: 'Adicionar ao combate' }[tipo];
  desenharPainel();
  if ($('painel').hidden) {
    $('painel').hidden = false;
    abrirCamada(() => { $('painel').hidden = true; painelAtual = null; desenharAtalhos(); desenharCombate(); });
  }
}

function desenharPainel() {
  const corpo = $('painel-corpo');
  corpo.replaceChildren();
  if (painelAtual === 'historico') desenharHistorico(corpo);
  else if (painelAtual === 'favoritos') desenharFavoritos(corpo);
  else if (painelAtual === 'config') desenharConfig(corpo);
  else if (painelAtual === 'adicionar') desenharAdicionar(corpo);
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

function itemDeLista(principal, secundario, resumo, aoAbrir, aoRemover, hora = '') {
  const linha = el('div', 'item');
  const abrir = el('button', 'abrir');
  const nome = el('span', 'principal');
  nome.append(el('span', 'nome-item', principal));
  if (hora) nome.append(el('time', 'hora', hora));
  abrir.append(nome);
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

// Histórico agrupado por dia (Hoje, Ontem, 12/10), com a hora de cada rolagem.
function desenharHistorico(corpo) {
  if (!historico.length) {
    corpo.append(el('p', 'vazio', 'Nenhuma rolagem ainda. As últimas 50 ficam guardadas aqui.'));
    return;
  }
  const barra = el('div', 'barra-painel');
  barra.append(el('span', '', `${historico.length} ${historico.length === 1 ? 'rolagem' : 'rolagens'} · toque para rolar de novo`));
  const limpar = el('button', 'botao perigo');
  limpar.append(icone('lixeira'), 'Limpar');
  limpar.addEventListener('click', () => {
    if (!confirm('Apagar todo o histórico de rolagens?')) return;
    historico = []; gravar('rolador.historico', historico);
    desenharPainel(); desenharAtalhos();
  });
  barra.append(limpar);
  corpo.append(barra);
  for (const grupo of agruparHistorico(historico)) {
    const titulo = el('h2', 'titulo-grupo', grupo.titulo);
    titulo.append(el('span', '', String(grupo.itens.length)));
    corpo.append(titulo);
    for (const { item: h, indice } of grupo.itens) {
      corpo.append(itemDeLista(h.titulo || nomeCurto(h.expr), h.detalhe || h.expr, h.resumo ?? String(h.total ?? ''),
        () => rolarNoVisor(h.expr, h.titulo),
        () => { historico.splice(indice, 1); gravar('rolador.historico', historico); desenharPainel(); },
        horaCurta(h.quando)));
    }
  }
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

function secao(corpo, titulo, nomeIcone) {
  const s = el('section', 'secao');
  const h = el('h2');
  if (nomeIcone) h.append(icone(nomeIcone));
  h.append(titulo);
  s.append(h);
  corpo.append(s);
  return s;
}

// Tamanho aproximado do que o app guardou (as imagens das fichas pesam mais).
function espacoUsado() {
  let total = 0;
  try {
    for (const chave of ['config', 'historico', 'favoritos', 'fichas', 'combate']) {
      total += (localStorage.getItem('rolador.' + chave) || '').length;
    }
  } catch { /* sem acesso ao armazenamento */ }
  return total < 1024 * 1024 ? `${Math.max(1, Math.round(total / 1024))} KB` : `${num(total / 1024 / 1024)} MB`;
}

function desenharConfig(corpo) {
  // 1) Aparência: tema de cores e tom do fundo
  const aparencia = secao(corpo, 'Aparência', 'dado');
  const grade = el('div', 'temas');
  for (const t of TEMAS) {
    const b = el('button', 'tema' + (t.id === config.tema ? ' ativo' : ''));
    b.setAttribute('aria-pressed', String(t.id === config.tema));
    b.append(el('b', '', t.nome));
    const amostras = el('div', 'amostras');
    for (const cor of [...t.dados, t.acento]) {
      const s = el('span'); s.style.background = cor; amostras.append(s);
    }
    b.append(amostras);
    b.addEventListener('click', () => { config.tema = t.id; salvarConfig(); aplicarTema(); desenharPainel(); });
    grade.append(b);
  }
  const fundos = el('div', 'fundos');
  for (const f of FUNDOS) {
    const b = el('button', 'fundo-opcao' + (f.id === config.fundo ? ' ativo' : ''), f.nome);
    b.setAttribute('aria-pressed', String(f.id === config.fundo));
    b.style.background = f.fundo;
    b.addEventListener('click', () => { config.fundo = f.id; salvarConfig(); aplicarTema(); desenharPainel(); });
    fundos.append(b);
  }
  aparencia.append(el('h3', 'subtitulo', 'Cores dos dados'), grade, el('h3', 'subtitulo', 'Fundo'), fundos);

  // 2) e 3) Opções liga/desliga, num cartão por assunto
  const chave = (grupo, campo, titulo, ajuda, aoLigar) => {
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
    grupo.append(rot);
  };
  const rolagens = el('div', 'grupo-opcoes');
  chave(rolagens, 'critico', 'Crítico automático', 'Com 20 natural no acerto, os dados do dano dobram.');
  chave(rolagens, 'stats', 'Mostrar mínimo, média e máximo', 'Na prévia e no resultado.');
  secao(corpo, 'Rolagens', 'ficha').append(rolagens);

  const celular = el('div', 'grupo-opcoes');
  chave(celular, 'vibrar', 'Vibrar ao rolar', 'Vibração mais longa num 20 natural.');
  chave(celular, 'agitar', 'Agitar para rolar', 'Na aba Dados, chacoalhe o celular para rolar.', async () => {
    // iPhone pede permissão para ler o movimento.
    if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) {
      try { await DeviceMotionEvent.requestPermission(); } catch { /* recusou */ }
    }
  });
  secao(corpo, 'Celular', 'celular').append(celular);

  // 4) Seus dados: resumo do que está guardado e o backup
  const dados = secao(corpo, 'Seus dados', 'baixar');
  const resumo = el('div', 'resumo-dados');
  for (const [valor, rotulo] of [
    [fichas.length, fichas.length === 1 ? 'ficha' : 'fichas'],
    [favoritos.length, favoritos.length === 1 ? 'favorito' : 'favoritos'],
    [historico.length, historico.length === 1 ? 'rolagem' : 'rolagens'],
    [combate.participantes.length, 'no combate'],
  ]) {
    const caixa = el('div');
    caixa.append(el('b', '', String(valor)), el('small', '', rotulo));
    resumo.append(caixa);
  }
  const acoes = el('div', 'acoes-dados');
  const aviso = el('p', 'aviso');
  const botao = (nomeIcone, texto, fn, classe = '') => {
    const b = el('button', 'botao ' + classe);
    b.append(icone(nomeIcone), texto);
    b.addEventListener('click', fn);
    acoes.append(b);
  };
  botao('baixar', 'Exportar backup', exportarBackup, 'destaque');
  botao('enviar', 'Importar backup', () => $('arquivo-backup').click());
  botao('restaurar', 'Restaurar monstros', () => {
    if (!confirm('Restaurar os 10 monstros padrão? Mudanças feitas neles serão perdidas. Suas outras fichas continuam.')) return;
    for (const m of MONSTROS_PADRAO.map(limparFicha)) {
      const i = fichas.findIndex(f => f.id === m.id);
      if (i >= 0) fichas[i] = m; else fichas.push(m);
    }
    salvarFichas();
    aviso.className = 'aviso ok'; aviso.textContent = 'Monstros restaurados.';
  });
  dados.append(resumo,
    el('p', 'ajuda', `Tudo fica salvo só neste aparelho (${espacoUsado()} usados). O backup leva fichas, favoritos, histórico, configurações e o combate em andamento. Faça de vez em quando, principalmente das fichas com imagens.`),
    acoes, aviso);
  corpo.append(el('p', 'rodape', `Rolador de Dados · versão ${VERSAO} · regras D&D 2024`));
}

$('abrir-historico').addEventListener('click', () => abrirPainel('historico'));
$('abrir-favoritos').addEventListener('click', () => abrirPainel('favoritos'));
$('abrir-config').addEventListener('click', () => abrirPainel('config'));
$('salvar-favorito').addEventListener('click', () => abrirPainel('favoritos'));
$('fechar-painel').addEventListener('click', voltar);
$('painel').addEventListener('click', (ev) => { if (ev.target.id === 'painel') voltar(); });

// ---------- 8. Backup ----------
function exportarBackup() {
  // Versão 2 do backup (app 7): passa a levar o combate em andamento.
  const dados = { app: 'rolador-de-dados', versao: 2, versaoApp: VERSAO, criadoEm: new Date().toISOString(),
    config, favoritos, fichas, historico, combate };
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  const hoje = new Date();
  const data = [hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  a.download = `rolador-backup-${data}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('arquivo-backup').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo) return;
  let lido;
  try {
    lido = lerBackup(JSON.parse(await arquivo.text()));  // confere tudo (backups antigos não têm combate)
  } catch {
    alert('Esse arquivo não é um backup válido do Rolador.');
    return;
  }
  const n = lido.combate.participantes.length;
  if (!confirm(`Importar ${lido.fichas.length} fichas, ${lido.favoritos.length} favoritos, ${lido.historico.length} rolagens` +
    `${n ? ` e um combate com ${n}` : ''}? Isso SUBSTITUI os dados atuais.`)) return;
  fichas = lido.fichas.map(f => limparFicha(migrarFicha(f, MONSTROS_PADRAO))).filter(Boolean);
  favoritos = lido.favoritos;
  historico = lido.historico;
  combate = lido.combate;
  config = { ...limparConfig(lido.config, CONFIG_PADRAO), aba: config.aba };
  resultadoRecolhido = config.recolhido;  // a variável da ficha acompanha a config importada
  combatenteAberto = null; avisoCombate = '';
  salvarFichas(); gravar('rolador.favoritos', favoritos); gravar('rolador.historico', historico);
  salvarCombate(); salvarConfig();
  aplicarTema(); aplicarRecolhido(); desenharPainel(); desenharListaFichas(); desenharAtalhos(); desenharCombate();
  alert('Backup importado!');
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
let avisoUsos = '';              // recado depois de gastar um uso, rolar recarga ou descansar
let resultadoRecolhido = !!config.recolhido;  // painel de resultado mostrando só o resumo
let combatenteFicha = null;      // ficha aberta pelo combate: id do combatente (ex.: Goblin 2)
let valorAlvo = '';              // CA ou CD do alvo, para mostrar acertou/errou
let donoDoAlvo = '';             // de quem é o valorAlvo (ficha ou combatente)

const acharFicha = (id) => fichas.find(f => f.id === id);

// "combatenteId": aberta pelo combate, a ficha mostra os PV e condições DAQUELE
// combatente (cada goblin tem os seus), mas as rolagens são as da ficha.
function abrirFicha(id, combatenteId = null) {
  fichaAtual = id;
  combatenteFicha = combatenteId;
  modo = 'normal';
  escolhendoCondicao = false;
  avisoPV = ''; avisoUsos = '';
  // A CA/CD do alvo vale para quem estava aberto: outra ficha começa sem alvo.
  if (donoDoAlvo !== (combatenteId || id)) { valorAlvo = ''; donoDoAlvo = combatenteId || id; }
  $('ficha-resultado').hidden = true;
  desenharFicha();
  $('ficha').hidden = false;
  $('ficha-corpo').scrollTop = 0;
  abrirCamada(() => {
    $('ficha').hidden = true; fichaAtual = null; combatenteFicha = null;
    desenharListaFichas(); desenharCombate();
  });
}

// De quem são os PV/condições mostrados: do combatente (monstro) ou da ficha.
function estadoNaFicha(f) {
  const c = combatenteFicha && combate.participantes.find(x => x.id === combatenteFicha);
  return c ? estadoDe(c) : f;
}

// Salva e redesenha mantendo a posição da rolagem da tela (para não "pular" ao tocar).
function mudouFicha() {
  salvarFichas();
  salvarCombate();
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

  corpo.append(controlesPV(f, (recado) => { avisoPV = recado; avisoUsos = ''; mudouFicha(); }));
  if (avisoPV) corpo.append(el('p', 'aviso-pv', avisoPV));
}

// Dano, cura ou PV temporários em quem tem PV (ficha ou combatente). Muda "f" e
// devolve o recado para mostrar (teste de Concentração, 0 PV, dano massivo).
// Personagens (fichas) também anotam as salvaguardas contra a morte em "f.morte".
function mudarPV(f, acao, n) {
  const contaMorte = f.tipo === 'personagem' && f.morte;
  if (acao === 'cura') {
    const estavaCaido = f.pv === 0;
    f.pv = aplicarCura(f.pv, f.pvMax, n);
    if (estavaCaido) acordar(f);
    if (estavaCaido && contaMorte) { f.morte = limparMorte(null); return 'Voltou a ter PV: acorda e as salvaguardas contra a morte zeram.'; }
    return '';
  }
  if (acao === 'temp') { f.pvTemp = ganharPVTemp(f.pvTemp, n); return ''; }
  const novo = aplicarDano(f.pv, f.pvTemp, n);
  const recados = [];
  if (novo.pvTemp < f.pvTemp) recados.push(`${f.pvTemp - novo.pvTemp} nos PV temporários.`);
  if (f.condicoes.includes('concentrando')) recados.push(`Concentração: salvaguarda de Constituição CD ${cdConcentracao(n)}.`);
  if (f.tipo === 'personagem' && novo.sobra >= f.pvMax) {
    recados.push('Dano massivo: o que passou do 0 é igual ou maior que o PV máximo, morte instantânea.');
    if (contaMorte) f.morte = { sucessos: 0, falhas: 3, estavel: false };
  } else if (novo.pv === 0 && f.pv > 0) {
    recados.push(f.tipo === 'personagem' ? 'Chegou a 0 PV: fica Inconsciente e faz salvaguardas contra a morte.' : 'Chegou a 0 PV.');
    if (contaMorte) f.morte = limparMorte(null);  // começa a contar do zero
  } else if (f.pv === 0 && novo.sobra > 0 && contaMorte) {
    f.morte = falhaPorDano(f.morte);
    recados.push(f.morte.falhas >= 3
      ? 'Dano com 0 PV: terceira falha, o personagem morre.'
      : 'Dano com 0 PV: 1 falha marcada na salvaguarda contra a morte (se foi crítico, toque em mais uma).');
  }
  f.pv = novo.pv; f.pvTemp = novo.pvTemp;
  return recados.join(' ');
}

// Voltou a ter PV (cura ou 20 natural contra a morte): deixa de estar Inconsciente.
function acordar(f) {
  f.condicoes = f.condicoes.filter(x => x !== 'inconsciente');
}

// Quadradinhos marcáveis (usos, sucessos, falhas): "cheios" de "total".
// Tocar num cheio tira um; tocar num vazio põe um.
function quadradinhos(cheios, total, classe, rotulo, mudar) {
  const caixa = el('div', 'quadradinhos');
  for (let i = 1; i <= total; i++) {
    const cheio = i <= cheios;
    const b = el('button', 'quadradinho ' + classe + (cheio ? ' cheio' : ''));
    b.setAttribute('aria-label', `${rotulo}: ${cheios} de ${total}. Toque para ${cheio ? 'tirar' : 'pôr'} um.`);
    b.addEventListener('click', () => mudar(cheio ? cheios - 1 : cheios + 1));
    caixa.append(b);
  }
  return caixa;
}

// Salvaguardas contra a morte (personagem com 0 PV): 3 sucessos, 3 falhas e o botão de rolar.
// "depois(recado)" salva e redesenha; "aoRolar(rolagem, texto)" mostra o d20 rolado.
function blocoMorte(f, depois, aoRolar) {
  const m = f.morte;
  const morto = m.falhas >= 3;
  const bloco = el('div', 'morte' + (morto ? ' morto' : m.estavel ? ' estavel' : ''));
  const cabeca = el('div', 'morte-cabeca');
  const titulo = el('b');
  titulo.append(icone('coracao'), morto ? 'Morto' : m.estavel ? 'Estável' : 'Salvaguardas contra a morte');
  cabeca.append(titulo);
  if (m.estavel) cabeca.append(el('small', '', 'Inconsciente com 0 PV; sem rolar. Recupera 1 PV em 1d4 horas.'));
  bloco.append(cabeca);
  const linhas = el('div', 'morte-linhas');
  for (const [campo, nome] of [['sucessos', 'Sucessos'], ['falhas', 'Falhas']]) {
    const linha = el('div', 'morte-linha ' + campo);
    linha.append(el('span', '', nome), quadradinhos(m[campo], 3, campo, nome, (n) => {
      f.morte = { ...m, [campo]: Math.max(0, Math.min(3, n)), estavel: false };
      depois('');
    }));
    linhas.append(linha);
  }
  const rolar = el('button', 'botao destaque');
  rolar.append(icone('dado'), 'Rolar 1d20');
  rolar.disabled = morto || m.estavel;
  rolar.addEventListener('click', () => {
    // É uma salvaguarda (teste de d20): a Exaustão desconta também.
    const expr = aplicarExaustao('1d20', f.exaustao);
    const rolagem = fazerRolagem(expr);
    const p = rolagem.partes[0];
    const r = salvaguardaMorte(f.morte, p.natural, p.res.total);
    f.morte = r.morte;
    if (r.resultado === 'recupera') { f.pv = Math.min(f.pvMax, 1); acordar(f); }
    registrar(`${f.nome} — Salvaguarda contra a morte`, expr, rolagem);
    desenharAtalhos();
    if (aoRolar) aoRolar(rolagem, r.texto);
    depois('Contra a morte: ' + r.texto);
  });
  linhas.append(rolar);
  bloco.append(linhas);
  return bloco;
}

// Usos que acabam e voltam (espaços de magia, Fúria, Sopro). "estado" guarda os gastos
// (a ficha, ou a cópia do monstro no combate); "f" tem a lista de recursos.
function nomeRecarga(id) {
  return (RECARGAS.find(r => r.id === id) || RECARGAS[0]).nome;
}

function blocoRecursos(f, estado, depois) {
  const area = el('div', 'recursos');
  for (const r of f.recursos) {
    const restam = usosRestantes(r, estado.gastos);
    const linha = el('div', 'recurso' + (restam ? '' : ' esgotado'));
    const nome = el('div', 'recurso-nome');
    nome.append(el('b', '', r.nome), el('small', '', `${restam}/${r.max} · ${nomeRecarga(r.recarga)}`));
    linha.append(nome);
    const mudar = (n) => { estado.gastos = definirRestantes(r, estado.gastos, n); depois(''); };
    if (r.max <= 10) {
      linha.append(quadradinhos(restam, r.max, 'uso', r.nome, mudar));
    } else {
      // Muitos usos (ex.: 20 pontos): − número +
      const contador = el('div', 'contador');
      const menos = el('button', '', '−'); menos.setAttribute('aria-label', `Gastar ${r.nome}`);
      const mais = el('button', '', '+'); mais.setAttribute('aria-label', `Recuperar ${r.nome}`);
      menos.disabled = !restam; mais.disabled = restam >= r.max;
      menos.addEventListener('click', () => mudar(restam - 1));
      mais.addEventListener('click', () => mudar(restam + 1));
      contador.append(menos, el('b', '', String(restam)), mais);
      linha.append(contador);
    }
    if (Number(r.recarga) && restam < r.max) {
      // Recarga X–6 de monstro: rola 1d6 e, se der, volta o uso.
      const recarga = el('button', 'botao rolar-recarga');
      recarga.append(icone('dado'), `d6 (${r.recarga}–6)`);
      recarga.setAttribute('aria-label', `Rolar a recarga de ${r.nome}`);
      recarga.addEventListener('click', () => {
        const d6 = rolarDadoCripto(6);
        const voltou = recarregou(r, d6);
        if (voltou) estado.gastos = definirRestantes(r, estado.gastos, r.max);
        depois(`${r.nome}: d6 = ${d6}, ${voltou ? 'recarregou!' : 'não recarregou.'}`);
      });
      linha.append(recarga);
    }
    area.append(linha);
  }
  return area;
}

// Descanso Curto / Longo (regras 2024). Muda o "estado" e devolve o recado.
function fazerDescanso(f, estado, tipo) {
  const longo = tipo === 'longo';
  const texto = longo
    ? 'Descanso Longo: PV ao máximo, PV temporários acabam, Exaustão −1 e todos os usos voltam. Continuar?'
    : 'Descanso Curto: voltam os usos de Descanso Curto e as recargas. Continuar?';
  const r = descansar(estado, f.recursos, tipo);
  if (r.erro) return r.erro;
  if (!confirm(texto)) return null;
  if (estado.tipo !== 'personagem' || !estado.morte) delete r.mudancas.morte;
  Object.assign(estado, r.mudancas);
  return `${longo ? 'Descanso Longo' : 'Descanso Curto'}: ${r.recados.join(' ')}`;
}

function blocoDescanso(f, estado, depois) {
  const linha = el('div', 'descansos');
  for (const [tipo, texto, nomeIcone] of [['curto', 'Descanso curto', 'ampulheta'], ['longo', 'Descanso longo', 'lua']]) {
    const b = el('button', 'botao');
    b.append(icone(nomeIcone), texto);
    b.addEventListener('click', () => {
      const recado = fazerDescanso(f, estado, tipo);
      if (recado !== null) depois(recado);
    });
    linha.append(b);
  }
  return linha;
}

// A linha [− Dano] [qtd] [+ Cura] [+ Temp], usada na ficha e no combate.
// "depois(recado)" é chamada depois de mudar, para salvar e redesenhar.
function controlesPV(f, depois) {
  const controles = el('div', 'pv-controles');
  const qtd = el('input'); qtd.type = 'number'; qtd.inputMode = 'numeric'; qtd.min = '0'; qtd.placeholder = 'qtd';
  qtd.setAttribute('aria-label', 'Quantidade de dano, cura ou PV temporários');
  for (const [acao, texto] of [['dano', '− Dano'], [null, ''], ['cura', '+ Cura'], ['temp', '+ Temp']]) {
    if (!acao) { controles.append(qtd); continue; }
    const b = el('button', acao, texto);
    b.addEventListener('click', () => {
      const n = Math.abs(parseInt(qtd.value, 10)) || 0;
      if (!n) { qtd.focus(); return; }
      depois(mudarPV(f, acao, n));
    });
    controles.append(b);
  }
  return controles;
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
  const estado = estadoNaFicha(f);   // a própria ficha, ou o combatente (Goblin 2)
  $('ficha-titulo').textContent = estado.nome || f.nome;
  const corpo = $('ficha-corpo');
  corpo.replaceChildren();

  // Cabeça: imagem + tipo + descrição
  const cabeca = el('div', 'ficha-cabeca' + (f.tipo === 'monstro' ? ' monstro' : ''));
  const textos = el('div', 'textos');
  textos.append(el('div', 'tipo', f.tipo === 'monstro' ? 'Monstro' : 'Personagem'));
  if (combatenteFicha) {
    const c = combate.participantes.find(x => x.id === combatenteFicha);
    const vez = c && c.id === combate.vez;
    textos.append(el('div', 'tipo combate' + (vez ? ' vez' : ''),
      combate.vez ? `Combate · rodada ${combate.rodada}${vez ? ' · é a vez dele' : ''}` : 'No combate'));
  }
  textos.append(el('div', 'sub', f.subtitulo || ''));
  cabeca.append(retrato(f, true), textos);
  corpo.append(cabeca);

  desenharPV(estado, corpo);
  if (estado.tipo === 'personagem' && estado.pvMax && estado.pv === 0 && estado.morte) {
    corpo.append(blocoMorte(estado, (recado) => { avisoPV = recado; mudouFicha(); }, (rolagem, texto) => {
      desenharRolagem($('ficha-resultado-conteudo'), rolagem, 'Contra a morte · ' + texto);
      $('ficha-resultado').hidden = false;
    }));
  }
  desenharCondicoes(estado, corpo);

  // Modo: normal / vantagem / desvantagem (vale para os d20 das rolagens).
  // As condições marcadas sugerem um modo para os ataques (ex.: Envenenado → Desvantagem).
  const sugestao = sugerirModo(estado.condicoes, 'ataque');
  const modos = el('div', 'modo');
  for (const [id, nome] of [['normal', 'Normal'], ['vant', 'Vantagem'], ['desv', 'Desvantagem']]) {
    const sugerido = id === sugestao.modo && (sugestao.vant.length || sugestao.desv.length);
    const b = el('button', (modo === id ? 'ativo' : '') + (sugerido ? ' sugerido' : ''), nome);
    b.dataset.modo = id;
    b.addEventListener('click', () => { modo = id; mudouFicha(); });
    modos.append(b);
  }
  // Título "Rolagens" com o campo da CA/CD do alvo do lado.
  const titulo = el('div', 'titulo-rolagens');
  const campoAlvo = el('label', 'campo-alvo', 'Alvo CA/CD');
  const inputAlvo = el('input'); inputAlvo.type = 'number'; inputAlvo.inputMode = 'numeric';
  inputAlvo.placeholder = '—'; inputAlvo.value = valorAlvo;
  inputAlvo.addEventListener('input', () => { valorAlvo = inputAlvo.value.trim(); });
  campoAlvo.append(inputAlvo);
  titulo.append(el('h2', 'titulo-secao', 'Rolagens'), campoAlvo);
  corpo.append(titulo, modos);
  if (sugestao.vant.length || sugestao.desv.length) {
    const partes = [];
    if (sugestao.vant.length) partes.push(`Vantagem (${sugestao.vant.join(', ')})`);
    if (sugestao.desv.length) partes.push(`Desvantagem (${sugestao.desv.join(', ')})`);
    let texto = `Nos ataques: ${partes.join(' e ')}`;
    texto += sugestao.modo === 'normal' ? ' — elas se anulam: Normal.' : '.';
    if ([...sugestao.vant, ...sugestao.desv].some(n => n.endsWith('*'))) texto += ' * só em certas situações.';
    corpo.append(el('p', 'sugestao-modo', texto));
  }

  // Rolagens
  const botoes = el('div', 'botoes-rolagem');
  for (const r of f.rolagens) {
    const b = el('button', 'botao-rolagem' + (/d20(?!\d)/.test(r.expr) ? ' teste' : ''));
    b.append(el('b', '', r.nome), el('small', '', r.expr));
    b.addEventListener('click', () => rolarDaFicha(f, r, estado));
    botoes.append(b);
  }
  if (!f.rolagens.length) botoes.append(el('p', 'vazio', 'Sem rolagens. Toque no lápis para adicionar.'));
  corpo.append(botoes);

  // Usos (espaços de magia, Fúria, Sopro...) e os descansos.
  corpo.append(el('h2', 'titulo-secao', f.recursos.length ? 'Usos e descanso' : 'Descanso'));
  // O recado aparece logo embaixo dos botões (e não lá em cima, perto dos PV).
  const aoMudar = (recado) => { avisoUsos = recado; avisoPV = ''; mudouFicha(); };
  if (f.recursos.length) corpo.append(blocoRecursos(f, estado, aoMudar));
  corpo.append(blocoDescanso(f, estado, aoMudar));
  if (avisoUsos) corpo.append(el('p', 'aviso-pv', avisoUsos));
  if (!f.recursos.length) corpo.append(el('p', 'ajuda', 'Espaços de magia, Fúria, Dados de Vida, "Recarga 5–6"... entram pelo lápis, em "Usos e recargas".'));

  if (f.notas) corpo.append(el('h2', 'titulo-secao', 'Notas'), el('div', 'notas', f.notas));
}

// "estado" é quem rola: a ficha, ou o combatente (com a exaustão e o nome dele).
function rolarDaFicha(f, r, estado = f) {
  const expr = aplicarExaustao(aplicarModo(r.expr, modo), estado.exaustao);
  const extras = [];
  if (modo === 'vant') extras.push('Vantagem');
  if (modo === 'desv') extras.push('Desvantagem');
  if (estado.exaustao && expr !== aplicarModo(r.expr, modo)) extras.push(`Exaustão −${2 * estado.exaustao}`);
  const complemento = extras.length ? ` (${extras.join(', ')})` : '';
  // Na tela, o nome da ficha já está no topo: o título fica curto e cabe numa linha.
  // No histórico vai o nome completo.
  const titulo = `${estado.nome || f.nome} — ${r.nome}${complemento}`;
  const alvo = $('ficha-resultado-conteudo');
  try {
    const rolagem = fazerRolagem(expr);
    desenharRolagem(alvo, rolagem, r.nome + complemento, valorAlvo === '' ? null : valorAlvo);
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
$('recolher-resultado').addEventListener('click', () => {
  resultadoRecolhido = !resultadoRecolhido;
  config.recolhido = resultadoRecolhido;  // lembra na próxima vez que abrir
  salvarConfig();
  aplicarRecolhido();
});

// ---------- 11. Editor de ficha ----------
let edFicha = null;     // cópia sendo editada
let edNova = false;

function abrirEditor(id) {
  edNova = !id;
  edFicha = id
    ? structuredClone(acharFicha(id))
    : { id: 'f-' + Date.now().toString(36), tipo: 'personagem', nome: '', subtitulo: '', emoji: '', imagem: null,
        ca: null, pvMax: null, pv: null, pvTemp: 0, exaustao: 0, condicoes: [], notas: '',
        rolagens: [{ nome: 'Iniciativa', expr: '1d20+0' }], recursos: [], gastos: {}, morte: limparMorte(null) };
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
  desenharLinhasRecurso();
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

// Usos e recargas: nome, quantos e quando voltam.
function desenharLinhasRecurso() {
  const caixa = $('ed-recursos');
  caixa.replaceChildren();
  edFicha.recursos.forEach((r, i) => {
    const linha = el('div', 'linha-recurso');
    const nome = el('input', 'rec-nome'); nome.placeholder = 'Nome (ex.: Espaços de magia 1º)'; nome.value = r.nome;
    const max = el('input', 'rec-max'); max.type = 'number'; max.inputMode = 'numeric'; max.min = '1'; max.max = '99';
    max.value = r.max; max.setAttribute('aria-label', 'Quantos usos');
    const recarga = el('select', 'rec-recarga');
    recarga.setAttribute('aria-label', 'Quando volta');
    for (const op of RECARGAS) {
      const o = el('option', '', op.nome); o.value = op.id;
      recarga.append(o);
    }
    recarga.value = r.recarga;
    const remover = el('button', 'remover'); remover.type = 'button'; remover.setAttribute('aria-label', 'Remover uso');
    remover.append(icone('fechar'));
    nome.addEventListener('input', () => { r.nome = nome.value; });
    max.addEventListener('input', () => { r.max = max.value; });
    recarga.addEventListener('change', () => { r.recarga = recarga.value; });
    remover.addEventListener('click', () => { edFicha.recursos.splice(i, 1); desenharLinhasRecurso(); });
    linha.append(nome, remover, max, recarga);
    caixa.append(linha);
  });
}

$('ed-adicionar-recurso').addEventListener('click', () => {
  edFicha.recursos.push({ id: 'r-' + Date.now().toString(36), nome: '', max: 1, recarga: edFicha.tipo === 'monstro' ? '5' : 'longo' });
  desenharLinhasRecurso();
  const nomes = $('ed-recursos').querySelectorAll('.rec-nome');
  nomes[nomes.length - 1].focus();
});

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

  // Usos sem nome são ignorados (limparFicha confere o resto).
  const recursos = edFicha.recursos.filter(r => String(r.nome).trim());

  const antiga = acharFicha(edFicha.id);
  const ficha = limparFicha({
    ...edFicha, nome, rolagens, recursos,
    tipo: $('ed-tipo').value,
    subtitulo: $('ed-subtitulo').value.trim(),
    emoji: $('ed-emoji').value.trim(),
    ca: $('ed-ca').value,
    pvMax: $('ed-pv').value,
    notas: $('ed-notas').value.trim(),
    // PV atual: mantém o que estava (ou começa cheio)
    pv: antiga && antiga.pvMax ? antiga.pv : $('ed-pv').value,
  });
  // Usos apagados: a contagem de gastos deles sai da ficha e das cópias no combate.
  ficha.gastos = podarGastos(ficha.gastos, ficha.recursos);
  for (const c of combate.participantes) if (c.fichaId === ficha.id) c.gastos = podarGastos(c.gastos, ficha.recursos);
  const i = fichas.findIndex(f => f.id === ficha.id);
  const copiaAnterior = fichas.slice();
  if (i >= 0) fichas[i] = ficha; else fichas.unshift(ficha);
  if (!salvarFichas(false)) {
    fichas = copiaAnterior;
    aviso.textContent = 'Sem espaço para salvar. Remova imagens de outras fichas ou faça backup e apague algumas.';
    return;
  }
  salvarCombate();
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
  if (!salvarFichas(false)) { fichas.splice(fichas.indexOf(copia), 1); $('ed-aviso').textContent = 'Sem espaço para duplicar.'; return; }
  depoisDeVoltar = () => abrirFicha(copia.id);
  history.go(-camadas.length);
});

$('ed-apagar').addEventListener('click', () => {
  if (!confirm(`Apagar a ficha "${edFicha.nome}"? Não dá para desfazer.`)) return;
  fichas = fichas.filter(f => f.id !== edFicha.id);
  salvarFichas();
  history.go(-camadas.length);
});

// ---------- 12. Combate: iniciativa, turnos e rodadas ----------
// A lista de combatentes JÁ ESTÁ na ordem de iniciativa (combate.participantes).
// Personagens usam os PV e condições da própria ficha (vinculado); cada monstro
// adicionado é uma cópia com PV próprios (3 goblins = 3 cópias).
let combatenteAberto = null;  // id do cartão aberto (com Dano/Cura) na lista
let avisoCombate = '';        // recado do último dano/cura/iniciativa

const estadoDe = (c) => (c.vinculado && acharFicha(c.fichaId)) || c;
// Quem perde a vez: monstro com 0 PV (personagem a 0 PV ainda faz salvaguardas contra a morte).
const foraDoCombate = () => new Set(combate.participantes
  .filter(c => { const e = estadoDe(c); return e.tipo === 'monstro' && e.pvMax && e.pv === 0; })
  .map(c => c.id));

function adicionarAoCombate(f) {
  const id = 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (f.tipo === 'personagem') {
    if (combate.participantes.some(c => c.vinculado && c.fichaId === f.id)) return;
    // Vinculado: PV, condições e usos ficam só na ficha (aqui, campos vazios).
    combate.participantes.push({ id, fichaId: f.id, vinculado: true, nome: f.nome, tipo: 'personagem', iniciativa: null,
      ca: null, pvMax: null, pv: null, pvTemp: 0, exaustao: 0, condicoes: [], gastos: {} });
  } else {
    const nome = nomeDeCopia(f.nome, combate.participantes.map(c => c.nome));
    combate.participantes.push({ id, fichaId: f.id, vinculado: false, nome, tipo: 'monstro', iniciativa: null,
      ca: f.ca, pvMax: f.pvMax, pv: f.pvMax, pvTemp: 0, exaustao: 0, condicoes: [], gastos: {} });
  }
  salvarCombate();
}

// Rola a Iniciativa de um combatente com a rolagem "Iniciativa" da ficha (ou 1d20),
// já com exaustão e com Vant/Desv das condições certas (Invisível, Incapacitado...).
function rolarIniciativa(c) {
  const e = estadoDe(c);
  const sugestao = sugerirModo(e.condicoes, 'iniciativa', true);
  let expr = aplicarExaustao(aplicarModo(exprIniciativa(acharFicha(c.fichaId)), sugestao.modo), e.exaustao);
  let rolagem;
  try { rolagem = fazerRolagem(expr); } catch { expr = '1d20'; rolagem = fazerRolagem(expr); }
  const p = rolagem.partes[0];
  const extras = sugestao.modo === 'vant' ? ' com Vantagem' : sugestao.modo === 'desv' ? ' com Desvantagem' : '';
  return { total: p.res.total, texto: `${c.nome}: ${p.res.expressao}${extras} = ${p.res.total}` };
}

// Rola para quem ainda não tem iniciativa. Cópias do mesmo monstro rolam uma vez só
// e ficam com o mesmo número (regra 2024 para grupos de criaturas iguais).
function rolarIniciativasQueFaltam() {
  const porMonstro = new Map();
  const textos = [];
  for (const c of combate.participantes) {
    if (c.iniciativa !== null) continue;
    const chave = !c.vinculado && c.fichaId ? c.fichaId : null;
    if (chave && porMonstro.has(chave)) { c.iniciativa = porMonstro.get(chave); continue; }
    const r = rolarIniciativa(c);
    c.iniciativa = r.total;
    if (chave) porMonstro.set(chave, r.total);
    textos.push(chave ? r.texto.replace(/ \d+:/, ':') : r.texto);  // "Goblin 1:" vira "Goblin:"
  }
  combate.participantes = ordenarIniciativa(combate.participantes);
  return textos;
}

function proximoTurno() {
  if (!combate.participantes.length) return;
  if (!combate.vez) {
    // Começar: rola quem falta e abre a rodada 1 no primeiro da ordem.
    const textos = rolarIniciativasQueFaltam();
    avisoCombate = textos.length ? 'Iniciativa: ' + textos.join(' · ') : '';
  } else {
    avisoCombate = '';
  }
  const t = avancarTurno(combate.participantes, combate.vez, combate.rodada, foraDoCombate());
  combate.vez = t.vez; combate.rodada = t.rodada;
  combatenteAberto = null;
  delete combate.desfazer;
  const lembretes = inicioDaVez(combate.participantes.find(c => c.id === combate.vez));
  if (lembretes) avisoCombate = avisoCombate ? avisoCombate + ' · ' + lembretes : lembretes;
  salvarFichas();
  salvarCombate();
  if (config.vibrar && navigator.vibrate) navigator.vibrate(15);
  desenharCombate(true);
}

// Começo da vez de alguém: Recargas X–6 rolam 1d6 e "Início do turno" volta inteiro
// (regra 2024); personagem com 0 PV é lembrado de rolar contra a morte.
function inicioDaVez(c) {
  if (!c) return '';
  const e = estadoDe(c);
  const ficha = acharFicha(c.fichaId);
  const recados = [];
  if (ficha && ficha.recursos.length) {
    const t = inicioDoTurno(ficha.recursos, e.gastos, rolarDadoCripto);
    // Guarda o que mudou sozinho, para "voltar turno" desfazer (e não ganhar outra recarga).
    const mudanca = mudancaDeGastos(e.gastos, t.gastos);
    if (mudanca.ids.length) combate.desfazer = { id: c.id, ...mudanca };
    e.gastos = t.gastos;
    recados.push(...t.recados);
  }
  if (e.tipo === 'personagem' && e.pvMax && e.pv === 0 && e.morte && !e.morte.estavel && e.morte.falhas < 3) {
    recados.push('0 PV: role a salvaguarda contra a morte.');
    combatenteAberto = c.id;  // abre o cartão com os quadradinhos e o botão de rolar
  }
  return recados.length ? `${c.nome}: ${recados.join(' ')}` : '';
}

function turnoAnterior() {
  if (!combate.vez) return;
  // Desfaz a recarga/Ações Lendárias que o início desta vez devolveu sozinho.
  const d = combate.desfazer;
  const daVez = d && d.id === combate.vez && combate.participantes.find(c => c.id === d.id);
  if (daVez) { const e = estadoDe(daVez); e.gastos = desfazerGastos(e.gastos, d); salvarFichas(); }
  delete combate.desfazer;
  const t = voltarTurno(combate.participantes, combate.vez, combate.rodada, foraDoCombate());
  combate.vez = t.vez; combate.rodada = t.rodada;
  avisoCombate = '';
  salvarCombate();
  desenharCombate(true);
}

function removerCombatente(c) {
  if (!confirm(`Tirar "${c.nome}" do combate?`)) return;
  tirarDoCombate(new Set([c.id]));
  combatenteAberto = null;
  salvarCombate();
  desenharCombate();
}

// Tira da lista os combatentes de "ids". Se era a vez de um deles, a vez passa para
// o próximo que fica (o combate continua na mesma rodada, não recomeça).
function tirarDoCombate(ids) {
  if (combate.vez && ids.has(combate.vez)) {
    const t = avancarTurno(combate.participantes, combate.vez, combate.rodada, new Set([...foraDoCombate(), ...ids]));
    combate.vez = ids.has(t.vez) ? null : t.vez;
    combate.rodada = combate.vez ? t.rodada : 0;
    delete combate.desfazer;
  }
  combate.participantes = combate.participantes.filter(x => !ids.has(x.id));
  if (!combate.participantes.length) { combate.vez = null; combate.rodada = 0; }
}

// O que aparece no cartão de quem está com 0 PV: "fora", "0 PV ✓1 ✗2", "estável", "morto".
function textoCaido(e) {
  if (e.tipo === 'monstro' || !e.morte) return e.tipo === 'monstro' ? 'fora' : '0 PV';
  if (e.morte.falhas >= 3) return 'morto';
  if (e.morte.estavel) return 'estável';
  // Por extenso: "✗" parece "×" em algumas fontes.
  return `0 PV · ${e.morte.sucessos} suc. · ${e.morte.falhas} falha${e.morte.falhas === 1 ? '' : 's'}`;
}

function cartaoCombatente(c, empatadoComOAnterior) {
  const e = estadoDe(c);
  const ficha = acharFicha(c.fichaId);
  const caido = e.pvMax && e.pv === 0;
  const aberto = combatenteAberto === c.id;
  const cartao = el('div', 'combatente ' + e.tipo + (c.id === combate.vez ? ' vez' : '') +
    (caido ? ' caido' : '') + (aberto ? ' aberto' : ''));
  cartao.dataset.id = c.id;

  const cabeca = el('button', 'combatente-cabeca');
  cabeca.setAttribute('aria-expanded', String(aberto));
  const ini = el('span', 'ini' + (c.iniciativa === null ? ' sem' : ''), c.iniciativa === null ? '?' : String(c.iniciativa));
  const info = el('span', 'info');
  info.append(el('span', 'nome', c.nome));
  const numeros = el('span', 'numeros');
  if (e.ca !== null) numeros.append(el('span', 'num-ca', `CA ${e.ca}`));
  if (e.pvMax) {
    numeros.append(el('span', 'num-pv', `PV ${e.pv}/${e.pvMax}`));
    if (e.pvTemp) numeros.append(el('span', 'num-temp', `+${e.pvTemp}`));
  }
  if (caido) numeros.append(el('span', 'num-caido', textoCaido(e)));
  info.append(numeros);
  if (e.pvMax) info.append(barraPV(e));
  const condicoes = nomesDasCondicoes(e);
  if (condicoes.length) {
    const tags = el('span', 'tags');
    for (const nome of condicoes) tags.append(el('span', 'tag', nome));
    info.append(tags);
  }
  cabeca.append(ini, retrato(ficha || { nome: c.nome }), info);
  cabeca.addEventListener('click', () => {
    combatenteAberto = aberto ? null : c.id;
    avisoCombate = '';
    desenharCombate();
  });
  cartao.append(cabeca);
  if (!aberto) return cartao;

  // Aberto: PV, iniciativa e ações deste combatente.
  const detalhes = el('div', 'combatente-detalhes');
  const depois = (recado) => {
    avisoCombate = recado;
    salvarFichas(); salvarCombate();
    desenharCombate();
  };
  if (e.pvMax) detalhes.append(controlesPV(e, depois));
  if (caido && e.tipo === 'personagem' && e.morte) detalhes.append(blocoMorte(e, depois));
  if (ficha && ficha.recursos.length) detalhes.append(blocoRecursos(ficha, e, depois));
  const linha = el('div', 'combatente-acoes');
  const campo = el('label', 'campo-ini', 'Inic.');
  const inputIni = el('input'); inputIni.type = 'number'; inputIni.inputMode = 'numeric';
  inputIni.value = c.iniciativa ?? ''; inputIni.placeholder = '?';
  inputIni.addEventListener('change', () => {
    const n = parseInt(inputIni.value, 10);
    c.iniciativa = Number.isFinite(n) ? n : null;
    combate.participantes = ordenarIniciativa(combate.participantes);
    salvarCombate(); desenharCombate();
  });
  campo.append(inputIni);
  const rolar = el('button', 'botao');
  rolar.append(icone('dado'), 'Rolar');
  rolar.setAttribute('aria-label', 'Rolar iniciativa');
  rolar.addEventListener('click', () => {
    const r = rolarIniciativa(c);
    c.iniciativa = r.total;
    avisoCombate = 'Iniciativa: ' + r.texto;
    combate.participantes = ordenarIniciativa(combate.participantes);
    salvarCombate(); desenharCombate();
  });
  linha.append(campo, rolar);
  if (empatadoComOAnterior) {
    // Empate: o Mestre/jogadores decidem quem vai antes (regra 2024).
    const subir = el('button', 'botao');
    subir.append(icone('subir'), 'Antes');
    subir.setAttribute('aria-label', 'Passar na frente do empatado de cima');
    subir.addEventListener('click', () => {
      combate.participantes = subirNoEmpate(combate.participantes, c.id);
      salvarCombate(); desenharCombate();
    });
    linha.append(subir);
  }
  detalhes.append(linha);

  const linha2 = el('div', 'combatente-acoes');
  const abrir = el('button', 'botao destaque');
  abrir.append(icone('ficha'), 'Ficha e rolagens');
  abrir.disabled = !ficha;
  abrir.addEventListener('click', () => abrirFicha(c.fichaId, c.id));
  const remover = el('button', 'botao');
  remover.append(icone('fechar'), 'Tirar');
  remover.addEventListener('click', () => removerCombatente(c));
  linha2.append(abrir, remover);
  detalhes.append(linha2);
  if (avisoCombate) detalhes.append(el('p', 'aviso-pv', avisoCombate));
  cartao.append(detalhes);
  return cartao;
}

// "rolarAteAVez": depois de passar o turno, rola a lista até quem está jogando.
function desenharCombate(rolarAteAVez = false) {
  // Personagem cuja ficha foi apagada sai do combate (sem recomeçar o combate).
  const semFicha = new Set(combate.participantes.filter(c => c.vinculado && !acharFicha(c.fichaId)).map(c => c.id));
  if (semFicha.size) {
    tirarDoCombate(semFicha);
    if (semFicha.has(combatenteAberto)) combatenteAberto = null;
    salvarCombate();
  }
  for (const c of combate.participantes) if (c.vinculado) c.nome = acharFicha(c.fichaId).nome;  // ficha renomeada
  // Selo na aba: a rodada, para lembrar que há um combate em andamento.
  const selo = $('selo-rodada');
  selo.hidden = !combate.vez;
  selo.textContent = combate.vez ? 'R' + combate.rodada : '';
  if ($('tela-combate').hidden) return;

  const lista = $('lista-combate');
  const posicao = lista.scrollTop;
  lista.replaceChildren();
  const vazio = !combate.participantes.length;
  const daVez = combate.participantes.find(c => c.id === combate.vez);
  $('rodada-num').textContent = combate.vez ? String(combate.rodada) : '—';
  $('vez-rotulo').textContent = daVez ? 'Vez de' : vazio ? 'Combate' : 'Pronto para começar';
  $('vez-nome').textContent = daVez ? daVez.nome
    : vazio ? 'Adicione combatentes' : `${combate.participantes.length} na lista`;
  $('proximo-turno').textContent = combate.vez ? 'PRÓXIMO TURNO' : 'COMEÇAR COMBATE';
  $('proximo-turno').disabled = vazio;
  $('turno-anterior').disabled = !combate.vez;
  $('rolar-iniciativas').disabled = vazio;
  $('encerrar-combate').disabled = vazio;
  $('add-combatente').classList.toggle('destaque', vazio);  // lista vazia: o primeiro passo fica em destaque

  if (vazio) {
    const ajuda = el('div', 'vazio');
    ajuda.append(el('p', '', 'Nenhum combatente ainda.'),
      el('p', '', 'Toque em Adicionar para pôr personagens e monstros (o mesmo monstro pode entrar várias vezes, cada um com seus PV). Depois, Começar combate rola a iniciativa de quem falta.'));
    lista.append(ajuda);
    return;
  }
  combate.participantes.forEach((c, i) => {
    const anterior = combate.participantes[i - 1];
    const empate = Boolean(anterior && c.iniciativa !== null && anterior.iniciativa === c.iniciativa);
    lista.append(cartaoCombatente(c, empate));
  });
  if (avisoCombate && !combatenteAberto) lista.prepend(el('p', 'aviso-pv', avisoCombate));
  lista.scrollTop = posicao;
  if (rolarAteAVez) {
    const atual = lista.querySelector('.combatente.vez');
    if (atual) atual.scrollIntoView({ block: 'nearest' });
  }
}

// Painel "Adicionar ao combate": um toque põe a ficha na lista.
function desenharAdicionar(corpo) {
  corpo.append(el('p', 'ajuda', 'Toque para pôr no combate. Monstros podem entrar várias vezes, cada um com seus PV; personagens entram uma vez e usam os PV da ficha.'));
  if (!fichas.length) { corpo.append(el('p', 'vazio', 'Nenhuma ficha ainda. Crie na aba Fichas.')); }
  for (const [titulo, tipo] of [['Personagens', 'personagem'], ['Monstros', 'monstro']]) {
    const doTipo = fichas.filter(f => f.tipo === tipo);
    if (!doTipo.length) continue;
    corpo.append(el('h2', 'titulo-grupo', titulo));
    for (const f of doTipo) {
      const quantos = combate.participantes.filter(c => c.fichaId === f.id).length;
      const ja = tipo === 'personagem' && quantos > 0;
      const b = el('button', 'item-adicionar' + (quantos ? ' tem' : ''));
      b.disabled = ja;
      const textos = el('span', 'textos');
      textos.append(el('b', '', f.nome), el('small', '', [f.ca !== null ? `CA ${f.ca}` : '', f.pvMax ? `PV ${f.pvMax}` : ''].filter(Boolean).join(' · ')));
      const marca = el('span', 'quantos', ja ? 'no combate' : quantos ? `×${quantos}` : '');
      const mais = el('span', 'mais');
      mais.append(icone(ja ? 'fechar' : 'mais'));
      if (ja) mais.hidden = true;
      b.append(retrato(f), textos, marca, mais);
      b.addEventListener('click', () => {
        adicionarAoCombate(f);
        const rolagem = corpo.scrollTop;
        desenharPainel();
        corpo.scrollTop = rolagem;
      });
      corpo.append(b);
    }
  }
  const pronto = el('button', 'botao destaque pronto', 'Pronto');
  pronto.addEventListener('click', voltar);
  corpo.append(pronto);
}

$('add-combatente').addEventListener('click', () => abrirPainel('adicionar'));
$('proximo-turno').addEventListener('click', proximoTurno);
$('turno-anterior').addEventListener('click', turnoAnterior);
$('rolar-iniciativas').addEventListener('click', () => {
  const faltam = combate.participantes.some(c => c.iniciativa === null);
  if (!faltam) {
    if (!confirm('Todos já têm iniciativa. Rolar de novo para todos?')) return;
    for (const c of combate.participantes) c.iniciativa = null;
  }
  const textos = rolarIniciativasQueFaltam();
  avisoCombate = textos.length ? 'Iniciativa: ' + textos.join(' · ') : '';
  combatenteAberto = null;
  salvarCombate();
  desenharCombate();
});
$('encerrar-combate').addEventListener('click', () => {
  if (!confirm('Encerrar o combate? A lista é esvaziada; os PV dos personagens continuam nas fichas.')) return;
  combate = limparCombate(null);
  combatenteAberto = null; avisoCombate = '';
  salvarCombate();
  desenharCombate();
});

// ---------- 13. Início ----------
aplicarTema();
aplicarRecolhido();
mostrarAba(['fichas', 'combate'].includes(config.aba) ? config.aba : 'dados');
desenharCombate();
desenharAtalhos();
atualizarPrevia();
