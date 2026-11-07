// Ficha de Personagem: página Galeria (fotos do personagem).
// As fotos ficam no IndexedDB do aparelho (cabe muito mais que no localStorage), já
// reduzidas para no máximo 1600 px. Não vão no arquivo exportado.
'use strict';

const fotosDB = (() => {
  let banco = null;
  const abrir = () => banco ? Promise.resolve(banco) : new Promise((ok, erro) => {
    const r = indexedDB.open('ficha-fotos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fotos', { keyPath: 'id' }).createIndex('personagem', 'personagem');
    r.onsuccess = () => { banco = r.result; ok(banco); };
    r.onerror = () => erro(r.error);
  });
  // Uma transação: "fazer" recebe a loja e pode devolver um pedido (cujo resultado volta).
  const tx = (modo, fazer) => abrir().then(b => new Promise((ok, erro) => {
    const t = b.transaction('fotos', modo);
    const pedido = fazer(t.objectStore('fotos'));
    t.oncomplete = () => ok(pedido ? pedido.result : undefined);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error);
  }));
  return {
    doPersonagem: (id) => tx('readonly', s => s.index('personagem').getAll(id)),
    todas: () => tx('readonly', s => s.getAll()),
    pegar: (id) => tx('readonly', s => s.get(id)),
    gravar: (foto) => tx('readwrite', s => { s.put(foto); }),
    apagar: (id) => tx('readwrite', s => { s.delete(id); }),
  };
})();

// Reduz a foto (lado maior até 1600 px) e devolve um JPEG.
function reduzirFoto(arquivo, lado = 1600) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const tela = document.createElement('canvas');
      tela.width = Math.round(img.naturalWidth * k);
      tela.height = Math.round(img.naturalHeight * k);
      tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
      URL.revokeObjectURL(url);
      tela.toBlob(b => (b ? ok(b) : erro(new Error('Não consegui ler essa imagem.'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

// Endereços (blob:) das fotos já abertas, para não criar de novo a cada desenho.
// A miniatura (~360 px, guardada junto) vai na grade, na escolha e no item; a grande, só na
// tela cheia — assim o celular não decodifica dezenas de fotos de 1600 px de uma vez.
const urlsFotos = new Map();
function urlDe(f, mini = false) {
  const blob = mini && f.mini ? f.mini : f.blob;
  const chave = f.id + (blob === f.mini ? ':m' : '');
  if (!urlsFotos.has(chave)) urlsFotos.set(chave, URL.createObjectURL(blob));
  return urlsFotos.get(chave);
}
async function urlDaFoto(id, mini = true) {
  if (!id) return null;
  if (urlsFotos.has(id + ':m')) return urlsFotos.get(id + ':m');
  if (!mini && urlsFotos.has(id)) return urlsFotos.get(id);
  try { const f = await fotosDB.pegar(id); return f ? urlDe(f, mini) : null; } catch { return null; }
}
// Galeria precisa ser refeita (foto nova, item ligado/desligado...) na próxima vez que aparecer.
let galeriaSuja = true;
function marcarGaleria() { galeriaSuja = true; if (typeof paginasSujas !== 'undefined') paginasSujas.add(PAGINAS.indexOf($('pg-galeria'))); }
const novoIdFoto = () => 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Organização: álbum escolhido ('' = Todas, '-' = Sem álbum), ordem e seleção de várias.
const CHAVE_GALERIA = 'ficha.galeria';
const prefGaleria = Object.assign({ album: '', ordem: 'recentes' }, ler(CHAVE_GALERIA, {}));
let fotosTodas = [];           // as do personagem: { id, personagem, criado, blob, album, legenda }
let fotosVisiveis = [];        // as da tela (álbum e ordem escolhidos)
let fotosMarcadas = null;            // Set de ids quando está selecionando várias
let desenhoGaleria = 0;        // evita misturar duas leituras se trocar de personagem rápido

const albunsDoPersonagem = () => [...new Set([...p.albuns, ...fotosTodas.map(f => f.album).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt'));

async function desenharGaleria() {
  const pg = $('pg-galeria');
  galeriaSuja = false;
  const minha = ++desenhoGaleria;
  let lista = [];
  try { lista = await fotosDB.doPersonagem(p.id); }
  catch { pg.replaceChildren(el('p', 'vazio', 'Este navegador não deixou guardar fotos.')); return; }
  if (minha !== desenhoGaleria) return;
  fotosTodas = lista.map(f => ({ album: '', legenda: '', ...f }));
  const vivos = new Set(fotosTodas.map(f => f.id));
  for (const [chave, u] of urlsFotos) {
    const id = chave.replace(/:m$/, '');
    if (!vivos.has(id) && !p.equipamentos.some(i => i.foto === id)) { URL.revokeObjectURL(u); urlsFotos.delete(chave); }
  }
  if (fotosMarcadas) { for (const id of [...fotosMarcadas]) if (!vivos.has(id)) fotosMarcadas.delete(id); if (!fotosMarcadas.size) fotosMarcadas = null; }
  const albuns = albunsDoPersonagem();
  if (prefGaleria.album && prefGaleria.album !== '-' && !albuns.includes(prefGaleria.album)) prefGaleria.album = '';
  const noAlbum = (f) => prefGaleria.album === '' || (prefGaleria.album === '-' ? !f.album : f.album === prefGaleria.album);
  fotosVisiveis = fotosTodas.filter(noAlbum).sort((a, b) => (prefGaleria.ordem === 'recentes' ? b.criado - a.criado : a.criado - b.criado));

  // Álbuns (chips) e ordem
  const barra = el('div', 'albuns');
  const chip = (valor, nome, n) => {
    const b = el('button', 'chip-album' + (prefGaleria.album === valor ? ' ativo' : ''));
    b.type = 'button';
    b.append(nome);
    if (n !== null) b.append(el('small', '', String(n)));
    b.addEventListener('click', () => { prefGaleria.album = valor; gravar(CHAVE_GALERIA, prefGaleria); fotosMarcadas = null; desenharGaleria(); });
    return b;
  };
  barra.append(chip('', 'Todas', fotosTodas.length));
  for (const a of albuns) barra.append(chip(a, a, fotosTodas.filter(f => f.album === a).length));
  const semAlbum = fotosTodas.filter(f => !f.album).length;
  if (albuns.length && semAlbum) barra.append(chip('-', 'Sem álbum', semAlbum));
  const novo = el('button', 'chip-album novo', '+ Álbum');
  novo.type = 'button';
  novo.addEventListener('click', async () => {
    const nome = await pedirNomeAlbum('Novo álbum', '');
    if (!nome) return;
    if (!p.albuns.includes(nome)) p.albuns.push(nome);
    prefGaleria.album = nome; gravar(CHAVE_GALERIA, prefGaleria); salvar(); desenharGaleria();
  });
  barra.append(novo);
  const linha2 = el('div', 'galeria-opcoes');
  const ordem = el('button', 'botao-texto-claro', prefGaleria.ordem === 'recentes' ? '↓ Mais recentes' : '↑ Mais antigas');
  ordem.type = 'button';
  ordem.addEventListener('click', () => { prefGaleria.ordem = prefGaleria.ordem === 'recentes' ? 'antigas' : 'recentes'; gravar(CHAVE_GALERIA, prefGaleria); desenharGaleria(); });
  linha2.append(ordem);
  if (prefGaleria.album && prefGaleria.album !== '-') {
    const ren = el('button', 'botao-texto-claro', 'Renomear');
    ren.type = 'button';
    ren.addEventListener('click', () => renomearAlbum(prefGaleria.album));
    const apaga = el('button', 'botao-texto-claro', 'Apagar álbum');
    apaga.type = 'button';
    apaga.addEventListener('click', () => apagarAlbum(prefGaleria.album));
    linha2.append(ren, apaga);
  }

  // Grade de fotos (segurar uma foto = selecionar várias)
  const grade = el('div', 'galeria');
  fotosVisiveis.forEach((f, i) => {
    const b = el('button', 'foto' + (fotosMarcadas && fotosMarcadas.has(f.id) ? ' marcada' : ''));
    b.type = 'button';
    b.setAttribute('aria-label', f.legenda || `Foto ${i + 1}`);
    const img = el('img'); img.src = urlDe(f, true); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    b.append(img);
    if (f.legenda) b.append(el('span', 'legenda-foto', f.legenda));
    const item = p.equipamentos.find(x => x.foto === f.id);
    if (item) b.append(el('span', 'selo-item', item.nome));
    if (fotosMarcadas) b.append(el('span', 'marca-foto', fotosMarcadas.has(f.id) ? '✓' : ''));
    tocavel(b, () => {
      if (!fotosMarcadas) { verFotos(fotosVisiveis, i); return; }
      fotosMarcadas.has(f.id) ? fotosMarcadas.delete(f.id) : fotosMarcadas.add(f.id);
      if (!fotosMarcadas.size) { fotosMarcadas = null; desenharGaleria(); return; }
      // Só esta foto muda: marca no lugar (rápido) e atualiza a barra.
      b.classList.toggle('marcada', fotosMarcadas.has(f.id));
      b.querySelector('.marca-foto').textContent = fotosMarcadas.has(f.id) ? '✓' : '';
      desenharBarraSelecao();
    }, () => { fotosMarcadas = fotosMarcadas || new Set(); fotosMarcadas.add(f.id); desenharGaleria(); });
    grade.append(b);
  });
  if (!fotosMarcadas) {
    const mais = el('button', 'foto nova');
    mais.type = 'button';
    mais.setAttribute('aria-label', 'Adicionar fotos');
    mais.append(el('span', '', '+'), el('small', '', prefGaleria.album && prefGaleria.album !== '-' ? prefGaleria.album : 'Fotos'));
    mais.addEventListener('click', () => $('arquivo-fotos').click());
    grade.append(mais);
  }
  pg.replaceChildren(barra, linha2, grade);
  if (!fotosTodas.length) pg.append(el('p', 'vazio', 'Adicione fotos e desenhos do personagem, de itens, mapas... Crie álbuns para organizar. Elas ficam só neste aparelho.'));
  else if (!fotosVisiveis.length) pg.append(el('p', 'vazio', 'Nenhuma foto neste álbum.'));
  desenharBarraSelecao();
}

// Barra embaixo quando há fotos selecionadas: mover para um álbum ou apagar.
function desenharBarraSelecao() {
  let barra = $('barra-selecao');
  // Saiu da Galeria: a seleção acaba (não volta sozinha depois).
  if (fotosMarcadas && paginaAtual() !== PAGINAS.indexOf($('pg-galeria'))) fotosMarcadas = null;
  document.body.classList.toggle('com-selecao', !!fotosMarcadas);
  if (!fotosMarcadas) { if (barra) barra.remove(); return; }
  if (!barra) { barra = el('div', 'barra-selecao'); barra.id = 'barra-selecao'; document.body.append(barra); }
  const b = (t, f, cls = '') => { const x = el('button', cls, t); x.type = 'button'; x.addEventListener('click', f); return x; };
  barra.replaceChildren(
    el('span', 'conta-selecao', `${fotosMarcadas.size} selecionada${fotosMarcadas.size > 1 ? 's' : ''}`),
    b('Mover', moverSelecionadas),
    b('Apagar', apagarSelecionadas, 'perigo'),
    b('✕', () => { fotosMarcadas = null; desenharGaleria(); }));
}

// O mesmo nome com outras maiúsculas/acentos vira o álbum que já existe.
const albumExistente = (nome) => albunsDoPersonagem().find(a => semAcento(a) === semAcento(nome)) || nome;
async function pedirNomeAlbum(titulo, atual) {
  const r = await dialogo(titulo, (corpo, ctx) => {
    const c = campoSub('Nome do álbum', atual, { tipo: 'text', largo: true });
    c.input.maxLength = 40;
    c.input.dataset.foco = '';
    corpo.append(c);
    setTimeout(() => c.input.focus(), 60);
    ctx.ler = () => c.input.value.trim() || undefined;
  }, [{ texto: 'Cancelar', valor: null }, { texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  return r && semAcento(r) !== semAcento(atual) ? albumExistente(r) : r;
}
async function renomearAlbum(antigo) {
  const nome = await pedirNomeAlbum('Renomear álbum', antigo);
  if (!nome || nome === antigo) return;
  p.albuns = [...new Set(p.albuns.map(a => (a === antigo ? nome : a)).concat(nome))];
  for (const f of fotosTodas.filter(x => x.album === antigo)) await fotosDB.gravar({ ...f, album: nome });
  prefGaleria.album = nome; gravar(CHAVE_GALERIA, prefGaleria); salvar(); desenharGaleria();
}
async function apagarAlbum(nome) {
  const n = fotosTodas.filter(x => x.album === nome).length;
  const ok = await dialogo(`Apagar o álbum ${nome}?`, (corpo) => corpo.append(el('p', 'dialogo-dica', n ? `As ${n} fotos dele não são apagadas: ficam em "Sem álbum".` : 'O álbum está vazio.')),
    [{ texto: 'Cancelar', valor: false }, { texto: 'Apagar', valor: true }]);
  if (!ok) return;
  p.albuns = p.albuns.filter(a => a !== nome);
  for (const f of fotosTodas.filter(x => x.album === nome)) await fotosDB.gravar({ ...f, album: '' });
  prefGaleria.album = ''; gravar(CHAVE_GALERIA, prefGaleria); salvar(); desenharGaleria();
}
// Escolher um álbum (ou criar um novo): devolve o nome, '' para "sem álbum", ou null.
async function escolherAlbum(titulo) {
  const albuns = albunsDoPersonagem();
  const r = await dialogo(titulo, (corpo, ctx) => {
    const lista = el('div', 'lista-albuns');
    const opcao = (valor, texto) => { const b = el('button', 'item-dialogo', texto); b.type = 'button'; b.addEventListener('click', () => ctx.fechar({ valor })); return b; };
    lista.append(...albuns.map(a => opcao(a, a)), opcao('', 'Sem álbum'), opcao(null, '+ Novo álbum…'));
    corpo.append(lista);
  }, [{ texto: 'Cancelar', valor: null }]);
  if (!r) return null;
  if (r.valor !== null) return r.valor;
  const nome = await pedirNomeAlbum('Novo álbum', '');
  if (!nome) return null;
  if (!p.albuns.includes(nome)) { p.albuns.push(nome); salvar(); }
  return nome;
}
async function moverSelecionadas() {
  const destino = await escolherAlbum('Mover para o álbum');
  if (destino === null) return;
  for (const f of fotosTodas.filter(x => fotosMarcadas.has(x.id))) await fotosDB.gravar({ ...f, album: destino });
  avisar(`${fotosMarcadas.size} foto(s) movida(s) para ${destino || 'Sem álbum'}`);
  fotosMarcadas = null;
  desenharGaleria();
}
async function apagarSelecionadas() {
  const escolhidas = fotosTodas.filter(x => fotosMarcadas.has(x.id));
  const ok = await dialogo(`Apagar ${escolhidas.length} foto(s)?`, null, [{ texto: 'Cancelar', valor: false }, { texto: 'Apagar', valor: true }]);
  if (!ok) return;
  for (const f of escolhidas) await fotosDB.apagar(f.id);
  const religar = soltarDosItens(escolhidas.map(f => f.id));
  fotosMarcadas = null;
  desenharGaleria();
  avisar(`${escolhidas.length} foto(s) apagada(s)`, 'Desfazer', async () => {
    for (const f of escolhidas) await fotosDB.gravar(f);
    religar();
    desenharGaleria();
  });
}

// Guarda arquivos de imagem como fotos do personagem (num álbum, se pedido). Devolve os ids.
async function guardarFotos(arquivos, album = '', legenda = '') {
  const ids = [];
  for (const arquivo of arquivos) {
    try {
      const blob = await reduzirFoto(arquivo);
      const mini = await reduzirFoto(arquivo, 360);
      const id = novoIdFoto();
      await fotosDB.gravar({ id, personagem: p.id, criado: Date.now(), blob, mini, album, legenda });
      ids.push(id);
    } catch (e) { avisar(e.message || 'Não consegui guardar a foto (memória cheia?)'); }
  }
  if (ids.length) marcarGaleria();
  return ids;
}
// Foto apagada: os itens que usavam ela ficam sem imagem. Devolve a função que desfaz isso.
function soltarDosItens(ids) {
  const usados = p.equipamentos.filter(i => ids.includes(i.foto)).map(i => [i, i.foto]);
  for (const [i] of usados) i.foto = '';
  if (usados.length) { salvar(); desenhar(); }
  return () => { for (const [i, id] of usados) i.foto = id; if (usados.length) { salvar(); desenhar(); } };
}
$('arquivo-fotos').addEventListener('change', async (ev) => {
  const arquivos = [...ev.target.files];
  ev.target.value = '';
  if (!arquivos.length) return;
  const album = prefGaleria.album && prefGaleria.album !== '-' ? prefGaleria.album : '';
  const ids = await guardarFotos(arquivos, album);
  if (ids.length) avisar(ids.length === 1 ? 'Foto adicionada' : `${ids.length} fotos adicionadas`);
  desenharGaleria();
});

// Visualizador em tela cheia: passa as fotos arrastando para o lado; legenda embaixo;
// o lápis edita legenda, álbum e o item ligado à foto.
function verFotos(lista, inicio) {
  const fundo = el('div', 'visor-fotos');
  const topo = el('div', 'visor-topo');
  const contador = el('span', 'contador');
  const fechar = el('button', 'icone'); fechar.setAttribute('aria-label', 'Fechar'); fechar.append(icone('fechar'));
  const lapis = el('button', 'icone'); lapis.setAttribute('aria-label', 'Editar foto'); lapis.append(icone('lapis'));
  const lixo = el('button', 'icone'); lixo.setAttribute('aria-label', 'Apagar foto'); lixo.append(icone('lixeira'));
  const acoes = el('span', 'visor-acoes'); acoes.append(lapis, lixo);
  topo.append(fechar, contador, acoes);
  const trilho = el('div', 'visor-trilho');
  for (const f of lista) {
    const s = el('div', 'visor-slide');
    const img = el('img'); img.alt = f.legenda || ''; img.decoding = 'async';
    s.append(img);
    trilho.append(s);
  }
  // Carrega a foto grande só da atual e das vizinhas (dezenas de fotos de 1600 px pesam).
  const carregar = () => { const a = atual(); for (let k = a - 1; k <= a + 1; k++) { const im = trilho.children[k] && trilho.children[k].firstChild; if (im && !im.src) im.src = urlDe(lista[k]); } };
  const rodape = el('div', 'visor-legenda');
  fundo.append(trilho, topo, rodape);
  document.body.append(fundo);
  const atual = () => Math.max(0, Math.min(lista.length - 1, Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth))));
  const mostrar = () => {
    const f = lista[atual()];
    contador.textContent = `${atual() + 1} / ${lista.length}`;
    const item = f && p.equipamentos.find(x => x.foto === f.id);
    rodape.replaceChildren();
    if (f && f.legenda) rodape.append(el('b', '', f.legenda));
    const info = [f && f.album, item && `Item: ${item.nome}`].filter(Boolean).join(' · ');
    if (info) rodape.append(el('small', '', info));
    rodape.hidden = !rodape.childElementCount;
  };
  trilho.addEventListener('scroll', () => { mostrar(); carregar(); }, { passive: true });
  trilho.scrollLeft = inicio * trilho.clientWidth;
  mostrar();
  carregar();
  abrirCamada(() => fundo.remove());
  fechar.addEventListener('click', voltar);
  lapis.addEventListener('click', async () => {
    const f = lista[atual()];
    const novo = await editarFoto(f);
    if (!novo) return;
    lista[atual()] = novo;
    trilho.children[atual()].firstChild.alt = novo.legenda;
    mostrar();
    desenharGaleria();
  });
  lixo.addEventListener('click', () => {
    const f = lista[atual()];
    if (!f) return;
    voltar();
    fotosDB.apagar(f.id).then(() => {
      const religar = soltarDosItens([f.id]);
      desenharGaleria();
      avisar('Foto apagada', 'Desfazer', () => fotosDB.gravar(f).then(() => { religar(); desenharGaleria(); }));
    });
  });
}
// Abre uma foto pelo id (ex.: a imagem de um item).
async function verFotoPorId(id) {
  let f = null;
  try { f = await fotosDB.pegar(id); } catch { /* sem banco */ }
  if (!f) { avisar('A imagem deste item não está mais na galeria.'); return; }
  verFotos([{ album: '', legenda: '', ...f }], 0);
}

// Legenda, álbum e item ligado a uma foto.
async function editarFoto(f) {
  const r = await dialogo('Foto', (corpo, ctx) => {
    const leg = campoSub('Legenda', f.legenda || '', { tipo: 'text', largo: true });
    leg.input.maxLength = 120;
    let album = f.album || '';
    const albumB = el('button', 'botao-texto-android', `Álbum: ${album || 'Sem álbum'}`);
    albumB.type = 'button';
    albumB.addEventListener('click', async () => {
      const a = await escolherAlbum('Álbum da foto');
      if (a === null) return;
      album = a;
      albumB.textContent = `Álbum: ${album || 'Sem álbum'}`;
    });
    const itemAtual = p.equipamentos.findIndex(x => x.foto === f.id);
    const item = caixaSelecao('Imagem do item:', [['-1', 'Nenhum'], ...p.equipamentos.map((x, k) => [String(k), x.nome])], String(itemAtual));
    corpo.append(leg, albumB, item);
    ctx.ler = () => ({ legenda: leg.input.value.trim(), album, item: Number(item.select.value), itemAtual });
  }, [{ texto: 'Cancelar', valor: null }, { texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (!r) return null;
  const novo = { ...f, legenda: r.legenda, album: r.album };
  await fotosDB.gravar(novo);
  if (r.item !== r.itemAtual) {
    if (r.itemAtual >= 0) p.equipamentos[r.itemAtual].foto = '';
    if (r.item >= 0) p.equipamentos[r.item].foto = f.id;
    salvar();
    desenhar();
  }
  marcarGaleria();
  return novo;
}

// Fotos de personagens que não existem mais (nem na lixeira) são apagadas ao abrir.
function limparFotosSoltas() {
  const vivos = new Set([...personagens, ...lixeira].map(x => x.id));
  fotosDB.todas().then(todas => {
    for (const f of todas) if (!vivos.has(f.personagem)) fotosDB.apagar(f.id);
  }).catch(() => {});
}
