// ===== MONSTROS PADRÃO (D&D 5.5 / SRD 5.2.1) =====
// Valores conferidos no SRD 5.2.1 (regras de 2024). Cada rolagem pode ter várias
// partes separadas por ";", cada uma com um nome antes de ":".
// Se o "Acerto" tirar 20 natural, o app dobra os dados do "Dano" sozinho.
const MONSTROS_PADRAO = [
  {
    id: 'm-goblin', tipo: 'monstro', emoji: '👺',
    nome: 'Guerreiro Goblin', subtitulo: 'ND 1/4 · Feérico Pequeno (Goblinoide)',
    ca: 15, pvMax: 10, notas: 'Fuga Ágil: Desengajar ou Esconder como Ação Bônus. +1d4 de dano se atacar com Vantagem.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+2' },
      { nome: 'Cimitarra', expr: 'Acerto: 1d20+4; Dano: 1d6+2' },
      { nome: 'Cimitarra com Vantagem', expr: 'Acerto: 2d20kh1+4; Dano: 1d6+2+1d4' },
      { nome: 'Arco Curto', expr: 'Acerto: 1d20+4; Dano: 1d6+2' },
      { nome: 'Furtividade', expr: '1d20+6' },
      { nome: 'PV aleatórios', expr: '3d6' },
    ],
  },
  {
    id: 'm-bugbear', tipo: 'monstro', emoji: '👹',
    nome: 'Guerreiro Bugbear', subtitulo: 'ND 1 · Feérico Médio (Goblinoide)',
    ca: 14, pvMax: 33, notas: 'Agarrar: alvo Médio ou menor fica Agarrado (CD 12). Martelo com Vantagem contra alvo agarrado por ele.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+2' },
      { nome: 'Agarrar', expr: 'Acerto: 1d20+4; Dano: 2d6+2' },
      { nome: 'Martelo Leve', expr: 'Acerto: 1d20+4; Dano: 3d4+2' },
      { nome: 'Furtividade', expr: '1d20+6' },
      { nome: 'PV aleatórios', expr: '6d8+6' },
    ],
  },
  {
    id: 'm-ogro', tipo: 'monstro', emoji: '🗿',
    nome: 'Ogro', subtitulo: 'ND 2 · Gigante Grande',
    ca: 11, pvMax: 68, notas: '',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20-1' },
      { nome: 'Clava Grande', expr: 'Acerto: 1d20+6; Dano: 2d8+4' },
      { nome: 'Azagaia', expr: 'Acerto: 1d20+6; Dano: 2d6+4' },
      { nome: 'PV aleatórios', expr: '8d10+24' },
    ],
  },
  {
    id: 'm-ursocoruja', tipo: 'monstro', emoji: '🦉',
    nome: 'Urso-Coruja', subtitulo: 'ND 3 · Monstruosidade Grande',
    ca: 13, pvMax: 59, notas: 'Multiataque: dois ataques de Dilacerar.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+1' },
      { nome: 'Dilacerar', expr: 'Acerto: 1d20+7; Dano: 2d8+5' },
      { nome: 'Multiataque (2×)', expr: 'Acerto 1: 1d20+7; Dano 1: 2d8+5; Acerto 2: 1d20+7; Dano 2: 2d8+5' },
      { nome: 'Percepção', expr: '1d20+5' },
      { nome: 'PV aleatórios', expr: '7d10+21' },
    ],
  },
  {
    id: 'm-troll', tipo: 'monstro', emoji: '🧌',
    nome: 'Troll', subtitulo: 'ND 5 · Gigante Grande',
    ca: 15, pvMax: 94, notas: 'Regeneração: recupera 15 PV no início do turno (não funciona no turno seguinte a dano de ácido ou fogo). Multiataque: três Dilacerar.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+1' },
      { nome: 'Dilacerar', expr: 'Acerto: 1d20+7; Dano: 2d6+4' },
      { nome: 'Multiataque (3×)', expr: 'Acerto 1: 1d20+7; Dano 1: 2d6+4; Acerto 2: 1d20+7; Dano 2: 2d6+4; Acerto 3: 1d20+7; Dano 3: 2d6+4' },
      { nome: 'Percepção', expr: '1d20+5' },
      { nome: 'PV aleatórios', expr: '9d10+45' },
    ],
  },
  {
    id: 'm-hidra', tipo: 'monstro', emoji: '🐍',
    nome: 'Hidra', subtitulo: 'ND 8 · Monstruosidade Enorme',
    ca: 15, pvMax: 184, notas: 'Cinco cabeças: uma Mordida por cabeça. Perde uma cabeça ao sofrer 25+ de dano num turno; nascem duas, a menos que tenha sofrido dano de fogo.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+4' },
      { nome: 'Mordida', expr: 'Acerto: 1d20+8; Dano: 1d10+5' },
      { nome: 'Dano de 5 Mordidas', expr: '5×(1d10+5)' },
      { nome: 'Percepção', expr: '1d20+6' },
      { nome: 'PV aleatórios', expr: '16d12+80' },
    ],
  },
  {
    id: 'm-dragao-jovem', tipo: 'monstro', emoji: '🐉',
    nome: 'Dragão Vermelho Jovem', subtitulo: 'ND 10 · Dragão Grande (Cromático)',
    ca: 18, pvMax: 178, notas: 'Imune a fogo. Multiataque: três Dilacerar. Sopro de Fogo: TR de Destreza CD 17, cone de 9 m; sucesso = metade do dano.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+4' },
      { nome: 'Dilacerar', expr: 'Acerto: 1d20+10; Cortante: 2d6+6; Fogo: 1d6' },
      { nome: 'Sopro de Fogo', expr: 'Fogo (CD 17 Des): 16d6' },
      { nome: 'Recarga do Sopro (5–6)', expr: '1d6' },
      { nome: 'Percepção', expr: '1d20+8' },
      { nome: 'PV aleatórios', expr: '17d10+85' },
    ],
  },
  {
    id: 'm-vampiro', tipo: 'monstro', emoji: '🧛',
    nome: 'Vampiro', subtitulo: 'ND 13 · Morto-vivo Médio ou Pequeno',
    ca: 16, pvMax: 195, notas: 'Multiataque: dois Golpes Sepulcrais e uma Mordida. Mordida: TR de Constituição CD 17; o vampiro recupera PV igual ao dano necrótico. Resistência Lendária (3/dia).',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+14' },
      { nome: 'Golpe Sepulcral', expr: 'Acerto: 1d20+9; Concussão: 1d8+4; Necrótico: 2d6' },
      { nome: 'Mordida (CD 17 Con)', expr: 'Perfurante: 1d4+4; Necrótico: 3d8' },
      { nome: 'Recarga do Encanto (5–6)', expr: '1d6' },
      { nome: 'Furtividade', expr: '1d20+9' },
      { nome: 'PV aleatórios', expr: '23d8+92' },
    ],
  },
  {
    id: 'm-dragao-adulto', tipo: 'monstro', emoji: '🐲',
    nome: 'Dragão Vermelho Adulto', subtitulo: 'ND 17 · Dragão Enorme (Cromático)',
    ca: 19, pvMax: 256, notas: 'Imune a fogo. Multiataque: três Dilacerar. Sopro de Fogo: TR de Destreza CD 21, cone de 18 m. Magias: CD 20, +12 para acertar. Resistência Lendária (3/dia). 3 Ações Lendárias.',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+12' },
      { nome: 'Dilacerar', expr: 'Acerto: 1d20+14; Cortante: 1d10+8; Fogo: 2d4' },
      { nome: 'Sopro de Fogo', expr: 'Fogo (CD 21 Des): 17d6' },
      { nome: 'Recarga do Sopro (5–6)', expr: '1d6' },
      { nome: 'Bola de Fogo (CD 20 Des)', expr: 'Fogo: 8d6' },
      { nome: 'Percepção', expr: '1d20+13' },
      { nome: 'PV aleatórios', expr: '19d12+133' },
    ],
  },
  {
    id: 'm-lich', tipo: 'monstro', emoji: '☠️',
    nome: 'Lich', subtitulo: 'ND 21 · Morto-vivo Médio (Mago)',
    ca: 20, pvMax: 315, notas: 'Multiataque: três ataques (Explosão Mística e/ou Toque Paralisante). Magias: CD 20. Resistência Lendária (4/dia).',
    rolagens: [
      { nome: 'Iniciativa', expr: '1d20+17' },
      { nome: 'Explosão Mística', expr: 'Acerto: 1d20+12; Energia: 4d12+5' },
      { nome: 'Toque Paralisante', expr: 'Acerto: 1d20+12; Frio: 3d6+5' },
      { nome: 'Bola de Fogo nv 5 (CD 20 Des)', expr: 'Fogo: 10d6' },
      { nome: 'Relâmpago nv 5 (CD 20 Des)', expr: 'Elétrico: 10d6' },
      { nome: 'Dedo da Morte (CD 20 Con)', expr: 'Necrótico: 7d8+30' },
      { nome: 'Arcanismo', expr: '1d20+19' },
      { nome: 'PV aleatórios', expr: '42d8+126' },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { MONSTROS_PADRAO };
