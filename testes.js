// Testes da lógica do rolador. Rode com:  node testes.js
// Ele lê o index.html, pega só o bloco entre "INÍCIO DA LÓGICA" e "FIM DA LÓGICA"
// e testa essas funções sem precisar abrir navegador.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const bloco = html.match(/\/\/ ===== INÍCIO DA LÓGICA =====([\s\S]*?)\/\/ ===== FIM DA LÓGICA =====/)[1];
const L = vm.runInNewContext(
  bloco + '\n({ analisar, rolar, descrever, contarDados, rolarDadoCripto, apertarDado, apertarD, apertarOperador, apertarAbre, apertarFecha, alternarVantagem, estatisticas })',
  { crypto: globalThis.crypto }
);

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

console.log(`\n${ok} passaram, ${falhou} falharam.`);
process.exit(falhou ? 1 : 0);
