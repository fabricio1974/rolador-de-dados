// Ficha de Personagem: diálogos de edição no estilo do app de referência (Android):
// número grande em azul, campos sublinhados com o nome embaixo, caixas de marcar e listas.
'use strict';

// Campo sublinhado com o rótulo embaixo ("12" / "Bônus da Armadura"). cinza = só leitura.
function campoSub(rotulo, valor, { cinza = false, tipo = 'number', largo = false } = {}) {
  const l = el('label', 'campo-sub' + (largo ? ' largo' : ''));
  const i = entrada(valor, tipo, cinza ? { readOnly: true, tabIndex: -1 } : {});
  if (tipo === 'number') i.inputMode = 'numeric';
  i.className = 'sublinhado' + (cinza ? ' apagado' : '');
  l.append(i, el('span', '', rotulo));
  l.input = i;
  return l;
}
const linhaCampos = (...cs) => { const d = el('div', 'linha-sub'); d.append(...cs); return d; };
const valorAzul = (texto) => el('div', 'valor-azul', texto);
function caixaSelecao(rotulo, opcoes, atual) {
  const l = el('label', 'linha-selecao');
  const s = selecao(opcoes, atual);
  l.append(el('b', '', rotulo), s);
  l.select = s;
  return l;
}
function marcarAndroid(rotulo, ligado) {
  const l = el('label', 'marcar-android');
  const c = el('input'); c.type = 'checkbox'; c.checked = !!ligado;
  l.append(c, el('span', '', rotulo));
  l.caixa = c;
  return l;
}
const OPCOES_ATR_NENHUM = () => [['', 'Nenhum'], ...ATRIBUTOS.map(a => [a.id, a.nome])];
const ABREV = { for: 'For', des: 'Des', con: 'Con', int: 'Int', sab: 'Sab', car: 'Car' };
// Depois de um diálogo de edição: salva e redesenha.
const aplicarEdicao = () => { salvar(); desenhar(); };

// ---------- Atributos (todos juntos) e salvaguardas ----------
async function editarAtributos() {
  const ok = await dialogo('', (corpo, ctx) => {
    const valores = {}, profs = {}, bonus = {};
    const g1 = el('div', 'grade-sub');
    for (const a of ATRIBUTOS) { valores[a.id] = campoSub(`Valor de ${a.nome}`, p.atributos[a.id]); g1.append(valores[a.id]); }
    const g2 = el('div', 'grade-marcar');
    for (const a of ATRIBUTOS) { profs[a.id] = marcarAndroid(ABREV[a.id], p.salvaguardas[a.id]); g2.append(profs[a.id]); }
    const g3 = el('div', 'grade-sub');
    for (const a of ATRIBUTOS) { bonus[a.id] = campoSub(`Salv. de ${ABREV[a.id]} Bônus Extra`, p.salvaguardasBonus[a.id] || 0); g3.append(bonus[a.id]); }
    const extra = caixaSelecao('Atributo Somado a Todas as Salvaguardas:', OPCOES_ATR_NENHUM(), p.salvaguardaExtra);
    corpo.append(g1, el('h3', 'sub-titulo', 'Proficiência em Salvaguardas:'), g2,
      el('h3', 'sub-titulo', 'Bônus Extra de Salvaguarda:'), g3, extra);
    ctx.ler = () => {
      for (const a of ATRIBUTOS) {
        const v = numeroDe(valores[a.id].input, -1);
        if (v < 1 || v > 30) { avisar(`${a.nome}: o valor vai de 1 a 30.`); return undefined; }
      }
      for (const a of ATRIBUTOS) {
        p.atributos[a.id] = numeroDe(valores[a.id].input);
        if (profs[a.id].caixa.checked) p.salvaguardas[a.id] = true; else delete p.salvaguardas[a.id];
        const b = Math.max(-30, Math.min(30, numeroDe(bonus[a.id].input, 0)));
        if (b) p.salvaguardasBonus[a.id] = b; else delete p.salvaguardasBonus[a.id];
      }
      p.salvaguardaExtra = extra.select.value;
      return true;
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Perícia ----------
async function editarPericia(id) {
  const s = PERICIAS.find(x => x.id === id);
  const ok = await dialogo(s.nome, (corpo, ctx) => {
    const azul = valorAzul('');
    const prof = campoSub('Bônus de Prof.', profDe(p), { cinza: true });
    const atr = campoSub(ABREV[s.atr], modDe(p, s.atr), { cinza: true });
    const bonus = campoSub('Bônus Extra', p.periciasBonus[id] || 0);
    const temProf = marcarAndroid('Proficiência na Perícia', (p.pericias[id] || 0) >= 1);
    const dupla = marcarAndroid('Proficiência Dobrada (Especialista)', p.pericias[id] === 2);
    const nivel = () => (dupla.caixa.checked ? 2 : temProf.caixa.checked ? 1 : 0);
    const calcular = () => { azul.textContent = semMais(modDe(p, s.atr) + profDe(p) * nivel() + numeroDe(bonus.input, 0)); };
    temProf.caixa.addEventListener('change', () => { if (!temProf.caixa.checked) dupla.caixa.checked = false; calcular(); });
    dupla.caixa.addEventListener('change', () => { if (dupla.caixa.checked) temProf.caixa.checked = true; calcular(); });
    bonus.input.addEventListener('input', calcular);
    const marcas = el('div', 'coluna-marcar');
    marcas.append(temProf, dupla);
    corpo.append(azul, linhaCampos(prof, atr, bonus), marcas);
    calcular();
    ctx.ler = () => {
      if (nivel()) p.pericias[id] = nivel(); else delete p.pericias[id];
      const b = Math.max(-30, Math.min(30, numeroDe(bonus.input, 0)));
      if (b) p.periciasBonus[id] = b; else delete p.periciasBonus[id];
      return true;
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Iniciativa ----------
async function editarIniciativa() {
  const ok = await dialogo('', (corpo, ctx) => {
    const previa = el('div', 'caixa-verde previa');
    const num = el('span', 'num-grande');
    previa.append(el('span', 'rot', 'Iniciativa'), num);
    const des = campoSub('Mod. Des', modDe(p, 'des'), { cinza: true });
    const bonus = campoSub('Bônus Extra', p.iniciativaBonus);
    const inteira = marcarAndroid('Somar Proficiência', p.iniciativaProf === 1);
    const metade = marcarAndroid('Metade da Proficiência', p.iniciativaProf === 0.5);
    const extra = caixaSelecao('Atributo Extra na Iniciativa:', OPCOES_ATR_NENHUM(), p.iniciativaAtributo);
    const profEscolhida = () => (inteira.caixa.checked ? 1 : metade.caixa.checked ? 0.5 : 0);
    const calcular = () => {
      num.textContent = semMais(modDe(p, 'des') + numeroDe(bonus.input, 0) + Math.floor(profDe(p) * profEscolhida()) +
        (extra.select.value ? modDe(p, extra.select.value) : 0));
    };
    inteira.caixa.addEventListener('change', () => { if (inteira.caixa.checked) metade.caixa.checked = false; calcular(); });
    metade.caixa.addEventListener('change', () => { if (metade.caixa.checked) inteira.caixa.checked = false; calcular(); });
    bonus.input.addEventListener('input', calcular);
    extra.select.addEventListener('change', calcular);
    const marcas = el('div', 'coluna-marcar');
    marcas.append(inteira, metade);
    corpo.append(previa, linhaCampos(des, bonus), marcas, extra);
    calcular();
    ctx.ler = () => {
      p.iniciativaBonus = Math.max(-20, Math.min(30, numeroDe(bonus.input, 0)));
      p.iniciativaProf = profEscolhida();
      p.iniciativaAtributo = extra.select.value;
      return true;
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Deslocamento (andar, voo, natação, escavação, escalada) ----------
async function editarDeslocamento() {
  const ok = await dialogo('', (corpo, ctx) => {
    const copia = structuredClone(p.deslocamentos);
    let tipo = 'andar';
    const previa = el('div', 'caixa-verde previa');
    const rot = el('span', 'rot', 'Deslocamento');
    const num = el('span', 'num-grande');
    previa.append(rot, num);
    const base = campoSub('Deslocamento Base (m)', copia.andar.base);
    const mod = campoSub('Bônus Extra (m)', copia.andar.mod);
    const lerNum = (i) => { const n = parseFloat(String(i.value).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
    const guardar = () => { copia[tipo] = { base: Math.max(0, lerNum(base.input)), mod: lerNum(mod.input) }; };
    const mostrar = () => {
      rot.textContent = TIPOS_DESLOCAMENTO.find(t => t[0] === tipo)[1];
      num.textContent = metros(Math.max(0, copia[tipo].base + copia[tipo].mod));
      num.append(el('small', 'unidade', 'm'));
    };
    for (const c of [base, mod]) { c.input.inputMode = 'decimal'; c.input.step = '0.5'; c.input.addEventListener('input', () => { guardar(); mostrar(); }); }
    const tipos = radios(TIPOS_DESLOCAMENTO.map(([id, nome]) => [id, nome]), 'andar', (v) => {
      guardar();
      tipo = v;
      base.input.value = copia[v].base;
      mod.input.value = copia[v].mod;
      mostrar();
    });
    tipos.classList.add('radios-linha');
    corpo.append(previa, linhaCampos(base, mod), tipos, el('p', 'dialogo-dica', '1,5 m = 1 quadrado. A caixa da ficha mostra o de andar.'));
    mostrar();
    ctx.ler = () => { guardar(); p.deslocamentos = copia; return true; };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Classe de Armadura ----------
async function editarCA() {
  const ok = await dialogo('Classe de Armadura', (corpo, ctx) => {
    const a = structuredClone(p.armadura);
    const azul = valorAzul('');
    const base = campoSub('Bônus da Armadura', a.base);
    const escudo = campoSub('Bônus do Escudo', a.escudo);
    const des = campoSub('Mod. Des', modDe(p, 'des'), { cinza: true });
    const maxDes = campoSub('Máx. Des', maxDestreza(a.tipo), { cinza: true });
    const mod = campoSub('Bônus Extra', a.mod);
    const tipo = caixaSelecao('Tipo de Armadura', TIPOS_ARMADURA.map(t => [t[0], t[1]]), a.tipo);
    const extra = caixaSelecao('Atributo Adicional:', OPCOES_ATR_NENHUM(), a.extra);
    const nome = el('p', 'dialogo-dica', '');
    const ler = () => Object.assign(a, {
      base: Math.max(0, numeroDe(base.input, 10)), escudo: Math.max(0, numeroDe(escudo.input, 0)), mod: numeroDe(mod.input, 0),
      tipo: tipo.select.value, extra: extra.select.value,
    });
    const calcular = () => {
      ler();
      maxDes.input.value = maxDestreza(a.tipo);
      azul.textContent = String(classeArmaduraDe({ ...p, armadura: a }));
      nome.textContent = a.nome ? `Armadura: ${a.nome}` : '';
    };
    corpo.addEventListener('input', calcular);
    corpo.addEventListener('change', calcular);
    const escolher = el('button', 'botao-texto-android', 'Selecionar Armadura');
    escolher.type = 'button';
    escolher.addEventListener('click', async () => {
      const arm = await escolherArmadura();
      if (!arm) return;
      const n = parseInt(arm.ca, 10) || 0;
      if (arm.categoria === 'Escudo') escudo.input.value = n;
      else {
        base.input.value = n;
        tipo.select.value = { Leve: 'leve', 'Média': 'media', Pesada: 'pesada' }[arm.categoria] || 'leve';
        a.nome = arm.nome;
      }
      calcular();
    });
    corpo.append(azul, linhaCampos(base, escudo, des, maxDes, mod), tipo, extra, nome, escolher,
      el('p', 'dialogo-dica', 'Sem armadura: deixe Nenhuma e 10. Defesa sem Armadura: escolha Constituição ou Sabedoria em Atributo Adicional.'));
    calcular();
    ctx.ler = () => { ler(); p.armadura = limparPersonagem({ ...p, armadura: a }).armadura; return true; };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}
function escolherArmadura() {
  return dialogo('Selecionar Armadura', (corpo, ctx) => {
    const grupos = [...new Set(D5.armaduras.map(a => a.categoria))];
    for (const g of grupos) {
      corpo.append(el('h3', 'sub-titulo', g));
      for (const a of D5.armaduras.filter(x => x.categoria === g)) {
        const b = el('button', 'item-dialogo');
        b.type = 'button';
        b.append(el('b', '', a.nome), el('small', '', `CA ${a.ca}${a.forca ? ' · ' + a.forca : ''}${a.furtividade ? ' · Furtividade: ' + a.furtividade : ''}`));
        b.addEventListener('click', () => ctx.fechar(a));
        corpo.append(b);
      }
    }
  }, [{ texto: 'Cancelar', valor: null }]);
}

// ---------- Conjuração: Ataque Mágico e CD ----------
async function editarConjuracao() {
  const ok = await dialogo('', (corpo, ctx) => {
    const c = structuredClone(p.conjuracao);
    const topo = el('div', 'pv-colunas');
    const atq = el('b'), cd = el('b');
    const c1 = el('div'); c1.append(el('span', '', 'Ataque Mágico'), atq);
    const c2 = el('div'); c2.append(el('span', '', 'CD de Magia'), cd);
    topo.append(c1, c2);
    const prof = campoSub('Bônus de Prof.', profDe(p), { cinza: true });
    const mod = campoSub('Mod.', 0, { cinza: true });
    const bAtq = campoSub('Bônus Extra de Ataque', c.bonusAtaque);
    const bCD = campoSub('Bônus Extra de CD', c.bonusCD);
    const nivel = campoSub('Nível', c.nivel);
    const atr = caixaSelecao('Atributo de Conjuração', ATRIBUTOS.map(a => [a.id, a.nome]), c.atributo);
    const tipo = caixaSelecao('Espaços de Magia', TIPOS_ESPACOS, c.espacosTipo);
    const calcular = () => {
      const m = modDe(p, atr.select.value);
      mod.input.value = m;
      mod.querySelector('span').textContent = `Mod. ${ABREV[atr.select.value]}`;
      atq.textContent = comSinal(profDe(p) + m + numeroDe(bAtq.input, 0));
      cd.textContent = String(8 + profDe(p) + m + numeroDe(bCD.input, 0));
    };
    corpo.addEventListener('input', calcular);
    corpo.addEventListener('change', calcular);
    corpo.append(topo, linhaCampos(prof, mod, bAtq, bCD, nivel), atr, tipo,
      el('p', 'dialogo-dica', '"Pelas classes" calcula os espaços pelas classes do SRD (multiclasse também). "Manual" deixa você mudar à mão.'));
    calcular();
    ctx.ler = () => {
      const n = numeroDe(nivel.input, -1);
      if (n < 0 || n > 20) { avisar('O nível vai de 0 a 20.'); return undefined; }
      p.conjuracao = { atributo: atr.select.value, nivel: n, bonusAtaque: numeroDe(bAtq.input, 0), bonusCD: numeroDe(bCD.input, 0), espacosTipo: tipo.select.value };
      const novos = espacosPorTipo(p, D5);
      if (novos) p.espacos = aplicarEspacos(p.espacos, novos);
      return true;
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Dados de Vida ("3 d 6" por classe) ----------
async function dialogoDadosVida() {
  const con = modDe(p, 'con');
  const r = await dialogo('Dados de Vida', (corpo, ctx) => {
    const linhas = [];
    p.classes.forEach((c, i) => {
      if (p.classes.length > 1) corpo.append(el('h3', 'sub-titulo', `${c.nome || 'Classe'} ${c.nivel}`));
      const qtd = entrada(c.nivel - c.gastos, 'number', { min: 0, max: c.nivel, inputMode: 'numeric' });
      qtd.className = 'sublinhado';
      const dado = selecao(DADOS_DE_VIDA.map(d => [String(d), String(d)]), String(c.dadoVida));
      dado.className = 'sublinhado';
      const linha = el('div', 'linha-dados-vida');
      linha.append(qtd, el('span', 'letra-d', 'd'), dado);
      const gastar = el('button', 'botao-texto-android', `Gastar 1 dado (1d${c.dadoVida}${comSinal(con)})`);
      gastar.type = 'button';
      gastar.disabled = c.nivel - c.gastos <= 0;
      gastar.addEventListener('click', () => { ctx.ler(); ctx.fechar({ gastar: i }); });
      corpo.append(linha, gastar);
      linhas.push({ qtd, dado });
    });
    corpo.append(el('p', 'dialogo-dica', `O número é quantos restam (de ${p.nivel}). No descanso curto, cada dado gasto cura o valor rolado ${comSinal(con)}; o descanso longo devolve todos.`));
    ctx.ler = () => {
      linhas.forEach(({ qtd, dado }, i) => {
        const c = p.classes[i];
        c.gastos = c.nivel - Math.max(0, Math.min(c.nivel, numeroDe(qtd, c.nivel)));
        c.dadoVida = Number(dado.value);
      });
      return { salvar: true };
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (!r) return;
  if (r.salvar) { aplicarEdicao(); return; }
  // Gastar um dado: rola, cura e oferece Desfazer.
  salvar();
  const c = p.classes[r.gastar];
  const antes = structuredClone(p);
  const rol = rolarExpr('Dado de Vida', `1d${c.dadoVida}${comSinal(con)}`, dialogoDadosVida);
  if (!rol) return;
  const cura = Math.max(1, rol.partes[0].res.total);   // mínimo de 1 PV (SRD 5.2.1)
  c.gastos += 1;
  p.pv = curar(p, cura);
  salvar();
  desenhar();
  avisar(`+${cura} PV (${p.pv}/${p.pvMax})`, 'Desfazer', () => {
    const k = personagens.indexOf(p); personagens[k] = antes; p = antes; salvar(); desenhar(true);
  });
}

// ---------- Topo da página de ataques: atributo em destaque e recursos de classe ----------
async function editarDestaque() {
  const ok = await dialogo('', (corpo, ctx) => {
    const recs = structuredClone(p.recursos);
    let atual = Math.min(p.recursoDestaque, Math.max(0, recs.length - 1));
    const atr = caixaSelecao('Atributo em Destaque:', ATRIBUTOS.map(a => [a.id, a.nome]), p.atributoDestaque);
    atr.classList.add('centro');
    const sel = el('select');
    const mais = el('button', 'botao-icone verde', '+'); mais.type = 'button'; mais.setAttribute('aria-label', 'Novo recurso');
    const menos = el('button', 'botao-icone vermelho', '✕'); menos.type = 'button'; menos.setAttribute('aria-label', 'Apagar recurso');
    const linhaSel = el('div', 'linha-recurso-sel');
    linhaSel.append(sel, mais, menos);
    const nome = campoSub('Nome', '', { tipo: 'text', largo: true });
    const textoCx = campoSub('Texto na Caixa', '', { tipo: 'text', largo: true });
    const max = campoSub('Máximo', 0);
    const dado = campoSub('Dado (0 = nenhum)', 0);
    const resta = campoSub('Restam', 0);
    let gastavel = true, reset = 'longo';
    const tipoR = radios([['g', 'Gastável'], ['f', 'Fixo']], 'g', (v) => { gastavel = v === 'g'; atualizarCinza(); });
    tipoR.classList.add('radios-linha');
    const resetR = radios([['curto', 'Curto'], ['longo', 'Longo'], ['nunca', 'Nunca']], 'longo', (v) => { reset = v; atualizarCinza(); });
    resetR.classList.add('radios-linha');
    const recC = campoSub('Recupera no Curto', 0);
    const recL = campoSub('Recupera no Longo', 0);
    const campos = el('div', 'campos-recurso');
    campos.append(linhaCampos(nome, textoCx), linhaCampos(max, dado, resta), tipoR, el('h3', 'sub-titulo', 'Volta no descanso:'), resetR, linhaCampos(recC, recL));
    function atualizarCinza() {
      const cinza = (c, sim) => { c.input.readOnly = sim; c.input.classList.toggle('apagado', sim); };
      cinza(resta, !gastavel);
      cinza(recC, !gastavel || reset === 'curto');
      cinza(recL, !gastavel || reset !== 'nunca');
    }
    const guardar = () => {
      if (!recs[atual]) return;
      const m = Math.max(0, numeroDe(max.input, 0));
      recs[atual] = limparRecurso({
        nome: nome.input.value.trim(), texto: textoCx.input.value.trim(), max: m, dado: numeroDe(dado.input, 0), gastavel, reset,
        recCurto: numeroDe(recC.input, 0), recLongo: numeroDe(recL.input, 0), usados: m - Math.max(0, Math.min(m, numeroDe(resta.input, m))),
      });
    };
    const mostrar = () => {
      sel.replaceChildren(...recs.map((r, i) => { const o = el('option', '', r.nome); o.value = String(i); return o; }));
      sel.value = String(atual);
      campos.hidden = !recs.length;
      menos.disabled = !recs.length;
      const r = recs[atual];
      if (!r) return;
      nome.input.value = r.nome; textoCx.input.value = r.texto; max.input.value = r.max; dado.input.value = r.dado;
      resta.input.value = restanteRecurso(r); recC.input.value = r.recCurto; recL.input.value = r.recLongo;
      gastavel = r.gastavel; reset = r.reset;
      tipoR.querySelector(`input[value="${gastavel ? 'g' : 'f'}"]`).checked = true;
      resetR.querySelector(`input[value="${reset}"]`).checked = true;
      atualizarCinza();
    };
    sel.addEventListener('change', () => { guardar(); atual = Number(sel.value); mostrar(); });
    mais.addEventListener('click', () => {
      guardar();
      recs.push(limparRecurso({ nome: 'Recurso ' + (recs.length + 1), max: 1 }));
      atual = recs.length - 1;
      mostrar();
      nome.input.focus(); nome.input.select();
    });
    menos.addEventListener('click', () => { recs.splice(atual, 1); atual = Math.max(0, atual - 1); mostrar(); });
    corpo.append(atr, el('h3', 'sub-titulo', 'Recurso de Classe na Caixa:'), linhaSel, campos,
      el('p', 'dialogo-dica', 'Ex.: Fúria 3 (gastável, volta no longo), Inspiração de Bardo d6, Sorte 2d20. Tocar na caixa gasta um e rola o dado.'));
    mostrar();
    ctx.ler = () => {
      guardar();
      p.atributoDestaque = atr.select.value;
      p.recursos = recs;
      p.recursoDestaque = Math.min(atual, Math.max(0, recs.length - 1));
      return true;
    };
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (ok) aplicarEdicao();
}

// ---------- Lista de personagens (pasta) ----------
async function dialogoPersonagens() {
  const r = await dialogo('', (corpo, ctx) => {
    for (const x of personagens) {
      const linha = el('div', 'linha-personagem' + (x === p ? ' atual' : ''));
      const abrir = el('button', 'abrir', `${x.nome}, ${classeENivelDe(x)}`);
      abrir.type = 'button';
      abrir.addEventListener('click', () => ctx.fechar({ abrir: x }));
      const tirar = el('button', 'tirar');
      tirar.type = 'button';
      tirar.setAttribute('aria-label', `Apagar ${x.nome}`);
      tirar.classList.add('letra');
      tirar.textContent = 'X';
      tirar.addEventListener('click', () => ctx.fechar({ apagar: x }));
      linha.append(abrir, tirar);
      corpo.append(linha);
    }
    corpo.parentNode.classList.add('lista');
  }, [{ texto: 'Duplicar', valor: { duplicar: true } }, { texto: 'Novo Personagem', valor: { novo: true } }]);
  if (!r) return;
  if (r.abrir) trocarPara(r.abrir);
  else if (r.apagar) mandarParaLixeira(r.apagar);
  else if (r.duplicar) {
    const copia = limparPersonagem({ ...structuredClone(p), id: '', nome: p.nome + ' (cópia)' });
    personagens.push(copia);
    trocarPara(copia);
  } else if (r.novo) novoPersonagemComCriador();
}
