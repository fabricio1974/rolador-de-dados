// ===== TEMAS DE CORES =====
// Cada tema muda só as cores "de destaque": os 7 dados, o botão ROLAR e Vant/Desv.
// O fundo é sempre em tons de preto/cinza (escolhido à parte em Configurações).
// Ordem das cores dos dados: d4, d6, d8, d10, d12, d20, d100.
const TEMAS = [
  { id: 'classico', nome: 'Clássico', acento: '#f5c84b',
    dados: ['#ef5a4c', '#2f97b8', '#3fa65a', '#e08a1e', '#d9579a', '#f5c84b', '#4c6fe0'] },
  { id: 'neon', nome: 'Neon', acento: '#00e5ff',
    dados: ['#ff2e88', '#00e5ff', '#39ff14', '#ff9f1c', '#b026ff', '#faff00', '#2979ff'] },
  { id: 'pastel', nome: 'Pastel', acento: '#f8c8dc',
    dados: ['#f4a6a6', '#a6d8f4', '#b5e8b0', '#f8d49b', '#d7b5f0', '#fff1a8', '#a9b8f5'] },
  { id: 'nord', nome: 'Nord', acento: '#88c0d0',
    dados: ['#bf616a', '#88c0d0', '#a3be8c', '#d08770', '#b48ead', '#ebcb8b', '#5e81ac'] },
  { id: 'dracula', nome: 'Drácula', acento: '#bd93f9',
    dados: ['#ff5555', '#8be9fd', '#50fa7b', '#ffb86c', '#ff79c6', '#f1fa8c', '#bd93f9'] },
  { id: 'gruvbox', nome: 'Gruvbox', acento: '#fabd2f',
    dados: ['#fb4934', '#83a598', '#b8bb26', '#fe8019', '#d3869b', '#fabd2f', '#8ec07c'] },
  { id: 'solarized', nome: 'Solarized', acento: '#2aa198',
    dados: ['#dc322f', '#268bd2', '#859900', '#cb4b16', '#d33682', '#b58900', '#6c71c4'] },
  { id: 'oceano', nome: 'Oceano', acento: '#00b4d8',
    dados: ['#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4'] },
  { id: 'vulcao', nome: 'Vulcão', acento: '#e85d04',
    dados: ['#9d0208', '#d00000', '#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08'] },
  { id: 'floresta', nome: 'Floresta', acento: '#52b788',
    dados: ['#bc6c25', '#dda15e', '#606c38', '#52b788', '#a3b18a', '#e9c46a', '#2a9d8f'] },
];

// Tons de fundo (sempre preto/cinza).
const FUNDOS = [
  { id: 'oled', nome: 'Preto', fundo: '#000000', superficie: '#141414', tecla: '#242424', teclaOp: '#0d0d0d', borda: '#2e2e2e' },
  { id: 'carvao', nome: 'Carvão', fundo: '#121212', superficie: '#1e1e1e', tecla: '#2c2c2c', teclaOp: '#191919', borda: '#383838' },
  { id: 'grafite', nome: 'Grafite', fundo: '#202124', superficie: '#2b2c30', tecla: '#3a3b40', teclaOp: '#26272a', borda: '#46474c' },
];

if (typeof module !== 'undefined') module.exports = { TEMAS, FUNDOS };
