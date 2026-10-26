// Ficha de Personagem: Criador de Personagem (nível 1, regras de 2024), em passos com
// Voltar/Próximo como no app de referência: espécie, classe e antecedente → valores de
// atributo (personalizado, conjunto padrão, compra de pontos ou rolagem) → bônus do
// antecedente → perícias da classe → Pontos de Vida do primeiro nível.
'use strict';

// Linhagens/ancestralidades das espécies do SRD (o texto delas está no traço da espécie).
const SUBESPECIES = {
  draconato: { rotulo: 'Ancestralidade', traco: 'Ancestralidade Dracônica',
    opcoes: ['Azul (Elétrico)', 'Branco (Frio)', 'Bronze (Elétrico)', 'Cobre (Ácido)', 'Latão (Fogo)', 'Negro (Ácido)', 'Ouro (Fogo)', 'Prata (Frio)', 'Verde (Veneno)', 'Vermelho (Fogo)'] },
  elfo: { rotulo: 'Linhagem', traco: 'Linhagem Élfica', opcoes: ['Drow', 'Alto Elfo', 'Elfo da Floresta'] },
  gnomo: { rotulo: 'Linhagem', traco: 'Linhagem Gnômica', opcoes: ['Gnomo da Floresta', 'Gnomo das Rochas'] },
  golias: { rotulo: 'Ancestralidade', traco: 'Ancestralidade Gigante',
    opcoes: ['Gigante das Nuvens', 'Gigante do Fogo', 'Gigante do Gelo', 'Gigante da Colina', 'Gigante da Pedra', 'Gigante da Tempestade'] },
  tiferino: { rotulo: 'Legado', traco: 'Legado Ínfero', opcoes: ['Abissal', 'Ctônico', 'Infernal'] },
};
const CONJUNTO_PADRAO = [15, 14, 13, 12, 10, 8];
const CUSTO_PONTOS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const VOLTAR = 'voltar';

async function novoPersonagemComCriador() {
  const usar = await dialogo('Usar o Criador de Personagem?', null,
    [{ texto: 'Cancelar', valor: false }, { texto: 'Sim', valor: true }]);
  if (usar === null) return;
  if (!usar) {
    const novo = novoPersonagem();
    personagens.push(novo);
    trocarPara(novo);
    irParaPagina(0);
    editarNome();
    return;
  }
  const e = {   // escolhas do criador
    nome: '', especie: D5.especies[0].id, sub: '', classe: D5.classes[0].id, antecedente: D5.antecedentes[0].id,
    metodo: 'compra', valores: null, aumentos: null, pericias: [], pv: null,
  };
  const passos = [passoBasico, passoAtributos, passoAumentos, passoPericias, passoEspecie, passoPV];
  let i = 0, sentido = 1;
  while (i < passos.length) {
    // Passo que não se aplica (ex.: escolhas de espécie para quem não tem): segue no mesmo sentido.
    if (passos[i] === passoEspecie && !ESCOLHAS_ESPECIE[e.especie]) { i += sentido; continue; }
    const r = await passos[i](e);
    // O botão voltar do celular (ou tocar fora) volta um passo; no primeiro, cancela.
    if (r === null && i === 0) return;
    sentido = r === VOLTAR || r === null ? -1 : 1;
    i += sentido;
    if (i < 0) return;
  }
  criarPersonagem(e);
}

// 1) Nome, espécie (e linhagem), classe e antecedente
function passoBasico(e) {
  return dialogo('', (corpo, ctx) => {
    const tabela = el('div', 'tabela-criador');
    const linha = (rotulo, no) => { const l = el('label', 'linha-criador'); l.append(el('span', '', rotulo), no); tabela.append(l); return l; };
    const nome = entrada(e.nome, 'text', { placeholder: 'Nome', maxLength: 60 });
    nome.className = 'sublinhado esquerda';
    const especie = selecao(D5.especies.map(x => [x.id, x.nome]), e.especie);
    const sub = el('select');
    const classe = selecao(D5.classes.map(x => [x.id, x.nome]), e.classe);
    const ant = selecao(D5.antecedentes.map(x => [x.id, x.nome]), e.antecedente);
    linha('Nome:', nome);
    linha('Espécie:', especie);
    const linhaSub = linha('Linhagem:', sub);
    linha('Classe:', classe);
    linha('Antecedente:', ant);
    const montarSub = () => {
      const s = SUBESPECIES[especie.value];
      linhaSub.hidden = !s;
      if (!s) return;
      linhaSub.firstChild.textContent = s.rotulo + ':';
      sub.replaceChildren(...s.opcoes.map(o => { const op = el('option', '', o); op.value = o; return op; }));
      sub.value = s.opcoes.includes(e.sub) ? e.sub : s.opcoes[0];
    };
    especie.addEventListener('change', montarSub);
    montarSub();
    corpo.append(tabela);
    ctx.ler = () => {
      if (!nome.value.trim()) { avisar('Escreva o nome do personagem.'); nome.focus(); return undefined; }
      if (classe.value !== e.classe) { e.pericias = []; e.pv = null; if (e.metodo === 'padrao') e.valores = null; }
      if (ant.value !== e.antecedente) e.aumentos = null;
      Object.assign(e, { nome: nome.value.trim(), especie: especie.value, sub: linhaSub.hidden ? '' : sub.value, classe: classe.value, antecedente: ant.value });
      return true;
    };
  }, [{ texto: 'Cancelar', valor: null }, { texto: 'Próximo', valor: (ctx) => ctx.ler() }]);
}

// 2) Valores de atributo antes do antecedente
function passoAtributos(e) {
  const classe = classeDoSRD(e.classe);
  const ant = D5.antecedentes.find(x => x.id === e.antecedente);
  // Ordem sugerida: atributo principal da classe, Constituição, Destreza e o resto.
  const ordem = [...new Set([...classe.atributoPrincipal, 'con', 'des', 'sab', 'int', 'car', 'for'])];
  const comConjunto = (lista) => Object.fromEntries(ordem.map((a, i) => [a, lista[i]]));
  return dialogo('Valores de Atributo (antes do antecedente):', (corpo, ctx) => {
    let metodo = e.metodo;
    let valores = e.valores ? { ...e.valores } : comConjunto(CONJUNTO_PADRAO);
    if (!e.valores && metodo === 'compra') valores = Object.fromEntries(ordem.map(a => [a, 8]));
    let rolados = null;
    const metodos = radios([['livre', 'Livre'], ['padrao', 'Padrão'], ['compra', 'Compra de Pontos'], ['rolar', 'Rolar']], metodo, (v) => {
      metodo = v;
      if (v === 'padrao') valores = comConjunto(CONJUNTO_PADRAO);
      if (v === 'compra') valores = Object.fromEntries(ordem.map(a => [a, 8]));
      if (v === 'rolar') rolar();
      desenharValores();
    });
    metodos.classList.add('radios-metodo');
    const area = el('div', 'area-atributos');
    const lado = el('div', 'lado-atributos');
    const linhas = el('div', 'linhas-atributos');
    area.append(lado, linhas);
    const rodape = el('p', 'dialogo-dica', `Bônus do antecedente (${ant.nome}): +2 e +1, ou +1 em cada: ${ant.atributos.map(a => NOME_ATRIBUTO[a]).join(', ')}`);
    function rolar() {
      // 4d6, descarta o menor, seis vezes (rolagem criptográfica do Rolador)
      rolados = ordem.map(() => rolarPartes('4d6kh3', rolarDadoCripto).partes[0].res.total).sort((a, b) => b - a);
      valores = comConjunto(rolados);
    }
    const gastos = () => Object.values(valores).reduce((s, v) => s + (CUSTO_PONTOS[v] ?? 99), 0);
    // Padrão e Rolar: + e − trocam o valor com o atributo que tem o próximo valor maior/menor.
    const trocar = (a, maior) => {
      const atual = valores[a];
      const outros = Object.entries(valores).filter(([x, v]) => x !== a && (maior ? v > atual : v < atual));
      if (!outros.length) return;
      // O vizinho: o menor dos maiores (ou o maior dos menores).
      const [alvo, v] = outros.sort((x, y) => (maior ? x[1] - y[1] : y[1] - x[1]))[0];
      valores[alvo] = atual;
      valores[a] = v;
    };
    function desenharValores() {
      lado.replaceChildren();
      if (metodo === 'compra') lado.append(el('b', '', 'Pontos Restantes:'), el('span', 'restantes' + (27 - gastos() < 0 ? ' ruim' : ''), String(27 - gastos())));
      if (metodo === 'rolar') {
        const b = el('button', 'botao-android', 'Rolar de novo');
        b.type = 'button';
        b.addEventListener('click', () => { rolar(); vibrar(); desenharValores(); });
        lado.append(b);
      }
      linhas.replaceChildren(...ATRIBUTOS.map(a => {
        const l = el('div', 'linha-atributo-criador');
        const mais = el('button', 'botao-android pequeno', '+'); mais.type = 'button';
        const menos = el('button', 'botao-android pequeno', '-'); menos.type = 'button';
        mais.setAttribute('aria-label', `Aumentar ${a.nome}`);
        menos.setAttribute('aria-label', `Diminuir ${a.nome}`);
        mais.addEventListener('click', () => {
          if (metodo === 'livre') valores[a.id] = Math.min(20, valores[a.id] + 1);
          else if (metodo === 'compra') { if (valores[a.id] < 15) valores[a.id] += 1; }
          else trocar(a.id, true);
          desenharValores();
        });
        menos.addEventListener('click', () => {
          if (metodo === 'livre') valores[a.id] = Math.max(3, valores[a.id] - 1);
          else if (metodo === 'compra') { if (valores[a.id] > 8) valores[a.id] -= 1; }
          else trocar(a.id, false);
          desenharValores();
        });
        l.append(el('b', '', a.nome), mais, el('span', 'valor', String(valores[a.id])), menos);
        return l;
      }));
    }
    corpo.append(metodos, area, rodape);
    if (metodo === 'rolar' && !e.valores) rolar();
    desenharValores();
    ctx.ler = () => {
      if (metodo === 'compra' && gastos() > 27) { avisar('Passou de 27 pontos.'); return undefined; }
      e.metodo = metodo;
      e.valores = { ...valores };
      return true;
    };
  }, [{ texto: 'Voltar', valor: VOLTAR }, { texto: 'Próximo', valor: (ctx) => ctx.ler() }]);
}

// 3) Bônus de atributo do antecedente (+2/+1 ou +1/+1/+1, sem passar de 20)
function passoAumentos(e) {
  const a = D5.antecedentes.find(x => x.id === e.antecedente);
  return dialogo(`Atributos de ${a.nome}`, (corpo, ctx) => {
    ctx.valor = e.aumentos ? { ...e.aumentos } : Object.fromEntries(a.atributos.map(x => [x, 1]));
    for (const x of a.atributos) {
      const linha = el('div', 'linha-aumento tres');
      const final = el('b');
      const mostrar = () => { final.textContent = `${Math.min(20, e.valores[x] + ctx.valor[x])}`; };
      linha.append(el('span', '', NOME_ATRIBUTO[x]),
        escolha([[0, '+0'], [1, '+1'], [2, '+2']], ctx.valor[x], (v) => { ctx.valor[x] = v; mostrar(); }), final);
      mostrar();
      corpo.append(linha);
    }
    corpo.append(el('p', 'dialogo-dica', 'Total de 3: +2 num e +1 noutro, ou +1 em cada um dos três.'));
  }, [{ texto: 'Voltar', valor: VOLTAR }, { texto: 'Próximo', valor: (ctx) => {
    const v = Object.values(ctx.valor);
    if (v.reduce((s, n) => s + n, 0) !== 3 || v.filter(n => n === 2).length > 1) { avisar('Use +2 e +1, ou +1 em cada um dos três.'); return undefined; }
    e.aumentos = ctx.valor;
    return true;
  } }]);
}

// 4) Perícias da classe (as do antecedente já vêm marcadas, em cinza)
function passoPericias(e) {
  const classe = classeDoSRD(e.classe);
  const ant = D5.antecedentes.find(x => x.id === e.antecedente);
  const n = classe.pericias.escolhe;
  return dialogo(`Selecione ${n} Perícia${n > 1 ? 's' : ''}`, (corpo, ctx) => {
    const lista = el('div', 'lista-pericias-criador');
    const caixas = [];
    const atualizar = () => {
      const marcadas = caixas.filter(x => x.c.checked && !x.doAnt).length;
      for (const x of caixas) if (!x.doAnt) x.c.disabled = !x.c.checked && marcadas >= n;
    };
    for (const id of classe.pericias.lista) {
      const s = PERICIAS.find(x => x.id === id);
      const doAnt = ant.pericias.includes(id);
      const l = marcarAndroid(s.nome, doAnt || e.pericias.includes(id));
      if (doAnt) { l.caixa.disabled = true; l.classList.add('do-antecedente'); }
      l.caixa.addEventListener('change', atualizar);
      caixas.push({ id, c: l.caixa, doAnt });
      lista.append(l);
    }
    corpo.append(lista, el('p', 'dialogo-dica', `Em cinza: perícias do antecedente (${ant.nome}).`));
    atualizar();
    ctx.ler = () => {
      const escolhidas = caixas.filter(x => x.c.checked && !x.doAnt).map(x => x.id);
      const livres = caixas.filter(x => !x.doAnt).length;
      if (escolhidas.length < Math.min(n, livres)) { avisar(`Escolha ${Math.min(n, livres)} perícia(s).`); return undefined; }
      e.pericias = escolhidas;
      return true;
    };
  }, [{ texto: 'Voltar', valor: VOLTAR }, { texto: 'Próximo', valor: (ctx) => ctx.ler() }]);
}

// Escolhas que mudam números na ficha: Humano (Habilidoso: 1 perícia; Versátil: 1 talento de
// Origem) e Elfo (Sentidos Aguçados: Intuição, Percepção ou Sobrevivência).
const ESCOLHAS_ESPECIE = {
  humano: { pericia: null, talento: true },
  elfo: { pericia: ['intuicao', 'percepcao', 'sobrevivencia'], talento: false },
};
function passoEspecie(e) {
  const esc = ESCOLHAS_ESPECIE[e.especie];
  const especie = D5.especies.find(x => x.id === e.especie);
  const ant = D5.antecedentes.find(x => x.id === e.antecedente);
  const ja = new Set([...ant.pericias, ...e.pericias]);
  const opcoes = (esc.pericia || PERICIAS.map(s => s.id)).filter(id => !ja.has(id));
  return dialogo(`Escolhas de ${especie.nome}`, (corpo, ctx) => {
    const per = selecao(opcoes.map(id => [id, PERICIAS.find(s => s.id === id).nome]), opcoes.includes(e.periciaEspecie) ? e.periciaEspecie : opcoes[0]);
    const lp = el('label', 'linha-criador'); lp.append(el('span', '', e.especie === 'elfo' ? 'Sentidos Aguçados:' : 'Habilidoso (perícia):'), per);
    corpo.append(lp);
    let tal = null;
    if (esc.talento) {
      const origem = D5.talentos.filter(t => t.categoria === 'Origem' && t.id !== ant.talento);
      tal = selecao(origem.map(t => [t.id, t.nome]), e.talentoEspecie || origem[0].id);
      const lt = el('label', 'linha-criador'); lt.append(el('span', '', 'Versátil (talento):'), tal);
      corpo.append(lt);
    }
    ctx.ler = () => { e.periciaEspecie = per.value; e.talentoEspecie = tal ? tal.value : ''; return true; };
  }, [{ texto: 'Voltar', valor: VOLTAR }, { texto: 'Próximo', valor: (ctx) => ctx.ler() }]);
}

// 5) Pontos de Vida do primeiro nível (o máximo do dado + CON, ou rolar/média)
function passoPV(e) {
  const classe = classeDoSRD(e.classe);
  const dado = classe.dadoVida;
  const con = modificador((e.valores.con || 10) + ((e.aumentos || {}).con || 0));
  return dialogo('Pontos de Vida', (corpo, ctx) => {
    const topo = el('div', 'pv-colunas um');
    const total = el('b');
    const c1 = el('div'); c1.append(el('span', '', 'Primeiro Nível'), total);
    topo.append(c1);
    const valor = entrada(e.pv ? e.pv.valor : dado, 'number', { min: 1, max: dado, inputMode: 'numeric' });
    valor.className = 'sublinhado grande';
    const bonus = entrada(e.pv ? e.pv.bonus : 0, 'number');
    bonus.className = 'sublinhado';
    const conCampo = entrada(con, 'text', { readOnly: true, tabIndex: -1 });
    conCampo.className = 'sublinhado apagado';
    const calcular = () => {
      const v = Math.max(1, Math.min(dado, numeroDe(valor, dado)));
      ctx.valor = { valor: v, bonus: numeroDe(bonus, 0), total: Math.max(1, v + con) + numeroDe(bonus, 0) };
      total.textContent = String(ctx.valor.total);
    };
    const botoes = el('div', 'botoes-android');
    const b = (t, f) => { const x = el('button', '', t); x.type = 'button'; x.addEventListener('click', () => { f(); calcular(); }); return x; };
    botoes.append(
      b('Máx.', () => { valor.value = dado; }),
      b('Média', () => { valor.value = mediaDadoVida(dado); }),
      b('Rolar', () => { valor.value = rolarDadoCripto(dado); valor.classList.remove('girou'); void valor.offsetWidth; valor.classList.add('girou'); vibrar(); }));
    const extras = el('div', 'pv-extras');
    const ex1 = el('label'); ex1.append(conCampo, el('span', '', 'Mod. CON'));
    const ex2 = el('label'); ex2.append(bonus, el('span', '', 'Bônus Extra'));
    extras.append(ex1, ex2);
    corpo.append(topo, valor, el('div', 'pv-dado', `Dado de Vida d${dado}`), botoes, extras);
    valor.addEventListener('input', calcular);
    bonus.addEventListener('input', calcular);
    calcular();
  }, [{ texto: 'Voltar', valor: VOLTAR }, { texto: 'Concluir', valor: (ctx) => { e.pv = ctx.valor; return true; } }]);
}

// Monta o personagem com tudo o que foi escolhido.
function criarPersonagem(e) {
  const classe = classeDoSRD(e.classe);
  const especie = D5.especies.find(x => x.id === e.especie);
  const ant = D5.antecedentes.find(x => x.id === e.antecedente);
  const atributos = { ...e.valores };
  for (const [a, n] of Object.entries(e.aumentos || {})) atributos[a] = Math.min(20, atributos[a] + n);
  const novo = limparPersonagem({
    nome: e.nome, atributos,
    classes: [{ id: classe.id, nome: classe.nome, nivel: 1, dadoVida: classe.dadoVida }],
    raca: e.sub ? `${especie.nome} (${e.sub})` : especie.nome,
    antecedente: ant.nome,
    deslocamentos: { andar: { base: lerMetros(especie.deslocamento) ?? 9 } },
    recursos: [], ataques: [], magias: [],
  });
  personagens.push(novo);
  p = novo;
  aplicarNivel1();                                     // salvaguardas, características, proficiências, conjuração
  p.pvMax = e.pv.total;
  p.pv = p.pvMax;
  for (const t of especie.tracos) p.caracteristicas.push({ nome: t.nome, origem: `Espécie: ${especie.nome}`, descricao: t.descricao });
  if (e.sub) {
    const s = SUBESPECIES[especie.id];
    p.caracteristicas.push({ nome: e.sub, origem: `${s.rotulo} (${especie.nome})`, descricao: `Escolhida no traço ${s.traco}: veja a descrição dele.` });
  }
  const talento = D5.talentos.find(x => x.id === ant.talento);
  if (talento) p.caracteristicas.push({ nome: talento.nome, origem: `Antecedente: ${ant.nome}`, descricao: talento.descricao });
  for (const id of [...ant.pericias, ...e.pericias]) p.pericias[id] = 1;
  if (ESCOLHAS_ESPECIE[especie.id] && e.periciaEspecie) p.pericias[e.periciaEspecie] = 1;
  const talEsp = ESCOLHAS_ESPECIE[especie.id] && e.talentoEspecie && D5.talentos.find(x => x.id === e.talentoEspecie);
  if (talEsp) p.caracteristicas.push({ nome: talEsp.nome, origem: `Espécie: ${especie.nome} (Versátil)`, descricao: talEsp.descricao });
  p.antecedenteAplicado = { aumentos: e.aumentos || {}, pericias: [...ant.pericias], ferramenta: ant.ferramenta || '' };
  if (ant.ferramenta) p.textos.profFerramentas = [p.textos.profFerramentas, ant.ferramenta].filter(Boolean).join('\n');
  p.textos.equipamento = [`${classe.nome}: ${classe.equipamento}`, `${ant.nome}: ${ant.equipamento}`].join('\n\n');
  p.textos.idiomas = 'Comum e mais dois idiomas à sua escolha.';
  atualizarConjuracao();
  trocarPara(p);
  irParaPagina(0);
  avisar(`${p.nome} criado! Escolha magias e armas nas páginas de Magias e Ataques.`);
}
