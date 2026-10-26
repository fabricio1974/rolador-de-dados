// Ficha de Personagem: listas do SRD 5.2.1 em português (magias, armas, talentos, espécies,
// antecedentes) para escolher em vez de digitar, e a lista de características da ficha.
'use strict';

// dados5e.js (gerado de ficha/dados/*.json) define DADOS5E; sem ele as listas ficam vazias.
const D5 = typeof DADOS5E !== 'undefined' ? DADOS5E : {
  classes: [], invocacoes: [], magias: [], especies: [], antecedentes: [], talentos: [], armas: [], maestrias: [], armaduras: [], propriedadesArmas: [],
};
const magiaDoSRD = (id) => D5.magias.find(m => m.id === id) || null;
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista com busca dentro da folha. "itens" = [{ chave (para buscar), no (elemento) }].
function listaComBusca(corpo, itens, placeholder) {
  const busca = entrada('', 'search', { placeholder, autocapitalize: 'off', spellcheck: false });
  busca.className = 'busca';
  const lista = el('div', 'lista-escolha');
  const vazio = el('p', 'dica', 'Nada encontrado.');
  const filtrar = () => {
    const q = semAcento(busca.value.trim());
    let algum = false;
    for (const it of itens) {
      const ok = !q || it.chave.includes(q);
      it.no.hidden = !ok;
      if (ok && !it.titulo) algum = true;
    }
    // Cabeçalhos de grupo somem quando o grupo fica vazio.
    for (const it of itens.filter(x => x.titulo)) it.no.hidden = !it.membros.some(m => !m.no.hidden);
    vazio.hidden = algum;
  };
  busca.addEventListener('input', filtrar);
  lista.append(...itens.map(i => i.no), vazio);
  corpo.append(busca, lista);
  filtrar();
  return { busca, filtrar };
}
function itemLista(titulo, sub, aoTocar, marca = '') {
  const b = el('button', 'item-escolha');
  b.type = 'button';
  const t = el('span');
  t.append(el('b', '', titulo));
  if (sub) t.append(el('small', '', sub));
  b.append(t);
  if (marca) b.append(el('span', 'marca', marca));
  b.addEventListener('click', aoTocar);
  return b;
}

// ---------- Magias ----------
const ESCOLAS_ABREV = (m) => `${m.nivel ? m.nivel + 'º nível' : 'Truque'} · ${m.escola}${m.concentracao ? ' · Concentração' : ''}${m.ritual ? ' · Ritual' : ''}`;

// O "cartão" com a magia do SRD: tempo, alcance, componentes, duração e o texto.
function fichaDaMagia(m) {
  const c = el('div', 'ficha-magia');
  const linha = (rot, val) => { const d = el('p', 'meta'); d.append(el('b', '', rot + ': '), val); return d; };
  c.append(el('p', 'escola', ESCOLAS_ABREV(m)),
    linha('Tempo de Conjuração', m.tempo), linha('Alcance', m.alcance), linha('Componentes', m.componentes), linha('Duração', m.duracao),
    linha('Classes', m.classes.map(id => (classeDoSRD(id) || { nome: id }).nome).join(', ')));
  for (const par of m.descricao.split(/\n\n+/)) c.append(el('p', 'texto', par));
  return c;
}

function magiaParaFicha(m) {
  return limparMagia({
    nome: m.nome, nivel: m.nivel, preparada: true, ataque: !!m.ataque, salvaguarda: m.salvaguarda || '',
    escala: m.nivel === 0 && /Aprimoramento de Truque/i.test(m.descricao) && !!m.rolagem,
    somarMod: /^Cura/i.test(m.rolagem || '') && /modificador (do seu atributo |de atributo )?de conjura/i.test(m.descricao),
    rolagem: m.rolagem || '', ref: m.id,
  });
}

function escolherMagia(nivel = null) {
  const minhas = new Set(p.classes.map(c => c.id).filter(id => { const d = classeDoSRD(id); return d && d.conjuracao; }));
  let soMinhas = minhas.size > 0, nivelFiltro = nivel;
  const montarLista = () => abrirFolha('Adicionar magia', (corpo) => {
    const filtros = el('div', 'filtros');
    const chip = (texto, ativo, f) => { const b = el('button', 'chip' + (ativo ? ' ativo' : ''), texto); b.type = 'button'; b.addEventListener('click', f); return b; };
    if (minhas.size) {
      filtros.append(chip('Minhas classes', soMinhas, () => { soMinhas = true; montarLista(); }),
        chip('Todas', !soMinhas, () => { soMinhas = false; montarLista(); }));
    }
    const nivelSel = selecao([['', 'Todos os níveis'], ...ORDINAIS.map((o, n) => [String(n), n ? o : 'Truques'])], nivelFiltro === null ? '' : String(nivelFiltro));
    nivelSel.className = 'chip-select';
    nivelSel.addEventListener('change', () => { nivelFiltro = nivelSel.value === '' ? null : Number(nivelSel.value); montarLista(); });
    filtros.append(nivelSel);
    corpo.append(filtros, linhaBotoes(botaoFolha('Magia personalizada', '', () => editarMagia(null, nivelFiltro ?? 0))));
    if (!D5.magias.length) { corpo.append(dica('A lista de magias não carregou.')); return; }
    const naFicha = new Set(p.magias.map(m => m.ref).filter(Boolean));
    const itens = D5.magias
      .filter(m => (nivelFiltro === null || m.nivel === nivelFiltro) && (!soMinhas || m.classes.some(c => minhas.has(c))))
      .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, 'pt'))
      .map(m => ({ chave: semAcento(m.nome + ' ' + m.en), no: itemLista(m.nome, ESCOLAS_ABREV(m), () => verMagia(m), naFicha.has(m.id) ? '✓' : '') }));
    listaComBusca(corpo, itens, `Buscar entre ${itens.length} magias`);
  });
  const verMagia = (m) => abrirFolha(m.nome, (corpo) => {
    corpo.append(fichaDaMagia(m), linhaBotoes(
      botaoFolha('Voltar à lista', '', montarLista),
      botaoFolha('Adicionar', 'principal', () => {
        p.magias.push(magiaParaFicha(m));
        salvar();
        desenhar();
        avisar(`${m.nome} adicionada`);
        montarLista();
      })));
  });
  montarLista();
}

// ---------- Armas ----------
function armaParaFicha(a) {
  const mod = (x) => modDe(p, x);
  const atributo = a.distancia ? 'des' : a.acuidade ? (mod('des') >= mod('for') ? 'des' : 'for') : 'for';
  const notas = [a.propriedades, a.maestria && `Maestria: ${a.maestria}`].filter(Boolean).join(' · ');
  return { nome: a.nome, alcance: a.alcance, tipo: a.tipo, atributo, prof: temProficienciaArma(a), dano: a.dano, notas };
}
// Proficiente com a arma? Pelo texto de Proficiência em Armas (simples, marciais ou o nome dela).
// Sem nada escrito, supõe que sim.
function temProficienciaArma(a) {
  const t = semAcento(p.textos.profArmas || '');
  if (!t.trim()) return true;
  if (t.includes(semAcento(a.nome))) return true;
  if (/^simples/i.test(semAcento(a.categoria))) return /simples/.test(t);
  return /marcia/.test(t);
}
function escolherArma() {
  abrirFolha('Nova arma', (corpo) => {
    corpo.append(linhaBotoes(botaoFolha('Arma personalizada', '', () => editarArma(null))));
    if (!D5.armas.length) return;
    const itens = [];
    const grupos = [...new Set(D5.armas.map(a => a.categoria))];
    for (const g of grupos) {
      const cab = { titulo: true, chave: '', no: el('h3', 'grupo-lista', g), membros: [] };
      itens.push(cab);
      for (const a of D5.armas.filter(x => x.categoria === g)) {
        const it = { chave: semAcento(a.nome + ' ' + a.en), no: itemLista(a.nome, `${a.dano} ${a.tipo} · ${a.alcance}${a.propriedades ? ' · ' + a.propriedades : ''}`, () => editarArma(null, armaParaFicha(a)), a.maestria) };
        cab.membros.push(it);
        itens.push(it);
      }
    }
    listaComBusca(corpo, itens, 'Buscar arma');
  });
}

// ---------- Talentos (diálogo, usado ao subir de nível; ou folha, pela ficha) ----------
function escolherTalento(categoria = 'Geral') {
  return dialogo('Escolher Talento', (corpo, ctx) => {
    const cats = [...new Set(D5.talentos.map(t => t.categoria))];
    let cat = cats.includes(categoria) ? categoria : cats[0];
    const lista = el('div', 'lista-talentos');
    const filtros = el('div', 'filtros');
    const desenhar = () => {
      filtros.replaceChildren(...cats.map(c => {
        const b = el('button', 'chip' + (c === cat ? ' ativo' : ''), c); b.type = 'button';
        b.addEventListener('click', () => { cat = c; desenhar(); });
        return b;
      }));
      lista.replaceChildren(...D5.talentos.filter(t => t.categoria === cat).map(t => {
        const d = el('details', 'talento');
        const s = el('summary');
        s.append(el('b', '', t.nome), t.prerequisito ? el('small', '', ' · ' + t.prerequisito) : '');
        const escolher = el('button', 'botao principal', 'Escolher');
        escolher.type = 'button';
        escolher.addEventListener('click', () => ctx.fechar(t));
        d.append(s, el('p', '', t.descricao), escolher);
        return d;
      }));
    };
    desenhar();
    corpo.append(filtros, lista);
  }, [{ texto: 'Cancelar', valor: null }]);
}

// ---------- Espécie e antecedente ----------
function escolherEspecie() {
  abrirFolha('Espécie', (corpo) => {
    for (const e of D5.especies) {
      const d = el('details', 'talento');
      const s = el('summary');
      s.append(el('b', '', e.nome), el('small', '', ` · ${e.tamanho} · ${e.deslocamento}`));
      d.append(s);
      for (const t of e.tracos) d.append(el('p', '', `${t.nome}. ${t.descricao}`));
      d.append(botaoFolha(`Escolher ${e.nome}`, 'principal', () => {
        fecharFolha(() => comDesfazer(`Espécie: ${e.nome}`, () => {
          p.raca = e.nome;
          p.deslocamentos.andar.base = lerMetros(e.deslocamento) ?? 9;
          p.caracteristicas = p.caracteristicas.filter(c => !c.origem.startsWith('Espécie'));
          for (const t of e.tracos) p.caracteristicas.push({ nome: t.nome, origem: `Espécie: ${e.nome}`, descricao: t.descricao });
          desenharDetalhes();
        }));
      }));
      corpo.append(d);
    }
    if (!D5.especies.length) corpo.append(dica('A lista não carregou.'));
  });
}

function escolherAntecedente() {
  abrirFolha('Antecedente', (corpo) => {
    for (const a of D5.antecedentes) {
      const d = el('details', 'talento');
      const s = el('summary');
      s.append(el('b', '', a.nome));
      d.append(s,
        el('p', '', `Atributos: ${a.atributos.map(x => NOME_ATRIBUTO[x]).join(', ')} (+2 e +1, ou +1 nos três).`),
        el('p', '', `Talento: ${a.talentoNome}.`),
        el('p', '', `Perícias: ${a.pericias.map(id => PERICIAS.find(x => x.id === id).nome).join(' e ')}. Ferramenta: ${a.ferramenta}.`),
        el('p', '', `Equipamento: ${a.equipamento}`));
      const aplicar = marcar('Aplicar perícias, talento, ferramenta e atributos', true);
      d.append(aplicar, botaoFolha(`Escolher ${a.nome}`, 'principal', () => fecharFolha(() => aplicarAntecedente(a, aplicar.caixa.checked))));
      corpo.append(d);
    }
  });
}
async function aplicarAntecedente(a, completo) {
  let aumentos = null;
  if (completo) {
    // +2 num e +1 noutro, ou +1 nos três (regra 2024), sem passar de 20.
    aumentos = await dialogo(`Atributos de ${a.nome}`, (corpo, ctx) => {
      ctx.valor = Object.fromEntries(a.atributos.map(x => [x, 1]));
      for (const x of a.atributos) {
        const linha = el('div', 'linha-aumento');
        linha.append(el('span', '', `${NOME_ATRIBUTO[x]} ${p.atributos[x]}`),
          escolha([[0, '+0'], [1, '+1'], [2, '+2']], 1, (v) => { ctx.valor[x] = v; }));
        corpo.append(linha);
      }
      corpo.append(el('p', 'dialogo-dica', 'Total de 3: +2 e +1, ou +1 em cada.'));
    }, [{ texto: 'Pular', valor: {} }, { texto: 'Concluído', valor: (ctx) => {
      const v = Object.values(ctx.valor);
      const soma = v.reduce((s, n) => s + n, 0);
      if (soma !== 3 || v.filter(n => n === 2).length > 1) { avisar('Use +2 e +1, ou +1 em cada um dos três.'); return undefined; }
      return ctx.valor;
    } }]);
    if (aumentos === null) return;
  }
  comDesfazer(`Antecedente: ${a.nome}`, () => {
    p.antecedente = a.nome;
    if (!completo) return;
    desfazerAntecedente();
    for (const id of a.pericias) p.pericias[id] = Math.max(1, p.pericias[id] || 0);
    p.antecedenteAplicado = { aumentos: aumentos || {}, pericias: a.pericias.filter(id => !(p.pericias[id] > 1)), ferramenta: a.ferramenta || '' };
    const t = D5.talentos.find(x => x.id === a.talento);
    p.caracteristicas = p.caracteristicas.filter(c => !c.origem.startsWith('Antecedente'));
    if (t) p.caracteristicas.push({ nome: t.nome, origem: `Antecedente: ${a.nome}`, descricao: t.descricao });
    if (a.ferramenta) p.textos.profFerramentas = [p.textos.profFerramentas, a.ferramenta].filter(Boolean).join('\n');
    for (const [x, n] of Object.entries(aumentos || {})) p.atributos[x] = Math.min(20, p.atributos[x] + n);
    desenharDetalhes();
  });
}

// Tira o que o antecedente anterior deu (atributos, perícias e ferramenta).
function desfazerAntecedente() {
  const v = p.antecedenteAplicado;
  for (const [x, n] of Object.entries(v.aumentos)) p.atributos[x] = Math.max(1, p.atributos[x] - n);
  for (const id of v.pericias) if (p.pericias[id] === 1) delete p.pericias[id];
  if (v.ferramenta) p.textos.profFerramentas = p.textos.profFerramentas.split('\n').filter(l => l.trim() !== v.ferramenta).join('\n');
  p.antecedenteAplicado = { aumentos: {}, pericias: [], ferramenta: '' };
}

// ---------- Características da ficha (classe, espécie, antecedente, talentos) ----------
function desenharCaracteristicas() {
  const caixa = $('det-caracteristicas');
  if (!caixa) return;
  caixa.replaceChildren(el('h3', '', 'Características e Talentos'));
  if (!p.caracteristicas.length) caixa.append(el('p', 'vazio-carac', 'Elas aparecem aqui ao escolher a classe, a espécie, o antecedente e ao subir de nível.'));
  p.caracteristicas.forEach((c, i) => {
    caixa.append(botao('carac', [el('b', '', c.nome), el('small', '', c.origem)], () => verCaracteristica(i), () => verCaracteristica(i)));
  });
  const novo = el('div', 'botoes');
  const add = (t, f) => { const b = el('button', 'botao', t); b.type = 'button'; b.addEventListener('click', f); return b; };
  novo.append(
    add('+ Talento', async () => {
      const t = await escolherTalento('Origem');
      if (t) comDesfazer(`${t.nome} adicionado`, () => p.caracteristicas.push({ nome: t.nome, origem: 'Talento', descricao: t.descricao }));
    }),
    add('+ Outra', () => editarCaracteristica(null)));
  caixa.append(novo);
}
function verCaracteristica(i) {
  const c = p.caracteristicas[i];
  abrirFolha(c.nome, (corpo) => {
    if (c.origem) corpo.append(dica(c.origem));
    for (const par of (c.descricao || 'Sem descrição.').split(/\n\n+/)) corpo.append(el('p', 'notas-magia', par));
    corpo.append(linhaBotoes(
      botaoFolha('Remover', 'perigo', () => fecharFolha(() => comDesfazer(`${c.nome} removida`, () => p.caracteristicas.splice(i, 1)))),
      botaoFolha('Editar', '', () => editarCaracteristica(i))));
  });
}
function editarCaracteristica(i) {
  const c = i === null ? { nome: '', origem: '', descricao: '' } : p.caracteristicas[i];
  const nome = entrada(c.nome, 'text', { foco: true, maxLength: 80 });
  const origem = entrada(c.origem, 'text', { maxLength: 60, placeholder: 'Ex.: Mago 3, Talento, Item' });
  const desc = areaTexto(c.descricao);
  formSimples(i === null ? 'Nova característica' : 'Editar característica', [campo('Nome', nome), campo('De onde vem', origem), campo('Descrição', desc)], () => {
    if (!nome.value.trim()) return 'Escreva o nome.';
    const nova = { nome: nome.value.trim(), origem: origem.value.trim(), descricao: desc.value };
    if (i === null) p.caracteristicas.push(nova); else p.caracteristicas[i] = nova;
  });
}
