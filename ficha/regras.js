// Ficha de Personagem: regras e dados, sem mexer na tela.
// Funções PURAS (recebem dados e devolvem dados), por isso o ficha/testes.js consegue
// testar tudo no Node. As contas seguem o D&D 2024 (5.5).

const ATRIBUTOS = [
  { id: 'for', nome: 'Força' },
  { id: 'des', nome: 'Destreza' },
  { id: 'con', nome: 'Constituição' },
  { id: 'int', nome: 'Inteligência' },
  { id: 'sab', nome: 'Sabedoria' },
  { id: 'car', nome: 'Carisma' },
];
const NOME_ATRIBUTO = Object.fromEntries(ATRIBUTOS.map(a => [a.id, a.nome]));

// As 18 perícias (nomes do Livro do Jogador 2024 em português), por atributo.
const PERICIAS = [
  { id: 'atletismo', nome: 'Atletismo', atr: 'for' },
  { id: 'acrobacia', nome: 'Acrobacia', atr: 'des' },
  { id: 'furtividade', nome: 'Furtividade', atr: 'des' },
  { id: 'prestidigitacao', nome: 'Prestidigitação', atr: 'des' },
  { id: 'arcanismo', nome: 'Arcanismo', atr: 'int' },
  { id: 'historia', nome: 'História', atr: 'int' },
  { id: 'investigacao', nome: 'Investigação', atr: 'int' },
  { id: 'natureza', nome: 'Natureza', atr: 'int' },
  { id: 'religiao', nome: 'Religião', atr: 'int' },
  { id: 'adestrar', nome: 'Adestrar Animais', atr: 'sab' },
  { id: 'intuicao', nome: 'Intuição', atr: 'sab' },
  { id: 'medicina', nome: 'Medicina', atr: 'sab' },
  { id: 'percepcao', nome: 'Percepção', atr: 'sab' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', atr: 'sab' },
  { id: 'atuacao', nome: 'Atuação', atr: 'car' },
  { id: 'enganacao', nome: 'Enganação', atr: 'car' },
  { id: 'intimidacao', nome: 'Intimidação', atr: 'car' },
  { id: 'persuasao', nome: 'Persuasão', atr: 'car' },
];
// Na tela de perícias: coluna da esquerda e da direita (Constituição não tem perícia).
const COLUNAS_PERICIAS = [['for', 'des', 'int'], ['sab', 'car']];
const NIVEIS_PERICIA = ['Sem proficiência', 'Proficiente', 'Especialista'];

const DADOS_DE_VIDA = [6, 8, 10, 12];
const MOEDAS = [
  { id: 'pl', nome: 'PL' }, { id: 'po', nome: 'PO' }, { id: 'pe', nome: 'PE' },
  { id: 'pp', nome: 'PP' }, { id: 'pc', nome: 'PC' },
];
const TEXTOS = [
  { id: 'caracteristicas', nome: 'Características' },
  { id: 'profArmaduras', nome: 'Proficiência em Armaduras' },
  { id: 'profArmas', nome: 'Proficiência em Armas' },
  { id: 'profFerramentas', nome: 'Proficiência em Ferramentas' },
  { id: 'idiomas', nome: 'Idiomas' },
  { id: 'equipamento', nome: 'Equipamento' },
];
const TEXTOS_FINAIS = [
  { id: 'personalidade', nome: 'Traços de Personalidade' },
  { id: 'ideais', nome: 'Ideais' },
  { id: 'vinculos', nome: 'Vínculos' },
  { id: 'defeitos', nome: 'Defeitos' },
  { id: 'notas', nome: 'Anotações' },
];

// ---------- Contas ----------
const modificador = (valor) => Math.floor((valor - 10) / 2);
// Bônus de proficiência pelo nível: +2 (1–4), +3 (5–8), +4 (9–12), +5 (13–16), +6 (17–20).
const proficiencia = (nivel) => Math.ceil(Math.min(20, Math.max(1, nivel)) / 4) + 1;
// "+3", "-1", "+0": o jeito de mostrar e também de juntar numa expressão de dados.
const comSinal = (n) => (n < 0 ? '-' : '+') + Math.abs(n);

const modDe = (p, atr) => modificador(p.atributos[atr]);
const profDe = (p) => proficiencia(p.nivel);
// Salvaguarda: modificador + proficiência (se tiver) + bônus extra do atributo + um atributo
// somado em todas (ex.: Aura de Proteção do Paladino soma Carisma).
const salvaguarda = (p, atr) => modDe(p, atr) + (p.salvaguardas[atr] ? profDe(p) : 0) +
  (p.salvaguardasBonus[atr] || 0) + (p.salvaguardaExtra ? Math.max(1, modDe(p, p.salvaguardaExtra)) : 0);
const pericia = (p, id) => {
  const def = PERICIAS.find(x => x.id === id);
  return modDe(p, def.atr) + profDe(p) * (p.pericias[id] || 0) + (p.periciasBonus[id] || 0);
};
// Iniciativa: Destreza + bônus extra + proficiência (inteira ou metade, arredondada para baixo)
// + outro atributo (algumas características somam um segundo modificador).
const iniciativa = (p) => modDe(p, 'des') + p.iniciativaBonus + Math.floor(profDe(p) * p.iniciativaProf) +
  (p.iniciativaAtributo ? modDe(p, p.iniciativaAtributo) : 0);

// ---------- Classe de Armadura ----------
// Tipo de armadura: até quanto da Destreza conta (leve: tudo; média: até 2; pesada: nada).
const TIPOS_ARMADURA = [
  ['nenhuma', 'Nenhuma', 10], ['leve', 'Leve', 10], ['media', 'Média', 2], ['pesada', 'Pesada', 0],
];
const maxDestreza = (tipo) => (TIPOS_ARMADURA.find(t => t[0] === tipo) || TIPOS_ARMADURA[0])[2];
function classeArmaduraDe(p) {
  const a = p.armadura;
  return a.base + a.escudo + Math.min(modDe(p, 'des'), maxDestreza(a.tipo)) +
    (a.extra ? modDe(p, a.extra) : 0) + a.mod;
}
// Deslocamento: andar, voo, natação, escalada e escavação (base + modificador, em metros).
const TIPOS_DESLOCAMENTO = [['andar', 'Andar'], ['voo', 'Voo'], ['natacao', 'Natação'], ['escavacao', 'Escavação'], ['escalada', 'Escalada']];
const deslocamentoDe = (p, tipo = 'andar') => Math.max(0, p.deslocamentos[tipo].base + p.deslocamentos[tipo].mod);
// "9" ou "4,5": metros com vírgula.
const metros = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
// Lê "9 m", "30 pés", "4,5" → metros. Só número grande (20+) sem "m" é tratado como pés.
function lerMetros(t) {
  const s = String(t ?? '').toLowerCase();
  const n = parseFloat(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (/p[eé]s|ft|feet/.test(s) || (n >= 20 && !/\bm\b|metro/.test(s))) return Math.round(n * 0.3 * 10) / 10;
  return n;
}

// ---------- Recursos de classe (Fúria, Inspiração de Bardo, Sorte...) ----------
const restanteRecurso = (r) => Math.max(0, r.max - r.usados);
// O que aparece na caixa: "2d20" (2 restantes de d20), "3" ou o máximo se for fixo.
const textoRecurso = (r) => {
  const n = r.gastavel ? restanteRecurso(r) : r.max;
  return r.dado ? `${n}d${r.dado}` : String(n);
};
function descansarRecursos(recursos, longo) {
  return recursos.map(r => {
    if (!r.gastavel) return r;
    if (r.reset === 'curto' || (longo && r.reset === 'longo')) return { ...r, usados: 0 };
    const volta = longo ? r.recLongo : r.recCurto;
    return { ...r, usados: Math.max(0, r.usados - volta) };
  });
}
// Percepção passiva: 10 + Percepção (aparece na ajuda da perícia).
const percepcaoPassiva = (p) => 10 + pericia(p, 'percepcao');

// Ataque com arma: atributo + proficiência (se tiver) + bônus extra (arma mágica +1...).
function bonusAtaque(p, a) {
  return (a.atributo ? modDe(p, a.atributo) : 0) + (a.prof ? profDe(p) : 0) + a.bonus;
}
// Dano: os dados da arma + o modificador do atributo (se somar) + bônus extra.
// "1d12+1d4" com Destreza +3 e bônus +1 vira "1d12+1d4+4".
function exprDano(p, a) {
  const extra = (a.somarMod && a.atributo ? modDe(p, a.atributo) : 0) + a.bonusDano;
  const dados = a.dano.trim();
  if (!dados) return String(extra);
  return extra ? dados + comSinal(extra) : dados;
}

const ataqueMagia = (p) => profDe(p) + modDe(p, p.conjuracao.atributo) + p.conjuracao.bonusAtaque;
const cdMagia = (p) => 8 + profDe(p) + modDe(p, p.conjuracao.atributo) + p.conjuracao.bonusCD;
// Tipos de espaços de magia (a caixa "Espaços" do diálogo de conjuração).
const TIPOS_ESPACOS = [
  ['auto', 'Pelas classes'], ['completo', 'Conjurador completo'], ['meio', 'Meio conjurador'],
  ['terco', 'Um terço'], ['pacto', 'Magia de Pacto'], ['manual', 'Manual'],
];
// Espaços pelo tipo e pelo nível de conjurador ("auto" usa as classes; "manual" não mexe).
function espacosPorTipo(p, dados) {
  const t = p.conjuracao.espacosTipo, n = p.conjuracao.nivel;
  if (t === 'manual') return null;
  if (t === 'auto') return espacosDasClasses(p.classes, dados);
  if (t === 'pacto') {
    const bruxo = dados && dados.classes.find(c => c.conjuracao && c.conjuracao.tipo === 'pacto');
    if (!bruxo || !n) return {};
    return { [bruxo.conjuracao.nivelPacto[n - 1]]: bruxo.conjuracao.espacosPacto[n - 1] };
  }
  const nivelConj = t === 'completo' ? n : t === 'meio' ? Math.ceil(n / 2) : Math.ceil(n / 3);
  const r = {};
  (ESPACOS_COMPLETO[Math.min(20, nivelConj)] || []).forEach((q, i) => { r[i + 1] = q; });
  return r;
}
// O que rolar ao tocar em "Rolar" numa magia (vazio = nada para rolar).
function exprMagia(p, m) {
  let r = m.rolagem.trim();
  if (m.nivel === 0 && m.escala) r = escalarDados(r, escalaTruque(p.nivel));
  if (m.somarMod && r) {
    const mod = modDe(p, p.conjuracao.atributo);
    r = r.split(';').map((parte, i) => (i === 0 ? parte + comSinal(mod) : parte)).join(';');
  }
  if (!m.ataque) return r;
  const atq = 'Ataque: 1d20' + comSinal(ataqueMagia(p));
  if (!r) return atq;
  return atq + '; ' + (r.includes(':') ? r : 'Dano: ' + r);
}

// Vida: dano gasta primeiro os PV temporários; cura não passa do máximo.
function sofrerDano(p, dano) {
  const temp = Math.min(p.pvTemp, dano);
  return { pvTemp: p.pvTemp - temp, pv: Math.max(0, p.pv - (dano - temp)) };
}
const curar = (p, cura) => Math.min(p.pvMax, p.pv + cura);

// ---------- Classes (multiclasse: cada classe com seu nível e seu Dado de Vida) ----------
const nivelTotal = (classes) => Math.min(20, classes.reduce((s, c) => s + c.nivel, 0));
const dadosDeVidaRestantes = (p) => p.classes.reduce((s, c) => s + Math.max(0, c.nivel - c.gastos), 0);
// "2d6" ou, com multiclasse, "2d6+1d10" (os que ainda restam).
function textoDadosDeVida(p) {
  const por = {};
  for (const c of p.classes) por[c.dadoVida] = (por[c.dadoVida] || 0) + Math.max(0, c.nivel - c.gastos);
  const partes = Object.entries(por).filter(([, n]) => n).sort((a, b) => b[0] - a[0]).map(([d, n]) => `${n}d${d}`);
  return partes.join('+') || `0d${p.classes[0].dadoVida}`;
}
const classeENivelDe = (p) => p.classes.map(c => `${c.nome || 'Classe'} ${c.nivel}`).join(' / ');

// Acha a classe do SRD pelo nome escrito (em português ou inglês, masculino ou feminino).
const PREFIXOS_CLASSE = [
  ['barb', 'barbaro'], ['bard', 'bardo'], ['cler', 'clerigo'], ['drui', 'druida'], ['guer', 'guerreiro'], ['figh', 'guerreiro'],
  ['mon', 'monge'], ['pala', 'paladino'], ['patr', 'patrulheiro'], ['rang', 'patrulheiro'], ['ladi', 'ladino'], ['rogu', 'ladino'],
  ['feit', 'feiticeiro'], ['sorc', 'feiticeiro'], ['brux', 'bruxo'], ['warl', 'bruxo'], ['mag', 'mago'], ['wiza', 'mago'],
];
function acharClasse(nome) {
  const n = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const achado = PREFIXOS_CLASSE.find(([pre]) => n.startsWith(pre));
  return achado ? achado[1] : '';
}

// Espaços de magia de um conjurador completo pelo nível de conjurador (1–20).
const ESPACOS_COMPLETO = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
// Nível de conjurador somado (regra de multiclasse 2024): completo conta inteiro, meio
// conjurador (Paladino, Patrulheiro) conta metade arredondada para cima. Bruxo (Magia de
// Pacto) é à parte e soma os espaços dele no nível do pacto.
// Devolve { 1: max, 2: max, ... } ou null se nenhuma classe conjura.
function espacosDasClasses(classes, dados) {
  let nivelConj = 0, conjura = false;
  const pacto = {};
  for (const c of classes) {
    const d = dados && dados.classes.find(x => x.id === c.id);
    const conj = d && d.conjuracao;
    if (!conj) continue;
    conjura = true;
    if (conj.tipo === 'completa') nivelConj += c.nivel;
    else if (conj.tipo === 'meia') nivelConj += Math.ceil(c.nivel / 2);
    else if (conj.tipo === 'pacto' && conj.espacosPacto) {
      const i = Math.min(20, c.nivel) - 1;
      const n = conj.nivelPacto[i];
      if (n) pacto[n] = (pacto[n] || 0) + conj.espacosPacto[i];
    }
  }
  if (!conjura) return null;
  const espacos = {};
  (ESPACOS_COMPLETO[Math.min(20, nivelConj)] || []).forEach((q, i) => { espacos[i + 1] = q; });
  for (const [n, q] of Object.entries(pacto)) espacos[n] = (espacos[n] || 0) + q;
  return espacos;
}
// Troca os máximos de espaços mantendo os já gastos (sem passar do novo máximo).
function aplicarEspacos(atuais, novos) {
  const r = {};
  for (const [n, max] of Object.entries(novos)) if (max) r[n] = { max, usados: Math.min(max, (atuais[n] || {}).usados || 0) };
  return r;
}
// A classe ganha Aumento no Valor de Atributo (ou Dádiva Épica) neste nível?
function ganhaAumento(classeDados, nivel) {
  const n = classeDados && classeDados.niveis.find(x => x.nivel === nivel);
  return !!n && n.caracteristicas.some(c => /Aumento no Valor de Atributo|Dádiva Épica/i.test(c.nome));
}
// Aumento de atributos: um atributo +2 ou dois +1 (sem passar de "max", 20 normalmente).
function aplicarAumento(atributos, escolhidos, max = 20) {
  const novo = { ...atributos };
  const qtd = escolhidos.length === 1 ? 2 : 1;
  for (const a of escolhidos.slice(0, 2)) novo[a] = Math.min(max, novo[a] + qtd);
  return novo;
}
// Truques ficam mais fortes nos níveis 5, 11 e 17 do personagem (mais dados).
const escalaTruque = (nivel) => 1 + (nivel >= 5) + (nivel >= 11) + (nivel >= 17);
function escalarDados(expr, vezes) {
  if (vezes <= 1) return expr;
  return expr.split(';').map(parte => parte.replace(/(\d*)d(\d+)/, (m, q, f) => `${(Number(q) || 1) * vezes}d${f}`)).join(';');
}
// Descanso longo (2024): PV cheios, PV temporários acabam, espaços de magia voltam e
// recupera todos os Dados de Vida gastos.
function descansoLongo(p) {
  const espacos = {};
  for (const [n, e] of Object.entries(p.espacos)) espacos[n] = { ...e, usados: 0 };
  return { ...p, pv: p.pvMax, pvTemp: 0, classes: p.classes.map(c => ({ ...c, gastos: 0 })), espacos, recursos: descansarRecursos(p.recursos, true) };
}
// Ganho de PV ao subir de nível: média do dado de vida (arredondada para cima) + CON.
const mediaDadoVida = (d) => d / 2 + 1;
const ganhoDeNivel = (p, rolado = null, dado = p.classes[0].dadoVida) => Math.max(1, (rolado ?? mediaDadoVida(dado)) + modDe(p, 'con'));

const ORDINAIS = ['Truques', '1º Nível', '2º Nível', '3º Nível', '4º Nível', '5º Nível', '6º Nível', '7º Nível', '8º Nível', '9º Nível'];

// ---------- Personagem novo e conferência do que vem do armazenamento ----------
function novoPersonagem(nome = 'Novo personagem') {
  return limparPersonagem({ nome });
}
const novoId = () => 'p-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

const inteiro = (v, padrao, min, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};
const texto = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

function limparAtaque(a) {
  a = a && typeof a === 'object' ? a : {};
  return {
    nome: texto(a.nome, 60) || 'Arma',
    alcance: texto(a.alcance, 30),
    tipo: texto(a.tipo, 30),
    atributo: ['', ...ATRIBUTOS.map(x => x.id)].includes(a.atributo) ? a.atributo : 'for',
    prof: a.prof !== false,
    bonus: inteiro(a.bonus, 0, -20, 30),
    dano: texto(a.dano, 60),
    somarMod: a.somarMod !== false,
    bonusDano: inteiro(a.bonusDano, 0, -20, 50),
    notas: texto(a.notas, 400),         // propriedades e maestria (ex.: Versátil (1d10) · Maestria: Drenar)
  };
}

function limparRecurso(r) {
  const max = inteiro(r.max, 1, 0, 99);
  return {
    nome: texto(r.nome, 40) || 'Recurso',
    texto: texto(r.texto, 20) || texto(r.nome, 20) || 'Recurso',
    max,
    dado: [0, 2, 3, 4, 6, 8, 10, 12, 20, 100].includes(Number(r.dado)) ? Number(r.dado) : 0,
    gastavel: r.gastavel !== false,
    reset: ['curto', 'longo', 'nunca'].includes(r.reset) ? r.reset : 'longo',
    recCurto: inteiro(r.recCurto, 0, 0, 99),
    recLongo: inteiro(r.recLongo, 0, 0, 99),
    usados: inteiro(r.usados, 0, 0, max),
  };
}
const bonusPor = (x, ids) => {
  const r = {};
  for (const id of ids) { const n = inteiro(x && x[id], 0, -30, 30); if (n) r[id] = n; }
  return r;
};

function limparMagia(m) {
  m = m && typeof m === 'object' ? m : {};
  return {
    nome: texto(m.nome, 80) || 'Magia',
    nivel: inteiro(m.nivel, 0, 0, 9),
    preparada: m.preparada !== false,
    ataque: m.ataque === true,          // rola o Ataque Mágico (1d20 + bônus) antes do dano
    escala: m.escala === true,          // truque que ganha dados nos níveis 5, 11 e 17
    somarMod: m.somarMod === true,      // soma o modificador de conjuração na 1ª parte (curas)
    salvaguarda: NOME_ATRIBUTO[m.salvaguarda] ? m.salvaguarda : '',
    ref: texto(m.ref, 60),              // id da magia no SRD (para mostrar a descrição)
    rolagem: texto(m.rolagem, 120),
    notas: texto(m.notas, 2000),
  };
}

// Tudo passa por aqui: dado estragado ou de versão antiga não quebra a tela.
function limparPersonagem(x) {
  x = x && typeof x === 'object' ? x : {};
  const atributos = {};
  for (const a of ATRIBUTOS) atributos[a.id] = inteiro(x.atributos && x.atributos[a.id], 10, 1, 30);
  const salvaguardas = {};
  for (const a of ATRIBUTOS) if (x.salvaguardas && x.salvaguardas[a.id]) salvaguardas[a.id] = true;
  const pericias = {};
  for (const s of PERICIAS) {
    const n = inteiro(x.pericias && x.pericias[s.id], 0, 0, 2);
    if (n) pericias[s.id] = n;
  }
  // Classes: lista nova; fichas antigas tinham classe/nivel/dadoVida soltos.
  let classes = Array.isArray(x.classes) ? x.classes.filter(c => c && typeof c === 'object').slice(0, 12) : [];
  if (!classes.length) classes = [{ id: acharClasse(x.classe), nome: x.classe, nivel: x.nivel, dadoVida: x.dadoVida, gastos: x.dadosVidaGastos }];
  classes = classes.map(c => {
    const nv = inteiro(c.nivel, 1, 1, 20);
    return {
      id: typeof c.id === 'string' ? c.id.slice(0, 30) : '',
      nome: texto(c.nome, 40),
      nivel: nv,
      dadoVida: DADOS_DE_VIDA.includes(Number(c.dadoVida)) ? Number(c.dadoVida) : 8,
      subclasse: texto(c.subclasse, 60),
      gastos: inteiro(c.gastos, 0, 0, nv),
    };
  });
  // O total não passa de 20: corta os níveis do fim.
  while (classes.reduce((s, c) => s + c.nivel, 0) > 20) {
    const ultima = classes[classes.length - 1];
    if (ultima.nivel > 1) ultima.nivel -= 1; else classes.pop();
  }
  const nivel = nivelTotal(classes);
  const pvMax = inteiro(x.pvMax, 10, 1, 9999);
  const espacos = {};
  for (let n = 1; n <= 9; n++) {
    const e = x.espacos && x.espacos[n];
    const max = inteiro(e && e.max, 0, 0, 20);
    if (max) espacos[n] = { max, usados: inteiro(e.usados, 0, 0, max) };
  }
  const moedas = {};
  for (const m of MOEDAS) moedas[m.id] = inteiro(x.moedas && x.moedas[m.id], 0, 0, 1e9);
  const textos = {};
  for (const t of [...TEXTOS, ...TEXTOS_FINAIS]) textos[t.id] = texto(x.textos && x.textos[t.id], 20000);
  // Classe de Armadura: fichas antigas tinham só o número (vira "Nenhuma" + modificador).
  const des = modificador(atributos.des);
  const arm = x.armadura && typeof x.armadura === 'object' ? x.armadura : { mod: inteiro(x.ca, 10, 0, 50) - 10 - des };
  const armadura = {
    base: inteiro(arm.base, 10, 0, 30),
    escudo: inteiro(arm.escudo, 0, 0, 10),
    tipo: TIPOS_ARMADURA.some(t => t[0] === arm.tipo) ? arm.tipo : 'nenhuma',
    extra: NOME_ATRIBUTO[arm.extra] ? arm.extra : '',
    mod: inteiro(arm.mod, 0, -30, 30),
    nome: texto(arm.nome, 60),
  };
  // Deslocamentos: fichas antigas tinham um texto ("9 m").
  const desl = x.deslocamentos && typeof x.deslocamentos === 'object' ? x.deslocamentos : { andar: { base: lerMetros(x.deslocamento) ?? 9 } };
  const deslocamentos = {};
  for (const [t] of TIPOS_DESLOCAMENTO) {
    const d = desl[t] && typeof desl[t] === 'object' ? desl[t] : {};
    const base = Number(d.base), mod = Number(d.mod);
    deslocamentos[t] = { base: Number.isFinite(base) ? Math.min(300, Math.max(0, base)) : 0, mod: Number.isFinite(mod) ? Math.min(300, Math.max(-300, mod)) : 0 };
  }
  // Recursos de classe: fichas antigas tinham uma "rolagem rápida" (ex.: Sorte 2d20).
  let recursos = Array.isArray(x.recursos) ? x.recursos : null;
  if (!recursos) {
    const at = x.atalho && typeof x.atalho === 'object' ? x.atalho : { nome: 'Sorte', expr: '2d20' };
    const m = String(at.expr || '').match(/^\s*(\d+)d(\d+)\s*$/);
    recursos = [m ? { nome: at.nome, texto: at.nome, max: Number(m[1]), dado: Number(m[2]), gastavel: true, reset: 'longo' }
      : { nome: at.nome || 'Recurso', texto: at.nome || 'Recurso', max: 1, dado: 0, gastavel: true, reset: 'longo' }];
  }
  recursos = recursos.filter(r => r && typeof r === 'object').slice(0, 20).map(limparRecurso);
  const conj = x.conjuracao && typeof x.conjuracao === 'object' ? x.conjuracao : {};
  return {
    id: typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : novoId(),
    nome: texto(x.nome, 60) || 'Sem nome',
    classes,
    nivel,
    raca: texto(x.raca, 60),
    antecedente: texto(x.antecedente, 60),
    alinhamento: texto(x.alinhamento, 60),
    xp: inteiro(x.xp, 0, 0, 1e9),
    pvMax,
    pv: inteiro(x.pv, pvMax, 0, pvMax),
    pvTemp: inteiro(x.pvTemp, 0, 0, 9999),
    armadura,
    deslocamentos,
    iniciativaBonus: inteiro(x.iniciativaBonus, 0, -20, 30),
    iniciativaProf: [0, 0.5, 1].includes(Number(x.iniciativaProf)) ? Number(x.iniciativaProf) : 0,
    iniciativaAtributo: NOME_ATRIBUTO[x.iniciativaAtributo] ? x.iniciativaAtributo : '',
    atributos, salvaguardas, pericias,
    salvaguardasBonus: bonusPor(x.salvaguardasBonus, ATRIBUTOS.map(a => a.id)),
    salvaguardaExtra: NOME_ATRIBUTO[x.salvaguardaExtra] ? x.salvaguardaExtra : '',
    periciasBonus: bonusPor(x.periciasBonus, PERICIAS.map(s => s.id)),
    recursos,
    recursoDestaque: inteiro(x.recursoDestaque, 0, 0, Math.max(0, recursos.length - 1)),
    atributoDestaque: NOME_ATRIBUTO[x.atributoDestaque] ? x.atributoDestaque : 'des',
    ataques: Array.isArray(x.ataques) ? x.ataques.slice(0, 40).map(limparAtaque) : [],
    conjuracao: {
      atributo: NOME_ATRIBUTO[conj.atributo] ? conj.atributo : 'int',
      nivel: inteiro(conj.nivel, nivel, 0, 20),
      bonusAtaque: inteiro(conj.bonusAtaque, 0, -20, 30),
      bonusCD: inteiro(conj.bonusCD, 0, -20, 30),
      espacosTipo: TIPOS_ESPACOS.some(t => t[0] === conj.espacosTipo) ? conj.espacosTipo : 'auto',
    },
    espacos,
    magias: Array.isArray(x.magias) ? x.magias.slice(0, 300).map(limparMagia) : [],
    moedas, textos,
    // Características ganhas (classe, espécie, antecedente, talentos), cada uma com sua descrição.
    caracteristicas: Array.isArray(x.caracteristicas) ? x.caracteristicas.filter(c => c && typeof c === 'object').slice(0, 300).map(c => ({
      nome: texto(c.nome, 80) || 'Característica', origem: texto(c.origem, 60), descricao: texto(c.descricao, 6000),
    })) : [],
  };
}

// Personagem de exemplo (o que aparece na primeira vez): Pandora, Maga nível 2.
function exemploPandora() {
  return limparPersonagem({
    nome: 'Pandora', classes: [{ id: 'mago', nome: 'Maga', nivel: 2, dadoVida: 6 }], raca: 'Humana', antecedente: 'Personalizado',
    pvMax: 25, pv: 25, ca: 17, deslocamento: '9 m',
    atributos: { for: 8, des: 16, con: 14, int: 16, sab: 12, car: 8 },
    salvaguardas: { int: true, sab: true },
    pericias: { percepcao: 1, sobrevivencia: 1, arcanismo: 2, historia: 1, investigacao: 1 },
    atributoDestaque: 'des',
    atalho: { nome: 'Sorte', expr: '2d20' },
    ataques: [
      { nome: 'Espada Longa', alcance: '1,5 m', tipo: 'Cortante', atributo: 'for', dano: '1d8' },
      { nome: 'Adaga', alcance: '6/18 m', tipo: 'Perfurante', atributo: 'des', dano: '1d4' },
      { nome: 'Arco Curto', alcance: '24/96 m', tipo: 'Perfurante', atributo: 'des', dano: '1d6' },
      { nome: 'Katana', alcance: '1,5 m', tipo: 'Cortante', atributo: 'des', dano: '1d4' },
      { nome: 'Katana', alcance: '1,5 m', tipo: 'Cortante', atributo: 'des', bonus: 1, dano: '1d12+1d4', bonusDano: 1 },
    ],
    conjuracao: { atributo: 'int', nivel: 2 },
    espacos: { 1: { max: 3, usados: 0 } },
    magias: [
      { nome: 'Prestidigitação (V, S)', nivel: 0 },
      { nome: 'Raio de Gelo (V, S)', nivel: 0, ataque: true, rolagem: '1d8' },
      { nome: 'Proteção Contra Lâminas', nivel: 0, preparada: false },
      { nome: 'Orientação (V, S)', nivel: 0, rolagem: '1d4' },
      { nome: 'Badalar Fúnebre (V, S)', nivel: 0, rolagem: '1d8' },
      { nome: 'Trovão (S)', nivel: 0, rolagem: '1d6' },
      { nome: 'Convocar Familiar (V, S, M) - 10 PO', nivel: 1, preparada: false },
      { nome: 'Escudo Arcano (V, S)', nivel: 1 },
      { nome: 'Faca de Gelo (S, M)', nivel: 1, ataque: true, rolagem: 'Dano: 1d10; Explosão: 2d6' },
      { nome: 'Orbe Cromático (V, S)', nivel: 1, ataque: true, rolagem: '3d8' },
      { nome: 'Mãos Flamejantes (V, S)', nivel: 1, rolagem: '3d6' },
      { nome: 'Escudo da Fé (V, S, M, C)', nivel: 1 },
      { nome: 'Disco Flutuante de Tenser (V, S, M, R)', nivel: 1, preparada: false },
      { nome: 'Compreender Idiomas (V, S, M)', nivel: 1, preparada: false },
      { nome: 'Mísseis Mágicos', nivel: 1, rolagem: '3×(1d4+1)' },
    ],
    textos: {
      profArmas: 'Armas simples.',
      profFerramentas: 'Ferramentas de calígrafo.',
      idiomas: 'Comum, Élfico, Pequenino.',
    },
  });
}

// Lê o que foi importado: um personagem, uma lista ou o backup inteiro do app.
function lerImportacao(dados) {
  let lista;
  if (Array.isArray(dados)) lista = dados;
  else if (dados && Array.isArray(dados.personagens)) lista = dados.personagens;
  else if (dados && typeof dados === 'object' && dados.atributos) lista = [dados];
  else throw new Error('Esse arquivo não é uma ficha.');
  const limpos = lista.filter(x => x && typeof x === 'object').map(limparPersonagem);
  if (!limpos.length) throw new Error('Esse arquivo não tem nenhuma ficha.');
  return limpos;
}

if (typeof module !== 'undefined') {
  module.exports = {
    ATRIBUTOS, NOME_ATRIBUTO, PERICIAS, COLUNAS_PERICIAS, NIVEIS_PERICIA, DADOS_DE_VIDA, MOEDAS, TEXTOS, TEXTOS_FINAIS, ORDINAIS,
    modificador, proficiencia, comSinal, modDe, profDe, salvaguarda, pericia, iniciativa, percepcaoPassiva,
    bonusAtaque, exprDano, ataqueMagia, cdMagia, exprMagia, TIPOS_ESPACOS, espacosPorTipo,
    TIPOS_ARMADURA, maxDestreza, classeArmaduraDe, TIPOS_DESLOCAMENTO, deslocamentoDe, metros, lerMetros,
    restanteRecurso, textoRecurso, descansarRecursos, limparRecurso,
    nivelTotal, textoDadosDeVida, classeENivelDe, acharClasse, ESPACOS_COMPLETO, espacosDasClasses, aplicarEspacos,
    ganhaAumento, aplicarAumento, escalaTruque, escalarDados, sofrerDano, curar, dadosDeVidaRestantes, descansoLongo,
    mediaDadoVida, ganhoDeNivel, novoPersonagem, limparPersonagem, limparAtaque, limparMagia, exemploPandora, lerImportacao,
  };
}
