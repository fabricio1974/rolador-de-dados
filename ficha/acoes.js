// Ficha de Personagem: página Ações — o que dá para fazer com Ação, Ação Bônus e Reação:
// armas, magias preparadas (pelo tempo de conjuração), características, poções do inventário
// e as ações que todo mundo tem (regras 2024). Também mostra o Portento do Adivinho.
'use strict';

// Ações de todo mundo (resumo das regras 2024 do SRD 5.2.1).
const ACOES_PADRAO = [
  ['Atacar', 'Faça um ataque com uma arma ou desarmado. Características como Ataque Extra dão mais ataques nesta mesma ação.'],
  ['Disparada', 'Você ganha movimento extra igual ao seu Deslocamento neste turno.'],
  ['Desengajar', 'Seu movimento não provoca Ataques de Oportunidade pelo resto do turno.'],
  ['Esquivar', 'Até o início do seu próximo turno, ataques contra você têm Desvantagem (se você vê o atacante) e você tem Vantagem em salvaguardas de Destreza. Acaba se você ficar Incapacitado ou com Deslocamento 0.'],
  ['Ajudar', 'Dê Vantagem ao próximo teste de um aliado numa perícia ou ferramenta em que você é proficiente, ou distraia um inimigo a até 1,5 m de você para dar Vantagem ao próximo ataque de um aliado contra ele. Vale até o início do seu próximo turno.'],
  ['Esconder-se', 'Teste de Destreza (Furtividade) CD 15, estando Densamente Obscurecido ou atrás de Cobertura de três quartos ou total, e fora da linha de visão dos inimigos. Sucesso: você fica Invisível enquanto escondido; o total do teste é a CD para te acharem.'],
  ['Influenciar', 'Teste de Carisma (Atuação, Enganação, Intimidação ou Persuasão) ou de Sabedoria (Adestrar Animais) para mudar a atitude de uma criatura.'],
  ['Magia', 'Conjure uma magia com tempo de conjuração de uma ação, ou use um item mágico ou característica que peça a ação Magia.'],
  ['Preparar', 'Escolha um gatilho e o que fazer quando ele acontecer (uma ação ou mover até seu Deslocamento); quando acontecer, você usa sua Reação. Magia preparada gasta o espaço na hora e pede Concentração até ser solta.'],
  ['Procurar', 'Teste de Sabedoria (Intuição, Medicina, Percepção ou Sobrevivência) para notar algo que não é óbvio.'],
  ['Estudar', 'Teste de Inteligência (Arcanismo, História, Investigação, Natureza ou Religião) para lembrar ou analisar algo.'],
  ['Utilizar', 'Use um objeto não mágico (abrir uma porta, acender uma tocha...). Itens mágicos usam a ação Magia.'],
];
const OPORTUNIDADE = 'Quando uma criatura que você vê sai do seu alcance, você pode usar sua Reação para fazer um ataque corpo a corpo contra ela. Não provoca quem usou Desengajar ou se teletransportou.';
const DUAS_ARMAS = 'Quando você ataca com uma arma Leve na ação Atacar, pode fazer um ataque extra com outra arma Leve como Ação Bônus (sem somar o modificador de atributo ao dano, se ele for positivo).';
// Poções de cura (regra 2024: beber ou dar uma poção é Ação Bônus).
const POCOES = [[/suprema/i, '10d4+20'], [/superior/i, '8d4+8'], [/maior/i, '4d4+4'], [/cura/i, '2d4+2']];

// Tempo de conjuração de uma magia da ficha: pelo SRD (ref ou nome) → acao / bonus / reacao / outro.
function tempoDaMagia(m) {
  const limpo = (t) => semAcento(t).replace(/\(.*?\)|['*]/g, '').replace(/\s+/g, ' ').trim();
  const srd = (m.ref && magiaDoSRD(m.ref)) || D5.magias.find(x => limpo(x.nome) === limpo(m.nome));
  const t = srd ? srd.tempo : 'Ação';
  if (/^Ação Bônus/i.test(t)) return 'bonus';
  if (/^Reação/i.test(t)) return 'reacao';
  if (/^Ação/i.test(t)) return 'acao';
  return 'outro';
}
// Tipo de ação de uma característica: o que a lista diz (subclasses extras) ou o texto dela.
function acaoDaCaracteristica(c) {
  for (const cl of D5.classes) for (const s of (cl.subclasses || [])) {
    const x = s.caracteristicas.find(f => f.nome === c.nome && f.acao !== undefined);
    if (x) return x.acao;
  }
  const d = c.descricao || '';
  if (/(como|usar|use|gastar) (uma |sua )?Ação Bônus/i.test(d)) return 'bonus';
  if (/(como|usar|use|gastar) (uma |sua )?Reação/i.test(d)) return 'reacao';
  if (/como uma ação\b|a ação Magia|como uma Ação\b/i.test(d)) return 'acao';
  return '';
}

const temPortento = () => p.caracteristicas.some(c => semAcento(c.nome) === 'portento');
// Rola os d20 do Portento (3 com Portento Maior) e guarda na ficha.
function rolarPortento() {
  const n = p.caracteristicas.some(c => semAcento(c.nome) === 'portento maior') ? 3 : 2;
  const rol = rolarExpr('Portento', `${n}d20`);
  if (!rol) return;
  p.portento = rol.partes[0].res.linhas[0].grupos[0].map(d => ({ valor: d.valor, usado: false }));
  salvar();
  desenhar();
}

function desenharAcoes() {
  const pg = $('pg-acoes');
  pg.replaceChildren();
  const secoes = { acao: [], bonus: [], reacao: [], livre: [] };
  const pilula = (titulo, sub, aoTocar, aoSegurar = null, classe = '') => {
    const filhos = [el('span', 'acao-nome encaixar', titulo)];
    if (sub) filhos.push(el('small', '', sub));
    return botao('pilula-acao' + (classe ? ' ' + classe : ''), filhos, aoTocar, aoSegurar);
  };

  // Armas: ação Atacar (toque rola ataque e dano, como na página de ataques).
  p.ataques.forEach((a, i) => secoes.acao.push(pilula(`Atacar: ${a.nome}`, `${comSinal(bonusAtaque(p, a))} · ${exprDano(p, a)} ${a.tipo}`.trim(), () => rolarAtaque(i), () => editarArma(i))));
  // Duas armas leves: o ataque extra é Ação Bônus.
  const leves = p.ataques.filter(a => /leve/i.test(semAcento(a.notas || '')));
  if (leves.length >= 2) secoes.bonus.push(pilula('Ataque com a 2ª arma Leve', leves.map(a => a.nome).join(', '), () => regraAcao('Ataque com duas armas Leves', DUAS_ARMAS)));
  // Magias preparadas (e truques), pelo tempo de conjuração.
  p.magias.forEach((m, i) => {
    if (!m.preparada && m.nivel > 0) return;
    const t = tempoDaMagia(m);
    if (t === 'outro') return;
    secoes[t].push(pilula(m.nome, m.nivel ? ORDINAIS[m.nivel] : 'Truque', () => folhaMagia(i), () => editarMagia(i), 'magia-acao'));
  });
  // Características com tipo de ação.
  p.caracteristicas.forEach((c, i) => {
    const t = acaoDaCaracteristica(c);
    if (t) secoes[t].push(pilula(c.nome, c.origem, () => verCaracteristica(i), () => verCaracteristica(i), 'carac-acao'));
  });
  // Poções no inventário: beber é Ação Bônus (cura rola sozinha e gasta uma).
  p.equipamentos.forEach((it, i) => {
    if (!/po[cç][aã]o/i.test(it.nome) || it.qtd <= 0) return;
    secoes.bonus.push(pilula(`Beber: ${it.nome}`, `×${it.qtd}`, () => beberPocao(i)));
  });

  // Portento (Adivinho): os d20 guardados, toque para marcar como usado.
  if (temPortento()) {
    const caixa = el('div', 'caixa-portento');
    const cab = el('div', 'portento-cab');
    cab.append(el('b', '', 'Portento'));
    const rolar = el('button', 'botao-android', p.portento.length ? 'Rolar de novo' : 'Rolar');
    rolar.type = 'button';
    rolar.addEventListener('click', rolarPortento);
    cab.append(rolar);
    const valores = el('div', 'portento-valores');
    if (!p.portento.length) valores.append(el('span', 'portento-vazio', 'Role ao terminar um descanso longo.'));
    p.portento.forEach((v, k) => {
      const b = el('button', 'portento-valor' + (v.usado ? ' usado' : ''), String(v.valor));
      b.type = 'button';
      b.setAttribute('aria-label', `Portento ${v.valor}${v.usado ? ' (usado)' : ''}`);
      b.addEventListener('click', () => comDesfazer(v.usado ? `Portento ${v.valor} de volta` : `Portento ${v.valor} usado`, () => { p.portento[k].usado = !v.usado; }));
      valores.append(b);
    });
    caixa.append(cab, valores);
    pg.append(caixa);
  }

  // Atalhos no topo: pula direto para Ação, Ação Bônus ou Reação (a lista de Ação pode ser longa).
  const atalhos = el('div', 'atalhos-acao');
  for (const [id, titulo] of [['acao', 'Ação'], ['bonus', 'Bônus'], ['reacao', 'Reação']]) {
    const b = el('button', 'atalho-acao ' + id);
    b.type = 'button';
    b.append(titulo, el('small', '', String(secoes[id].length)));
    b.addEventListener('click', () => { const alvo = pg.querySelector('.secao-acao.' + id); if (alvo) pg.scrollTo({ top: alvo.offsetTop - 6, behavior: 'smooth' }); });
    atalhos.append(b);
  }
  pg.append(atalhos);
  const secao = (id, titulo, itens, extras = null) => {
    const cab = el('div', 'secao-acao ' + id);
    cab.append(el('span', '', titulo));
    pg.append(cab);
    const lista = el('div', 'lista-acoes');
    if (!itens.length && !extras) lista.append(el('p', 'acao-vazia', 'Nada por enquanto.'));
    lista.append(...itens);
    if (extras) lista.append(extras);
    pg.append(lista);
  };
  const padrao = el('div', 'acoes-padrao');
  for (const [nome, regra] of ACOES_PADRAO) {
    const b = el('button', 'chip-acao', nome);
    b.type = 'button';
    b.addEventListener('click', () => regraAcao(nome, regra));
    padrao.append(b);
  }
  secao('acao', 'Ação', secoes.acao, padrao);
  secao('bonus', 'Ação Bônus', secoes.bonus);
  const oportunidade = el('div', 'acoes-padrao');
  const op = el('button', 'chip-acao', 'Ataque de Oportunidade');
  op.type = 'button';
  op.addEventListener('click', () => regraAcao('Ataque de Oportunidade', OPORTUNIDADE));
  oportunidade.append(op);
  secao('reacao', 'Reação', secoes.reacao, oportunidade);
  if (secoes.livre.length) secao('livre', 'Sem ação', secoes.livre);
}

function regraAcao(nome, texto) {
  dialogo(nome, (corpo) => corpo.append(el('p', 'regra-acao', texto)), [{ texto: 'OK', valor: true }]);
}

async function beberPocao(i) {
  const it = p.equipamentos[i];
  const cura = POCOES.find(([re]) => re.test(it.nome));
  const ok = await dialogo(`Beber ${it.nome}?`, (corpo) => corpo.append(el('p', 'dialogo-dica',
    `Ação Bônus. Restam ${it.qtd}.` + (cura ? ` Cura ${cura[1]}.` : ''))), [{ texto: 'Cancelar', valor: false }, { texto: 'Beber', valor: true }]);
  if (!ok) return;
  const antes = structuredClone(p);
  p.equipamentos[i].qtd -= 1;
  let msg = `${it.nome}: restam ${p.equipamentos[i].qtd}`;
  if (cura) {
    const rol = rolarExpr(it.nome, cura[1]);
    if (rol) { const n = rol.partes[0].res.total; p.pv = curar(p, n); msg = `+${n} PV (${p.pv}/${p.pvMax}) · ${msg}`; }
  }
  salvar();
  desenhar();
  avisar(msg, 'Desfazer', () => { const k = personagens.indexOf(p); personagens[k] = antes; p = antes; salvar(); desenhar(true); });
}
