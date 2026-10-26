// Ficha de Personagem: a interface. Desenha as páginas, liga os toques, rola os dados
// (com o parser do Rolador, ../js/logica.js) e salva tudo no localStorage.
'use strict';

const VERSAO_FICHA = '3';

// ---------- 1. Ajudantes ----------
const $ = (id) => document.getElementById(id);
function el(tag, classe = '', conteudo = null) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (conteudo !== null) e.textContent = conteudo;
  return e;
}

// Ícones desenhados aqui mesmo (sem arquivos de imagem). "traco" = só contorno.
const ICONES = {
  pasta: { d: ['M2 6.5A2.5 2.5 0 0 1 4.5 4H9l2.2 2.2h8.3A2.5 2.5 0 0 1 22 8.7v9.8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5z'] },
  lixeira: { d: ['M9 2.5h6l1 2h4.5v2.5h-17V4.5H8z', 'M5.5 8.5h13l-1.1 12.2a1.5 1.5 0 0 1-1.5 1.3H8.1a1.5 1.5 0 0 1-1.5-1.3z'] },
  pontos: { d: ['M12 2a2.3 2.3 0 1 0 0 4.6A2.3 2.3 0 1 0 12 2z', 'M12 9.7a2.3 2.3 0 1 0 0 4.6a2.3 2.3 0 1 0 0-4.6z', 'M12 17.4a2.3 2.3 0 1 0 0 4.6a2.3 2.3 0 1 0 0-4.6z'] },
  fechar: { d: ['M6 6l12 12', 'M18 6L6 18'], traco: true },
  lapis: { d: ['M4 20h4L20 8l-4-4L4 16z', 'M13 7l4 4'], traco: true },
};
function icone(nome) {
  const ns = 'http://www.w3.org/2000/svg';
  const def = ICONES[nome];
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ic' + (def.traco ? ' traco' : ''));
  svg.setAttribute('aria-hidden', 'true');
  for (const d of def.d) {
    const t = document.createElementNS(ns, 'path');
    t.setAttribute('d', d);
    svg.append(t);
  }
  return svg;
}
document.querySelectorAll('[data-icone]').forEach(i => i.replaceWith(icone(i.dataset.icone)));

// localStorage pode falhar (modo anônimo, memória cheia), então sempre com try/catch.
function ler(chave, padrao) {
  try { const v = localStorage.getItem(chave); return v === null ? padrao : JSON.parse(v); }
  catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
  catch { return false; }
}

// No APK (Capacitor) usa os recursos do celular; no navegador, os do navegador.
function nativo() {
  const C = window.Capacitor;
  return C && C.isNativePlatform && C.isNativePlatform() ? C.Plugins : null;
}
function vibrar() {
  const p = nativo();
  if (p && p.Haptics) { p.Haptics.impact({ style: 'LIGHT' }).catch(() => {}); return; }
  if (navigator.vibrate) navigator.vibrate(15);
}

// Mensagem rápida embaixo (com um botão opcional, como "Desfazer").
let avisoTimer = null;
function avisar(texto, acao = null, aoAgir = null) {
  let barra = $('snackbar');
  if (!barra) { barra = el('div', 'snackbar'); barra.id = 'snackbar'; barra.setAttribute('role', 'status'); document.body.append(barra); }
  barra.replaceChildren(el('span', '', texto));
  if (acao) {
    const b = el('button', '', acao);
    b.addEventListener('click', () => { esconderAviso(); aoAgir(); });
    barra.append(b);
  }
  barra.classList.add('visivel');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(esconderAviso, acao ? 5000 : 3000);
}
function esconderAviso() { const b = $('snackbar'); if (b) b.classList.remove('visivel'); }

// ---------- 2. Estado (o que fica salvo) ----------
const CHAVE = 'ficha.personagens', CHAVE_ATUAL = 'ficha.atual', CHAVE_LIXEIRA = 'ficha.lixeira', CHAVE_PAGINA = 'ficha.pagina';

function carregarLista(chave) {
  const v = ler(chave, null);
  return Array.isArray(v) ? v.map(limparPersonagem) : null;
}
let personagens = carregarLista(CHAVE);
if (!personagens || !personagens.length) personagens = [exemploPandora()];   // primeira vez: a Pandora de exemplo
let lixeira = carregarLista(CHAVE_LIXEIRA) || [];
let p = personagens.find(x => x.id === ler(CHAVE_ATUAL, '')) || personagens[0];

function salvar() {
  const ok = gravar(CHAVE, personagens) && gravar(CHAVE_ATUAL, p.id) && gravar(CHAVE_LIXEIRA, lixeira);
  if (!ok) avisar('Não consegui salvar: a memória do navegador está cheia.');
}
// Para os campos de texto: salva um pouco depois de parar de digitar.
let salvarTimer = null;
function salvarDepois() { clearTimeout(salvarTimer); salvarTimer = setTimeout(salvar, 400); }
window.addEventListener('pagehide', () => { clearTimeout(salvarTimer); salvar(); });

// Muda algo no personagem e oferece "Desfazer" (volta a cópia de antes).
function comDesfazer(mensagem, mudar) {
  const antes = structuredClone(p);
  mudar();
  salvar();
  desenhar();
  avisar(mensagem, 'Desfazer', () => {
    const i = personagens.indexOf(p);
    if (i < 0) return;
    personagens[i] = antes;
    p = antes;
    salvar();
    desenhar(true);
  });
}

// ---------- 3. Botão voltar do celular ----------
// Cada janela por cima (folha, menu) é uma "camada" com uma entrada no histórico do
// navegador; assim o botão voltar do Android fecha a janela em vez de sair do app.
const camadas = [];
let depoisDeVoltar = null;
function abrirCamada(fechar) {
  if (typeof cancelarGesto === 'function') cancelarGesto();
  camadas.push(fechar);
  history.pushState({ camada: camadas.length }, '');
}
const voltar = () => history.back();
window.addEventListener('popstate', (ev) => {
  const nivel = (ev.state && ev.state.camada) || 0;
  while (camadas.length > nivel) camadas.pop()();
  if (depoisDeVoltar) { const f = depoisDeVoltar; depoisDeVoltar = null; f(); }
});
if (history.state && history.state.camada > 0) history.go(-history.state.camada);

// ---------- 4. Páginas (arrastar para o lado, sem fim) ----------
// As páginas ficam numa roda: depois da última vem a primeira (e antes da primeira, a
// última). Cada página é posicionada com transform; o dedo arrasta na horizontal e a
// rolagem vertical dentro da página continua sendo a do navegador (touch-action: pan-y).
const paginas = $('paginas');
const PAGINAS = [...paginas.children];
const N_PAGINAS = PAGINAS.length;
let paginaIdx = 0;
let arrasto = 0;          // quanto o dedo já puxou (px)
let fimDoArrasto = -1e9;  // quando o último arrasto acabou: o "clique" logo depois não vale
const paginaAtual = () => paginaIdx;

// Distância (em páginas) de "i" até a atual, pelo caminho mais curto da roda.
function distanciaPagina(i) {
  let d = i - paginaIdx;
  if (d > N_PAGINAS / 2) d -= N_PAGINAS;
  if (d <= -N_PAGINAS / 2) d += N_PAGINAS;
  return d;
}
function posicionarPaginas(animar) {
  const w = paginas.clientWidth;
  PAGINAS.forEach((pg, i) => {
    const d = distanciaPagina(i);
    pg.style.transition = animar ? 'transform .3s cubic-bezier(.2,.75,.25,1)' : 'none';
    pg.style.transform = `translate3d(${d * w + arrasto}px,0,0)`;
    pg.style.visibility = Math.abs(d) <= 1 ? 'visible' : 'hidden';   // só a atual e as vizinhas
    pg.setAttribute('aria-hidden', String(d !== 0));
  });
}
function irParaPagina(i, animar = true) {
  paginaIdx = ((i % N_PAGINAS) + N_PAGINAS) % N_PAGINAS;
  arrasto = 0;
  posicionarPaginas(animar);
  marcarPonto();
  gravar(CHAVE_PAGINA, paginaIdx);
}
function marcarPonto() {
  [...$('pontos').children].forEach((b, i) => b.classList.toggle('ativo', i === paginaIdx));
}
PAGINAS.forEach((pg, i) => {
  const b = el('button');
  b.setAttribute('aria-label', pg.getAttribute('aria-label'));
  b.addEventListener('click', () => irParaPagina(i));
  $('pontos').append(b);
});

let gesto = null;   // { id, x, y, t, modo: null | 'h' | 'v' }
paginas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  if (arrasto) { arrasto = 0; posicionarPaginas(false); }
  gesto = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), modo: null };
});
paginas.addEventListener('pointermove', (ev) => {
  if (!gesto || ev.pointerId !== gesto.id) return;
  if (ev.pointerType === 'mouse' && !ev.buttons) { cancelarGesto(); return; }   // soltou fora e voltou
  const dx = ev.clientX - gesto.x, dy = ev.clientY - gesto.y;
  if (!gesto.modo) {
    // Decide o rumo no começo: mais de lado que de cima a baixo = trocar de página.
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      gesto.modo = 'h';
      try { paginas.setPointerCapture(ev.pointerId); } catch { /* sem captura: segue igual */ }
    } else if (Math.abs(dy) > 12) gesto.modo = 'v';
  }
  if (gesto.modo === 'h') {
    arrasto = dx;
    posicionarPaginas(false);
  }
});
function soltarGesto(ev) {
  if (!gesto || ev.pointerId !== gesto.id) return;
  if (gesto.modo === 'h') {
    fimDoArrasto = performance.now();
    const dx = ev.clientX - gesto.x;
    const velocidade = dx / Math.max(1, performance.now() - gesto.t);   // px por ms
    const w = paginas.clientWidth;
    arrasto = 0;
    if (dx < -w * 0.2 || velocidade < -0.45) irParaPagina(paginaIdx + 1);
    else if (dx > w * 0.2 || velocidade > 0.45) irParaPagina(paginaIdx - 1);
    else posicionarPaginas(true);
  }
  gesto = null;
}
// Soltar em qualquer lugar (até por cima de um diálogo que acabou de abrir) encerra o gesto.
window.addEventListener('pointerup', soltarGesto);
window.addEventListener('pointercancel', soltarGesto);
// Abriu uma janela por cima (folha, diálogo, menu): o gesto que estava começando não vale mais.
function cancelarGesto() {
  gesto = null;
  if (arrasto) { arrasto = 0; posicionarPaginas(true); }
}
// Depois de arrastar, o toque não vale como clique (não rola dado sem querer).
paginas.addEventListener('click', (ev) => {
  if (performance.now() - fimDoArrasto < 400) { ev.stopPropagation(); ev.preventDefault(); }
}, true);
// Setas do teclado (no computador) também passam as páginas.
document.addEventListener('keydown', (ev) => {
  if (camadas.length || /input|textarea|select/i.test(document.activeElement.tagName)) return;
  if (ev.key === 'ArrowRight') irParaPagina(paginaIdx + 1);
  if (ev.key === 'ArrowLeft') irParaPagina(paginaIdx - 1);
});
new ResizeObserver(() => posicionarPaginas(false)).observe(paginas);
// A caixa das páginas nunca rola sozinha (o navegador tenta, ao focar um campo de uma página
// vizinha): se rolar, volta e mostra a página daquele campo.
paginas.addEventListener('scroll', () => {
  if (!paginas.scrollLeft && !paginas.scrollTop) return;
  paginas.scrollLeft = 0;
  paginas.scrollTop = 0;
});
paginas.addEventListener('focusin', (ev) => {
  const pg = ev.target.closest('.pagina');
  const i = PAGINAS.indexOf(pg);
  if (i >= 0 && i !== paginaIdx) irParaPagina(i, false);
});

// ---------- 5. Tocar e segurar ----------
// Tocar faz a ação principal (quase sempre rolar); segurar meio segundo abre a edição.
function tocavel(no, aoTocar, aoSegurar = null) {
  no.classList.add('tocavel');
  let timer = null, segurou = false, x0 = 0, y0 = 0;
  const cancelar = () => clearTimeout(timer);
  no.addEventListener('pointerdown', (ev) => {
    segurou = false; x0 = ev.clientX; y0 = ev.clientY;
    if (aoSegurar) timer = setTimeout(() => { segurou = true; vibrar(); aoSegurar(); }, 500);
  });
  no.addEventListener('pointermove', (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) cancelar(); });
  for (const tipo of ['pointerup', 'pointercancel', 'pointerleave']) no.addEventListener(tipo, cancelar);
  no.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (segurou) { segurou = false; return; }
    aoTocar(ev);
  });
  if (aoSegurar) no.addEventListener('contextmenu', (ev) => ev.preventDefault());
  return no;
}
function botao(classe, filhos, aoTocar, aoSegurar) {
  const b = el('button', classe);
  b.type = 'button';
  b.append(...filhos);
  return tocavel(b, aoTocar, aoSegurar);
}

// ---------- 6. Rolagens ----------
let ultima = null;   // { titulo, expr, editar } da última rolagem (para Vantagem/De novo)

function rolarExpr(titulo, expr, editar = null, modo = 'normal') {
  let rolagem;
  try { rolagem = rolarPartes(aplicarModo(expr, modo), rolarDadoCripto); }
  catch (e) { avisar(`${titulo}: ${e.message}`); return null; }
  ultima = { titulo, expr, editar };
  vibrar();
  fecharFolha(() => mostrarRolagem(titulo, rolagem, modo));
  return rolagem;
}

// Os dados de uma linha, em texto: "[14]", "[6, ~2~]", "3 + 5 + 4" (repetições)...
function detalheDaLinha(l) {
  const caixa = el('span');
  const grupo = (g) => {
    const s = el('span', '', '[');
    g.forEach((d, i) => {
      if (i) s.append(', ');
      s.append(el('span', d.descartado ? 'descartado' : '', String(d.valor)));
    });
    s.append(']');
    return s;
  };
  if (l.repeticoes) caixa.append(l.repeticoes.map(r => r.valor).join(' + '));
  else if (l.multiplicacao) caixa.append(`${l.multiplicacao.valorA} × ${l.multiplicacao.valorB}`);
  else if (l.grupos.length) l.grupos.forEach((g, i) => { if (i) caixa.append(' '); caixa.append(grupo(g)); });
  else caixa.append(l.texto.replace(/^−/, ''));
  return caixa;
}
function detalhe(res) {
  const d = el('span', 'detalhe');
  res.linhas.forEach((l, i) => {
    const neg = l.subtotal < 0 || l.texto.startsWith('−');
    if (i) d.append(neg ? ' − ' : ' + ');
    else if (neg) d.append('−');
    d.append(detalheDaLinha(l));
  });
  return d;
}

function mostrarRolagem(titulo, rolagem, modo) {
  const caixa = $('rolagem');
  caixa.replaceChildren();
  const topo = el('div', 'rolagem-topo');
  const nomeModo = { vant: ' · Vantagem', desv: ' · Desvantagem' }[modo] || '';
  topo.append(el('h2', '', titulo + nomeModo));
  if (ultima && ultima.editar) {
    const ed = el('button', 'icone'); ed.setAttribute('aria-label', 'Editar');
    ed.append(icone('lapis'));
    const editar = ultima.editar;
    ed.addEventListener('click', () => { esconderRolagem(); editar(); });
    topo.append(ed);
  }
  const fechar = el('button', 'icone'); fechar.setAttribute('aria-label', 'Fechar');
  fechar.append(icone('fechar'));
  fechar.addEventListener('click', esconderRolagem);
  topo.append(fechar);
  caixa.append(topo);

  const partes = rolagem.partes;
  const unica = partes.length === 1;
  const somas = somasDeDano(rolagem);
  partes.forEach((parte, i) => {
    const linha = el('div', 'parte' + (unica ? ' unica' : ''));
    if (!unica || parte.rotulo) linha.append(el('span', 'rotulo', parte.rotulo || parte.res.expressao));
    linha.append(el('span', 'total', String(parte.res.total)));
    if (parte.natural === 20) { linha.classList.add('critico'); linha.append(el('span', 'etiqueta', '20 NATURAL')); }
    else if (parte.natural === 1) { linha.classList.add('falha'); linha.append(el('span', 'etiqueta', '1 NATURAL')); }
    else if (parte.critico) { linha.classList.add('critico'); linha.append(el('span', 'etiqueta', 'CRÍTICO')); }
    linha.append(detalhe(parte.res));
    caixa.append(linha);
    for (const s of somas.filter(x => x.fim === i)) {
      const soma = el('div', 'parte soma');
      soma.append(el('span', 'rotulo', 'Total'), el('span', 'total', String(s.total)), el('span', 'detalhe', s.rotulos.join(' + ')));
      caixa.append(soma);
    }
  });

  // Rolar de novo; com d20, também com Vantagem ou Desvantagem.
  const botoes = el('div', 'rolagem-botoes');
  const deNovo = (m) => () => rolarExpr(ultima.titulo, ultima.expr, ultima.editar, m);
  if (/d20/.test(ultima.expr)) {
    const v = el('button', '', 'Vantagem'); v.addEventListener('click', deNovo('vant'));
    const d = el('button', '', 'Desvantagem'); d.addEventListener('click', deNovo('desv'));
    botoes.append(v, d);
  }
  const n = el('button', '', 'Rolar de novo'); n.addEventListener('click', deNovo(modo));
  botoes.append(n);
  caixa.append(botoes);
  caixa.hidden = false;
  document.body.classList.add('com-rolagem');
}
function esconderRolagem() {
  $('rolagem').hidden = true;
  document.body.classList.remove('com-rolagem');
}

// ---------- 7. Folha (janela que sobe de baixo) e campos ----------
function abrirFolha(titulo, montar) {
  esconderAviso();
  $('folha-titulo').textContent = titulo;
  const corpo = $('folha-corpo');
  corpo.replaceChildren();
  montar(corpo);
  if ($('folha').hidden) {
    $('folha').hidden = false;
    abrirCamada(() => { $('folha').hidden = true; });
  }
  corpo.scrollTop = 0;
  const primeiro = corpo.querySelector('[data-foco]');
  if (primeiro) setTimeout(() => { primeiro.focus(); if (primeiro.select) primeiro.select(); }, 60);
}
// Fecha a folha (se aberta) e depois faz "depois".
function fecharFolha(depois = null) {
  if ($('folha').hidden) { if (depois) depois(); return; }
  depoisDeVoltar = depois;
  voltar();
}
$('fechar-folha').addEventListener('click', () => fecharFolha());
$('folha').addEventListener('click', (ev) => { if (ev.target === $('folha')) fecharFolha(); });

function campo(rotulo, entrada) {
  const l = el('label', 'campo');
  l.append(rotulo, entrada);
  return l;
}
function entrada(valor, tipo = 'text', extra = {}) {
  const i = el('input');
  i.type = tipo;
  i.value = valor ?? '';
  Object.assign(i, extra);
  if (extra.foco) i.dataset.foco = '';
  return i;
}
function areaTexto(valor) {
  const t = el('textarea');
  t.value = valor || '';
  return t;
}
function marcar(rotulo, ligado) {
  const l = el('label', 'marcar');
  const c = el('input'); c.type = 'checkbox'; c.checked = !!ligado;
  l.append(c, rotulo);
  l.caixa = c;
  return l;
}
// Botões lado a lado em que só um fica marcado (ex.: Nenhuma / Proficiente / Especialista).
function escolha(opcoes, atual, aoMudar) {
  const caixa = el('div', 'escolha');
  caixa.valor = atual;
  for (const [valor, nome] of opcoes) {
    const b = el('button', valor === atual ? 'ativo' : '', nome);
    b.type = 'button';
    b.addEventListener('click', () => {
      caixa.valor = valor;
      [...caixa.children].forEach(x => x.classList.toggle('ativo', x === b));
      if (aoMudar) aoMudar(valor);
    });
    caixa.append(b);
  }
  return caixa;
}
function botaoFolha(texto, classe, aoTocar) {
  const b = el('button', 'botao' + (classe ? ' ' + classe : ''), texto);
  b.type = 'button';
  b.addEventListener('click', aoTocar);
  return b;
}
const linhaBotoes = (...bs) => { const d = el('div', 'botoes'); d.append(...bs.filter(Boolean)); return d; };
const numeroDe = (input, padrao = 0) => { const n = parseInt(String(input.value).replace('−', '-'), 10); return Number.isFinite(n) ? n : padrao; };
const dica = (texto) => el('p', 'dica', texto);
// Confere uma expressão de dados sem rolar; devolve a mensagem de erro (ou '').
function erroDaExpr(expr) {
  try { validar(expr); return ''; } catch (e) { return e.message; }
}
const opcoesAtributos = (comNenhum) => {
  const op = ATRIBUTOS.map(a => [a.id, a.nome]);
  return comNenhum ? [...op, ['', 'Nenhum']] : op;
};
function selecao(opcoes, atual) {
  const s = el('select');
  for (const [v, n] of opcoes) { const o = el('option', '', n); o.value = v; s.append(o); }
  s.value = atual;
  return s;
}

// ---------- 8. Desenhar as páginas ----------
function desenhar(tudo = false) {
  $('titulo').textContent = p.nome;
  document.title = p.nome + ' · Ficha';
  desenharPrincipal();
  desenharPericias();
  desenharAtaques();
  desenharMagias();
  if (tudo || !$('pg-detalhes').childElementCount) desenharDetalhes();
  else { $('det-classe').textContent = classeENivel(); desenharCaracteristicas(); }
  if (tudo) desenharGaleria();
}
const classeENivel = () => classeENivelDe(p);
// Como na ficha de papel: positivo sem "+" (3), negativo com "-" (-1).
const semMais = (n) => String(n);

// Caixa com rótulo e número grande; textos compridos ("9 m", "2d20+1") ficam menores.
function caixaNumero(classe, rotulo, numero, aoTocar, aoSegurar) {
  const n = String(numero);
  return botao(classe, [el('span', 'rot', rotulo), el('span', 'num-grande' + (n.length > 3 ? ' longo' : ''), n)], aoTocar, aoSegurar);
}

function desenharPrincipal() {
  const pg = $('pg-principal');
  pg.replaceChildren();
  const linha = el('div', 'linha');
  linha.append(
    botao('pilula-nome', [p.nome], editarNome),
    botao('pilula-nome classe', [classeENivel()], editarClasse),
  );
  pg.append(linha);

  const trio = el('div', 'trio');
  const ini = iniciativa(p);
  trio.append(caixaNumero('caixa-verde', 'Iniciativa', semMais(ini), rolarIniciativa, editarIniciativa));
  const pv = botao('caixa-pv' + (p.pv <= p.pvMax / 4 ? ' baixo' : ''),
    [el('span', 'rot', 'PV'), el('span', 'num-grande', String(p.pv))], folhaPV, folhaPV);
  if (p.pvTemp) pv.append(el('span', 'temp', `+${p.pvTemp} temp.`));
  trio.append(pv);
  const desl = caixaNumero('caixa-verde', 'Deslocamento', metros(deslocamentoDe(p)), editarDeslocamento, editarDeslocamento);
  desl.querySelector('.num-grande').append(el('small', 'unidade', 'm'));
  trio.append(desl);
  pg.append(trio);

  const azul = el('div', 'grupo-azul');
  const textoDV = textoDadosDeVida(p);
  const dv = botao('', [el('span', 'rot', 'Dados de Vida'), el('span', 'num-grande' + (textoDV.length > 4 ? ' longo' : ''), textoDV)],
    dialogoDadosVida, dialogoDadosVida);
  if (dadosDeVidaRestantes(p) < p.nivel) dv.append(el('small', '', `de ${p.nivel}`));
  azul.append(
    dv,
    caixaNumero('', 'Classe de Armadura', classeArmaduraDe(p), editarCA, editarCA),
    caixaNumero('', 'Proficiência', comSinal(profDe(p)), folhaProficiencia, folhaProficiencia),
  );
  pg.append(azul);

  // Atributos em duas colunas: Força, Destreza, Constituição | Inteligência, Sabedoria, Carisma.
  const verde = el('div', 'grupo-verde');
  for (const id of ['for', 'int', 'des', 'sab', 'con', 'car']) verde.append(cartaoAtributo(id));
  pg.append(verde);
}

function cartaoAtributo(id) {
  const card = el('div', 'atributo');
  const nome = NOME_ATRIBUTO[id];
  const teste = () => rolarExpr(`Teste de ${nome}`, '1d20' + comSinal(modDe(p, id)), editarAtributos);
  const salv = () => rolarExpr(`Salvaguarda de ${nome}`, '1d20' + comSinal(salvaguarda(p, id)), editarAtributos);
  const editar = editarAtributos;
  const titulo = tocavel(el('h3', '', nome), teste, editar);
  const col = (rot, valor, classe = '') => {
    const c = el('span', classe);
    c.append(el('div', 'rot-it', rot), el('div', 'valor', valor));
    return c;
  };
  const valor = botao('', [col('Valor', String(p.atributos[id]))], teste, editar);
  const mod = botao('', [col('Mod.', comSinal(modDe(p, id)))], teste, editar);
  const sv = botao('salv' + (p.salvaguardas[id] ? ' prof' : ''), [col('Salv.', comSinal(salvaguarda(p, id)))], salv, editar);
  sv.setAttribute('aria-label', `Salvaguarda de ${nome}`);
  card.append(titulo, valor, mod, sv);
  return card;
}

function desenharPericias() {
  const pg = $('pg-pericias');
  pg.replaceChildren();
  const colunas = el('div', 'colunas');
  for (const lista of COLUNAS_PERICIAS) {
    const coluna = el('div', 'coluna');
    for (const atr of lista) {
      const cartao = el('div', 'cartao-pericias');
      const h = el('h3');
      h.append(el('span', '', NOME_ATRIBUTO[atr]), el('span', '', comSinal(modDe(p, atr))));
      tocavel(h, () => rolarExpr(`Teste de ${NOME_ATRIBUTO[atr]}`, '1d20' + comSinal(modDe(p, atr)), editarAtributos),
        editarAtributos);
      cartao.append(h);
      for (const s of PERICIAS.filter(x => x.atr === atr)) {
        const nivel = p.pericias[s.id] || 0;
        const valor = pericia(p, s.id);
        cartao.append(botao('pericia' + (nivel === 1 ? ' prof' : nivel === 2 ? ' espec' : ''),
          [el('span', '', s.nome), el('span', '', semMais(valor))],
          () => rolarExpr(s.nome, '1d20' + comSinal(pericia(p, s.id)), () => editarPericia(s.id)),
          () => editarPericia(s.id)));
      }
      coluna.append(cartao);
    }
    colunas.append(coluna);
  }
  pg.append(colunas, el('p', 'passiva', `Percepção passiva ${percepcaoPassiva(p)}`));
}

function desenharAtaques() {
  const pg = $('pg-ataques');
  pg.replaceChildren();
  const caixas = el('div', 'caixas-amarelas');
  const dest = p.atributoDestaque;
  const rec = p.recursos[p.recursoDestaque];
  const textoRec = rec ? textoRecurso(rec) : '+';
  const caixaRec = botao('caixa-amarela' + (rec && rec.gastavel && !restanteRecurso(rec) ? ' esgotado' : ''),
    [el('span', 'rot', rec ? rec.texto : 'Recurso'), el('span', 'num-grande' + (textoRec.length > 4 ? ' longo' : ''), textoRec)],
    () => (rec ? usarRecurso(p.recursoDestaque) : editarDestaque()), editarDestaque);
  caixas.append(
    caixaNumero('caixa-amarela', 'Proficiência', comSinal(profDe(p)), folhaProficiencia, folhaProficiencia),
    caixaNumero('caixa-amarela', NOME_ATRIBUTO[dest], comSinal(modDe(p, dest)),
      () => rolarExpr(`Teste de ${NOME_ATRIBUTO[dest]}`, '1d20' + comSinal(modDe(p, dest)), editarDestaque), editarDestaque),
    caixaRec,
  );
  pg.append(caixas);

  if (!p.ataques.length) pg.append(el('p', 'vazio', 'Nenhuma arma ainda.'));
  p.ataques.forEach((a, i) => {
    const linha = el('div', 'arma');
    const atacar = () => rolarAtaque(i);
    const editar = () => editarArma(i);
    const topo = botao('arma-topo', [el('span', '', a.nome), el('span', '', a.alcance || '—'), el('span', '', a.tipo || '—')], atacar, editar);
    const baixo = botao('arma-baixo', [el('span', '', comSinal(bonusAtaque(p, a))), el('span', '', exprDano(p, a))], atacar, editar);
    const tirar = el('button', 'tirar');
    tirar.type = 'button';
    tirar.setAttribute('aria-label', `Tirar ${a.nome}`);
    tirar.append(icone('fechar'));
    tirar.addEventListener('click', () => comDesfazer(`${a.nome} tirada`, () => p.ataques.splice(i, 1)));
    linha.append(topo, baixo, tirar);
    pg.append(linha);
  });
  pg.append(botao('botao-novo', ['Nova'], escolherArma));
}

// Tocar no recurso: gasta um (e rola o dado dele, se tiver); fixo só rola.
function usarRecurso(i) {
  const r = p.recursos[i];
  if (!r.gastavel) { if (r.dado) rolarExpr(r.nome, `${r.max}d${r.dado}`, editarDestaque); return; }
  if (!restanteRecurso(r)) { avisar(`${r.nome}: nenhum uso restante. ${r.reset === 'nunca' ? '' : 'O descanso ' + (r.reset === 'curto' ? 'curto' : 'longo') + ' devolve.'}`); return; }
  const antes = structuredClone(p);
  r.usados += 1;
  salvar();
  desenhar();
  if (r.dado) rolarExpr(`${r.nome} (restam ${restanteRecurso(r)})`, `1d${r.dado}`, editarDestaque);
  avisar(`${r.nome}: restam ${restanteRecurso(r)} de ${r.max}`, 'Desfazer', () => {
    const k = personagens.indexOf(p); personagens[k] = antes; p = antes; salvar(); desenhar(true);
  });
}

function rolarAtaque(i) {
  const a = p.ataques[i];
  rolarExpr(a.nome, `Ataque: 1d20${comSinal(bonusAtaque(p, a))}; Dano: ${exprDano(p, a)}`, () => editarArma(i));
}

function desenharMagias() {
  const pg = $('pg-magias');
  pg.replaceChildren();
  const caixas = el('div', 'caixas-roxas');
  caixas.append(
    caixaNumero('caixa-roxa', 'Nv. Conj.', p.conjuracao.nivel, editarConjuracao, editarConjuracao),
    caixaNumero('caixa-roxa', 'Ataque', comSinal(ataqueMagia(p)),
      () => rolarExpr('Ataque Mágico', '1d20' + comSinal(ataqueMagia(p)), editarConjuracao), editarConjuracao),
    caixaNumero('caixa-roxa', 'CD', cdMagia(p), editarConjuracao, editarConjuracao),
  );
  pg.append(caixas);

  for (let n = 0; n <= 9; n++) {
    const doNivel = p.magias.map((m, i) => [m, i]).filter(([m]) => m.nivel === n);
    const esp = p.espacos[n];
    if (n > 0 && !esp && !doNivel.length) continue;
    const cab = el('div', 'nivel-magia');
    cab.append(botao('', [ORDINAIS[n]], () => editarNivelMagia(n), () => editarNivelMagia(n)));
    if (esp) {
      const resta = esp.max - esp.usados;
      cab.append(botao('espacos' + (resta ? '' : ' acabou'), [`${resta} / ${esp.max}`], () => gastarEspaco(n), () => editarNivelMagia(n)));
    }
    pg.append(cab);
    const lista = el('div', 'lista-magias');
    for (const [m, i] of doNivel) {
      const b = botao('magia' + (m.preparada ? '' : ' nao-preparada'), [m.nome], () => folhaMagia(i), () => editarMagia(i));
      if (exprMagia(p, m)) b.append(el('span', 'dado-mini', '🎲'));
      lista.append(b);
    }
    const nova = botao('magia nova', ['+'], () => escolherMagia(n));
    nova.setAttribute('aria-label', `Nova magia (${ORDINAIS[n]})`);
    lista.append(nova);
    pg.append(lista);
  }
  pg.append(botao('botao-nivel', ['+ Espaços de magia'], folhaEspacos));
}

function gastarEspaco(n) {
  const esp = p.espacos[n];
  if (esp.usados >= esp.max) { avisar(`Sem espaços de ${ORDINAIS[n]}. Um descanso longo devolve.`); return; }
  comDesfazer(`Espaço de ${ORDINAIS[n]} gasto (restam ${esp.max - esp.usados - 1})`, () => { esp.usados += 1; });
}

function desenharDetalhes() {
  const pg = $('pg-detalhes');
  pg.replaceChildren();
  const cartao = (titulo, conteudo, escolher = null) => {
    const c = el('div', 'cartao-texto');
    const h = el('h3', '', titulo);
    // "▾" abre a lista do SRD (espécies, antecedentes); dá para escrever à mão também.
    if (escolher) { const b = el('button', 'escolher', '▾'); b.type = 'button'; b.setAttribute('aria-label', 'Escolher ' + titulo); b.addEventListener('click', escolher); h.append(b); }
    c.append(h, conteudo);
    return c;
  };
  const campoLinha = (chave, tipo = 'text') => {
    const i = entrada(p[chave], tipo);
    if (tipo === 'number') i.inputMode = 'numeric';
    i.addEventListener('input', () => {
      p[chave] = tipo === 'number' ? Math.max(0, numeroDe(i)) : i.value.slice(0, 60);
      salvarDepois();
    });
    return i;
  };
  // Caixas de texto que crescem com o que se escreve.
  const crescer = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
  const campoTexto = (id) => {
    const t = areaTexto(p.textos[id]);
    t.rows = 1;
    t.addEventListener('input', () => { p.textos[id] = t.value; crescer(t); salvarDepois(); });
    requestAnimationFrame(() => crescer(t));
    return t;
  };

  const classe = botao('valor-texto', [classeENivel()], editarClasse);
  classe.id = 'det-classe';
  pg.append(cartao('Classe', classe));
  const dois1 = el('div', 'dois');
  dois1.append(cartao('Espécie', campoLinha('raca'), escolherEspecie), cartao('Antecedente', campoLinha('antecedente'), escolherAntecedente));
  const dois2 = el('div', 'dois');
  dois2.append(cartao('Alinhamento', campoLinha('alinhamento')), cartao('Experiência', campoLinha('xp', 'number')));
  pg.append(dois1, dois2);
  const carac = el('div', 'cartao-texto');
  carac.id = 'det-caracteristicas';
  pg.append(carac);
  desenharCaracteristicas();
  for (const t of TEXTOS) pg.append(cartao(t.id === 'caracteristicas' ? 'Outras Características' : t.nome, campoTexto(t.id)));
  const moedas = el('div', 'moedas');
  for (const m of MOEDAS) {
    const i = entrada(p.moedas[m.id], 'number', { inputMode: 'numeric', min: 0 });
    i.addEventListener('input', () => { p.moedas[m.id] = Math.max(0, numeroDe(i)); salvarDepois(); });
    moedas.append(cartao(m.nome, i));
  }
  pg.append(moedas);
  for (const t of TEXTOS_FINAIS) pg.append(cartao(t.nome, campoTexto(t.id)));
  // Ao trocar de página, as caixas de texto acertam a altura (a página escondida não tem medida certa).
  requestAnimationFrame(() => pg.querySelectorAll('textarea').forEach(crescer));
}

// ---------- 9. Edição (folhas) ----------
function formSimples(titulo, campos, aoSalvar, extras = []) {
  abrirFolha(titulo, (corpo) => {
    const erro = el('p', 'erro');
    corpo.append(...campos, erro);
    const salvarForm = () => {
      const msg = aoSalvar();
      if (msg) { erro.textContent = msg; return; }
      salvar();
      fecharFolha(() => desenhar());
    };
    corpo.append(linhaBotoes(...extras, botaoFolha('Salvar', 'principal', salvarForm)));
    corpo.querySelectorAll('input').forEach(i => i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') salvarForm(); }));
  });
}

function editarNome() {
  const nome = entrada(p.nome, 'text', { foco: true, maxLength: 60 });
  formSimples('Nome', [campo('Nome do personagem', nome)], () => {
    if (!nome.value.trim()) return 'Escreva um nome.';
    p.nome = nome.value.trim();
  });
}

function rolarIniciativa() {
  rolarExpr('Iniciativa', '1d20' + comSinal(iniciativa(p)), editarIniciativa);
}
function folhaPV() {
  abrirFolha('Pontos de Vida', (corpo) => {
    const visor = el('div', 'pv-visor');
    visor.append(String(p.pv), el('small', '', ` / ${p.pvMax}`));
    if (p.pvTemp) visor.append(el('span', 'temp', `+${p.pvTemp} PV temporários`));
    const qtd = entrada('', 'number', { foco: true, min: 1, inputMode: 'numeric', placeholder: 'Quantidade' });
    const erro = el('p', 'erro');
    const agir = (tipo) => () => {
      const n = numeroDe(qtd, 0);
      if (n <= 0) { erro.textContent = 'Digite a quantidade.'; qtd.focus(); return; }
      fecharFolha(() => {
        if (tipo === 'dano') {
          comDesfazer(`−${n} PV`, () => {
            Object.assign(p, sofrerDano(p, n));
            if (n >= p.pvMax * 2 && p.pv === 0) avisar('Dano massivo: o dano que sobrou passou do máximo de PV. Morte instantânea (regra 2024).');
          });
        } else if (tipo === 'cura') comDesfazer(`+${n} PV`, () => { p.pv = curar(p, n); });
        else comDesfazer(`${Math.max(n, p.pvTemp)} PV temporários`, () => { p.pvTemp = Math.max(p.pvTemp, n); });
      });
    };
    const max = entrada(p.pvMax, 'number', { min: 1, inputMode: 'numeric' });
    max.addEventListener('change', () => {
      const n = numeroDe(max, 0);
      if (n < 1) { max.value = p.pvMax; return; }
      p.pvMax = Math.min(9999, n);
      p.pv = Math.min(p.pv, p.pvMax);
      salvar();
      desenhar();
      visor.firstChild.textContent = String(p.pv);
      visor.children[0].textContent = ` / ${p.pvMax}`;
    });
    corpo.append(visor, campo('Quantidade', qtd), erro,
      linhaBotoes(botaoFolha('Dano', 'ruim', agir('dano')), botaoFolha('Cura', 'bom', agir('cura')), botaoFolha('Temp.', '', agir('temp'))),
      campo('PV máximo', max),
      dica('Dano gasta primeiro os PV temporários. PV temporários não se somam: fica o maior.'));
  });
}

function folhaProficiencia() {
  abrirFolha('Bônus de Proficiência', (corpo) => {
    corpo.append(dica(`${comSinal(profDe(p))} no nível ${p.nivel}. Ele muda sozinho com o nível: +2 (1–4), +3 (5–8), +4 (9–12), +5 (13–16), +6 (17–20).`),
      linhaBotoes(botaoFolha('Mudar classe e nível', 'principal', () => fecharFolha(editarClasse))));
  });
}

function editarArma(i, modelo = null) {
  const a = i === null ? limparAtaque(modelo || { nome: '', atributo: 'for', dano: '1d8' }) : structuredClone(p.ataques[i]);
  const nome = entrada(i === null && !modelo ? '' : a.nome, 'text', { foco: true, maxLength: 60, placeholder: 'Ex.: Espada Longa' });
  const alcance = entrada(a.alcance, 'text', { maxLength: 30, placeholder: '1,5 m' });
  const tipo = entrada(a.tipo, 'text', { maxLength: 30, placeholder: 'Cortante' });
  const atr = selecao(opcoesAtributos(true), a.atributo);
  const prof = marcar('Proficiente com a arma', a.prof);
  const bonus = entrada(a.bonus, 'number');
  const dano = entrada(a.dano, 'text', { maxLength: 60, autocapitalize: 'off', spellcheck: false, placeholder: '1d8' });
  const somar = marcar('Somar o modificador do atributo no dano', a.somarMod);
  const bonusDano = entrada(a.bonusDano, 'number');
  const notas = entrada(a.notas, 'text', { maxLength: 400, placeholder: 'Propriedades, maestria...' });
  const previa = el('p', 'dica');
  const ler = () => Object.assign(a, {
    nome: nome.value.trim() || 'Arma', alcance: alcance.value.trim(), tipo: tipo.value.trim(), atributo: atr.value,
    prof: prof.caixa.checked, bonus: numeroDe(bonus), dano: dano.value.trim(), somarMod: somar.caixa.checked, bonusDano: numeroDe(bonusDano),
    notas: notas.value.trim(),
  });
  const atualizar = () => { ler(); previa.textContent = `Ataque ${comSinal(bonusAtaque(p, a))} · Dano ${exprDano(p, a)}`; };
  const l1 = el('div', 'campos-lado'); l1.append(campo('Alcance', alcance), campo('Tipo de dano', tipo));
  const l2 = el('div', 'campos-lado'); l2.append(campo('Atributo', atr), campo('Bônus no ataque', bonus));
  const l3 = el('div', 'campos-lado'); l3.append(campo('Dados de dano', dano), campo('Bônus no dano', bonusDano));
  const campos = [campo('Nome', nome), l1, l2, prof, l3, somar, campo('Propriedades', notas), previa];
  formSimples(i === null ? 'Nova arma' : 'Editar arma', campos, () => {
    ler();
    if (a.dano) { const erro = erroDaExpr(a.dano); if (erro) return 'Dano: ' + erro; }
    const limpo = limparAtaque(a);
    if (i === null) p.ataques.push(limpo); else p.ataques[i] = limpo;
  }, i === null ? [] : [botaoFolha('Apagar', 'perigo', () => {
    const nomeArma = p.ataques[i].nome;
    fecharFolha(() => comDesfazer(`${nomeArma} tirada`, () => p.ataques.splice(i, 1)));
  })]);
  $('folha-corpo').addEventListener('input', atualizar);
  $('folha-corpo').addEventListener('change', atualizar);
  atualizar();
}

function editarNivelMagia(n) {
  if (n === 0) { escolherMagia(0); return; }
  const esp = p.espacos[n] || { max: 0, usados: 0 };
  const max = entrada(esp.max, 'number', { foco: true, min: 0, max: 20, inputMode: 'numeric' });
  const resta = entrada(esp.max - esp.usados, 'number', { min: 0, max: 20, inputMode: 'numeric' });
  const lado = el('div', 'campos-lado'); lado.append(campo('Espaços (total)', max), campo('Restam', resta));
  formSimples(ORDINAIS[n], [lado, dica('Tocar no número de espaços gasta um. O descanso longo devolve todos.')], () => {
    const m = numeroDe(max, -1);
    if (m < 0 || m > 20) return 'Os espaços vão de 0 a 20.';
    const r = Math.min(m, Math.max(0, numeroDe(resta, m)));
    if (m) p.espacos[n] = { max: m, usados: m - r }; else delete p.espacos[n];
  }, [botaoFolha('Nova magia', '', () => escolherMagia(n))]);
}

function folhaEspacos() {
  abrirFolha('Espaços de magia', (corpo) => {
    corpo.append(dica('Quantos espaços de cada nível o personagem tem (0 esconde o nível sem magias).'));
    const grade = el('div', 'campos-lado');
    const entradas = [];
    for (let n = 1; n <= 9; n++) {
      const i = entrada((p.espacos[n] || {}).max || 0, 'number', { min: 0, max: 20, inputMode: 'numeric' });
      entradas[n] = i;
      grade.append(campo(ORDINAIS[n], i));
    }
    corpo.append(grade, linhaBotoes(botaoFolha('Salvar', 'principal', () => {
      for (let n = 1; n <= 9; n++) {
        const m = Math.max(0, Math.min(20, numeroDe(entradas[n], 0)));
        const antes = p.espacos[n];
        if (m) p.espacos[n] = { max: m, usados: Math.min(m, antes ? antes.usados : 0) };
        else delete p.espacos[n];
      }
      salvar();
      fecharFolha(() => desenhar());
    })));
  });
}

function folhaMagia(i) {
  const m = p.magias[i];
  abrirFolha(m.nome, (corpo) => {
    corpo.append(dica(`${ORDINAIS[m.nivel] === 'Truques' ? 'Truque' : ORDINAIS[m.nivel]} · ${m.preparada ? 'Preparada' : 'Não preparada'}` +
      (m.salvaguarda ? ` · Salvaguarda de ${NOME_ATRIBUTO[m.salvaguarda]} CD ${cdMagia(p)}` : '')));
    const ref = m.ref && magiaDoSRD(m.ref);
    if (ref) corpo.append(fichaDaMagia(ref));
    if (m.notas) corpo.append(el('p', 'notas-magia', m.notas));
    const expr = exprMagia(p, m);
    if (expr) corpo.append(dica('Rolagem: ' + expr));
    const lancar = m.nivel > 0 ? botaoFolha('Lançar (gasta espaço)', 'principal', () => {
      const esp = p.espacos[m.nivel];
      if (!esp || esp.usados >= esp.max) { fecharFolha(() => avisar(`Sem espaços de ${ORDINAIS[m.nivel]}.`)); return; }
      fecharFolha(() => {
        comDesfazer(`${m.nome}: espaço de ${ORDINAIS[m.nivel]} gasto`, () => { esp.usados += 1; });
        if (expr) rolarExpr(m.nome, expr, () => editarMagia(i));
      });
    }) : null;
    corpo.append(
      linhaBotoes(lancar, expr ? botaoFolha('Rolar', lancar ? '' : 'principal', () => rolarExpr(m.nome, expr, () => editarMagia(i))) : null),
      linhaBotoes(
        botaoFolha(m.preparada ? 'Desmarcar preparada' : 'Marcar preparada', '', () => {
          m.preparada = !m.preparada; salvar(); fecharFolha(() => desenhar());
        }),
        botaoFolha('Editar', '', () => editarMagia(i))));
  });
}

function editarMagia(i, nivelNovo = 0) {
  const m = i === null ? limparMagia({ nome: '', nivel: nivelNovo }) : structuredClone(p.magias[i]);
  const nome = entrada(i === null ? '' : m.nome, 'text', { foco: true, maxLength: 80, placeholder: 'Ex.: Bola de Fogo (V, S, M)' });
  const nivel = selecao(ORDINAIS.map((o, n) => [String(n), n ? o : 'Truque']), String(m.nivel));
  const prep = marcar('Preparada', m.preparada);
  const atq = marcar(`Rola o Ataque Mágico (1d20${comSinal(ataqueMagia(p))})`, m.ataque);
  const rolagem = entrada(m.rolagem, 'text', { maxLength: 120, autocapitalize: 'off', spellcheck: false, placeholder: 'Ex.: 8d6 ou Dano: 3d8; Fogo: 1d6' });
  const notas = areaTexto(m.notas);
  formSimples(i === null ? 'Nova magia' : 'Editar magia', [campo('Nome', nome), campo('Nível', nivel), prep, atq,
    campo('Dados (dano, cura...)', rolagem), campo('Anotações', notas)], () => {
    if (!nome.value.trim()) return 'Escreva o nome da magia.';
    if (rolagem.value.trim()) { const erro = erroDaExpr(rolagem.value); if (erro) return erro; }
    const limpa = limparMagia({ nome: nome.value.trim(), nivel: Number(nivel.value), preparada: prep.caixa.checked,
      ataque: atq.caixa.checked, rolagem: rolagem.value.trim(), notas: notas.value });
    if (i === null) p.magias.push(limpa); else p.magias[i] = limpa;
  }, i === null ? [] : [botaoFolha('Apagar', 'perigo', () => {
    const n = p.magias[i].nome;
    fecharFolha(() => comDesfazer(`${n} apagada`, () => p.magias.splice(i, 1)));
  })]);
}

// ---------- 10. Personagens, lixeira, menu ----------
function trocarPara(x) {
  p = x;
  salvar();
  esconderRolagem();
  desenhar(true);
}

// Manda um personagem para a lixeira (dá para restaurar em ⋮ → Restaurar personagem).
function mandarParaLixeira(x) {
  personagens.splice(personagens.indexOf(x), 1);
  lixeira.unshift(x);
  lixeira = lixeira.slice(0, 10);
  if (!personagens.length) personagens.push(novoPersonagem());
  if (x === p) trocarPara(personagens[0]); else { salvar(); desenhar(); }
  avisar(`${x.nome} foi para a lixeira`, 'Desfazer', restaurar(0));
}
async function apagarPersonagem() {
  const ok = await dialogo(`Apagar ${p.nome}?`, (corpo) => {
    corpo.append(el('p', 'dialogo-dica', 'Vai para a lixeira: dá para trazer de volta em ⋮ → Restaurar personagem.'));
  }, [{ texto: 'Cancelar', valor: false }, { texto: 'Apagar', valor: true }]);
  if (ok) mandarParaLixeira(p);
}
const restaurar = (i) => () => {
  const x = lixeira.splice(i, 1)[0];
  if (!x) return;
  if (personagens.some(y => y.id === x.id)) x.id = limparPersonagem({}).id;
  personagens.push(x);
  trocarPara(x);
};
function folhaRestaurar() {
  abrirFolha('Restaurar personagem', (corpo) => {
    if (!lixeira.length) { corpo.append(dica('A lixeira está vazia.')); return; }
    corpo.append(dica('Toque para trazer de volta (a lixeira guarda os 10 últimos).'));
    lixeira.forEach((x, i) => {
      const b = el('button', 'item-lista');
      const t = el('span');
      t.append(el('b', '', x.nome), el('small', '', classeENivelDe(x)));
      b.append(t);
      b.addEventListener('click', () => fecharFolha(restaurar(i)));
      corpo.append(b);
    });
  });
}

function folhaDescanso() {
  abrirFolha('Descanso', (corpo) => {
    corpo.append(
      dica('Curto (1 hora): recursos de descanso curto voltam e você pode gastar Dados de Vida para curar. Longo (8 horas): PV cheios, PV temporários acabam, espaços de magia, recursos e Dados de Vida voltam.'),
      linhaBotoes(
        botaoFolha('Descanso curto', '', () => fecharFolha(() => {
          if (p.recursos.some(r => r.gastavel && r.usados)) comDesfazer('Descanso curto: recursos recuperados', () => { p.recursos = descansarRecursos(p.recursos, false); });
          dialogoDadosVida();
        })),
        botaoFolha('Descanso longo', 'principal', () => fecharFolha(() => {
          comDesfazer('Descanso longo: tudo recuperado', () => { Object.assign(p, descansoLongo(p)); });
        }))));
  });
}

function exportar(todos) {
  const dados = { app: 'ficha-de-personagem', versao: 1, criadoEm: new Date().toISOString(), personagens: todos ? personagens : [p] };
  const base = todos ? 'fichas' : p.nome.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'ficha';
  const nome = `${base}.json`;
  const nat = nativo();
  if (nat && nat.Filesystem && nat.Share) {
    // No APK não existe "baixar arquivo": grava e abre o Compartilhar do Android.
    nat.Filesystem.writeFile({ path: nome, data: JSON.stringify(dados), directory: 'CACHE', encoding: 'utf8' })
      .then(({ uri }) => nat.Share.share({ title: nome, url: uri, dialogTitle: 'Salvar ficha' }))
      .catch(() => avisar('Não consegui exportar.'));
    return;
  }
  const a = el('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' }));
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function folhaExportar() {
  abrirFolha('Exportar', (corpo) => {
    corpo.append(dica('Gera um arquivo .json para guardar ou passar para outro celular (⋮ → Importar ficha). As fotos da Galeria não vão no arquivo.'),
      linhaBotoes(botaoFolha('Todas as fichas', '', () => fecharFolha(() => exportar(true))),
        botaoFolha(`Só ${p.nome}`, 'principal', () => fecharFolha(() => exportar(false)))));
  });
}
$('arquivo-importar').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo) return;
  let lidos;
  try { lidos = lerImportacao(JSON.parse(await arquivo.text())); }
  catch (e) { avisar(e instanceof SyntaxError ? 'Esse arquivo não é uma ficha.' : e.message); return; }
  for (const x of lidos) {
    if (personagens.some(y => y.id === x.id)) x.id = limparPersonagem({}).id;   // importar duas vezes cria cópias
    personagens.push(x);
  }
  trocarPara(lidos[0]);
  avisar(lidos.length === 1 ? `${lidos[0].nome} importado` : `${lidos.length} fichas importadas`);
});

function folhaAjuda() {
  abrirFolha('Ajuda', (corpo) => {
    const ajuda = el('div', 'ajuda');
    const secao = (t, ...ps) => { ajuda.append(el('h3', '', t)); for (const x of ps) ajuda.append(el('p', '', x)); };
    secao('Tocar e segurar', 'Tocar rola os dados (atributos, salvaguardas, perícias, iniciativa, armas). Segurar meio segundo abre a edição. O lápis no resultado também abre a edição do que foi rolado.');
    secao('Páginas', 'Arraste para o lado: Principal, Perícias, Ataques, Magias, Detalhes e Galeria. Não tem fim: depois da Galeria vem a Principal de novo (e ao contrário). As bolinhas embaixo mostram onde você está.');
    secao('Principal', 'Toque nos PV para Dano, Cura e PV temporários. Dados de Vida: gaste no descanso curto. Na caixa do atributo, a coluna Salv. rola a salvaguarda; o resto rola o teste.');
    secao('Perícias', 'Verde = proficiente; verde mais forte com ★ = especialista (dobro da proficiência). Segure para mudar.');
    secao('Ataques', 'Tocar na arma rola o ataque e o dano juntos; com 20 natural o dano rola o dobro de dados (regra 2024). O ✕ tira a arma (dá para desfazer). A caixa da direita é uma rolagem rápida que você escolhe (ex.: Sorte 2d20).');
    secao('Magias', 'Toque no número de espaços para gastar um. Toque na magia para ver, rolar ou lançar; o + cria uma nova. Magias cinza não estão preparadas.');
    secao('Personagem novo', 'Na pasta → Novo Personagem → Usar o Criador de Personagem: nome, espécie (e linhagem), classe e antecedente; valores de atributo (Personalizado, Padrão 15/14/13/12/10/8, Compra de Pontos 27 ou Rolar 4d6); bônus do antecedente; perícias da classe; PV do primeiro nível.');
    secao('Editar segurando', 'Segure Iniciativa (proficiência, metade, atributo extra), Deslocamento (andar, voo, natação, escavação, escalada), CA (armadura, escudo, tipo, atributo adicional, Selecionar Armadura), um atributo (todos os valores, proficiências e bônus de salvaguarda), uma perícia (proficiência, dobrada, bônus), Dados de Vida e o Ataque Mágico/CD (bônus extras, tipo de espaços).');
    secao('Recursos de classe', 'Na página de ataques, a caixa da direita mostra um recurso (Fúria, Inspiração de Bardo, Sorte 2d20...). Tocar gasta um e rola o dado dele; segurar abre a lista de recursos (+ cria, ✕ apaga), com máximo, dado, gastável ou fixo e quando volta (descanso curto, longo ou nunca).');
    secao('Subir de nível', '⋮ → Subir de nível: escolha a classe (ou Multiclasse), os PV (Máx., Média ou Rolar), o aumento de atributos ou um talento nos níveis 4, 8, 12, 16 e 19, a subclasse no nível 3. As características novas, os espaços de magia e a proficiência entram sozinhos (dá para desfazer).');
    secao('Listas do D&D 2024', 'Ao criar arma (Nova) ou magia (+), escolha da lista em português (SRD 5.2.1) ou crie uma personalizada. Em Detalhes, o ▾ de Espécie e Antecedente abre a lista; as características aparecem no cartão Características e Talentos (toque para ler).');
    secao('Galeria', 'A última página guarda fotos e desenhos do personagem (ficam só neste aparelho e não vão no arquivo exportado). Toque numa foto para ver em tela cheia e passar para o lado.');
    secao('Rolagem', 'O resultado aparece embaixo, com os dados de cada parte. Com d20, dá para rolar de novo com Vantagem ou Desvantagem.');
    secao('Salvo no aparelho', 'Tudo fica salvo neste navegador/celular. Use ⋮ → Exportar ficha para guardar uma cópia.');
    corpo.append(ajuda);
  });
}
function folhaSobre() {
  abrirFolha('Sobre', (corpo) => {
    corpo.append(dica(`Ficha de Personagem · versão ${VERSAO_FICHA}. Regras do D&D 2024 (5.5). Os dados usam o mesmo rolador do app Rolador de Dados, com sorteio criptográfico.`),
      dica('Classes, magias, espécies, antecedentes, talentos, armas e armaduras: tradução para o português do System Reference Document 5.2.1 ("SRD 5.2.1"), da Wizards of the Coast LLC, disponível em https://www.dndbeyond.com/srd, sob a licença Creative Commons Atribuição 4.0 Internacional (https://creativecommons.org/licenses/by/4.0/legalcode). A tradução não é oficial.'),
      linhaBotoes(botaoFolha('Abrir o Rolador de Dados', 'principal', () => { location.href = '../index.html'; })));
  });
}

function abrirMenu() {
  $('menu').hidden = false;
  abrirCamada(() => { $('menu').hidden = true; });
}
$('abrir-menu').addEventListener('click', abrirMenu);
$('menu').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-menu]');
  const acoes = {
    nivel: subirDeNivel, descanso: folhaDescanso, exportar: folhaExportar,
    importar: () => $('arquivo-importar').click(), restaurar: folhaRestaurar,
    rolador: () => { location.href = '../index.html'; }, ajuda: folhaAjuda, sobre: folhaSobre,
  };
  depoisDeVoltar = b ? acoes[b.dataset.menu] : null;
  voltar();
});
$('abrir-personagens').addEventListener('click', () => dialogoPersonagens());   // fica em dialogos.js
$('apagar-personagem').addEventListener('click', apagarPersonagem);
