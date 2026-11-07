// Ficha de Personagem: equipamento em abas (Armas, Armaduras, Mágicos, Consumíveis,
// Ferramentas, Diversos). Cada item tem nome, quantidade e anotações; mágicos podem ser
// sintonizados (até 3) e armas/armaduras, equipadas. O texto antigo vira "Anotações".
'use strict';

const CHAVE_ABA_EQUIP = 'ficha.abaEquipamento';
let abaEquip = CATEGORIAS_ITEM.some(c => c[0] === ler(CHAVE_ABA_EQUIP, '')) ? ler(CHAVE_ABA_EQUIP, '') : 'diversos';

function cartaoEquipamento(campoTexto) {
  const c = el('div', 'cartao-texto cartao-equip');
  c.id = 'det-equipamento';
  c.append(el('h3', '', 'Equipamento'));
  const abas = el('div', 'abas-equip');
  abas.setAttribute('role', 'tablist');
  const lista = el('div', 'lista-equip');
  const rodape = el('div', 'equip-rodape');
  const desenharAbas = () => {
    abas.replaceChildren(...CATEGORIAS_ITEM.map(([id, nome]) => {
      const n = p.equipamentos.filter(i => i.categoria === id).length;
      const b = el('button', 'aba-equip' + (id === abaEquip ? ' ativa' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(id === abaEquip));
      b.append(nome);
      if (n) b.append(el('small', '', String(n)));
      b.addEventListener('click', () => { abaEquip = id; gravar(CHAVE_ABA_EQUIP, id); desenharAbas(); desenharLista(); });
      return b;
    }));
  };
  const desenharLista = () => {
    const itens = p.equipamentos.map((it, i) => [it, i]).filter(([it]) => it.categoria === abaEquip);
    lista.replaceChildren();
    if (!itens.length) lista.append(el('p', 'equip-vazio', 'Nenhum item nesta aba.'));
    for (const [it, i] of itens) lista.append(linhaItem(it, i));
    rodape.replaceChildren();
    const info = el('span', 'equip-info',
      abaEquip === 'magicos' ? `Sintonizados: ${sintonizados(p)}/${MAX_SINTONIZADOS}` : '');
    const add = el('button', 'botao', '+ Item');
    add.type = 'button';
    add.addEventListener('click', () => editarItem(null));
    rodape.append(info, add);
  };
  // Linha: nome (toque abre) e − quantidade + (gastar uma poção, uma flecha...).
  function linhaItem(it, i) {
    const linha = el('div', 'item-equip' + (it.qtd === 0 ? ' esgotado' : ''));
    // Imagem do item (da Galeria): miniatura; tocar abre em tela cheia.
    if (it.foto) {
      const mini = el('button', 'mini-item');
      mini.type = 'button';
      mini.setAttribute('aria-label', `Imagem de ${it.nome}`);
      const img = el('img'); img.alt = ''; img.decoding = 'async';
      mini.append(img);
      urlDaFoto(it.foto).then(u => { if (u) img.src = u; else mini.remove(); });
      mini.addEventListener('click', () => verFotoPorId(it.foto));
      linha.append(mini);
    }
    const abrir = el('button', 'abrir-item');
    abrir.type = 'button';
    const nome = el('b', '', it.nome);
    const marcas = [it.sintonizado && 'sintonizado', it.equipado && 'equipado'].filter(Boolean).join(' · ');
    if (marcas) nome.append(el('span', 'marcas', marcas));
    abrir.append(nome);
    if (it.notas) abrir.append(el('small', '', it.notas.split('\n')[0]));
    abrir.addEventListener('click', () => editarItem(i));
    const qtd = el('div', 'qtd-equip');
    const menos = el('button', '', '−'); menos.type = 'button'; menos.setAttribute('aria-label', `Tirar 1 ${it.nome}`);
    const mais = el('button', '', '+'); mais.type = 'button'; mais.setAttribute('aria-label', `Pôr 1 ${it.nome}`);
    const n = el('span', '', `×${it.qtd}`);
    const mudar = (d) => {
      it.qtd = Math.max(0, Math.min(9999, it.qtd + d));
      n.textContent = `×${it.qtd}`;
      linha.classList.toggle('esgotado', it.qtd === 0);
      salvarDepois();
      vibrar();
    };
    menos.addEventListener('click', () => mudar(-1));
    mais.addEventListener('click', () => mudar(1));
    qtd.append(menos, n, mais);
    linha.append(abrir, qtd);
    return linha;
  }
  c.redesenhar = () => { desenharAbas(); desenharLista(); };
  c.redesenhar();
  const notas = el('label', 'notas-equip');
  notas.append(el('span', '', 'Anotações'), campoTexto('equipamento'));
  c.append(abas, lista, rodape, notas);
  return c;
}

// Diálogo de um item (novo ou existente), no estilo dos outros diálogos de edição.
async function editarItem(i) {
  const novo = i === null;
  const it = novo ? limparItem({ nome: '', categoria: abaEquip }) : structuredClone(p.equipamentos[i]);
  const r = await dialogo(novo ? 'Novo item' : 'Item', (corpo, ctx) => {
    const nome = campoSub('Nome', novo ? '' : it.nome, { tipo: 'text', largo: true });
    nome.input.maxLength = 80;
    const cat = caixaSelecao('Aba:', CATEGORIAS_ITEM, it.categoria);
    const qtd = entrada(it.qtd, 'number', { min: 0, max: 9999, inputMode: 'numeric' });
    qtd.className = 'sublinhado';
    const passo = (d) => { const b = el('button', 'botao-android pequeno', d > 0 ? '+' : '-'); b.type = 'button'; b.addEventListener('click', () => { qtd.value = Math.max(0, numeroDe(qtd, 0) + d); }); return b; };
    const stepper = el('div', 'stepper');
    stepper.append(passo(-1), qtd, passo(1));
    const sint = marcarAndroid(`Sintonizado (${sintonizados(p) - (it.sintonizado ? 1 : 0)}/${MAX_SINTONIZADOS} em uso)`, it.sintonizado);
    const equip = marcarAndroid('Equipado', it.equipado);
    const atacar = marcarAndroid('Também pôr em Ataques', false);
    const notas = el('textarea', 'notas-item');
    notas.value = it.notas;
    notas.placeholder = 'Anotações (dano, CA, efeito, cargas...)';
    const marcas = el('div', 'coluna-marcar');
    marcas.append(sint, equip, atacar);
    // Da lista do SRD (armas e armaduras): preenche nome e anotações.
    const daLista = el('button', 'botao-texto-android', 'Escolher da lista (SRD)');
    daLista.type = 'button';
    const mostrar = () => {
      const c = cat.select.value;
      sint.hidden = c !== 'magicos';
      equip.hidden = !['armas', 'armaduras', 'magicos'].includes(c);
      atacar.hidden = !(novo && c === 'armas');
      daLista.hidden = !['armas', 'armaduras'].includes(c);
    };
    cat.select.addEventListener('change', mostrar);
    daLista.addEventListener('click', async () => {
      const c = cat.select.value;
      const escolhido = await dialogo(c === 'armas' ? 'Armas' : 'Armaduras', (cp, cx) => {
        for (const x of c === 'armas' ? D5.armas : D5.armaduras) {
          const b = el('button', 'item-dialogo');
          b.type = 'button';
          b.append(el('b', '', x.nome), el('small', '', c === 'armas' ? `${x.dano} ${x.tipo} · ${x.propriedades || x.categoria}` : `CA ${x.ca} · ${x.categoria}`));
          b.addEventListener('click', () => cx.fechar(x));
          cp.append(b);
        }
      }, [{ texto: 'Cancelar', valor: null }]);
      if (!escolhido) return;
      nome.input.value = escolhido.nome;
      notas.value = c === 'armas'
        ? [`${escolhido.dano} ${escolhido.tipo}`, escolhido.propriedades, escolhido.maestria && `Maestria: ${escolhido.maestria}`, escolhido.peso].filter(Boolean).join(' · ')
        : [`CA ${escolhido.ca}`, escolhido.forca && `For ${escolhido.forca}`, escolhido.furtividade && `Furtividade: ${escolhido.furtividade}`, escolhido.peso].filter(Boolean).join(' · ');
      ctx.escolhido = c === 'armas' ? escolhido : null;
      if (c === 'armas') atacar.caixa.checked = true;
    });
    // Imagem do item: da Galeria ou uma foto nova (que entra no álbum "Itens").
    ctx.foto = it.foto;
    const imagem = el('div', 'imagem-item');
    const previa = el('button', 'previa-item');
    previa.type = 'button';
    previa.setAttribute('aria-label', 'Ver imagem');
    previa.addEventListener('click', () => { if (ctx.foto) verFotoPorId(ctx.foto); });
    const mostrarFoto = () => {
      previa.replaceChildren();
      previa.hidden = !ctx.foto;
      tirarFoto.hidden = !ctx.foto;
      if (!ctx.foto) return;
      const img = el('img'); img.alt = '';
      urlDaFoto(ctx.foto).then(u => { if (u) img.src = u; });
      previa.append(img);
    };
    const daGaleria = el('button', 'botao-android', 'Da galeria'); daGaleria.type = 'button';
    const novaFoto = el('button', 'botao-android', 'Nova foto'); novaFoto.type = 'button';
    const tirarFoto = el('button', 'botao-android', 'Tirar imagem'); tirarFoto.type = 'button';
    daGaleria.addEventListener('click', async () => { const id = await escolherFotoDaGaleria(); if (id) { ctx.foto = id; mostrarFoto(); } });
    novaFoto.addEventListener('click', () => {
      const arq = el('input'); arq.type = 'file'; arq.accept = 'image/*';
      arq.addEventListener('change', async () => {
        if (!arq.files[0]) return;
        if (!p.albuns.includes('Itens')) p.albuns.push('Itens');
        const [id] = await guardarFotos([arq.files[0]], 'Itens', nome.input.value.trim());
        if (id) { ctx.foto = id; mostrarFoto(); }
      });
      arq.click();
    });
    tirarFoto.addEventListener('click', () => { ctx.foto = ''; mostrarFoto(); });
    const botoesFoto = el('div', 'botoes-android'); botoesFoto.append(daGaleria, novaFoto, tirarFoto);
    imagem.append(previa, botoesFoto);
    mostrarFoto();
    corpo.append(nome, cat, el('h3', 'sub-titulo', 'Quantidade'), stepper, marcas, daLista, el('h3', 'sub-titulo', 'Imagem'), imagem, notas);
    mostrar();
    ctx.ler = () => {
      const n = nome.input.value.trim();
      if (!n) { avisar('Escreva o nome do item.'); return undefined; }
      const c = cat.select.value;
      if (c === 'magicos' && sint.caixa.checked && !it.sintonizado && sintonizados(p) >= MAX_SINTONIZADOS) {
        avisar(`Já tem ${MAX_SINTONIZADOS} itens sintonizados (o máximo).`); return undefined;
      }
      return {
        item: limparItem({ nome: n, qtd: numeroDe(qtd, 1), categoria: c, notas: notas.value, foto: ctx.foto,
          sintonizado: c === 'magicos' && sint.caixa.checked, equipado: !equip.hidden && equip.caixa.checked }),
        ataque: novo && c === 'armas' && atacar.caixa.checked ? (ctx.escolhido || null) : undefined,
      };
    };
  }, novo
    ? [{ texto: 'Cancelar', valor: null }, { texto: 'Concluído', valor: (ctx) => ctx.ler() }]
    : [{ texto: 'Apagar', valor: 'apagar' }, { texto: 'Concluído', valor: (ctx) => ctx.ler() }]);
  if (!r) return;
  if (r === 'apagar') {
    const nomeItem = p.equipamentos[i].nome;
    comDesfazer(`${nomeItem} apagado`, () => { p.equipamentos.splice(i, 1); });
    return;
  }
  comDesfazer(novo ? `${r.item.nome} adicionado` : `${r.item.nome} salvo`, () => {
    if (novo) p.equipamentos.push(r.item); else p.equipamentos[i] = r.item;
    abaEquip = r.item.categoria;
    gravar(CHAVE_ABA_EQUIP, abaEquip);
    // Arma nova pode ir junto para a página de Ataques (com os números da lista, se veio dela).
    if (r.ataque !== undefined) p.ataques.push(limparAtaque(r.ataque ? armaParaFicha(r.ataque) : { nome: r.item.nome, atributo: 'for', dano: '1d6' }));
  });
}

// Escolher uma foto da Galeria (o álbum "Itens" primeiro). Devolve o id ou null.
async function escolherFotoDaGaleria() {
  let fotos = [];
  try { fotos = await fotosDB.doPersonagem(p.id); } catch { /* sem banco */ }
  if (!fotos.length) { avisar('A Galeria está vazia: use "Nova foto".'); return null; }
  fotos.sort((a, b) => ((b.album === 'Itens') - (a.album === 'Itens')) || b.criado - a.criado);
  const r = await dialogo('Escolher imagem', (corpo, ctx) => {
    const grade = el('div', 'galeria escolher');
    for (const f of fotos) {
      const b = el('button', 'foto');
      b.type = 'button';
      b.setAttribute('aria-label', f.legenda || 'Foto');
      const img = el('img'); img.src = urlDe(f); img.alt = ''; img.loading = 'lazy';
      b.append(img);
      if (f.legenda) b.append(el('span', 'legenda-foto', f.legenda));
      b.addEventListener('click', () => ctx.fechar(f.id));
      grade.append(b);
    }
    corpo.append(grade);
  }, [{ texto: 'Cancelar', valor: null }]);
  return r || null;
}
