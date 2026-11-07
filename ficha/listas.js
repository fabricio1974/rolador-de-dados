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
// Lista com busca dentro da folha. "itens" = [{ chave (para buscar), no (elemento) }].
// "filtroExtra(item)" soma outro filtro (nível, classe...): mudar o filtro só esconde/mostra,
// sem refazer a lista (com 339 magias isso faz diferença no celular).
function listaComBusca(corpo, itens, placeholder, filtroExtra = null) {
  const busca = entrada('', 'search', { placeholder: typeof placeholder === 'function' ? '' : placeholder, autocapitalize: 'off', spellcheck: false });
  busca.className = 'busca';
  const lista = el('div', 'lista-escolha');
  const vazio = el('p', 'dica', 'Nada encontrado.');
  const filtrar = () => {
    const q = semAcento(busca.value.trim());
    let quantos = 0;
    for (const it of itens) {
      if (it.titulo) continue;
      const ok = (!q || it.chave.includes(q)) && (!filtroExtra || filtroExtra(it));
      if (it.no.hidden === ok) it.no.hidden = !ok;
      if (ok) quantos++;
    }
    // Cabeçalhos de grupo somem quando o grupo fica vazio.
    for (const it of itens.filter(x => x.titulo)) it.no.hidden = !it.membros.some(m => !m.no.hidden);
    vazio.hidden = quantos > 0;
    if (typeof placeholder === 'function') busca.placeholder = placeholder(quantos);
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
  abrirFolha('Adicionar magia', (corpo) => {
    const filtros = el('div', 'filtros');
    let busca = null;
    const chip = (texto, ativo, f) => { const b = el('button', 'chip' + (ativo ? ' ativo' : ''), texto); b.type = 'button'; b.addEventListener('click', f); return b; };
    if (minhas.size) {
      const minhasB = chip('Minhas classes', soMinhas, () => { soMinhas = true; minhasB.classList.add('ativo'); todasB.classList.remove('ativo'); busca.filtrar(); });
      const todasB = chip('Todas', !soMinhas, () => { soMinhas = false; todasB.classList.add('ativo'); minhasB.classList.remove('ativo'); busca.filtrar(); });
      filtros.append(minhasB, todasB);
    }
    const nivelSel = selecao([['', 'Todos os níveis'], ...ORDINAIS.map((o, n) => [String(n), n ? o : 'Truques'])], nivelFiltro === null ? '' : String(nivelFiltro));
    nivelSel.className = 'chip-select';
    nivelSel.addEventListener('change', () => { nivelFiltro = nivelSel.value === '' ? null : Number(nivelSel.value); busca.filtrar(); });
    filtros.append(nivelSel);
    corpo.append(filtros, linhaBotoes(botaoFolha('Magia personalizada', '', () => editarMagia(null, nivelFiltro ?? 0))));
    if (!D5.magias.length) { corpo.append(dica('A lista de magias não carregou.')); return; }
    const naFicha = new Set(p.magias.map(m => m.ref).filter(Boolean));
    // As 339 magias são montadas uma vez; os filtros só escondem e mostram.
    const itens = [...D5.magias]
      .sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome, 'pt'))
      .map(m => {
        const it = { m, chave: semAcento(m.nome + ' ' + m.en) };
        it.no = itemLista(m.nome, ESCOLAS_ABREV(m), () => verMagia(it), naFicha.has(m.id) ? '✓' : '');
        return it;
      });
    busca = listaComBusca(corpo, itens, (n) => `Buscar entre ${n} magias`,
      (it) => (nivelFiltro === null || it.m.nivel === nivelFiltro) && (!soMinhas || it.m.classes.some(c => minhas.has(c))));
  });
  // A magia abre num diálogo por cima da lista: a busca e a rolagem da lista continuam lá.
  async function verMagia(it) {
    const m = it.m;
    const add = await dialogo(m.nome, (corpo) => corpo.append(fichaDaMagia(m)),
      [{ texto: 'Fechar', valor: false }, { texto: 'Adicionar', valor: true }]);
    if (!add) return;
    p.magias.push(magiaParaFicha(m));
    salvar();
    desenhar();
    let marca = it.no.querySelector('.marca');
    if (!marca) { marca = el('span', 'marca'); it.no.append(marca); }
    marca.textContent = '✓';
    avisar(`${m.nome} adicionada`);
  }
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
  if (!/marcia/.test(t)) return false;
  // "armas marciais com a propriedade Acuidade ou Leve" (Ladino, Monge): precisa ter uma delas.
  const m = t.match(/marciais com a propriedade ([a-z ]+?)(?:[.,;\n]|$)/);
  if (!m) return true;
  const props = semAcento(a.propriedades || '');
  return m[1].split(/ ou | e /).some(x => x.trim() && props.includes(x.trim()));
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
    const topo = el('div', 'topo-talentos');           // fica parado no alto enquanto a lista rola
    const filtros = el('div', 'filtros');
    const busca = entrada('', 'search', { placeholder: 'Buscar talento', autocapitalize: 'off', spellcheck: false });
    busca.className = 'busca';
    topo.append(filtros, busca);
    // Talentos que o personagem já tem (pelo nome): marcados; os não repetíveis ficam bloqueados.
    const tem = new Set(p.caracteristicas.map(c => chaveNome(c.nome)));
    const filtrar = () => {
      const q = chaveNome(busca.value);
      // Buscando, procura em todas as categorias; sem busca, só na escolhida.
      const itens = D5.talentos.filter(t => (q ? (chaveNome(t.nome).includes(q) || chaveNome(t.en).includes(q)) : t.categoria === cat));
      lista.replaceChildren(...itens.map(t => {
        const ja = tem.has(chaveNome(t.nome));
        const d = el('details', 'talento' + (ja ? ' ja-tem' : ''));
        const s = el('summary');
        s.append(el('b', '', t.nome), t.prerequisito ? el('small', '', ' · ' + t.prerequisito) : '', q ? el('small', '', ' · ' + t.categoria) : '');
        if (ja) s.append(el('span', 'marca-talento', '✓ já tem'));
        const escolher = el('button', 'botao principal', ja && !t.repetivel ? 'Já tem (não se repete)' : 'Escolher');
        escolher.type = 'button';
        escolher.disabled = ja && !t.repetivel;
        escolher.addEventListener('click', () => ctx.fechar(t));
        d.append(s, el('p', '', t.descricao), escolher);
        return d;
      }));
      if (!itens.length) lista.append(el('p', 'dica', 'Nenhum talento encontrado.'));
    };
    const desenharChips = () => {
      filtros.replaceChildren(...cats.map(c => {
        const b = el('button', 'chip' + (c === cat ? ' ativo' : ''), c); b.type = 'button';
        b.addEventListener('click', () => { cat = c; busca.value = ''; desenharChips(); filtrar(); });
        return b;
      }));
    };
    busca.addEventListener('input', filtrar);
    desenharChips();
    filtrar();
    corpo.append(topo, lista);
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
    const novas = a.pericias.filter(id => !p.pericias[id]);          // as que o personagem ainda não tinha
    for (const id of novas) p.pericias[id] = 1;
    const deu = {};                                                   // aumento real (o teto de 20 pode cortar)
    for (const [x, n] of Object.entries(aumentos || {})) { const antes = p.atributos[x]; p.atributos[x] = Math.min(20, antes + n); if (p.atributos[x] > antes) deu[x] = p.atributos[x] - antes; }
    aumentos = null;
    p.antecedenteAplicado = { aumentos: deu, pericias: novas, ferramenta: a.ferramenta || '' };
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
// Tudo o que o app conhece com nome e descrição: talentos, características de classe e de
// subclasse, traços de espécie, invocações e metamagias.
let indiceDescricoes = null;
// Nome para comparar: sem acento, sem maiúsculas e sem pontuação ("Fey-Touched", "Iniciado em Magia: Clérigo").
const chaveNome = (t) => semAcento(String(t || '')).replace(/[’'`]/g, '').replace(/[-–—:_/(),.]/g, ' ').replace(/\s+/g, ' ').trim();
// Nomes em inglês e variações comuns em português → nome usado nas listas do app.
const APELIDOS = {
  'sneak attack': 'Ataque Furtivo', 'rage': 'Fúria', 'cunning action': 'Ação Ardilosa', 'second wind': 'Retomar o Fôlego',
  'segundo folego': 'Retomar o Fôlego', 'extra attack': 'Ataque Extra', 'darkvision': 'Visão no Escuro', 'breath weapon': 'Sopro',
  'arma de sopro': 'Sopro', 'arcane recovery': 'Recuperação Arcana', 'bardic inspiration': 'Inspiração de Bardo',
  'inspiracao bardica': 'Inspiração de Bardo', 'wild shape': 'Forma Selvagem', 'font of magic': 'Fonte de Magia',
  'martial arts': 'Artes Marciais', 'favored enemy': 'Inimigo Favorito', 'pact magic': 'Magia de Pacto',
  'eldritch invocations': 'Invocações Místicas', 'frenzy': 'Frenesi', 'improved critical': 'Crítico Aprimorado',
  'portent': 'Portento', 'trance': 'Transe', 'relentless endurance': 'Resistência Implacável', 'lay on hands': 'Cura pelas Mãos',
  'imposicao das maos': 'Cura pelas Mãos', 'maos curativas': 'Cura pelas Mãos', 'divine smite': 'Golpe do Paladino', 'paladins smite': 'Golpe do Paladino', 'golpe divino': 'Golpe do Paladino',
  'pontos de feiticaria': 'Fonte de Magia', 'magia gemea': 'Magia Duplicada', 'conjurador ritual': 'Conjurador Ritualista',
  'mestre de escudo': 'Mestre de Escudos', 'mestre em armas de haste': 'Mestre de Armas de Haste',
  'treinamento com armadura leve': 'Armadura Leve (Treinamento)', 'unarmored defense': 'Defesa sem Armadura',
  'spellcasting': 'Conjuração', 'weapon mastery': 'Maestria em Armas', 'fighting style': 'Estilo de Luta',
  'channel divinity': 'Canalizar Divindade', 'expertise': 'Especialização', 'evasion': 'Evasão', 'action surge': 'Surto de Ação',
  'indomitable': 'Indomável', 'reckless attack': 'Ataque Imprudente', 'ataque descuidado': 'Ataque Imprudente', 'danger sense': 'Sentido de Perigo', 'metamagic': 'Metamagia',
};
function montarIndiceDescricoes() {
  const lista = [];
  for (const t of D5.talentos) lista.push({ nome: t.nome, en: t.en, descricao: t.descricao, fonte: `Talento (${t.categoria})` });
  for (const c of D5.classes) {
    for (const n of c.niveis) for (const f of n.caracteristicas) lista.push({ nome: f.nome, descricao: f.descricao, fonte: `${c.nome} ${n.nivel}`, classe: c.nome, nivel: n.nivel });
    for (const s of (c.subclasses || [c.subclasse])) {
      for (const f of s.caracteristicas) lista.push({ nome: f.nome, descricao: f.descricao, fonte: `${s.nome} ${f.nivel}`, classe: c.nome, nivel: f.nivel });
      // A própria subclasse: o texto é a lista das características dela, por nível.
      lista.push({ nome: s.nome, en: s.en, fonte: `Subclasse de ${c.nome}`, classe: c.nome,
        descricao: s.caracteristicas.map(f => `Nível ${f.nivel} — ${f.nome}: ${f.descricao}`).join('\n\n') });
    }
  }
  for (const e of D5.especies) {
    for (const t of e.tracos) lista.push({ nome: t.nome, descricao: t.descricao, fonte: `Espécie: ${e.nome}`, classe: e.nome });
    // Linhagens/ancestralidades (Drow, Alto Elfo, Gigante das Nuvens...): o texto é o do traço delas.
    const sub = typeof SUBESPECIES !== 'undefined' && SUBESPECIES[e.id];
    const traco = sub && e.tracos.find(t => t.nome === sub.traco);
    if (traco) for (const o of sub.opcoes) lista.push({ nome: o, descricao: traco.descricao, fonte: `${sub.rotulo} (${e.nome})`, classe: e.nome });
  }
  for (const x of D5.invocacoes || []) lista.push({ nome: x.nome, en: x.en, descricao: x.descricao, fonte: 'Invocação Mística', classe: 'Bruxo' });
  for (const x of D5.metamagias || []) lista.push({ nome: x.nome, en: x.en, descricao: x.descricao, fonte: 'Metamagia', classe: 'Feiticeiro' });
  // Genéricas ("Característica de Subclasse", "Aumento no Valor de Atributo") não servem de descrição.
  return lista.filter(x => x.descricao && !/^Você ganha uma característica da sua subclasse/.test(x.descricao))
    .map(x => ({ ...x, chave: chaveNome(x.nome), chaveEn: chaveNome(x.en) }));
}
// Acha a descrição pelo nome. Quando o mesmo nome existe em várias classes ("Conjuração",
// "Defesa sem Armadura", "Visão no Escuro"), escolhe pela origem guardada ("Monge 1",
// "Espécie: Anão") ou pelo que está entre parênteses ("Canalizar Divindade (Paladino)").
function descricaoConhecida(nome, origem = '') {
  if (!indiceDescricoes) indiceDescricoes = montarIndiceDescricoes();
  let alvo = chaveNome(nome);
  if (!alvo) return null;
  const dentro = (String(nome).match(/\(([^)]+)\)/) || [])[1] || '';
  const semPar = chaveNome(String(nome).replace(/\([^)]*\)/g, ' '));
  const contexto = chaveNome(`${origem} ${dentro}`);
  const nivelOrigem = Number((String(origem).match(/(\d+)/) || [])[1]) || 0;
  const pontuar = (x) => {
    let n = 0;
    if (x.classe && contexto.includes(chaveNome(x.classe))) n += 10;
    if (contexto && chaveNome(x.fonte) && contexto.includes(chaveNome(x.fonte))) n += 5;
    if (nivelOrigem && x.nivel) n += x.nivel === nivelOrigem ? 4 : -Math.abs(x.nivel - nivelOrigem) / 20;
    return n;
  };
  const melhor = (cands) => (cands.length ? cands.slice().sort((a, b) => pontuar(b) - pontuar(a))[0] : null);
  const tentativas = [alvo, chaveNome(APELIDOS[alvo] || ''), chaveNome(APELIDOS[semPar] || ''), alvo.replace(/^estilo de luta /, '')].filter(Boolean);
  for (const t of tentativas) {
    const c = indiceDescricoes.filter(x => x.chave === t || x.chaveEn === t);
    if (c.length) return melhor(c);
  }
  // Com parênteses: "Estilo de Luta (Arquearia)" → Arquearia; "Iniciado em Magia (Bruxo)" não existe → nada.
  if (dentro) {
    const pelaParte = indiceDescricoes.filter(x => x.chave === chaveNome(dentro));
    if (pelaParte.length && !indiceDescricoes.some(x => x.chave.startsWith(semPar + ' '))) return melhor(pelaParte);
    const variantes = indiceDescricoes.filter(x => x.chave.startsWith(semPar + ' ') && /\(/.test(x.nome));
    if (variantes.length) return null;
  }
  const c = indiceDescricoes.filter(x => x.chave === semPar || x.chaveEn === semPar);
  return melhor(c);
}

function verCaracteristica(i) {
  const c = p.caracteristicas[i];
  // Sem descrição (escrita à mão, ou de versão antiga): procura na lista pelo nome e guarda na ficha.
  if (!c.descricao || !c.descricao.trim() || /veja a descrição dele\.$|^Característica da sua subclasse/.test(c.descricao)) {
    const achou = descricaoConhecida(c.nome, c.origem);
    if (achou) { c.descricao = achou.descricao; if (!c.origem) c.origem = achou.fonte; salvarDepois(); }
  }
  abrirFolha(c.nome, (corpo) => {
    if (c.origem) corpo.append(dica(c.origem));
    for (const par of (c.descricao || 'Sem descrição. Toque em Editar para escrever o que ela faz.').split(/\n\n+/)) corpo.append(el('p', 'notas-magia', par));
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
  // Sugestões de nomes conhecidos; escolher um preenche a descrição (se estiver vazia).
  if (!indiceDescricoes) indiceDescricoes = montarIndiceDescricoes();
  const sugestoes = el('datalist');
  sugestoes.id = 'nomes-caracteristicas';
  sugestoes.append(...[...new Set(indiceDescricoes.map(x => x.nome))].sort((a, b) => a.localeCompare(b, 'pt')).map(n => { const o = el('option'); o.value = n; return o; }));
  nome.setAttribute('list', sugestoes.id);
  const preencher = () => {
    const achou = descricaoConhecida(nome.value, origem.value);
    if (achou && !desc.value.trim()) { desc.value = achou.descricao; if (!origem.value.trim()) origem.value = achou.fonte; }
  };
  nome.addEventListener('change', preencher);
  // No Android o "change" só vem ao sair do campo: escolher uma sugestão já preenche.
  nome.addEventListener('input', () => { if (indiceDescricoes.some(x => x.nome === nome.value)) preencher(); });
  if (!$('nomes-caracteristicas')) document.body.append(sugestoes);   // uma vez só, no fim da página
  formSimples(i === null ? 'Nova característica' : 'Editar característica', [campo('Nome', nome), campo('De onde vem', origem), campo('Descrição', desc)], () => {
    if (!nome.value.trim()) return 'Escreva o nome.';
    const achou = !desc.value.trim() && descricaoConhecida(nome.value, origem.value);
    const nova = { nome: nome.value.trim(), origem: origem.value.trim() || (achou ? achou.fonte : ''), descricao: desc.value.trim() ? desc.value : (achou ? achou.descricao : '') };
    if (i === null) p.caracteristicas.push(nova); else p.caracteristicas[i] = nova;
  });
}
