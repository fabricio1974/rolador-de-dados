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
const salvaguarda = (p, atr) => modDe(p, atr) + (p.salvaguardas[atr] ? profDe(p) : 0);
const pericia = (p, id) => {
  const def = PERICIAS.find(x => x.id === id);
  return modDe(p, def.atr) + profDe(p) * (p.pericias[id] || 0);
};
const iniciativa = (p) => modDe(p, 'des') + p.iniciativaBonus;
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

const ataqueMagia = (p) => profDe(p) + modDe(p, p.conjuracao.atributo);
const cdMagia = (p) => 8 + ataqueMagia(p);
// O que rolar ao tocar em "Rolar" numa magia (vazio = nada para rolar).
function exprMagia(p, m) {
  const r = m.rolagem.trim();
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

const dadosDeVidaRestantes = (p) => Math.max(0, p.nivel - p.dadosVidaGastos);
// Descanso longo (2024): PV cheios, PV temporários acabam, espaços de magia voltam e
// recupera todos os Dados de Vida gastos.
function descansoLongo(p) {
  const espacos = {};
  for (const [n, e] of Object.entries(p.espacos)) espacos[n] = { ...e, usados: 0 };
  return { ...p, pv: p.pvMax, pvTemp: 0, dadosVidaGastos: 0, espacos };
}
// Ganho de PV ao subir de nível: média do dado de vida (arredondada para cima) + CON.
const mediaDadoVida = (d) => d / 2 + 1;
const ganhoDeNivel = (p, rolado = null) => Math.max(1, (rolado ?? mediaDadoVida(p.dadoVida)) + modDe(p, 'con'));

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
  };
}

function limparMagia(m) {
  m = m && typeof m === 'object' ? m : {};
  return {
    nome: texto(m.nome, 80) || 'Magia',
    nivel: inteiro(m.nivel, 0, 0, 9),
    preparada: m.preparada !== false,
    ataque: m.ataque === true,          // rola o Ataque Mágico (1d20 + bônus) antes do dano
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
  const nivel = inteiro(x.nivel, 1, 1, 20);
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
  const atalho = x.atalho && typeof x.atalho === 'object' ? x.atalho : {};
  const conj = x.conjuracao && typeof x.conjuracao === 'object' ? x.conjuracao : {};
  return {
    id: typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : novoId(),
    nome: texto(x.nome, 60) || 'Sem nome',
    classe: texto(x.classe, 60),
    nivel,
    dadoVida: DADOS_DE_VIDA.includes(Number(x.dadoVida)) ? Number(x.dadoVida) : 8,
    dadosVidaGastos: inteiro(x.dadosVidaGastos, 0, 0, nivel),
    raca: texto(x.raca, 60),
    antecedente: texto(x.antecedente, 60),
    alinhamento: texto(x.alinhamento, 60),
    xp: inteiro(x.xp, 0, 0, 1e9),
    pvMax,
    pv: inteiro(x.pv, pvMax, 0, pvMax),
    pvTemp: inteiro(x.pvTemp, 0, 0, 9999),
    ca: inteiro(x.ca, 10, 0, 50),
    deslocamento: texto(x.deslocamento, 20) || '9 m',
    iniciativaBonus: inteiro(x.iniciativaBonus, 0, -20, 30),
    atributos, salvaguardas, pericias,
    atributoDestaque: NOME_ATRIBUTO[x.atributoDestaque] ? x.atributoDestaque : 'des',
    atalho: { nome: texto(atalho.nome, 20) || 'Sorte', expr: texto(atalho.expr, 80) || '2d20' },
    ataques: Array.isArray(x.ataques) ? x.ataques.slice(0, 40).map(limparAtaque) : [],
    conjuracao: {
      atributo: NOME_ATRIBUTO[conj.atributo] ? conj.atributo : 'int',
      nivel: inteiro(conj.nivel, nivel, 0, 20),
    },
    espacos,
    magias: Array.isArray(x.magias) ? x.magias.slice(0, 300).map(limparMagia) : [],
    moedas, textos,
  };
}

// Personagem de exemplo (o que aparece na primeira vez): Pandora, Maga nível 2.
function exemploPandora() {
  return limparPersonagem({
    nome: 'Pandora', classe: 'Maga', nivel: 2, dadoVida: 6, raca: 'Humana', antecedente: 'Personalizado',
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
    bonusAtaque, exprDano, ataqueMagia, cdMagia, exprMagia, sofrerDano, curar, dadosDeVidaRestantes, descansoLongo,
    mediaDadoVida, ganhoDeNivel, novoPersonagem, limparPersonagem, limparAtaque, limparMagia, exemploPandora, lerImportacao,
  };
}
