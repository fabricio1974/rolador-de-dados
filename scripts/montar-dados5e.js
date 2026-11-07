// Junta os JSON de ficha/dados/ (tradução do SRD 5.2.1) num só arquivo, ficha/dados5e.js,
// carregado com <script> (assim funciona até abrindo o index.html direto, sem servidor).
// Rode depois de mudar algum JSON:  node scripts/montar-dados5e.js
const fs = require('fs');
const path = require('path');
const pasta = path.join(__dirname, '..', 'ficha', 'dados');
const ler = (n) => JSON.parse(fs.readFileSync(path.join(pasta, n), 'utf8'));
const c2 = ler('classes_2.json');
const origens = ler('origens_equipamento.json');
const ORDEM = ['barbaro', 'bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'guerreiro', 'ladino', 'mago', 'monge', 'paladino', 'patrulheiro'];
const dados = {
  classes: [...ler('classes_1.json'), ...c2.classes].sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id)),
  invocacoes: c2.invocacoes,
  metamagias: c2.metamagias || [],
  magias: [1, 2, 3, 4].flatMap(n => ler(`magias_${n}.json`)),
  ...origens,
};
// Talentos fora do SRD (resumos próprios do Livro do Jogador 2024, conferidos no 5e.tools/XPHB).
for (const n of ['talentos_extra_geral.json', 'talentos_extra_outros.json']) {
  const ja = new Set(dados.talentos.map(t => t.en));
  for (const t of ler(n)) if (!ja.has(t.en)) dados.talentos.push(t);
}
const ORDEM_TAL = ['Origem', 'Geral', 'Estilo de Luta', 'Dádiva Épica'];
dados.talentos.sort((a, b) => ORDEM_TAL.indexOf(a.categoria) - ORDEM_TAL.indexOf(b.categoria) || a.nome.localeCompare(b.nome, 'pt'));
// Subclasses fora do SRD (resumos próprios): cada classe passa a ter a lista "subclasses".
const extras = ler('subclasses_extra.json');
for (const c of dados.classes) c.subclasses = [c.subclasse, ...(extras[c.id] || [])];
const ids = new Set();
for (const m of dados.magias) { if (ids.has(m.id)) throw new Error('magia repetida: ' + m.id); ids.add(m.id); }
const cabecalho = '// GERADO por scripts/montar-dados5e.js a partir de ficha/dados/*.json. Não edite à mão.\n' +
  '// Inclui material do System Reference Document 5.2.1 ("SRD 5.2.1"), da Wizards of the Coast LLC,\n' +
  '// https://www.dndbeyond.com/srd, licenciado sob CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/legalcode).\n' +
  '// Tradução para o português não oficial.\n';
fs.writeFileSync(path.join(pasta, '..', 'dados5e.js'), cabecalho + 'const DADOS5E = ' + JSON.stringify(dados) + ';\n' +
  "if (typeof module !== 'undefined') module.exports = DADOS5E;\n");
console.log(Object.entries(dados).map(([k, v]) => `${k} ${v.length}`).join(', '));
