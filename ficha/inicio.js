// Ficha de Personagem: começo (roda por último, depois de todos os outros arquivos).
'use strict';

desenhar(true);
const paginaSalva = Math.min(PAGINAS.length - 1, Math.max(0, Number(ler(CHAVE_PAGINA, 0)) || 0));
paginas.scrollLeft = paginaSalva * paginas.clientWidth;
paginaAntes = paginaSalva;
marcarPonto();
limparFotosSoltas();
