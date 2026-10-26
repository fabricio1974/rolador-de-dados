// Ficha de Personagem: subir de nível, classes (multiclasse) e Dados de Vida.
// Os diálogos imitam os do Android: cartão branco no meio da tela, botões embaixo.
'use strict';

// ---------- Diálogo (devolve uma Promise com o valor do botão; voltar/fora = null) ----------
function dialogo(titulo, montar, botoes) {
  return new Promise((resolve) => {
    let resultado = null;
    const fundo = el('div', 'dialogo-fundo');
    const caixa = el('div', 'dialogo');
    caixa.setAttribute('role', 'dialog');
    if (titulo) caixa.append(el('h2', '', titulo));
    const corpo = el('div', 'dialogo-corpo');
    const ctx = { valor: null, corpo, botoes: {} };
    const fechar = (valor) => { resultado = valor; voltar(); };
    ctx.fechar = fechar;
    const rodape = el('div', 'dialogo-botoes');
    for (const b of botoes) {
      const x = el('button', '', b.texto);
      x.type = 'button';
      x.addEventListener('click', () => {
        const v = typeof b.valor === 'function' ? b.valor(ctx) : b.valor;
        if (v === undefined) return;   // undefined = não fecha (ex.: falta escolher algo)
        fechar(v);
      });
      ctx.botoes[b.id || b.texto] = x;
      rodape.append(x);
    }
    caixa.append(corpo, rodape);
    fundo.append(caixa);
    document.body.append(fundo);
    if (montar) montar(corpo, ctx);
    fundo.addEventListener('click', (ev) => { if (ev.target === fundo) fechar(null); });
    abrirCamada(() => { fundo.remove(); resolve(resultado); });
  });
}

// Lista de opções com bolinha (radio), como no Android.
function radios(opcoes, atual, aoMudar) {
  const caixa = el('div', 'radios');
  const nome = 'r' + Math.random().toString(36).slice(2);
  for (const [valor, texto, sub] of opcoes) {
    const l = el('label', 'radio');
    const r = el('input');
    r.type = 'radio'; r.name = nome; r.value = valor; r.checked = valor === atual;
    r.addEventListener('change', () => aoMudar(valor));
    const t = el('span');
    t.append(texto);
    if (sub) t.append(el('small', '', sub));
    l.append(r, t);
    caixa.append(l);
  }
  return caixa;
}

// ---------- Subir de nível ----------
const classeDoSRD = (id) => D5.classes.find(c => c.id === id) || null;
// Primeiro atributo de uma classe (multiclasse 2024 pede 13 nele).
function requisitoMulticlasse(id) {
  const d = classeDoSRD(id);
  return d ? d.atributoPrincipal : [];
}
const temRequisito = (id) => {
  const req = requisitoMulticlasse(id);
  return !req.length || req.some(a => p.atributos[a] >= 13);
};

async function subirDeNivel() {
  if (p.nivel >= 20) { avisar('Nível 20 é o máximo.'); return; }
  // 1) Qual classe sobe (ou uma nova, multiclasse)
  const opcoes = p.classes.map((c, i) => [String(i), c.nome || 'Classe']);
  opcoes.push(['multi', 'Multiclasse']);
  const qual = await dialogo(`Subir ${p.nome} de nível?`, (corpo, ctx) => {
    ctx.valor = '0';
    corpo.append(radios(opcoes, '0', (v) => { ctx.valor = v; }));
  }, [{ texto: 'Cancelar', valor: null }, { texto: 'Aplicar', valor: (ctx) => ctx.valor }]);
  if (qual === null) return;

  let alvo;
  if (qual === 'multi') {
    const ja = new Set(p.classes.map(c => c.id));
    const lista = D5.classes.filter(c => !ja.has(c.id));
    const id = await dialogo('Nova classe', (corpo, ctx) => {
      corpo.append(el('p', 'dialogo-dica', 'Multiclasse (regra 2024): pede 13 ou mais no atributo principal da classe nova e das suas classes.'));
      corpo.append(radios(lista.map(c => [c.id, c.nome,
        `d${c.dadoVida} · ${c.atributoPrincipal.map(a => NOME_ATRIBUTO[a]).join(' ou ')} 13` + (temRequisito(c.id) ? '' : ' ✗')]),
        null, (v) => { ctx.valor = v; }));
    }, [{ texto: 'Cancelar', valor: null }, { texto: 'Aplicar', valor: (ctx) => ctx.valor || undefined }]);
    if (!id) return;
    const d = classeDoSRD(id);
    alvo = { id, nome: d.nome, nivel: 0, dadoVida: d.dadoVida, subclasse: '', gastos: 0, nova: true };
  } else {
    alvo = { ...p.classes[Number(qual)], indice: Number(qual) };
  }
  const dados = classeDoSRD(alvo.id);
  const nivelClasse = alvo.nivel + 1;

  // 2) Pontos de Vida: valor do dado (Máx / Média / Rolar) + CON + bônus extra
  const ganhoPV = await dialogoPV(alvo.dadoVida);
  if (ganhoPV === null) return;

  // 3) Aumento no Valor de Atributo (ou talento) nos níveis da classe que dão isso
  let aumento = null;
  if (ganhaAumento(dados, nivelClasse)) {
    aumento = await dialogoAumento(nivelClasse === 19);
    if (aumento === null) return;
  }

  // 4) Subclasse no nível 3
  let subclasse = alvo.subclasse;
  if (nivelClasse === 3 && !subclasse && dados) {
    subclasse = await dialogoSubclasse(dados);
    if (subclasse === null) return;
  }

  // Aplica tudo de uma vez (com Desfazer)
  const antes = structuredClone(p);
  const pvAntes = p.pvMax, profAntes = profDe(p), espAntes = JSON.stringify(p.espacos);
  const conjAntes = contagemMagias();
  if (alvo.nova) p.classes.push({ id: alvo.id, nome: alvo.nome, nivel: 1, dadoVida: alvo.dadoVida, subclasse: '', gastos: 0 });
  else p.classes[alvo.indice].nivel = nivelClasse;
  const c = alvo.nova ? p.classes[p.classes.length - 1] : p.classes[alvo.indice];
  c.subclasse = subclasse || c.subclasse;
  p.nivel = nivelTotal(p.classes);
  p.pvMax += ganhoPV;
  p.pv += ganhoPV;
  if (aumento && aumento.atributos) p.atributos = aplicarAumento(p.atributos, aumento.atributos, aumento.max || 20);
  if (aumento && aumento.talento) {
    p.caracteristicas.push({ nome: aumento.talento.nome, origem: `Talento (${c.nome} ${nivelClasse})`, descricao: aumento.talento.descricao });
    if (aumento.talentoAtributo) p.atributos[aumento.talentoAtributo] = Math.min(aumento.talento.aumento.max || 20, p.atributos[aumento.talentoAtributo] + aumento.talento.aumento.qtd);
  }
  const novas = caracteristicasDoNivel(dados, nivelClasse, c.subclasse);
  for (const x of novas) p.caracteristicas.push({ nome: x.nome, origem: `${c.nome} ${nivelClasse}`, descricao: x.descricao });
  atualizarConjuracao();
  salvar();
  desenhar();

  // 5) O que mudou
  const conjDepois = contagemMagias();
  const linhas = [`Pontos de Vida máximos: ${pvAntes} → ${p.pvMax}`];
  if (profDe(p) !== profAntes) linhas.push(`Bônus de proficiência: ${comSinal(profAntes)} → ${comSinal(profDe(p))}`);
  if (JSON.stringify(p.espacos) !== espAntes) {
    linhas.push('Espaços de magia: ' + Object.entries(p.espacos).map(([n, e]) => `${n}º ${e.max}`).join(' · '));
  }
  if (conjDepois.truques !== conjAntes.truques) linhas.push(`Truques: ${conjAntes.truques} → ${conjDepois.truques}`);
  if (conjDepois.preparadas !== conjAntes.preparadas) linhas.push(`Magias preparadas: ${conjAntes.preparadas} → ${conjDepois.preparadas}`);
  if (alvo.nova) linhas.push('Multiclasse: você ganha só parte das proficiências da classe nova (veja a regra de Multiclasse).');
  await dialogo(`${c.nome} ${nivelClasse}`, (corpo) => {
    for (const l of linhas) corpo.append(el('p', 'dialogo-linha', l));
    for (const x of novas) {
      const d = el('details', 'novidade');
      d.append(el('summary', '', x.nome), el('p', '', x.descricao));
      corpo.append(d);
    }
    if (!dados) corpo.append(el('p', 'dialogo-dica', 'Classe fora do SRD: escreva as características novas em Detalhes.'));
  }, [{ texto: 'Concluído', valor: true }]);
  avisar(`${p.nome} chegou ao nível ${p.nivel}`, 'Desfazer', () => {
    const i = personagens.indexOf(p);
    personagens[i] = antes; p = antes; salvar(); desenhar(true);
  });
}

function dialogoPV(dado) {
  const con = modDe(p, 'con');
  return dialogo('Pontos de Vida', (corpo, ctx) => {
    const atual = el('div', 'pv-colunas');
    const prox = el('b', '', '');
    const c1 = el('div'); c1.append(el('span', '', 'Atual'), el('b', '', String(p.pvMax)));
    const c2 = el('div'); c2.append(el('span', '', 'Próximo Nível'), prox);
    atual.append(c1, c2);
    const valor = entrada(mediaDadoVida(dado), 'number', { min: 1, max: dado, inputMode: 'numeric' });
    valor.className = 'sublinhado grande';
    const bonus = entrada(0, 'number');
    bonus.className = 'sublinhado';
    const conCampo = entrada(con, 'text', { readOnly: true, tabIndex: -1 });
    conCampo.className = 'sublinhado apagado';
    const calcular = () => {
      const v = Math.max(1, Math.min(dado, numeroDe(valor, 1)));
      ctx.valor = Math.max(1, v + con) + numeroDe(bonus, 0);
      prox.textContent = String(p.pvMax + ctx.valor);
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
    corpo.append(atual, valor, el('div', 'pv-dado', `Dado de Vida d${dado}`), botoes, extras);
    valor.addEventListener('input', calcular);
    bonus.addEventListener('input', calcular);
    calcular();
  }, [{ texto: 'Concluído', valor: (ctx) => ctx.valor }]);
}

// Selecionar um ou dois atributos (+2 em um ou +1 em dois). "Escolher Talento" troca por um talento.
async function dialogoAumento(epico) {
  for (;;) {
    const r = await dialogo(epico ? 'Dádiva Épica: aumente um ou dois atributos ou escolha um talento' : 'Selecione um ou dois atributos para aumentar', (corpo, ctx) => {
      ctx.valor = [];
      const lista = el('div', 'atributos-aumento');
      const caixas = [];
      const atualizar = () => {
        const marcados = caixas.filter(x => x.c.checked).map(x => x.id);
        ctx.valor = marcados;
        const novo = aplicarAumento(p.atributos, marcados);
        for (const x of caixas) {
          x.c.disabled = !x.c.checked && (marcados.length >= 2 || p.atributos[x.id] >= 20);
          const v = novo[x.id];
          x.valor.textContent = `${v}  (${comSinal(modificador(v))})`;
          x.valor.classList.toggle('subiu', v !== p.atributos[x.id]);
        }
      };
      for (const a of ATRIBUTOS) {
        const l = el('label', 'linha-aumento');
        const c = el('input'); c.type = 'checkbox';
        const valor = el('b');
        l.append(c, el('span', '', a.nome), valor);
        c.addEventListener('change', atualizar);
        caixas.push({ id: a.id, c, valor });
        lista.append(l);
      }
      corpo.append(lista);
      atualizar();
    }, [
      { texto: 'Escolher Talento', valor: 'talento' },
      { texto: 'Concluído', valor: (ctx) => (ctx.valor.length ? { atributos: ctx.valor } : undefined) },
    ]);
    if (r !== 'talento') return r;
    const t = await escolherTalento(epico ? 'Dádiva Épica' : 'Geral');
    if (!t) continue;                                  // voltou da lista: mostra os atributos de novo
    if (t.aumento && t.aumento.dividir) continue;      // "Aumento no Valor de Atributo" é o próprio diálogo
    const res = { talento: t };
    if (t.aumento && t.aumento.atributos.length) {
      const atr = await dialogo(`${t.nome}: +${t.aumento.qtd} em qual atributo?`, (corpo, ctx) => {
        ctx.valor = t.aumento.atributos[0];
        corpo.append(radios(t.aumento.atributos.map(a => [a, NOME_ATRIBUTO[a], `${p.atributos[a]} → ${Math.min(t.aumento.max || 20, p.atributos[a] + t.aumento.qtd)}`]),
          ctx.valor, (v) => { ctx.valor = v; }));
      }, [{ texto: 'Concluído', valor: (ctx) => ctx.valor }]);
      if (!atr) continue;
      res.talentoAtributo = atr;
    }
    return res;
  }
}

async function dialogoSubclasse(dados) {
  const r = await dialogo(`Subclasse de ${dados.nome}`, (corpo, ctx) => {
    ctx.valor = dados.subclasse.nome;
    const outra = entrada('', 'text', { placeholder: 'Nome de outra subclasse', maxLength: 60 });
    outra.className = 'sublinhado';
    outra.hidden = true;
    corpo.append(radios([[dados.subclasse.nome, dados.subclasse.nome, 'SRD'], ['', 'Outra (escrever)']], ctx.valor, (v) => {
      ctx.valor = v; outra.hidden = v !== ''; if (!outra.hidden) outra.focus();
    }), outra);
    ctx.outra = outra;
  }, [{ texto: 'Pular', valor: '' }, { texto: 'Aplicar', valor: (ctx) => ctx.valor || ctx.outra.value.trim() || undefined }]);
  return r;
}

// Características que a classe ganha num nível: as genéricas ("Característica de Subclasse",
// "Aumento no Valor de Atributo") viram as da subclasse do SRD ou somem (o talento já entra à parte).
function caracteristicasDoNivel(dados, nivel, subclasse) {
  if (!dados) return [];
  const n = dados.niveis.find(x => x.nivel === nivel);
  const lista = [];
  for (const c of (n ? n.caracteristicas : [])) {
    if (/Aumento no Valor de Atributo|Dádiva Épica/i.test(c.nome)) continue;
    if (/Característica de Subclasse/i.test(c.nome)) {
      if (subclasse === dados.subclasse.nome) lista.push(...dados.subclasse.caracteristicas.filter(s => s.nivel === nivel));
      else lista.push({ nome: `Característica de ${subclasse || 'Subclasse'}`, descricao: 'Característica da sua subclasse (fora do SRD): escreva o que ela faz.' });
      continue;
    }
    if (/^Subclasse de/i.test(c.nome) && subclasse) {
      lista.push({ nome: subclasse, descricao: c.descricao });
      if (subclasse === dados.subclasse.nome) lista.push(...dados.subclasse.caracteristicas.filter(s => s.nivel === nivel));
      continue;
    }
    lista.push(c);
  }
  return lista;
}

// Truques e magias preparadas somados das classes que conjuram (para mostrar o que mudou).
function contagemMagias() {
  let truques = 0, preparadas = 0;
  for (const c of p.classes) {
    const d = classeDoSRD(c.id);
    if (!d || !d.conjuracao) continue;
    truques += d.conjuracao.truques[c.nivel - 1] || 0;
    preparadas += d.conjuracao.preparadas[c.nivel - 1] || 0;
  }
  return { truques, preparadas };
}

// Espaços de magia, atributo e nível de conjurador seguem as classes do SRD.
function atualizarConjuracao() {
  const novos = espacosDasClasses(p.classes, D5);
  if (novos) p.espacos = aplicarEspacos(p.espacos, novos);
  const conjuradoras = p.classes.filter(c => { const d = classeDoSRD(c.id); return d && d.conjuracao; });
  if (conjuradoras.length) {
    p.conjuracao.nivel = conjuradoras.reduce((s, c) => s + c.nivel, 0);
    if (!p.magias.length) p.conjuracao.atributo = classeDoSRD(conjuradoras[0].id).conjuracao.atributo;
  }
}

// ---------- Classes (editar à mão) ----------
function editarClasse() {
  abrirFolha('Classes', (corpo) => {
    const linhas = [];
    const lista = el('div', 'lista-classes');
    const opcoes = [...D5.classes.map(c => [c.id, c.nome]), ['', 'Outra']];
    const novaLinha = (c) => {
      const linha = el('div', 'linha-classe');
      const sel = selecao(opcoes, c.id);
      const nome = entrada(c.nome, 'text', { maxLength: 40, placeholder: 'Nome da classe' });
      const nivel = entrada(c.nivel, 'number', { min: 1, max: 20, inputMode: 'numeric' });
      const dado = selecao(DADOS_DE_VIDA.map(d => [String(d), 'd' + d]), String(c.dadoVida));
      const sub = entrada(c.subclasse, 'text', { maxLength: 60, placeholder: 'Subclasse' });
      sel.addEventListener('change', () => {
        const d = classeDoSRD(sel.value);
        if (d) { nome.value = d.nome; dado.value = String(d.dadoVida); }
      });
      const tirar = el('button', 'tirar');
      tirar.type = 'button';
      tirar.setAttribute('aria-label', 'Tirar classe');
      tirar.append(icone('fechar'));
      tirar.addEventListener('click', () => { if (linhas.length > 1) { linhas.splice(linhas.indexOf(reg), 1); linha.remove(); } });
      const l1 = el('div', 'campos-lado'); l1.append(campo('Classe', sel), campo('Nível', nivel));
      const l2 = el('div', 'campos-lado'); l2.append(campo('Nome na ficha', nome), campo('Dado de Vida', dado));
      linha.append(l1, l2, campo('Subclasse', sub), tirar);
      const reg = { sel, nome, nivel, dado, sub, gastos: c.gastos };
      linhas.push(reg);
      lista.append(linha);
    };
    p.classes.forEach(novaLinha);
    const semNada = !p.caracteristicas.length && p.nivel === 1;
    const aplicar1 = marcar('Aplicar o nível 1: salvaguardas, PV, características e espaços de magia', semNada);
    const erro = el('p', 'erro');
    corpo.append(lista,
      linhaBotoes(botaoFolha('+ Classe (multiclasse)', '', () => novaLinha({ id: '', nome: '', nivel: 1, dadoVida: 8, subclasse: '', gastos: 0 }))),
      aplicar1,
      dica('Para subir um nível com PV, atributos e características novas, use ⋮ → Subir de nível.'),
      erro,
      linhaBotoes(botaoFolha('Salvar', 'principal', () => {
        const classes = linhas.map(r => {
          const d = classeDoSRD(r.sel.value);
          return { id: r.sel.value, nome: r.nome.value.trim() || (d ? d.nome : 'Classe'), nivel: numeroDe(r.nivel, 1),
            dadoVida: Number(r.dado.value), subclasse: r.sub.value.trim(), gastos: r.gastos || 0 };
        });
        if (classes.some(c => c.nivel < 1 || c.nivel > 20)) { erro.textContent = 'O nível de cada classe vai de 1 a 20.'; return; }
        if (classes.reduce((s, c) => s + c.nivel, 0) > 20) { erro.textContent = 'A soma dos níveis passa de 20.'; return; }
        const antes = structuredClone(p);
        p.classes = classes.map(c => ({ ...c, gastos: Math.min(c.gastos, c.nivel) }));
        p.nivel = nivelTotal(p.classes);
        if (aplicar1.caixa.checked) aplicarNivel1();
        atualizarConjuracao();
        salvar();
        fecharFolha(() => {
          desenhar();
          avisar('Classes salvas', 'Desfazer', () => { const i = personagens.indexOf(p); personagens[i] = antes; p = antes; salvar(); desenhar(true); });
        });
      })));
  });
}

// Personagem novo: o que a primeira classe dá no nível 1.
function aplicarNivel1() {
  const c = p.classes[0];
  const d = classeDoSRD(c.id);
  if (!d) return;
  p.salvaguardas = Object.fromEntries(d.salvaguardas.map(a => [a, true]));
  p.pvMax = Math.max(1, d.dadoVida + modDe(p, 'con'));
  p.pv = p.pvMax;
  if (d.conjuracao) p.conjuracao.atributo = d.conjuracao.atributo;
  for (const x of caracteristicasDoNivel(d, 1, c.subclasse)) p.caracteristicas.push({ nome: x.nome, origem: `${c.nome} 1`, descricao: x.descricao });
  if (d.armas) p.textos.profArmas = [p.textos.profArmas, d.armas].filter(Boolean).join('\n');
  if (d.armaduras) p.textos.profArmaduras = [p.textos.profArmaduras, d.armaduras].filter(Boolean).join('\n');
  if (d.ferramentas) p.textos.profFerramentas = [p.textos.profFerramentas, d.ferramentas].filter(Boolean).join('\n');
}

// ---------- Dados de Vida (um botão por classe) ----------
function folhaDadosVida() {
  abrirFolha('Dados de Vida', (corpo) => {
    const con = modDe(p, 'con');
    corpo.append(dica(`No descanso curto, cada dado gasto cura o valor rolado ${comSinal(con)} (Constituição). O descanso longo devolve todos.`));
    p.classes.forEach((c, i) => {
      const resta = c.nivel - c.gastos;
      const linha = el('div', 'linha-dv');
      linha.append(el('span', '', `${c.nome || 'Classe'}: ${resta} de ${c.nivel} (d${c.dadoVida})`));
      const gastar = botaoFolha(`Gastar 1d${c.dadoVida}${comSinal(con)}`, 'principal', () => {
        const antes = structuredClone(p);
        const rol = rolarExpr('Dado de Vida', `1d${c.dadoVida}${comSinal(con)}`);
        if (!rol) return;
        const cura = Math.max(0, rol.partes[0].res.total);
        p.classes[i].gastos += 1;
        p.pv = curar(p, cura);
        salvar();
        desenhar();
        avisar(`+${cura} PV (${p.pv}/${p.pvMax})`, 'Desfazer', () => {
          const k = personagens.indexOf(p); personagens[k] = antes; p = antes; salvar(); desenhar(true);
        });
      });
      gastar.disabled = !resta;
      const devolver = c.gastos ? botaoFolha('Devolver', '', () => { p.classes[i].gastos -= 1; salvar(); fecharFolha(() => desenhar()); }) : null;
      corpo.append(linha, linhaBotoes(gastar, devolver));
    });
  });
}
