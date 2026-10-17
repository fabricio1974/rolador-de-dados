// Testes da lógica do rolador. Rode com:  node testes.js
// Carrega os arquivos de js/ (que não dependem de tela) e testa as funções.
const assert = require('assert');
const L = require('./js/logica.js');
const { TEMAS, FUNDOS } = require('./js/temas.js');
const { MONSTROS_PADRAO } = require('./js/monstros.js');

// Dado "falso" que devolve uma sequência conhecida e anota cada rolagem.
function dadoFalso(sequencia = []) {
  const chamadas = [];
  let i = 0;
  const f = (faces) => {
    chamadas.push(faces);
    return i < sequencia.length ? sequencia[i++] : faces; // sem sequência: sempre o máximo
  };
  f.chamadas = chamadas;
  return f;
}

let ok = 0, falhou = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✔ ' + nome); }
  catch (e) { falhou++; console.log('  ✘ ' + nome + '\n      ' + e.message); }
}
function deveFalhar(expr) {
  assert.throws(() => L.analisar(expr), /\S/, `"${expr}" deveria dar erro`);
}

console.log('Rolagem');

teste('3×(3d6) rola exatamente 9 dados d6, em 3 grupos de 3', () => {
  const d = dadoFalso();
  const r = L.rolar('3×(3d6)', d);
  assert.deepStrictEqual(d.chamadas, [6, 6, 6, 6, 6, 6, 6, 6, 6]);
  assert.strictEqual(r.linhas[0].grupos.length, 3);
  r.linhas[0].grupos.forEach(g => assert.strictEqual(g.length, 3));
  assert.strictEqual(r.total, 54);
});

teste('2d12+3×(3d6) = 2 dados d12 + 9 dados d6', () => {
  const d = dadoFalso();
  L.rolar('2d12+3×(3d6)', d);
  assert.strictEqual(d.chamadas.filter(f => f === 12).length, 2);
  assert.strictEqual(d.chamadas.filter(f => f === 6).length, 9);
});

teste('detalhamento no formato do exemplo (total 53)', () => {
  const d = dadoFalso([7, 11, 4, 2, 6, 1, 5, 5, 3, 3, 6]);
  const r = L.rolar('2d12+3×(3d6)', d);
  assert.strictEqual(L.descrever(r),
    '2d12: [7, 11] = 18\n' +
    '3×(3d6): [4, 2, 6] [1, 5, 5] [3, 3, 6] = 35\n' +
    'Total: 53');
});

teste('cada repetição é independente (não é 3d6 vezes 3)', () => {
  const r = L.rolar('3×(1d6)', dadoFalso([1, 2, 3]));
  assert.strictEqual(r.total, 6); // 1+2+3, e não 1×3
});

teste('1d20+5 soma a constante', () => {
  assert.strictEqual(L.rolar('1d20+5', dadoFalso([10])).total, 15);
});

teste('subtração, inclusive com o sinal "−" do teclado', () => {
  assert.strictEqual(L.rolar('1d20−2', dadoFalso([10])).total, 8);
  assert.strictEqual(L.rolar('10-3-2', dadoFalso()).total, 5);
  assert.strictEqual(L.rolar('1d8-(1d4+1)', dadoFalso([5, 2])).total, 2);
});

teste('parênteses aninhados: 2×(1d8+2×(1d4)) = 2 d8 + 4 d4', () => {
  const d = dadoFalso();
  const r = L.rolar('2×(1d8+2×(1d4))', d);
  assert.deepStrictEqual(d.chamadas, [8, 4, 4, 8, 4, 4]);
  assert.strictEqual(r.total, 2 * (8 + 4 + 4));
});

teste('(1d6)×3 também repete, e "x" / "*" valem como ×', () => {
  for (const e of ['(1d6)×3', '3x(1d6)', '3*(1d6)', '3 × ( 1d6 )']) {
    const d = dadoFalso();
    L.rolar(e, d);
    assert.strictEqual(d.chamadas.length, 3, e);
  }
});

teste('"d20" sem quantidade vale 1d20; números puros funcionam', () => {
  assert.strictEqual(L.rolar('d20', dadoFalso([7])).total, 7);
  assert.strictEqual(L.rolar('2×3+1', dadoFalso()).total, 7);
});

teste('dado de verdade (crypto) fica entre 1 e faces e sai todas as faces', () => {
  const vistos = new Set();
  for (let k = 0; k < 5000; k++) {
    const v = L.rolarDadoCripto(6);
    assert.ok(v >= 1 && v <= 6 && Number.isInteger(v));
    vistos.add(v);
  }
  assert.strictEqual(vistos.size, 6);
});

teste('colchetes MULTIPLICAM: 3×[3d6] rola só 3 dados e multiplica por 3', () => {
  const d = dadoFalso([4, 2, 6]);
  const r = L.rolar('3×[3d6]', d);
  assert.strictEqual(d.chamadas.length, 3);
  assert.strictEqual(r.total, 36);
  assert.strictEqual(L.descrever(r), '3×[3d6]: [4, 2, 6] = 36\nTotal: 36');
});

teste('colchete dos dois lados e combinado com repetição', () => {
  assert.strictEqual(L.rolar('[1d6+1]×2', dadoFalso([3])).total, 8);
  const d = dadoFalso([1, 2]);
  assert.strictEqual(L.rolar('2×(2×[1d6])', d).total, 6); // (1×2) + (2×2)
  assert.strictEqual(d.chamadas.length, 2);
  assert.strictEqual(L.rolar('[1d6]', dadoFalso([5])).total, 5);
});

teste('kh/kl: 2d20kh1 fica com o maior, 4d6kh3 descarta o menor', () => {
  let r = L.rolar('2d20kh1+5', dadoFalso([7, 15]));
  assert.strictEqual(r.total, 20);
  assert.strictEqual(L.descrever(r), '2d20kh1: [~7~, 15] = 15\n5\nTotal: 20');
  assert.strictEqual(L.rolar('2d20kl1', dadoFalso([7, 15])).total, 7);
  assert.strictEqual(L.rolar('4d6kh3', dadoFalso([3, 1, 6, 4])).total, 13);
  assert.strictEqual(L.rolar('2d20kh', dadoFalso([2, 9])).total, 9); // sem número = 1
});

teste('estatísticas: mín, máx e média', () => {
  const e = (x) => L.estatisticas(L.analisar(x));
  assert.deepStrictEqual({ ...e('2d6+3') }, { min: 5, max: 15, media: 10 });
  assert.deepStrictEqual({ ...e('3×(3d6)') }, { min: 9, max: 54, media: 31.5 });
  assert.deepStrictEqual({ ...e('3×[3d6]') }, { min: 9, max: 54, media: 31.5 });
  assert.deepStrictEqual({ ...e('1d20−1d4') }, { min: -3, max: 19, media: 8 });
  assert.ok(Math.abs(e('2d20kh1').media - 13.825) < 1e-9);
  assert.ok(Math.abs(e('2d20kl1').media - 7.175) < 1e-9);
  assert.ok(Math.abs(e('4d6kh3').media - 12.2446) < 1e-4);
});

teste('repetição guarda cada vez separada, com o seu valor (6 atributos)', () => {
  const r = L.rolar('2×(4d6kh3)+1', dadoFalso([3, 1, 6, 4, 2, 2, 5, 5]));
  const reps = r.linhas[0].repeticoes;
  assert.strictEqual(reps.length, 2);
  assert.deepStrictEqual(reps.map(x => x.valor), [13, 12]);
  assert.strictEqual(reps[0].grupos[0].filter(d => d.descartado).length, 1);
  assert.strictEqual(r.linhas[0].grupos.length, 2, 'grupos continua com todos os dados');
  assert.strictEqual(r.total, 26);
  assert.strictEqual(r.linhas[1].repeticoes, undefined, 'só repetição tem repeticoes');
  // colchetes NÃO são repetição: uma rolagem só
  assert.strictEqual(L.rolar('3×[1d6]', dadoFalso([2])).linhas[0].repeticoes, undefined);
  // repetição negativa com sinal de menos na frente
  const neg = L.rolar('10−2×(1d4)', dadoFalso([1, 3]));
  assert.strictEqual(neg.total, 6);
  assert.deepStrictEqual(neg.linhas[1].repeticoes.map(x => x.valor), [1, 3]);
});

console.log('Partes, crítico e modos');

teste('"Acerto: ...; Dano: ..." rola as duas partes com nome', () => {
  const r = L.rolarPartes('Acerto: 1d20+4; Dano: 1d6+2', dadoFalso([12, 3]));
  assert.deepStrictEqual(r.partes.map(p => [p.rotulo, p.res.total]), [['Acerto', 16], ['Dano', 5]]);
  assert.strictEqual(L.resumir(r), 'Acerto 16 · Dano 5');
});

teste('20 natural no acerto dobra os DADOS do dano (não o modificador)', () => {
  const d = dadoFalso([20, 1, 2, 3, 4]);
  const r = L.rolarPartes('Acerto: 1d20+4; Dano: 2d6+2', d);
  assert.strictEqual(r.partes[0].natural, 20);
  assert.strictEqual(r.partes[1].critico, true);
  assert.strictEqual(r.partes[1].res.expressao, '4d6+2');
  assert.strictEqual(r.partes[1].res.total, 1 + 2 + 3 + 4 + 2);
});

teste('crítico vale só até o próximo acerto, e pode ser desligado', () => {
  const r = L.rolarPartes('A1: 1d20; D1: 1d8; A2: 1d20; D2: 1d8', dadoFalso([20, 5, 5, 7, 3]));
  assert.strictEqual(r.partes[1].res.expressao, '2d8');
  assert.strictEqual(r.partes[3].res.expressao, '1d8');
  const sem = L.rolarPartes('A: 1d20; D: 1d8', dadoFalso([20, 5]), { critico: false });
  assert.strictEqual(sem.partes[1].res.expressao, '1d8');
});

teste('com vantagem, o d20 descartado não conta como natural', () => {
  const r = L.rolarPartes('A: 2d20kh1; D: 1d6', dadoFalso([20, 1, 4]));
  assert.strictEqual(r.partes[0].natural, 20);
  const r2 = L.rolarPartes('A: 2d20kl1; D: 1d6', dadoFalso([20, 1, 4]));
  assert.strictEqual(r2.partes[0].natural, 1);
  assert.strictEqual(r2.partes[1].critico, undefined);
});

teste('somasDeDano soma as partes de dano seguidas, separadas por ataque', () => {
  const r = L.rolarPartes('Acerto: 1d20+5; Dano: 1d8+3; Fogo: 1d6', dadoFalso([12, 5, 4]));
  assert.strictEqual(r.partes[0].ataque, true);
  assert.deepStrictEqual(L.somasDeDano(r), [{ fim: 2, total: 12, rotulos: ['Dano', 'Fogo'] }]);
  // ataque múltiplo: cada ataque tem a sua soma; bloco de uma parte só não soma
  const m = L.rolarPartes('A1: 1d20; D1: 1d6; F1: 1d4; A2: 1d20; D2: 1d6', dadoFalso([10, 6, 4, 10, 1]));
  assert.deepStrictEqual(L.somasDeDano(m).map(s => [s.fim, s.total]), [[2, 10]]);
  assert.deepStrictEqual(L.somasDeDano(L.rolarPartes('1d20+5', dadoFalso([3]))), []);
});

teste('erro numa parte diz qual parte é', () => {
  assert.throws(() => L.validar('Acerto: 1d20+4; Dano: 1d6+'), /^Error: Dano:/);
});

teste('aplicarModo força vantagem/desvantagem só nos d20', () => {
  assert.strictEqual(L.aplicarModo('Acerto: 1d20+4; Dano: 1d6+2', 'vant'), 'Acerto: 2d20kh1+4; Dano: 1d6+2');
  assert.strictEqual(L.aplicarModo('Acerto: 2d20kh1+4; Dano: 1d6', 'desv'), 'Acerto: 2d20kl1+4; Dano: 1d6');
  assert.strictEqual(L.aplicarModo('Acerto: 2d20kh1+4', 'vant'), 'Acerto: 2d20kh1+4');
  assert.strictEqual(L.aplicarModo('1d20+4', 'normal'), '1d20+4');
  assert.strictEqual(L.aplicarModo('A1: 1d20+7; A2: 1d20+7', 'vant'), 'A1: 2d20kh1+7; A2: 2d20kh1+7');
});

teste('montarAtalhos: favoritos primeiro, recentes sem repetir', () => {
  const fav = [{ nome: 'Espada', expr: '1d20+5; 1d8+3' }];
  const hist = [
    { titulo: '', expr: '2d6' }, { titulo: 'Espada', expr: '1d20+5; 1d8+3' },
    { titulo: '', expr: '2d6' }, { titulo: 'Goblin', expr: '1d20+4' }, { expr: '' }, null,
  ];
  assert.deepStrictEqual(L.montarAtalhos(fav, hist), [
    { nome: 'Espada', expr: '1d20+5; 1d8+3', tipo: 'favorito' },
    { nome: '2d6', expr: '2d6', tipo: 'recente' },
    { nome: 'Goblin', expr: '1d20+4', tipo: 'recente' },
  ]);
  assert.strictEqual(L.montarAtalhos([], hist, 1).length, 1);
  assert.deepStrictEqual(L.montarAtalhos(undefined, undefined), []);
});

console.log('Fichas, monstros e temas');

teste('as rolagens dos 10 monstros padrão são todas válidas', () => {
  assert.strictEqual(MONSTROS_PADRAO.length, 10);
  for (const m of MONSTROS_PADRAO) {
    assert.ok(L.limparFicha(m), m.nome);
    for (const r of m.rolagens) {
      assert.doesNotThrow(() => L.validar(r.expr), `${m.nome} / ${r.nome}`);
    }
  }
  assert.strictEqual(new Set(MONSTROS_PADRAO.map(m => m.id)).size, 10, 'ids repetidos');
});

teste('limparFicha aceita só campos conhecidos e imagens data:', () => {
  assert.strictEqual(L.limparFicha({ nome: '' }), null);
  assert.strictEqual(L.limparFicha(null), null);
  const f = L.limparFicha({ nome: ' Ana ', tipo: 'x', pvMax: '20', pv: 50, imagem: 'javascript:alert(1)', extra: 1,
                            rolagens: [{ nome: 'A', expr: '1d20' }, { nome: 1 }] });
  assert.strictEqual(f.nome, 'Ana');
  assert.strictEqual(f.tipo, 'personagem');
  assert.strictEqual(f.pvMax, 20);
  assert.strictEqual(f.pv, 20);
  assert.strictEqual(f.imagem, null);
  assert.strictEqual(f.extra, undefined);
  assert.strictEqual(f.rolagens.length, 1);
});

teste('10 temas com 7 cores de dados cada, e cor de texto legível', () => {
  assert.strictEqual(TEMAS.length, 10);
  for (const t of TEMAS) {
    assert.strictEqual(t.dados.length, 7, t.nome);
    for (const c of [...t.dados, t.acento]) assert.match(c, /^#[0-9a-f]{6}$/i, t.nome);
  }
  assert.ok(FUNDOS.length >= 1);
  assert.strictEqual(L.corDoTexto('#ffffff'), '#111111');
  assert.strictEqual(L.corDoTexto('#000000'), '#ffffff');
  assert.strictEqual(L.corDoTexto('#f5c84b'), '#111111');
  assert.strictEqual(L.corDoTexto('#023e8a'), '#ffffff');
});

console.log('Erros');

teste('expressões inválidas dão erro com mensagem', () => {
  for (const e of ['', '2d', '(1d6', '1d6)', '()', '1d6+', '1d6×1d4', 'abc', '0d6', '1d1',
                   '3×(3d6', '(1d6)(1d4)', '1000×(1000d6)', '-2×(1d6)',
                   '[1d6)', '(1d6]', '2×[1d6', '1d6]', '2d20kh3', '1d6kh0', '5kh1', '1d6×[1d4]']) {
    deveFalhar(e);
  }
});

teste('mensagem de erro é legível', () => {
  assert.throws(() => L.analisar('(1d6'), /Falta fechar com "\)"/);
  assert.throws(() => L.analisar('1d6×1d4'), /dado por dado/);
});

console.log('Teclado');

teste('tocar no mesmo dado incrementa: d6 → 2d6 → 3d6', () => {
  let v = '';
  v = L.apertarDado(v, 6); assert.strictEqual(v, '1d6');
  v = L.apertarDado(v, 6); assert.strictEqual(v, '2d6');
  v = L.apertarDado(v, 6); assert.strictEqual(v, '3d6');
});

teste('outro dado soma; número antes vira quantidade', () => {
  assert.strictEqual(L.apertarDado('1d20', 6), '1d20+1d6');
  assert.strictEqual(L.apertarDado('4', 6), '4d6');
  assert.strictEqual(L.apertarDado('1d20+', 4), '1d20+1d4');
  assert.strictEqual(L.apertarDado('3×(', 6), '3×(1d6');
});

teste('operadores e parênteses', () => {
  assert.strictEqual(L.apertarOperador('1d6+', '−'), '1d6−');
  assert.strictEqual(L.apertarOperador('', '+'), '');
  assert.strictEqual(L.apertarAbre('3', '('), '3×(');
  assert.strictEqual(L.apertarAbre('3', '['), '3×[');
  assert.strictEqual(L.apertarAbre('1d6', '('), '1d6+(');
  assert.strictEqual(L.apertarFecha('3×(1d6', ')'), '3×(1d6)');
  assert.strictEqual(L.apertarFecha('3×[1d6', ')'), '3×[1d6', 'não fecha [ com )');
  assert.strictEqual(L.apertarFecha('3×[1d6', ']'), '3×[1d6]');
  assert.strictEqual(L.apertarFecha('1d6', ')'), '1d6');
});

teste('botão dX: 3, dX, 7 -> 3d7', () => {
  assert.strictEqual(L.apertarD('3') + '7', '3d7');
  assert.strictEqual(L.apertarD('1d6'), '1d6+d');
});

teste('Vant/Desv trocam o último 1d20 e alternam', () => {
  assert.strictEqual(L.alternarVantagem('1d20+5', true), '2d20kh1+5');
  assert.strictEqual(L.alternarVantagem('2d20kh1+5', false), '2d20kl1+5');
  assert.strictEqual(L.alternarVantagem('2d20kl1+5', false), '1d20+5');
  assert.strictEqual(L.alternarVantagem('', true), '2d20kh1');
  assert.strictEqual(L.alternarVantagem('1d8+3', true), '1d8+3+2d20kh1');
  assert.strictEqual(L.alternarVantagem('3d20', true), '3d20+2d20kh1');
  assert.strictEqual(L.apertarDado('2d20kh1', 6), '2d20kh1+1d6');
});

console.log('Resumo compacto e ficha em combate');

teste('resumoCompacto: ataque + dano somado num número só', () => {
  const r = L.rolarPartes('Acerto: 1d20+5; Dano: 1d8+3; Fogo: 1d6', dadoFalso([20, 5, 4, 3, 2]));
  const itens = L.resumoCompacto(r);
  assert.deepStrictEqual(itens.map(i => [i.rotulo, i.valor, i.tipo]), [['Acerto', 25, 'ataque'], ['Dano', 5 + 4 + 3 + 3 + 2, 'dano']]);
  assert.strictEqual(itens[0].natural, 20);
  assert.strictEqual(itens[1].critico, true);
  assert.strictEqual(L.resumir(r), 'Acerto 25 · Dano 17');
});

teste('resumoCompacto: dano de uma parte mantém o nome; partes sem ataque ficam separadas', () => {
  const r = L.rolarPartes('Acerto: 1d20+4; Corte: 1d6+2', dadoFalso([12, 3]));
  assert.deepStrictEqual(L.resumoCompacto(r).map(i => `${i.rotulo} ${i.valor}`), ['Acerto 16', 'Corte 5']);
  const attr = L.rolarPartes('For: 3d6; Des: 3d6', dadoFalso([1, 2, 3, 4, 5, 6]));
  assert.deepStrictEqual(L.resumoCompacto(attr).map(i => [i.rotulo, i.valor, i.tipo]), [['For', 6, 'parte'], ['Des', 15, 'parte']]);
  const multi = L.rolarPartes('A1: 1d20; D1: 1d6; A2: 1d20; D2: 1d6; F2: 1d4', dadoFalso([10, 6, 11, 1, 4]));
  assert.deepStrictEqual(L.resumoCompacto(multi).map(i => `${i.rotulo} ${i.valor}`), ['A1 10', 'D1 6', 'A2 11', 'Dano 5']);
});

teste('nomeCurto: partes com nome viram "Acerto + Dano"', () => {
  assert.strictEqual(L.nomeCurto('Acerto: 1d20+5; Dano: 2d6+3; Fogo: 1d6'), 'Acerto + Dano + Fogo');
  assert.strictEqual(L.nomeCurto('1d20+5; Dano: 1d8'), '1d20+5; Dano: 1d8');
  assert.strictEqual(L.nomeCurto(' 2d6 '), '2d6');
  assert.strictEqual(L.nomeCurto(''), '');
  assert.strictEqual(L.montarAtalhos([], [{ titulo: '', expr: 'A: 1d20; D: 1d6' }])[0].nome, 'A + D');
});

teste('dano gasta os PV temporários primeiro e para no 0', () => {
  assert.deepStrictEqual(L.aplicarDano(20, 5, 3), { pv: 20, pvTemp: 2, sobra: 0 });
  assert.deepStrictEqual(L.aplicarDano(20, 5, 8), { pv: 17, pvTemp: 0, sobra: 0 });
  assert.deepStrictEqual(L.aplicarDano(4, 0, 10), { pv: 0, pvTemp: 0, sobra: 6 });
  assert.deepStrictEqual(L.aplicarDano(10, undefined, -3), { pv: 10, pvTemp: 0, sobra: 0 });
});

teste('cura para no máximo; PV temporários não se somam (fica o maior)', () => {
  assert.strictEqual(L.aplicarCura(5, 12, 10), 12);
  assert.strictEqual(L.aplicarCura(5, 12, 3), 8);
  assert.strictEqual(L.ganharPVTemp(5, 3), 5);
  assert.strictEqual(L.ganharPVTemp(5, 8), 8);
  assert.strictEqual(L.ganharPVTemp(undefined, 4), 4);
});

teste('CD de Concentração: maior entre 10 e metade do dano, no máximo 30', () => {
  assert.strictEqual(L.cdConcentracao(7), 10);
  assert.strictEqual(L.cdConcentracao(25), 12);
  assert.strictEqual(L.cdConcentracao(100), 30);
});

teste('exaustão tira 2 por nível só das partes com d20', () => {
  assert.strictEqual(L.aplicarExaustao('Acerto: 1d20+4; Dano: 1d6+2', 2), 'Acerto: 1d20+4−4; Dano: 1d6+2');
  assert.strictEqual(L.aplicarExaustao('1d20+3', 0), '1d20+3');
  assert.strictEqual(L.aplicarExaustao('2d6', 3), '2d6');
  assert.strictEqual(L.aplicarExaustao('1d20', 9), '1d20−12', 'nível máximo é 6');
  assert.doesNotThrow(() => L.validar(L.aplicarExaustao(L.aplicarModo('Acerto: 1d20+4; Dano: 1d6', 'vant'), 1)));
  assert.strictEqual(L.rolar('1d20−2', () => 10).total, 8);
});

teste('limparFicha: ficha antiga ganha campos novos zerados; condições inválidas saem', () => {
  const antiga = L.limparFicha({ nome: 'Velha', pvMax: 10, pv: 4, rolagens: [] });
  assert.strictEqual(antiga.pvTemp, 0);
  assert.strictEqual(antiga.exaustao, 0);
  assert.deepStrictEqual(antiga.condicoes, []);
  const nova = L.limparFicha({ nome: 'X', pvTemp: '7', exaustao: 9, condicoes: ['caido', 'voando', 'envenenado', 'caido'] });
  assert.strictEqual(nova.pvTemp, 7);
  assert.strictEqual(nova.exaustao, 6);
  assert.deepStrictEqual(nova.condicoes, ['caido', 'envenenado']);
  assert.deepStrictEqual(L.limparFicha(nova), nova, 'limpar de novo não muda nada');
  assert.strictEqual(new Set(L.CONDICOES.map(c => c.id)).size, L.CONDICOES.length);
});

console.log('Combate e alvo');

teste('alvo: ataque acerta com total ≥ CA; 20 natural sempre acerta, 1 natural sempre erra', () => {
  const acerto = L.rolarPartes('Acerto: 1d20+4; Dano: 1d6+2', dadoFalso([11, 3]));
  assert.deepStrictEqual(L.compararComAlvo(acerto, 15), [{ tipo: 'ataque', sucesso: true, automatico: false }, null]);
  assert.strictEqual(L.compararComAlvo(acerto, 16)[0].sucesso, false);
  const vinte = L.rolarPartes('Acerto: 1d20+0; Dano: 1d6', dadoFalso([20, 3]));
  assert.deepStrictEqual(L.compararComAlvo(vinte, 30)[0], { tipo: 'ataque', sucesso: true, automatico: true });
  const um = L.rolarPartes('Acerto: 1d20+40; Dano: 1d6', dadoFalso([1, 3]));
  assert.deepStrictEqual(L.compararComAlvo(um, 10)[0], { tipo: 'ataque', sucesso: false, automatico: true });
  assert.deepStrictEqual(L.compararComAlvo(acerto, null), [null, null], 'sem alvo, sem comparação');
  assert.deepStrictEqual(L.compararComAlvo(acerto, ''), [null, null]);
});

teste('alvo: teste/salvaguarda usa só o total (20 e 1 naturais não são automáticos)', () => {
  const salv = L.rolarPartes('1d20+2', dadoFalso([20]));
  assert.deepStrictEqual(L.compararComAlvo(salv, 25), [{ tipo: 'teste', sucesso: false, automatico: false }]);
  const um = L.rolarPartes('1d20+12', dadoFalso([1]));
  assert.strictEqual(L.compararComAlvo(um, 13)[0].sucesso, true);
  const nomeado = L.rolarPartes('Ataque: 1d20+5', dadoFalso([20]));
  assert.strictEqual(L.compararComAlvo(nomeado, 40)[0].tipo, 'ataque', 'nome "Ataque" conta como ataque');
  const multi = L.rolarPartes('A1: 1d20+5; D1: 1d6; A2: 1d20+5; D2: 1d6', dadoFalso([10, 2, 5, 2]));
  assert.deepStrictEqual(L.compararComAlvo(multi, 14).map(x => x && x.sucesso), [true, null, false, null]);
  assert.strictEqual(L.resumoCompacto(multi)[2].parte, 2, 'resumo guarda a posição do ataque');
});

teste('condições sugerem Vantagem/Desvantagem; as duas juntas se anulam', () => {
  assert.strictEqual(L.sugerirModo(['envenenado'], 'ataque').modo, 'desv');
  assert.strictEqual(L.sugerirModo(['invisivel'], 'ataque').modo, 'vant');
  assert.strictEqual(L.sugerirModo(['invisivel', 'caido'], 'ataque').modo, 'normal');
  assert.strictEqual(L.sugerirModo([], 'ataque').modo, 'normal');
  assert.deepStrictEqual(L.sugerirModo(['amedrontado'], 'ataque').desv, ['Amedrontado*']);
  assert.strictEqual(L.sugerirModo(['amedrontado'], 'iniciativa', true).modo, 'normal', 'condicional não entra sozinha');
  assert.strictEqual(L.sugerirModo(['paralisado'], 'iniciativa', true).modo, 'desv');
  assert.strictEqual(L.sugerirModo(['surdo', 'concentrando'], 'iniciativa').modo, 'normal');
});

teste('iniciativa: maior primeiro, empate mantém a ordem, quem não rolou vai para o fim', () => {
  const lista = [
    { id: 'a', iniciativa: 12 }, { id: 'b', iniciativa: null }, { id: 'c', iniciativa: 18 },
    { id: 'd', iniciativa: 12 }, { id: 'e', iniciativa: 0 },
  ];
  assert.deepStrictEqual(L.ordenarIniciativa(lista).map(c => c.id), ['c', 'a', 'd', 'e', 'b']);
  assert.strictEqual(lista[0].id, 'a', 'não muda a lista original');
  const ordem = L.ordenarIniciativa(lista);
  assert.deepStrictEqual(L.subirNoEmpate(ordem, 'd').map(c => c.id), ['c', 'd', 'a', 'e', 'b']);
  assert.strictEqual(L.subirNoEmpate(ordem, 'a'), ordem, 'sem empate com o de cima: não troca');
  assert.strictEqual(L.subirNoEmpate(ordem, 'c'), ordem);
});

teste('turnos: começa na rodada 1, dá a volta somando rodada, pula quem está fora', () => {
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  let t = L.avancarTurno(lista, null, 0);
  assert.deepStrictEqual(t, { vez: 'a', rodada: 1 });
  t = L.avancarTurno(lista, t.vez, t.rodada);
  assert.deepStrictEqual(t, { vez: 'b', rodada: 1 });
  t = L.avancarTurno(lista, 'c', 1);
  assert.deepStrictEqual(t, { vez: 'a', rodada: 2 });
  assert.deepStrictEqual(L.avancarTurno(lista, 'c', 1, new Set(['a'])), { vez: 'b', rodada: 2 });
  assert.deepStrictEqual(L.avancarTurno(lista, null, 0, new Set(['a'])), { vez: 'b', rodada: 1 });
  assert.deepStrictEqual(L.avancarTurno(lista, 'a', 1, new Set(['a', 'b', 'c'])), { vez: 'b', rodada: 1 }, 'todos fora: ninguém é pulado');
  assert.deepStrictEqual(L.avancarTurno([], 'x', 3), { vez: null, rodada: 0 });
  assert.deepStrictEqual(L.avancarTurno(lista, 'sumiu', 2), { vez: 'a', rodada: 2 }, 'vez de quem saiu: recomeça no primeiro');
});

teste('voltar turno: volta uma vez e desfaz a rodada, mas não antes do começo', () => {
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepStrictEqual(L.voltarTurno(lista, 'b', 1), { vez: 'a', rodada: 1 });
  assert.deepStrictEqual(L.voltarTurno(lista, 'a', 2), { vez: 'c', rodada: 1 });
  assert.deepStrictEqual(L.voltarTurno(lista, 'a', 1), { vez: 'a', rodada: 1 });
  assert.deepStrictEqual(L.voltarTurno(lista, 'c', 2, new Set(['b'])), { vez: 'a', rodada: 2 });
  for (let r = 1; r <= 3; r++) for (const c of lista) {
    const ida = L.avancarTurno(lista, c.id, r);
    assert.deepStrictEqual(L.voltarTurno(lista, ida.vez, ida.rodada), { vez: c.id, rodada: r }, 'avançar e voltar = parado');
  }
});

teste('cópias de monstro ganham número; iniciativa vem da ficha', () => {
  assert.strictEqual(L.nomeDeCopia('Goblin', []), 'Goblin 1');
  assert.strictEqual(L.nomeDeCopia('Goblin', ['Goblin 1', 'Goblin 3']), 'Goblin 2');
  assert.strictEqual(L.exprIniciativa(MONSTROS_PADRAO[0]), '1d20+2');
  assert.strictEqual(L.exprIniciativa({ rolagens: [{ nome: ' INICIATIVA ', expr: '1d20+7' }] }), '1d20+7');
  assert.strictEqual(L.exprIniciativa({ rolagens: [] }), '1d20');
  assert.strictEqual(L.exprIniciativa(undefined), '1d20');
  for (const m of MONSTROS_PADRAO) assert.doesNotThrow(() => L.validar(L.exprIniciativa(m)), m.nome);
});

teste('limparCombate: dados ausentes ou corrompidos viram um combate vazio e válido', () => {
  const vazio = { participantes: [], vez: null, rodada: 0 };
  assert.deepStrictEqual(L.limparCombate(null), vazio);
  assert.deepStrictEqual(L.limparCombate('lixo'), vazio);
  assert.deepStrictEqual(L.limparCombate({ participantes: 3 }), vazio);
  const c = L.limparCombate({
    participantes: [
      { id: 'x', nome: 'Goblin 1', pvMax: '10', pv: 99, iniciativa: '14', condicoes: ['caido', 'voando'] },
      { id: 'x', nome: 'Repetido' }, { nome: 'Sem id' }, null,
      { id: 'y', nome: 'Ana', tipo: 'personagem', vinculado: true, iniciativa: 'abc' },
    ],
    vez: 'y', rodada: 0,
  });
  assert.deepStrictEqual(c.participantes.map(p => p.id), ['x', 'y']);
  assert.strictEqual(c.participantes[0].pv, 10);
  assert.strictEqual(c.participantes[0].iniciativa, 14);
  assert.deepStrictEqual(c.participantes[0].condicoes, ['caido']);
  assert.strictEqual(c.participantes[1].iniciativa, null);
  assert.strictEqual(c.participantes[1].vinculado, true);
  assert.strictEqual(c.rodada, 1, 'com vez marcada, a rodada é pelo menos 1');
  assert.strictEqual(L.limparCombate({ participantes: [], vez: 'z', rodada: 5 }).rodada, 0);
  assert.deepStrictEqual(L.limparCombate(c), c, 'limpar de novo não muda nada');
});

console.log('Recursos, descansos, morte, histórico e backup (versão 7)');

teste('aplicarExaustao desconta em cada repetição (3×(1d20+2) são três testes)', () => {
  assert.strictEqual(L.aplicarExaustao('3×(1d20+2)', 1), '3×(1d20−2+2)');
  assert.strictEqual(L.aplicarExaustao('Ataques: 2×(2d20kh1+5); Dano: 2×(1d8)', 2), 'Ataques: 2×(2d20kh1−4+5); Dano: 2×(1d8)');
  assert.strictEqual(L.aplicarExaustao('1d20+5', 1), '1d20+5−2', 'sem repetição continua igual');
  const r = L.rolarPartes(L.aplicarExaustao('3×(1d20+2)', 1), dadoFalso([10, 10, 10]));
  assert.strictEqual(r.partes[0].res.total, 30, '3 × (10 − 2 + 2)');
});

teste('limparRecursos e limparGastos aceitam só o que é válido', () => {
  const r = L.limparRecursos([{ nome: ' Fúria ', max: '3', recarga: 'longo' }, { nome: '' }, null,
    { id: 'a', nome: 'Sopro', max: 0, recarga: '5' }, { id: 'a', nome: 'Outro', max: 500, recarga: 'xyz' }]);
  assert.strictEqual(r.length, 3);
  assert.strictEqual(r[0].nome, 'Fúria'); assert.strictEqual(r[0].max, 3);
  assert.strictEqual(r[1].max, 1, 'mínimo de 1 uso');
  assert.notStrictEqual(r[2].id, 'a', 'id repetido ganha outro');
  assert.strictEqual(r[2].max, 99); assert.strictEqual(r[2].recarga, 'longo');
  assert.deepStrictEqual(L.limparRecursos('lixo'), []);
  assert.deepStrictEqual(L.limparGastos({ a: 2, b: -1, c: 'x', d: 1000 }), { a: 2, d: 99 });
  assert.deepStrictEqual(L.limparGastos([1, 2]), {});
});

teste('usosRestantes e definirRestantes', () => {
  const r = { id: 'f', nome: 'Fúria', max: 3, recarga: 'longo' };
  assert.strictEqual(L.usosRestantes(r, {}), 3);
  let g = L.definirRestantes(r, {}, 1);
  assert.deepStrictEqual(g, { f: 2 });
  assert.strictEqual(L.usosRestantes(r, g), 1);
  g = L.definirRestantes(r, g, 3);
  assert.deepStrictEqual(g, {}, 'cheio não guarda nada');
  assert.strictEqual(L.usosRestantes(r, { f: 9 }), 0, 'nunca negativo');
});

teste('inicioDoTurno: Recarga 5–6 rola 1d6; "Início do turno" volta inteiro', () => {
  const recursos = [
    { id: 's', nome: 'Sopro', max: 1, recarga: '5' },
    { id: 'l', nome: 'Ações Lendárias', max: 3, recarga: 'turno' },
    { id: 'm', nome: 'Magia', max: 2, recarga: 'longo' },
    { id: 'x', nome: 'Não gasto', max: 1, recarga: '6' },
  ];
  let t = L.inicioDoTurno(recursos, { s: 1, l: 2, m: 1 }, dadoFalso([5]));
  assert.deepStrictEqual(t.gastos, { m: 1 });
  assert.strictEqual(t.recados.length, 2);
  t = L.inicioDoTurno(recursos, { s: 1 }, dadoFalso([4]));
  assert.deepStrictEqual(t.gastos, { s: 1 }, 'tirou 4: não recarregou');
  assert.ok(/não recarregou/.test(t.recados[0]));
  const d = dadoFalso([6]);
  L.inicioDoTurno(recursos, {}, d);
  assert.strictEqual(d.chamadas.length, 0, 'nada gasto: não rola');
});

teste('descansar: Longo enche PV, zera temp, −1 Exaustão e devolve tudo; Curto só os curtos', () => {
  const recursos = [
    { id: 'm', nome: 'Espaços 1º', max: 4, recarga: 'longo' },
    { id: 'a', nome: 'Surto de Ação', max: 1, recarga: 'curto' },
    { id: 's', nome: 'Sopro', max: 1, recarga: '5' },
  ];
  const estado = { pv: 5, pvMax: 30, pvTemp: 4, exaustao: 2, gastos: { m: 3, a: 1, s: 1 } };
  const curto = L.descansar(estado, recursos, 'curto');
  assert.deepStrictEqual(curto.mudancas.gastos, { m: 3 });
  assert.strictEqual(curto.mudancas.pv, undefined, 'curto não mexe nos PV');
  const longo = L.descansar(estado, recursos, 'longo');
  assert.deepStrictEqual(longo.mudancas.gastos, {});
  assert.strictEqual(longo.mudancas.pv, 30);
  assert.strictEqual(longo.mudancas.pvTemp, 0);
  assert.strictEqual(longo.mudancas.exaustao, 1);
  assert.ok(L.descansar({ pv: 0, pvMax: 10, gastos: {} }, recursos, 'longo').erro, 'precisa de 1 PV');
  assert.strictEqual(L.descansar({ pv: null, pvMax: null, gastos: {} }, [], 'longo').mudancas.exaustao, 0);
});

teste('salvaguardaMorte segue a regra 2024 (10+, 1 = duas falhas, 20 = 1 PV)', () => {
  const zero = { sucessos: 0, falhas: 0, estavel: false };
  assert.strictEqual(L.salvaguardaMorte(zero, 12).resultado, 'sucesso');
  assert.strictEqual(L.salvaguardaMorte(zero, 9).resultado, 'falha');
  assert.strictEqual(L.salvaguardaMorte(zero, 10).morte.sucessos, 1, '10 já é sucesso');
  assert.strictEqual(L.salvaguardaMorte(zero, 1).morte.falhas, 2);
  assert.strictEqual(L.salvaguardaMorte({ sucessos: 2, falhas: 2 }, 20).resultado, 'recupera');
  assert.strictEqual(L.salvaguardaMorte({ sucessos: 2, falhas: 0 }, 15).resultado, 'estavel');
  assert.deepStrictEqual(L.salvaguardaMorte({ sucessos: 2, falhas: 0 }, 15).morte, { sucessos: 0, falhas: 0, estavel: true });
  assert.strictEqual(L.salvaguardaMorte({ sucessos: 0, falhas: 2 }, 1).resultado, 'morto');
  assert.strictEqual(L.salvaguardaMorte(zero, 11, 7).resultado, 'falha', 'Exaustão conta no total');
  assert.deepStrictEqual(L.falhaPorDano({ sucessos: 1, falhas: 0, estavel: true }), { sucessos: 1, falhas: 1, estavel: false });
  assert.strictEqual(L.falhaPorDano({ falhas: 2 }, true).falhas, 3);
  assert.deepStrictEqual(L.limparMorte('x'), zero);
});

teste('limparFicha e limparCombate de versões antigas ganham os campos da versão 7', () => {
  const f = L.limparFicha({ nome: 'Ana', pvMax: 10 });
  assert.deepStrictEqual(f.recursos, []);
  assert.deepStrictEqual(f.gastos, {});
  assert.deepStrictEqual(f.morte, { sucessos: 0, falhas: 0, estavel: false });
  assert.deepStrictEqual(L.limparFicha(f), f, 'limpar de novo não muda nada');
  const c = L.limparCombate({ participantes: [{ id: 'a', nome: 'Dragão 1', gastos: { s: 1 } }, { id: 'b', nome: 'Goblin 1' }] });
  assert.deepStrictEqual(c.participantes[0].gastos, { s: 1 });
  assert.deepStrictEqual(c.participantes[1].gastos, {});
  for (const m of MONSTROS_PADRAO) {
    const limpa = L.limparFicha(m);
    assert.strictEqual(limpa.recursos.length, (m.recursos || []).length, m.nome);
  }
});

teste('agruparHistorico separa por dia; rolagens antigas sem hora ficam em "Antes"', () => {
  const agora = new Date(2026, 9, 17, 20, 0).getTime();
  const hist = [
    { expr: '1d20', quando: new Date(2026, 9, 17, 19, 5).getTime() },
    { expr: '2d6', quando: new Date(2026, 9, 17, 0, 1).getTime() },
    { expr: '1d8', quando: new Date(2026, 9, 16, 23, 59).getTime() },
    { expr: '1d4', quando: new Date(2026, 9, 3, 12, 0).getTime() },
    { expr: '1d12' },
  ];
  const g = L.agruparHistorico(hist, agora);
  assert.deepStrictEqual(g.map(x => x.titulo), ['Hoje', 'Ontem', '03/10', 'Antes']);
  assert.deepStrictEqual(g[0].itens.map(x => x.indice), [0, 1]);
  assert.strictEqual(L.horaCurta(hist[0].quando), '19:05');
  assert.strictEqual(L.horaCurta(undefined), '');
  assert.deepStrictEqual(L.agruparHistorico([], agora), []);
});

teste('lerBackup: versão 1 (sem combate) e versão 2 (com combate)', () => {
  assert.throws(() => L.lerBackup({ app: 'outro', fichas: [] }));
  assert.throws(() => L.lerBackup(null));
  const v1 = L.lerBackup({ app: 'rolador-de-dados', versao: 1, fichas: [{ nome: 'Ana' }, { nome: '' }],
    favoritos: [{ nome: 'a', expr: '1d6' }, { nome: 1 }], config: { tema: 'neon' }, historico: [{ expr: '1d20' }, 5] });
  assert.strictEqual(v1.fichas.length, 1);
  assert.strictEqual(v1.favoritos.length, 1);
  assert.strictEqual(v1.historico.length, 1);
  assert.deepStrictEqual(v1.combate, { participantes: [], vez: null, rodada: 0 });
  const v2 = L.lerBackup({ app: 'rolador-de-dados', versao: 2, fichas: [], config: [1],
    combate: { participantes: [{ id: 'c1', nome: 'Goblin 1', pvMax: 7, iniciativa: 12 }], vez: 'c1', rodada: 3 } });
  assert.strictEqual(v2.combate.rodada, 3);
  assert.strictEqual(v2.combate.participantes[0].pv, 7);
  assert.deepStrictEqual(v2.config, {}, 'config estragada vira vazia');
});

console.log('Continuidade (versão 8)');

teste('migrarFicha: monstro padrão antigo perde a rolagem "Recarga do Sopro (5–6)" e ganha o uso', () => {
  const v6 = { id: 'm-dragao-jovem', nome: 'Dragão', rolagens: [{ nome: 'Sopro de Fogo', expr: '16d6' }, { nome: 'Recarga do Sopro (5–6)', expr: '1d6' }] };
  const m = L.limparFicha(L.migrarFicha(v6, MONSTROS_PADRAO));
  assert.deepStrictEqual(m.rolagens.map(r => r.nome), ['Sopro de Fogo']);
  assert.deepStrictEqual(m.recursos.map(r => r.id), ['sopro']);
  // Salvo pela versão 7 (já com recursos e ainda com a rolagem velha): também limpa.
  const v7 = { ...v6, recursos: [{ id: 'sopro', nome: 'Sopro de Fogo', max: 1, recarga: '5' }] };
  assert.deepStrictEqual(L.migrarFicha(v7, MONSTROS_PADRAO).rolagens.map(r => r.nome), ['Sopro de Fogo']);
  assert.deepStrictEqual(L.limparFicha(L.migrarFicha(m, MONSTROS_PADRAO)), m, 'rodar de novo não muda nada');
  // Quem apagou o uso de recarga fica com a rolagem; ficha de outro id não é tocada.
  const semUso = { ...v6, recursos: [] };
  assert.strictEqual(L.migrarFicha(semUso, MONSTROS_PADRAO).rolagens.length, 2);
  const outra = { id: 'f-1', nome: 'Ana', rolagens: v6.rolagens };
  assert.strictEqual(L.migrarFicha(outra, MONSTROS_PADRAO), outra);
  // Vampiro: "Recarga do Encanto (5–6)"
  const vamp = L.migrarFicha({ id: 'm-vampiro', nome: 'Vampiro', rolagens: [{ nome: 'Recarga do Encanto (5–6)', expr: '1d6' }] }, MONSTROS_PADRAO);
  assert.deepStrictEqual(vamp.rolagens, []);
});

teste('aplicarExaustao: "2×1d20" sem parênteses também desconta em cada teste', () => {
  assert.strictEqual(L.aplicarExaustao('2×1d20', 1), '2×(1d20−2)');
  assert.strictEqual(L.aplicarExaustao('1d20×2', 2), '(1d20−4)×2');
  assert.strictEqual(L.aplicarExaustao('2×1d20+3', 1), '2×(1d20−2)+3');
  assert.strictEqual(L.aplicarExaustao('2×[1d20]', 1), '2×[1d20]−2', 'colchete rola uma vez: desconta uma vez');
  assert.strictEqual(L.rolarPartes(L.aplicarExaustao('2×1d20', 1), dadoFalso([10, 10])).partes[0].res.total, 16);
  assert.strictEqual(L.rolarPartes(L.aplicarExaustao('1d20×2', 1), dadoFalso([10, 10])).partes[0].res.total, 16);
});

teste('PV máximo 0, negativo ou vazio vira "sem PV"; CA fica entre 0 e 99', () => {
  for (const v of [0, -5, '', null, 'abc', '-3']) assert.strictEqual(L.limparFicha({ nome: 'X', pvMax: v }).pvMax, null, String(v));
  assert.strictEqual(L.limparFicha({ nome: 'X', pvMax: 1e9 }).pvMax, 99999);
  assert.strictEqual(L.limparFicha({ nome: 'X', ca: -2 }).ca, 0);
  assert.strictEqual(L.limparFicha({ nome: 'X', ca: 500 }).ca, 99);
  assert.strictEqual(L.limparFicha({ nome: 'X', ca: '' }).ca, null);
  const c = L.limparCombate({ participantes: [{ id: 'a', nome: 'G 1', pvMax: -4 }] });
  assert.strictEqual(c.participantes[0].pvMax, null);
  // Descanso longo em quem tinha PV máximo negativo não põe PV negativo.
  const f = L.limparFicha({ nome: 'X', pvMax: -5 });
  assert.strictEqual(L.descansar(f, [], 'longo').mudancas.pv, undefined);
});

teste('limparCombate: combatente vinculado não guarda PV/condições/usos próprios', () => {
  const c = L.limparCombate({ participantes: [{ id: 'p', nome: 'Ana', tipo: 'personagem', vinculado: true, fichaId: 'f1',
    ca: 15, pvMax: 20, pv: 3, pvTemp: 5, exaustao: 2, condicoes: ['caido'], gastos: { x: 1 }, iniciativa: 12 }] });
  const p = c.participantes[0];
  assert.deepStrictEqual([p.ca, p.pvMax, p.pv, p.pvTemp, p.exaustao, p.condicoes, p.gastos, p.iniciativa],
    [null, null, null, 0, 0, [], {}, 12]);
});

teste('voltar turno desfaz a recarga do início da vez, mas não o que o Mestre mexeu depois', () => {
  const antes = { sopro: 1, acoes: 3, res: 1 };
  const depois = { res: 1 };  // o Sopro recarregou e as Ações Lendárias voltaram
  const m = L.mudancaDeGastos(antes, depois);
  assert.deepStrictEqual(m.ids.sort(), ['acoes', 'sopro']);
  assert.deepStrictEqual(L.desfazerGastos(depois, m), antes);
  // O Mestre gastou de novo o Sopro durante o turno: o Sopro fica como está.
  assert.deepStrictEqual(L.desfazerGastos({ res: 1, sopro: 1 }, m), { res: 1, sopro: 1, acoes: 3 });
  assert.deepStrictEqual(L.desfazerGastos({ a: 1 }, null), { a: 1 });
  // O desfazer sobrevive a salvar/recarregar (limparCombate), só para quem está com a vez.
  const comb = { participantes: [{ id: 'd', nome: 'Dragão 1' }, { id: 'g', nome: 'Goblin 1' }], vez: 'd', rodada: 2,
    desfazer: { id: 'd', ...m } };
  const limpo = L.limparCombate(comb);
  assert.deepStrictEqual(L.desfazerGastos(depois, limpo.desfazer), antes);
  assert.deepStrictEqual(L.limparCombate(limpo), limpo);
  assert.strictEqual(L.limparCombate({ ...comb, vez: 'g' }).desfazer, undefined);
});

teste('podarGastos: uso apagado no editor não deixa contagem órfã', () => {
  assert.deepStrictEqual(L.podarGastos({ a: 1, b: 2 }, [{ id: 'a' }]), { a: 1 });
  assert.deepStrictEqual(L.podarGastos(undefined, []), {});
});

teste('backup e dados salvos estragados: histórico, favoritos e config conferidos campo a campo', () => {
  const h = L.limparHistorico([{ expr: '1d6', titulo: 5, resumo: {}, detalhe: ['x'], quando: 'ontem' },
    { expr: '1d20', total: 12 }, { expr: 3 }, null, { expr: '1d4', quando: 1e20 }]);
  assert.deepStrictEqual(h, [{ titulo: '', expr: '1d6' }, { titulo: '', expr: '1d20', resumo: '12' }, { titulo: '', expr: '1d4' }]);
  const atual = { titulo: 'Ana — Espada', expr: 'Acerto: 1d20+5', resumo: 'Acerto 17', detalhe: 'x', quando: Date.now() - 1000 };
  assert.deepStrictEqual(L.limparHistorico([atual]), [atual], 'item atual passa igual');
  assert.deepStrictEqual(L.limparHistorico('lixo'), []);
  assert.deepStrictEqual(L.limparFavoritos([{ nome: 'a', expr: '1d6', extra: 1 }, { nome: 1, expr: 'x' }]), [{ nome: 'a', expr: '1d6' }]);
  const padrao = { tema: 'classico', vibrar: true, aba: 'dados' };
  assert.deepStrictEqual(L.limparConfig({ tema: 'neon', vibrar: 'sim', lixo: 1 }, padrao), { tema: 'neon', vibrar: true, aba: 'dados' });
  assert.deepStrictEqual(L.limparConfig('abc', padrao), padrao);
  assert.deepStrictEqual(L.limparConfig([1], padrao), padrao);
  const b = L.lerBackup({ app: 'rolador-de-dados', fichas: [], historico: [{ expr: '<b>1d6</b>', titulo: {} }] });
  assert.deepStrictEqual(b.historico, [{ titulo: '', expr: '<b>1d6</b>' }]);
});

teste('dado com faces demais dá erro claro (antes travava o sorteio com crypto)', () => {
  assert.throws(() => L.analisar('1d9999999999'), /no máximo 1\.000\.000 de faces/);
  assert.throws(() => L.analisar('1d4294967296'), /faces/);
  assert.strictEqual(L.rolar('1d1000000', () => 1000000).total, 1000000);
  const r = L.rolarDadoCripto(1000000);
  assert.ok(r >= 1 && r <= 1000000);
});

console.log(`\n${ok} passaram, ${falhou} falharam.`);
process.exit(falhou ? 1 : 0);
