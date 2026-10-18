// ===== TEMAS DE CORES =====
// Cada tema muda só as cores "de destaque": os 7 dados, o botão ROLAR e detalhes.
// As cores de cada tema têm brilho parecido entre si (família de tons), por isso
// combinam sem "brigar". O fundo é sempre preto/cinza (escolhido à parte).
// Ordem das cores dos dados: d4, d6, d8, d10, d12, d20, d100, d3, d2.
const TEMAS = [
  // Material: blocos fortes no estilo dos apps Android de dados (padrão desde a versão 11).
  { id: 'material', nome: 'Material', acento: '#1e88e5', acentoTxt: '#ffffff', textoBrancoNosDados: true,  // texto branco no azul e em todos os blocos, como no Android
    dados: ['#e53935', '#ff5722', '#ffc107', '#8bc34a', '#009688', '#03a9f4', '#5b8aa0', '#7c4dff', '#3d5afe'] },
  { id: 'espectro', nome: 'Espectro', acento: '#e4e4e7',
    dados: ['#f87171', '#60a5fa', '#4ade80', '#fb923c', '#f472b6', '#facc15', '#a78bfa', '#c084fc', '#38bdf8'] },
  { id: 'grafite', nome: 'Grafite', acento: '#fafafa',
    dados: ['#a1a1aa', '#b4b4bb', '#c4c4cc', '#d4d4d8', '#e4e4e7', '#ffffff', '#8e8e96', '#9a9aa2', '#bdbdc4'] },
  { id: 'indigo', nome: 'Índigo', acento: '#818cf8',
    dados: ['#c4b5fd', '#a5b4fc', '#818cf8', '#a78bfa', '#93c5fd', '#e0e7ff', '#7dd3fc', '#c7d2fe', '#6366f1'] },
  { id: 'menta', nome: 'Menta', acento: '#34d399',
    dados: ['#a7f3d0', '#6ee7b7', '#34d399', '#2dd4bf', '#5eead4', '#d1fae5', '#67e8f9', '#99f6e4', '#14b8a6'] },
  { id: 'ambar', nome: 'Âmbar', acento: '#fbbf24',
    dados: ['#fdba74', '#fcd34d', '#fbbf24', '#fb923c', '#fde68a', '#fef3c7', '#f59e0b', '#fed7aa', '#d97706'] },
  { id: 'coral', nome: 'Coral', acento: '#fb7185',
    dados: ['#fda4af', '#fb7185', '#fdba74', '#f472b6', '#fecdd3', '#ffe4e6', '#f9a8d4', '#fecaca', '#e11d48'] },
  { id: 'oceano', nome: 'Oceano', acento: '#38bdf8',
    dados: ['#93c5fd', '#7dd3fc', '#38bdf8', '#60a5fa', '#67e8f9', '#e0f2fe', '#a5b4fc', '#bae6fd', '#0ea5e9'] },
  { id: 'aurora', nome: 'Aurora', acento: '#2dd4bf',
    dados: ['#5eead4', '#7dd3fc', '#a5b4fc', '#c4b5fd', '#f0abfc', '#99f6e4', '#86efac', '#bae6fd', '#d8b4fe'] },
  { id: 'sakura', nome: 'Sakura', acento: '#f9a8d4',
    dados: ['#fbcfe8', '#f9a8d4', '#f0abfc', '#e9d5ff', '#fda4af', '#fdf2f8', '#d8b4fe', '#f5d0fe', '#f472b6'] },
  { id: 'areia', nome: 'Areia', acento: '#d6c3a5',
    dados: ['#c8a97e', '#d6c3a5', '#b9a688', '#e2c799', '#a8a29e', '#f5ecdf', '#cbb89d', '#e7d8c3', '#9c8b72'] },
];

// Temas da versão 8 e anteriores → o tema novo mais parecido (quem já tinha um
// tema escolhido continua com algo próximo, em vez de cair no padrão).
const TEMAS_ANTIGOS = {
  classico: 'espectro', neon: 'espectro', pastel: 'sakura', nord: 'oceano', dracula: 'indigo',
  gruvbox: 'ambar', solarized: 'oceano', vulcao: 'coral', floresta: 'menta',
};

// Tons de fundo (sempre preto/cinza, levemente frios para parecer mais "limpo").
const FUNDOS = [
  // Ardósia: cinza-azulado com barra de cima mais clara e barra ROLAR cinza-azulada.
  { id: 'ardosia', nome: 'Ardósia', fundo: '#2d3136', superficie: '#3a3e44', tecla: '#33373d', teclaOp: '#2a2e33', borda: '#464b52',
    barra: '#3d4147', rolar: '#687a89' },
  { id: 'oled', nome: 'Preto', fundo: '#000000', superficie: '#0e0e10', tecla: '#17171a', teclaOp: '#0a0a0b', borda: '#232327' },
  { id: 'carvao', nome: 'Carvão', fundo: '#0b0b0c', superficie: '#141416', tecla: '#1c1c1f', teclaOp: '#111113', borda: '#29292d' },
  { id: 'grafite', nome: 'Grafite', fundo: '#18181b', superficie: '#1f1f23', tecla: '#27272a', teclaOp: '#1c1c1f', borda: '#36363b' },
];

if (typeof module !== 'undefined') module.exports = { TEMAS, FUNDOS, TEMAS_ANTIGOS };
