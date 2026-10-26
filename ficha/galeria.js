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

let fotosAtuais = [];          // [{ id, personagem, criado, blob, url }]
let desenhoGaleria = 0;        // evita misturar duas leituras se trocar de personagem rápido

async function desenharGaleria() {
  const pg = $('pg-galeria');
  const minha = ++desenhoGaleria;
  let lista = [];
  try { lista = await fotosDB.doPersonagem(p.id); }
  catch { pg.replaceChildren(el('p', 'vazio', 'Este navegador não deixou guardar fotos.')); return; }
  if (minha !== desenhoGaleria) return;
  for (const f of fotosAtuais) URL.revokeObjectURL(f.url);
  fotosAtuais = lista.sort((a, b) => a.criado - b.criado).map(f => ({ ...f, url: URL.createObjectURL(f.blob) }));
  const grade = el('div', 'galeria');
  fotosAtuais.forEach((f, i) => {
    const b = el('button', 'foto');
    b.type = 'button';
    b.setAttribute('aria-label', `Foto ${i + 1}`);
    const img = el('img'); img.src = f.url; img.alt = ''; img.loading = 'lazy';
    b.append(img);
    b.addEventListener('click', () => verFotos(i));
    grade.append(b);
  });
  const mais = el('button', 'foto nova');
  mais.type = 'button';
  mais.setAttribute('aria-label', 'Adicionar fotos');
  mais.append(el('span', '', '+'), el('small', '', 'Fotos'));
  mais.addEventListener('click', () => $('arquivo-fotos').click());
  grade.append(mais);
  pg.replaceChildren(grade);
  if (!fotosAtuais.length) pg.append(el('p', 'vazio', 'Adicione fotos e desenhos do personagem. Elas ficam só neste aparelho.'));
}

$('arquivo-fotos').addEventListener('change', async (ev) => {
  const arquivos = [...ev.target.files];
  ev.target.value = '';
  if (!arquivos.length) return;
  let n = 0;
  for (const arquivo of arquivos) {
    try {
      const blob = await reduzirFoto(arquivo);
      await fotosDB.gravar({ id: 'f-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), personagem: p.id, criado: Date.now(), blob });
      n++;
    } catch (e) { avisar(e.message || 'Não consegui guardar a foto (memória cheia?)'); }
  }
  if (n) avisar(n === 1 ? 'Foto adicionada' : `${n} fotos adicionadas`);
  desenharGaleria();
});

// Visualizador em tela cheia: passa as fotos arrastando para o lado.
function verFotos(inicio) {
  const fundo = el('div', 'visor-fotos');
  const topo = el('div', 'visor-topo');
  const contador = el('span', 'contador');
  const fechar = el('button', 'icone'); fechar.setAttribute('aria-label', 'Fechar'); fechar.append(icone('fechar'));
  const lixo = el('button', 'icone'); lixo.setAttribute('aria-label', 'Apagar foto'); lixo.append(icone('lixeira'));
  topo.append(fechar, contador, lixo);
  const trilho = el('div', 'visor-trilho');
  for (const f of fotosAtuais) {
    const s = el('div', 'visor-slide');
    const img = el('img'); img.src = f.url; img.alt = '';
    s.append(img);
    trilho.append(s);
  }
  fundo.append(trilho, topo);
  document.body.append(fundo);
  const atual = () => Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth));
  const contar = () => { contador.textContent = `${atual() + 1} / ${fotosAtuais.length}`; };
  trilho.addEventListener('scroll', contar, { passive: true });
  trilho.scrollLeft = inicio * trilho.clientWidth;
  contar();
  abrirCamada(() => fundo.remove());
  fechar.addEventListener('click', voltar);
  lixo.addEventListener('click', () => {
    const f = fotosAtuais[atual()];
    if (!f) return;
    voltar();
    fotosDB.apagar(f.id).then(() => {
      desenharGaleria();
      avisar('Foto apagada', 'Desfazer', () => fotosDB.gravar({ id: f.id, personagem: f.personagem, criado: f.criado, blob: f.blob }).then(desenharGaleria));
    });
  });
}

// Fotos de personagens que não existem mais (nem na lixeira) são apagadas ao abrir.
function limparFotosSoltas() {
  const vivos = new Set([...personagens, ...lixeira].map(x => x.id));
  fotosDB.todas().then(todas => {
    for (const f of todas) if (!vivos.has(f.personagem)) fotosDB.apagar(f.id);
  }).catch(() => {});
}
