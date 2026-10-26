// Testes da lógica da Ficha (node ficha/testes.js). Não abrem a tela.
const assert = require('assert');
const L = require('../js/logica.js');
const R = require('./regras.js');
let passaram = 0, falharam = 0;
function teste(nome, fn) {
  try { fn(); passaram++; } catch (e) { falharam++; console.log('FALHOU:', nome, '\n ', e.message); }
}

teste('modificador e proficiência', () => {
  assert.deepStrictEqual([1, 8, 9, 10, 11, 16, 20, 30].map(R.modificador), [-5, -1, -1, 0, 0, 3, 5, 10]);
  assert.deepStrictEqual([1, 4, 5, 8, 9, 13, 17, 20].map(R.proficiencia), [2, 2, 3, 3, 4, 5, 6, 6]);
  assert.strictEqual(R.comSinal(3), '+3');
  assert.strictEqual(R.comSinal(0), '+0');
  assert.strictEqual(R.comSinal(-1), '-1');
});

const pandora = R.exemploPandora();
teste('Pandora bate com a ficha das fotos', () => {
  assert.strictEqual(R.iniciativa(pandora), 3);
  assert.strictEqual(R.profDe(pandora), 2);
  assert.deepStrictEqual(R.ATRIBUTOS.map(a => R.salvaguarda(pandora, a.id)), [-1, 3, 2, 5, 3, -1]);
  assert.strictEqual(R.pericia(pandora, 'arcanismo'), 7);       // especialista
  assert.strictEqual(R.pericia(pandora, 'historia'), 5);
  assert.strictEqual(R.pericia(pandora, 'percepcao'), 3);
  assert.strictEqual(R.pericia(pandora, 'intuicao'), 1);
  assert.strictEqual(R.pericia(pandora, 'atletismo'), -1);
  assert.strictEqual(R.ataqueMagia(pandora), 5);
  assert.strictEqual(R.cdMagia(pandora), 13);
  const armas = pandora.ataques.map(a => `${R.comSinal(R.bonusAtaque(pandora, a))} ${R.exprDano(pandora, a)}`);
  assert.deepStrictEqual(armas, ['+1 1d8-1', '+5 1d4+3', '+5 1d6+3', '+5 1d4+3', '+6 1d12+1d4+4']);
});

teste('as expressões geradas rolam no parser do Rolador', () => {
  for (const a of pandora.ataques) L.validar(`Ataque: 1d20${R.comSinal(R.bonusAtaque(pandora, a))}; Dano: ${R.exprDano(pandora, a)}`);
  for (const m of pandora.magias) { const e = R.exprMagia(pandora, m); if (e) L.validar(e); }
  assert.strictEqual(R.exprMagia(pandora, pandora.magias.find(m => m.nome.startsWith('Raio'))), 'Ataque: 1d20+5; Dano: 1d8');
  assert.strictEqual(R.exprMagia(pandora, pandora.magias.find(m => m.nome.startsWith('Mísseis'))), '3×(1d4+1)');
});

teste('dano sem dados e sem modificador', () => {
  const a = R.limparAtaque({ atributo: '', dano: '', bonusDano: 2 });
  assert.strictEqual(R.exprDano(pandora, a), '2');
  assert.strictEqual(R.exprDano(pandora, R.limparAtaque({ atributo: 'des', dano: '1d6', somarMod: false })), '1d6');
});

teste('dano gasta PV temporários primeiro; cura para no máximo', () => {
  const x = { ...pandora, pv: 20, pvTemp: 5 };
  assert.deepStrictEqual(R.sofrerDano(x, 3), { pvTemp: 2, pv: 20 });
  assert.deepStrictEqual(R.sofrerDano(x, 8), { pvTemp: 0, pv: 17 });
  assert.deepStrictEqual(R.sofrerDano(x, 99), { pvTemp: 0, pv: 0 });
  assert.strictEqual(R.curar(x, 100), 25);
});

teste('descanso longo e subir de nível', () => {
  const x = R.limparPersonagem({ ...pandora, pv: 3, pvTemp: 4, dadosVidaGastos: 2, espacos: { 1: { max: 3, usados: 3 }, 2: { max: 2, usados: 1 } } });
  const d = R.descansoLongo(x);
  assert.strictEqual(d.pv, 25); assert.strictEqual(d.pvTemp, 0); assert.strictEqual(d.dadosVidaGastos, 0);
  assert.deepStrictEqual(d.espacos, { 1: { max: 3, usados: 0 }, 2: { max: 2, usados: 0 } });
  assert.strictEqual(x.espacos[1].usados, 3);                   // não mexe no original
  assert.strictEqual(R.ganhoDeNivel(pandora), 6);               // média do d6 (4) + CON 2
  assert.strictEqual(R.ganhoDeNivel(pandora, 1), 3);
  assert.strictEqual(R.ganhoDeNivel(R.limparPersonagem({ atributos: { con: 1 } }), 1), 1);  // nunca menos de 1
});

teste('limparPersonagem conserta dados estragados', () => {
  const x = R.limparPersonagem({ nivel: 99, pvMax: -5, pv: 'abc', atributos: { for: 50, des: 'x' }, pericias: { arcanismo: 7, nada: 1 },
    espacos: { 1: { max: 2, usados: 9 }, 10: { max: 3 } }, ataques: 'não', magias: [null, { nome: 'Luz', nivel: 12 }], dadoVida: 7 });
  assert.strictEqual(x.nivel, 20);
  assert.strictEqual(x.pvMax, 1);
  assert.strictEqual(x.pv, 1);
  assert.strictEqual(x.atributos.for, 30);
  assert.strictEqual(x.atributos.des, 10);
  assert.deepStrictEqual(x.pericias, { arcanismo: 2 });
  assert.deepStrictEqual(x.espacos, { 1: { max: 2, usados: 2 } });
  assert.deepStrictEqual(x.ataques, []);
  assert.strictEqual(x.magias.length, 2);
  assert.strictEqual(x.magias[1].nivel, 9);
  assert.strictEqual(x.dadoVida, 8);
  assert.deepStrictEqual(R.limparPersonagem(x), x);             // limpar de novo não muda nada
});

teste('importar: um personagem, lista ou backup', () => {
  assert.strictEqual(R.lerImportacao(pandora).length, 1);
  assert.strictEqual(R.lerImportacao([pandora, pandora]).length, 2);
  assert.strictEqual(R.lerImportacao({ app: 'ficha-de-personagem', personagens: [pandora] })[0].nome, 'Pandora');
  assert.throws(() => R.lerImportacao({ qualquer: 1 }), /não é uma ficha/);
  assert.throws(() => R.lerImportacao({ personagens: [] }), /nenhuma ficha/);
});

console.log(`\n${passaram} passaram, ${falharam} falharam.`);
if (falharam) process.exit(1);
