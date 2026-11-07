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
const chaveNome = (t) => semAcento(String(t || '')).replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
function montarIndiceDescricoes() {
  const lista = [];
  for (const t of D5.talentos) lista.push({ nome: t.nome, en: t.en, descricao: t.descricao, fonte: `Talento (${t.categoria})` });
  for (const c of D5.classes) {
    for (const n of c.niveis) for (const f of n.caracteristicas) lista.push({ nome: f.nome, descricao: f.descricao, fonte: `${c.nome} ${n.nivel}` });
    for (const s of (c.subclasses || [c.subclasse])) for (const f of s.caracteristicas) lista.push({ nome: f.nome, descricao: f.descricao, fonte: `${s.nome} ${f.nivel}` });
  }
  for (const e of D5.especies) for (const t of e.tracos) lista.push({ nome: t.nome, descricao: t.descricao, fonte: `Espécie: ${e.nome}` });
  for (const x of D5.invocacoes || []) lista.push({ nome: x.nome, en: x.en, descricao: x.descricao, fonte: 'Invocação Mística' });
  for (const x of D5.metamagias || []) lista.push({ nome: x.nome, en: x.en, descricao: x.descricao, fonte: 'Metamagia' });
  // Genéricas ("Característica de Subclasse", "Aumento no Valor de Atributo") não servem de descrição.
  return lista.filter(x => x.descricao && !/^Você ganha uma característica da sua subclasse/.test(x.descricao));
}
// Acha a descrição pelo nome: igual, sem o que está entre parênteses, ou em inglês ("Lucky").
function descricaoConhecida(nome) {
  if (!indiceDescricoes) indiceDescricoes = montarIndiceDescricoes();
  const alvo = chaveNome(nome);
  const semParenteses = alvo.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  if (!alvo) return null;
  return indiceDescricoes.find(x => chaveNome(x.nome) === alvo || chaveNome(x.en) === alvo)
    || indiceDescricoes.find(x => chaveNome(x.nome) === semParenteses || chaveNome(x.en) === semParenteses)
    || indiceDescricoes.find(x => chaveNome(x.nome).replace(/\s*\(.*?\)\s*/g, ' ').trim() === semParenteses)
    || null;
}

function verCaracteristica(i) {
  const c = p.caracteristicas[i];
  // Sem descrição (escrita à mão, ou de versão antiga): procura na lista pelo nome e guarda na ficha.
  if (!c.descricao || !c.descricao.trim() || /veja a descrição dele\.$/.test(c.descricao)) {
    const achou = descricaoConhecida(c.nome);
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
  nome.addEventListener('change', () => {
    const achou = descricaoConhecida(nome.value);
    if (achou && !desc.value.trim()) { desc.value = achou.descricao; if (!origem.value.trim()) origem.value = achou.fonte; }
  });
  if (!$('nomes-caracteristicas')) document.body.append(sugestoes);   // uma vez só, no fim da página
  formSimples(i === null ? 'Nova característica' : 'Editar característica', [campo('Nome', nome), campo('De onde vem', origem), campo('Descrição', desc)], () => {
    if (!nome.value.trim()) return 'Escreva o nome.';
    const achou = !desc.value.trim() && descricaoConhecida(nome.value);
    const nova = { nome: nome.value.trim(), origem: origem.value.trim() || (achou ? achou.fonte : ''), descricao: desc.value.trim() ? desc.value : (achou ? achou.descricao : '') };
    if (i === null) p.caracteristicas.push(nova); else p.caracteristicas[i] = nova;
  });
}
