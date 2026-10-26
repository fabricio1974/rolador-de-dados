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
  const x = R.limparPersonagem({ ...pandora, pv: 3, pvTemp: 4, classes: [{ ...pandora.classes[0], gastos: 2 }], espacos: { 1: { max: 3, usados: 3 }, 2: { max: 2, usados: 1 } } });
  const d = R.descansoLongo(x);
  assert.strictEqual(d.pv, 25); assert.strictEqual(d.pvTemp, 0); assert.strictEqual(d.classes[0].gastos, 0);
  assert.deepStrictEqual(d.espacos, { 1: { max: 3, usados: 0 }, 2: { max: 2, usados: 0 } });
  assert.strictEqual(x.espacos[1].usados, 3);                   // não mexe no original
  assert.strictEqual(R.ganhoDeNivel(pandora), 6);               // média do d6 (4) + CON 2
  assert.strictEqual(R.ganhoDeNivel(pandora, 1), 3);
  assert.strictEqual(R.ganhoDeNivel(R.limparPersonagem({ atributos: { con: 1 } }), 1), 1);  // nunca menos de 1
});

teste('limparPersonagem conserta dados estragados', () => {
  const x = R.limparPersonagem({ nivel: 99, pvMax: -5, pv: 'abc', atributos: { for: 50, des: 'x' }, pericias: { arcanismo: 7, nada: 1 },
    espacos: { 1: { max: 2, usados: 9 }, 10: { max: 3 } }, ataques: 'não', magias: [null, { nome: 'Luz', nivel: 12 }], dadoVida: 7 });
  assert.strictEqual(x.classes[0].dadoVida, 8);
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
  assert.deepStrictEqual(R.limparPersonagem(x), x);             // limpar de novo não muda nada
});

teste('importar: um personagem, lista ou backup', () => {
  assert.strictEqual(R.lerImportacao(pandora).length, 1);
  assert.strictEqual(R.lerImportacao([pandora, pandora]).length, 2);
  assert.strictEqual(R.lerImportacao({ app: 'ficha-de-personagem', personagens: [pandora] })[0].nome, 'Pandora');
  assert.throws(() => R.lerImportacao({ qualquer: 1 }), /não é uma ficha/);
  assert.throws(() => R.lerImportacao({ personagens: [] }), /nenhuma ficha/);
});

teste('fichas antigas viram a lista de classes', () => {
  const velha = R.limparPersonagem({ nome: 'X', classe: 'Clériga', nivel: 5, dadoVida: 8, dadosVidaGastos: 2 });
  assert.deepStrictEqual(velha.classes, [{ id: 'clerigo', nome: 'Clériga', nivel: 5, dadoVida: 8, subclasse: '', gastos: 2 }]);
  assert.strictEqual(velha.nivel, 5);
  assert.deepStrictEqual(['Bardo', 'Barbarian', 'Feiticeira', 'Wizard', 'Monja', 'Xamã'].map(R.acharClasse), ['bardo', 'barbaro', 'feiticeiro', 'mago', 'monge', '']);
  const multi = R.limparPersonagem({ classes: [{ id: 'mago', nivel: 15, dadoVida: 6 }, { id: 'guerreiro', nivel: 9, dadoVida: 10, gastos: 1 }] });
  assert.strictEqual(multi.nivel, 20);                           // total cortado em 20
  assert.strictEqual(R.textoDadosDeVida(multi), '4d10+15d6');
  assert.strictEqual(R.dadosDeVidaRestantes(multi), 19);
  assert.strictEqual(R.classeENivelDe(multi), 'Classe 15 / Classe 5');
});

teste('espaços de magia por classe (completo, meio, pacto e multiclasse)', () => {
  const dados = { classes: [
    { id: 'mago', conjuracao: { tipo: 'completa' } }, { id: 'paladino', conjuracao: { tipo: 'meia' } },
    { id: 'bruxo', conjuracao: { tipo: 'pacto', espacosPacto: [1, 2, 2, 2, 2], nivelPacto: [1, 1, 2, 2, 3] } }, { id: 'guerreiro', conjuracao: null },
  ] };
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'mago', nivel: 3 }], dados), { 1: 4, 2: 2 });
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'paladino', nivel: 1 }], dados), { 1: 2 });
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'paladino', nivel: 5 }], dados), { 1: 4, 2: 2 });
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'mago', nivel: 3 }, { id: 'paladino', nivel: 3 }], dados), { 1: 4, 2: 3, 3: 2 });  // conjurador 3 + 2 = 5
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'bruxo', nivel: 5 }], dados), { 3: 2 });
  assert.strictEqual(R.espacosDasClasses([{ id: 'guerreiro', nivel: 5 }], dados), null);
  assert.deepStrictEqual(R.aplicarEspacos({ 1: { max: 3, usados: 3 } }, { 1: 4, 2: 2 }), { 1: { max: 4, usados: 3 }, 2: { max: 2, usados: 0 } });
});

teste('aumento de atributo e truques', () => {
  const a = { for: 8, des: 16, con: 14, int: 19, sab: 12, car: 8 };
  assert.deepStrictEqual(R.aplicarAumento(a, ['des']).des, 18);
  const dois = R.aplicarAumento(a, ['int', 'sab']);
  assert.deepStrictEqual([dois.int, dois.sab], [20, 13]);
  assert.strictEqual(R.aplicarAumento(a, ['int']).int, 20);       // não passa de 20
  assert.deepStrictEqual([1, 4, 5, 10, 11, 17].map(R.escalaTruque), [1, 1, 2, 2, 3, 4]);
  assert.strictEqual(R.escalarDados('Dano: 1d10; Fogo: 2d6+1', 3), 'Dano: 3d10; Fogo: 6d6+1');
  const raio = R.limparMagia({ nome: 'Raio de Fogo', nivel: 0, ataque: true, escala: true, rolagem: '1d10' });
  assert.strictEqual(R.exprMagia(R.limparPersonagem({ ...pandora, classes: [{ id: 'mago', nivel: 5, dadoVida: 6 }] }), raio), 'Ataque: 1d20+6; Dano: 2d10');
  const cura = R.limparMagia({ nome: 'Curar Ferimentos', nivel: 1, somarMod: true, rolagem: 'Cura: 2d8' });
  assert.strictEqual(R.exprMagia(pandora, cura), 'Cura: 2d8+3');
  const dc = { niveis: [{ nivel: 4, caracteristicas: [{ nome: 'Aumento no Valor de Atributo' }] }, { nivel: 5, caracteristicas: [{ nome: 'Outra' }] }] };
  assert.deepStrictEqual([R.ganhaAumento(dc, 4), R.ganhaAumento(dc, 5), R.ganhaAumento(null, 4)], [true, false, false]);
});

teste('dados do SRD em português: completos e coerentes', () => {
  const D = require('./dados5e.js');
  assert.strictEqual(D.classes.length, 12);
  assert.strictEqual(D.magias.length, 339);
  const ids = new Set(D.classes.map(c => c.id));
  const pericias = new Set(R.PERICIAS.map(x => x.id));
  for (const c of D.classes) {
    assert.strictEqual(c.niveis.length, 20, c.id);
    assert.ok([6, 8, 10, 12].includes(c.dadoVida), c.id);
    assert.ok(c.pericias.lista.every(x => pericias.has(x)), c.id + ' perícias');
    assert.ok(c.subclasse && c.subclasse.caracteristicas.length, c.id + ' subclasse');
    if (c.conjuracao) assert.ok(c.conjuracao.truques.length === 20 && c.conjuracao.preparadas.length === 20, c.id);
    for (const nv of [4, 8, 12, 16, 19]) assert.ok(R.ganhaAumento(c, nv), `${c.id} nível ${nv} sem aumento/dádiva`);
  }
  for (const m of D.magias) {
    assert.ok(m.classes.length && m.classes.every(x => ids.has(x)), m.id + ' classes');
    assert.ok(m.nivel >= 0 && m.nivel <= 9 && m.descricao.length > 20, m.id);
    if (m.rolagem) L.validar(m.rolagem);
  }
  for (const a of D.armas) L.validar(a.dano);
  for (const a of D.antecedentes) {
    assert.ok(D.talentos.some(t => t.id === a.talento), a.id + ' talento');
    assert.ok(a.pericias.every(x => pericias.has(x)), a.id + ' perícias');
  }
  assert.ok(D.talentos.some(t => t.aumento && t.aumento.dividir), 'talento Aumento no Valor de Atributo');
  // Mago 2024: 3 truques no 1, 4 no 4; Paladino sem truques; Bruxo 5 com 2 espaços de 3º
  const mago = D.classes.find(c => c.id === 'mago'), bruxo = D.classes.find(c => c.id === 'bruxo');
  assert.deepStrictEqual([mago.conjuracao.truques[0], mago.conjuracao.truques[3]], [3, 4]);
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'bruxo', nivel: 5 }], D), { 3: 2 });
  assert.deepStrictEqual(R.espacosDasClasses([{ id: 'paladino', nivel: 2 }], D), { 1: 2 });
  assert.strictEqual(bruxo.conjuracao.tipo, 'pacto');
});

console.log(`\n${passaram} passaram, ${falharam} falharam.`);
if (falharam) process.exit(1);
