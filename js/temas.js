// ===== TEMAS DE CORES =====
// Cada tema muda só as cores "de destaque": os 7 dados, o botão ROLAR e detalhes.
// As cores de cada tema têm brilho parecido entre si (família de tons), por isso
// combinam sem "brigar". O fundo é sempre preto/cinza (escolhido à parte).
// Ordem das cores dos dados: d4, d6, d8, d10, d12, d20, d100.
const TEMAS = [
  { id: 'espectro', nome: 'Espectro', acento: '#e4e4e7',
    dados: ['#f87171', '#60a5fa', '#4ade80', '#fb923c', '#f472b6', '#facc15', '#a78bfa'] },
  { id: 'grafite', nome: 'Grafite', acento: '#fafafa',
    dados: ['#a1a1aa', '#b4b4bb', '#c4c4cc', '#d4d4d8', '#e4e4e7', '#ffffff', '#8e8e96'] },
  { id: 'indigo', nome: 'Índigo', acento: '#818cf8',
    dados: ['#c4b5fd', '#a5b4fc', '#818cf8', '#a78bfa', '#93c5fd', '#e0e7ff', '#7dd3fc'] },
  { id: 'menta', nome: 'Menta', acento: '#34d399',
    dados: ['#a7f3d0', '#6ee7b7', '#34d399', '#2dd4bf', '#5eead4', '#d1fae5', '#67e8f9'] },
  { id: 'ambar', nome: 'Âmbar', acento: '#fbbf24',
    dados: ['#fdba74', '#fcd34d', '#fbbf24', '#fb923c', '#fde68a', '#fef3c7', '#f59e0b'] },
  { id: 'coral', nome: 'Coral', acento: '#fb7185',
    dados: ['#fda4af', '#fb7185', '#fdba74', '#f472b6', '#fecdd3', '#ffe4e6', '#f9a8d4'] },
  { id: 'oceano', nome: 'Oceano', acento: '#38bdf8',
    dados: ['#93c5fd', '#7dd3fc', '#38bdf8', '#60a5fa', '#67e8f9', '#e0f2fe', '#a5b4fc'] },
  { id: 'aurora', nome: 'Aurora', acento: '#2dd4bf',
    dados: ['#5eead4', '#7dd3fc', '#a5b4fc', '#c4b5fd', '#f0abfc', '#99f6e4', '#86efac'] },
  { id: 'sakura', nome: 'Sakura', acento: '#f9a8d4',
    dados: ['#fbcfe8', '#f9a8d4', '#f0abfc', '#e9d5ff', '#fda4af', '#fdf2f8', '#d8b4fe'] },
  { id: 'areia', nome: 'Areia', acento: '#d6c3a5',
    dados: ['#c8a97e', '#d6c3a5', '#b9a688', '#e2c799', '#a8a29e', '#f5ecdf', '#cbb89d'] },
];

// Temas da versão 8 e anteriores → o tema novo mais parecido (quem já tinha um
// tema escolhido continua com algo próximo, em vez de cair no padrão).
const TEMAS_ANTIGOS = {
  classico: 'espectro', neon: 'espectro', pastel: 'sakura', nord: 'oceano', dracula: 'indigo',
  gruvbox: 'ambar', solarized: 'oceano', vulcao: 'coral', floresta: 'menta',
};

// Tons de fundo (sempre preto/cinza, levemente frios para parecer mais "limpo").
const FUNDOS = [
  { id: 'oled', nome: 'Preto', fundo: '#000000', superficie: '#0e0e10', tecla: '#17171a', teclaOp: '#0a0a0b', borda: '#232327' },
  { id: 'carvao', nome: 'Carvão', fundo: '#0b0b0c', superficie: '#141416', tecla: '#1c1c1f', teclaOp: '#111113', borda: '#29292d' },
  { id: 'grafite', nome: 'Grafite', fundo: '#18181b', superficie: '#1f1f23', tecla: '#27272a', teclaOp: '#1c1c1f', borda: '#36363b' },
];

if (typeof module !== 'undefined') module.exports = { TEMAS, FUNDOS, TEMAS_ANTIGOS };
