// ===== LÓGICA DO ROLADOR =====
// Só funções puras: não mexem na tela nem no localStorage. Por isso o arquivo
// testes.js consegue testá-las sozinhas, no Node, sem navegador.

const LIMITE_DADOS = 1000; // proteção para "1000×(1000d6)" não travar o celular

// 1) TOKENIZADOR: transforma o texto em uma lista de "peças" (tokens).
//    "2d12+3×(3d6)" -> [2] [d] [12] [+] [3] [×] [(] [3] [d] [6] [)]
function tokenizar(texto) {
  const s = String(texto)
    .toLowerCase()
    .replace(/[−–—]/g, '-')   // vários tipos de "menos" viram "-"
    .replace(/[*x·]/g, '×')   // "*" e "x" do teclado do celular viram "×"
    .replace(/\s+/g, '');     // ignora espaços
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      tokens.push({ tipo: 'num', valor: Number(s.slice(i, j)) });
      i = j;
    } else if ('d+-×()[]'.includes(c)) {
      tokens.push({ tipo: c });
      i++;
    } else if (c === 'k' && (s[i + 1] === 'h' || s[i + 1] === 'l')) {
      tokens.push({ tipo: 'k', alto: s[i + 1] === 'h' }); // kh = manter maiores, kl = menores
      i += 2;
    } else {
      throw new Error(`Caractere inválido: "${c}". Use números, d, +, −, ×, ( ) e [ ].`);
    }
  }
  return tokens;
}

function simbolo(token) {
  if (token.tipo === 'num') return String(token.valor);
  if (token.tipo === 'k') return token.alto ? 'kh' : 'kl';
  return token.tipo === '-' ? '−' : token.tipo;
}

// 2) PARSER: transforma os tokens em uma ÁRVORE que representa a conta.
//    Gramática (do mais fraco para o mais forte):
//      soma     = produto (("+" | "−") produto)*
//      produto  = unario ("×" unario)*
//      unario   = "−" unario | primario
//      primario = número | [número] "d" número [("kh"|"kl") [número]]
//               | "(" soma ")" | "[" soma "]"
function analisar(texto) {
  const tokens = tokenizar(texto);
  if (tokens.length === 0) throw new Error('A expressão está vazia.');
  let i = 0;
  const ver = () => tokens[i];
  const pegar = () => tokens[i++];

  function soma() {
    let no = produto();
    while (ver() && (ver().tipo === '+' || ver().tipo === '-')) {
      const op = pegar().tipo;
      no = { tipo: op === '+' ? 'mais' : 'menos', esq: no, dir: produto() };
    }
    return no;
  }

  function produto() {
    let no = unario();
    while (ver() && ver().tipo === '×') {
      pegar();
      no = multiplicacao(no, unario());
    }
    return no;
  }

  function unario() {
    if (ver() && ver().tipo === '-') { pegar(); return { tipo: 'neg', alvo: unario() }; }
    if (ver() && ver().tipo === '+') { pegar(); return unario(); }
    return primario();
  }

  function primario() {
    const t = ver();
    if (!t) throw new Error('A expressão terminou no meio: falta um número, um dado ou fechar ")" / "]".');
    if (t.tipo === '(' || t.tipo === '[') {
      pegar();
      const fecha = t.tipo === '(' ? ')' : ']';
      const dentro = soma();
      if (!ver() || ver().tipo !== fecha) throw new Error(`Falta fechar com "${fecha}".`);
      pegar();
      return { tipo: t.tipo === '(' ? 'grupo' : 'colchete', dentro };
    }
    if (t.tipo === 'num' || t.tipo === 'd') {
      let qtd = 1;
      if (t.tipo === 'num') {
        pegar();
        if (!ver() || ver().tipo !== 'd') return { tipo: 'num', valor: t.valor };
        qtd = t.valor;
      }
      pegar(); // o "d"
      const faces = ver();
      if (!faces || faces.tipo !== 'num') throw new Error('Depois do "d" vem o número de faces (ex.: d6).');
      pegar();
      if (qtd < 1) throw new Error('A quantidade de dados precisa ser pelo menos 1.');
      if (faces.valor < 2) throw new Error('Um dado precisa ter pelo menos 2 faces.');
      const no = { tipo: 'dado', qtd, faces: faces.valor };
      if (ver() && ver().tipo === 'k') {
        const alto = pegar().alto;
        const n = ver() && ver().tipo === 'num' ? pegar().valor : 1;
        if (n < 1 || n > qtd) throw new Error(`Em ${qtd}d${faces.valor}, só dá para manter de 1 a ${qtd} dados.`);
        no.manter = { alto, n };
      }
      return no;
    }
    if (t.tipo === ')' || t.tipo === ']') throw new Error(`Há um "${t.tipo}" sem conteúdo ou sem abertura antes dele.`);
    throw new Error(`Esperava um número, dado, "(" ou "[", mas encontrei "${simbolo(t)}".`);
  }

  const arvore = soma();
  if (i < tokens.length) {
    const t = tokens[i];
    if (t.tipo === ')' || t.tipo === ']') throw new Error(`Há um "${t.tipo}" sem abertura correspondente.`);
    throw new Error(`Falta um operador (+, −, ×) antes de "${simbolo(t)}".`);
  }
  if (contarDados(arvore) > LIMITE_DADOS) {
    throw new Error(`Dados demais! O limite é ${LIMITE_DADOS} dados por rolagem.`);
  }
  return arvore;
}

// O "×" tem dois sentidos, e quem decide é o tipo de agrupamento:
//   3×(3d6) -> REPETIÇÃO: rola (3d6) três vezes, de forma independente, e soma.
//   3×[3d6] -> MULTIPLICAÇÃO: rola 3d6 uma vez e multiplica o resultado por 3.
// Um dos lados precisa ser um número fixo.
function multiplicacao(esq, dir) {
  const esqTemDados = temDados(esq);
  const dirTemDados = temDados(dir);
  if (esqTemDados && dirTemDados) {
    throw new Error('Não dá para multiplicar dado por dado. Use N×(...) para repetir ou N×[...] para multiplicar.');
  }
  const [fator, alvo, invertido] = esqTemDados ? [dir, esq, true] : [esq, dir, false];
  if (alvo.tipo === 'colchete' || !temDados(alvo)) return { tipo: 'mult', fator, alvo, invertido };
  if (valorConstante(fator) < 0) throw new Error('O número de repetições não pode ser negativo. Para multiplicar, use [ ].');
  return { tipo: 'rep', vezes: fator, alvo, invertido };
}

function temDados(no) {
  switch (no.tipo) {
    case 'dado': return true;
    case 'num': return false;
    case 'neg': return temDados(no.alvo);
    case 'grupo': case 'colchete': return temDados(no.dentro);
    case 'rep': case 'mult': return temDados(no.alvo);
    default: return temDados(no.esq) || temDados(no.dir); // mais / menos
  }
}

// Valor de um pedaço SEM dados (ex.: o "3" de 3×(...), ou "(2+1)").
function valorConstante(no) {
  switch (no.tipo) {
    case 'num': return no.valor;
    case 'neg': return -valorConstante(no.alvo);
    case 'grupo': case 'colchete': return valorConstante(no.dentro);
    case 'rep': return valorConstante(no.vezes) * valorConstante(no.alvo);
    case 'mult': return valorConstante(no.fator) * valorConstante(no.alvo);
    case 'mais': return valorConstante(no.esq) + valorConstante(no.dir);
    case 'menos': return valorConstante(no.esq) - valorConstante(no.dir);
    default: throw new Error('Esperava um número fixo.');
  }
}

// Quantos dados serão rolados no total (sem rolar nada).
function contarDados(no) {
  switch (no.tipo) {
    case 'dado': return no.qtd;
    case 'num': return 0;
    case 'neg': return contarDados(no.alvo);
    case 'grupo': case 'colchete': return contarDados(no.dentro);
    case 'rep': return valorConstante(no.vezes) * contarDados(no.alvo);
    case 'mult': return contarDados(no.alvo);
    default: return contarDados(no.esq) + contarDados(no.dir);
  }
}

// Escreve a árvore de volta como texto bonito: "3×(3d6)".
function formatar(no) {
  switch (no.tipo) {
    case 'num': return String(no.valor);
    case 'dado': {
      const k = no.manter ? `k${no.manter.alto ? 'h' : 'l'}${no.manter.n}` : '';
      return `${no.qtd}d${no.faces}${k}`;
    }
    case 'neg': return `−${formatar(no.alvo)}`;
    case 'grupo': return `(${formatar(no.dentro)})`;
    case 'colchete': return `[${formatar(no.dentro)}]`;
    case 'rep': case 'mult': {
      const n = formatar(no.tipo === 'rep' ? no.vezes : no.fator);
      return no.invertido ? `${formatar(no.alvo)}×${n}` : `${n}×${formatar(no.alvo)}`;
    }
    case 'mais': return `${formatar(no.esq)}+${formatar(no.dir)}`;
    case 'menos': return `${formatar(no.esq)}−${formatar(no.dir)}`;
  }
}

// 3) ROLAGEM: percorre a árvore rolando os dados.
//    "rolarDado" é passado de fora: no app usa crypto; nos testes, um dado "falso"
//    que devolve números conhecidos. Cada grupo de dados rolados vai para "grupos".
function avaliar(no, rolarDado, grupos) {
  switch (no.tipo) {
    case 'num': return no.valor;
    case 'dado': {
      const dados = [];
      for (let k = 0; k < no.qtd; k++) dados.push({ valor: rolarDado(no.faces), faces: no.faces });
      if (no.manter) {
        // ordena as posições do melhor para o pior e marca o resto como descartado
        const ordem = dados.map((_, k) => k)
          .sort((a, b) => no.manter.alto ? dados[b].valor - dados[a].valor : dados[a].valor - dados[b].valor);
        ordem.slice(no.manter.n).forEach(k => { dados[k].descartado = true; });
      }
      grupos.push(dados);
      return dados.reduce((s, d) => s + (d.descartado ? 0 : d.valor), 0);
    }
    case 'neg': return -avaliar(no.alvo, rolarDado, grupos);
    case 'grupo': case 'colchete': return avaliar(no.dentro, rolarDado, grupos);
    case 'rep': {
      const n = valorConstante(no.vezes);
      let soma = 0;
      for (let k = 0; k < n; k++) soma += avaliar(no.alvo, rolarDado, grupos); // rola DE NOVO a cada vez
      return soma;
    }
    case 'mult': return valorConstante(no.fator) * avaliar(no.alvo, rolarDado, grupos); // rola UMA vez
    case 'mais': return avaliar(no.esq, rolarDado, grupos) + avaliar(no.dir, rolarDado, grupos);
    case 'menos': return avaliar(no.esq, rolarDado, grupos) - avaliar(no.dir, rolarDado, grupos);
  }
}

// Separa a expressão nas parcelas de cima: "2d12+3×(3d6)" -> [2d12] [3×(3d6)].
function parcelas(no, sinal, lista) {
  if (no.tipo === 'mais') { parcelas(no.esq, sinal, lista); parcelas(no.dir, sinal, lista); }
  else if (no.tipo === 'menos') { parcelas(no.esq, sinal, lista); parcelas(no.dir, -sinal, lista); }
  else lista.push({ sinal, no });
  return lista;
}

// Função principal: texto -> resultado completo, com uma linha por parcela.
function rolar(texto, rolarDado) {
  return rolarArvore(analisar(texto), rolarDado);
}

function rolarArvore(arvore, rolarDado) {
  const linhas = parcelas(arvore, 1, []).map(({ sinal, no }) => {
    const texto = (sinal < 0 ? '−' : '') + formatar(no);
    if (no.tipo === 'rep') {
      // Repetição (ex.: 6×(4d6kh3)): guarda cada vez separada, com o seu valor,
      // para a tela mostrar uma linha por repetição (os 6 atributos, por exemplo).
      const repeticoes = [];
      const n = valorConstante(no.vezes);
      for (let k = 0; k < n; k++) {
        const gruposDaVez = [];
        repeticoes.push({ grupos: gruposDaVez, valor: avaliar(no.alvo, rolarDado, gruposDaVez) });
      }
      const grupos = repeticoes.flatMap(r => r.grupos);
      const subtotal = sinal * repeticoes.reduce((s, r) => s + r.valor, 0);
      return { texto, grupos, subtotal, repeticoes };
    }
    const grupos = [];
    const subtotal = sinal * avaliar(no, rolarDado, grupos);
    return { texto, grupos, subtotal };
  });
  const total = linhas.reduce((s, l) => s + l.subtotal, 0);
  return { expressao: formatar(arvore), linhas, total, stats: estatisticas(arvore) };
}

// Resultado em texto puro, no formato "2d12: [7, 11] = 18". Dado descartado: ~3~.
function descrever(resultado) {
  const linhas = resultado.linhas.map(l => {
    if (l.grupos.length === 0) return `${l.texto}`;
    const grupos = l.grupos
      .map(g => `[${g.map(d => d.descartado ? `~${d.valor}~` : d.valor).join(', ')}]`).join(' ');
    return `${l.texto}: ${grupos} = ${l.subtotal}`;
  });
  linhas.push(`Total: ${resultado.total}`);
  return linhas.join('\n');
}

// 4) ESTATÍSTICAS: menor, maior e média possíveis, sem rolar nada.
//    A média de uma soma é a soma das médias, então dá para calcular parte por parte.
function estatisticas(no) {
  const inverter = (e) => ({ min: -e.max, max: -e.min, media: e.media === null ? null : -e.media });
  const escalar = (e, c) => c >= 0
    ? { min: e.min * c, max: e.max * c, media: e.media === null ? null : e.media * c }
    : inverter(escalar(e, -c));
  const somar = (a, b) => ({
    min: a.min + b.min, max: a.max + b.max,
    media: a.media === null || b.media === null ? null : a.media + b.media,
  });
  switch (no.tipo) {
    case 'num': return { min: no.valor, max: no.valor, media: no.valor };
    case 'dado': {
      if (!no.manter) return { min: no.qtd, max: no.qtd * no.faces, media: no.qtd * (no.faces + 1) / 2 };
      const n = no.manter.n;
      return { min: n, max: n * no.faces, media: mediaMantendo(no.qtd, no.faces, n, no.manter.alto) };
    }
    case 'neg': return inverter(estatisticas(no.alvo));
    case 'grupo': case 'colchete': return estatisticas(no.dentro);
    case 'rep': return escalar(estatisticas(no.alvo), valorConstante(no.vezes));
    case 'mult': return escalar(estatisticas(no.alvo), valorConstante(no.fator));
    case 'mais': return somar(estatisticas(no.esq), estatisticas(no.dir));
    case 'menos': return somar(estatisticas(no.esq), inverter(estatisticas(no.dir)));
  }
}

// Média ao rolar "qtd" dados de "faces" e manter os "n" maiores (alto) ou menores.
// Usa a distribuição binomial: P(pelo menos m dados tirarem >= v).
// Para muitos dados a conta fica pesada, então devolve null (sem média).
function mediaMantendo(qtd, faces, n, alto) {
  if (qtd > 60 || faces > 1000) return null;
  let media = 0;
  for (let v = 1; v <= faces; v++) {
    const p = (faces - v + 1) / faces;      // chance de um dado tirar >= v
    const pmf = [];                          // pmf[i] = P(exatamente i dados >= v)
    let c = 1;                               // coeficiente binomial C(qtd, i)
    for (let i = 0; i <= qtd; i++) {
      pmf.push(c * p ** i * (1 - p) ** (qtd - i));
      c = c * (qtd - i) / (i + 1);
    }
    const peloMenos = [];                    // peloMenos[m] = P(pelo menos m dados >= v)
    let acum = 0;
    for (let i = qtd; i >= 0; i--) { acum += pmf[i]; peloMenos[i] = acum; }
    // o j-ésimo maior é >= v quando pelo menos j dados são >= v
    // o j-ésimo menor é >= v quando pelo menos (qtd-j+1) dados são >= v
    for (let j = 1; j <= n; j++) media += peloMenos[alto ? j : qtd - j + 1];
  }
  return media;
}

// Dado de verdade: crypto.getRandomValues. Descarta números do "resto" para que
// todas as faces tenham exatamente a mesma chance.
function rolarDadoCripto(faces) {
  const limite = Math.floor(0x100000000 / faces) * faces;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limite);
  return (buf[0] % faces) + 1;
}

// 5) TECLADO: o que cada botão faz com o texto do visor.
const termina = {
  emOperador: (e) => /[+\-−×*x]$/.test(e),
  emAbertura: (e) => /[([]$/.test(e),
  emDado: (e) => /d\d+(k[hl]\d*)?$/.test(e),
  emFechamento: (e) => /[)\]]$/.test(e),
  emNumero: (e) => /\d$/.test(e),
};

// Junta um termo novo ao fim da expressão, pondo "+" se precisar.
function juntarTermo(expr, termo) {
  if (termina.emNumero(expr) || termina.emFechamento(expr)) return expr + '+' + termo;
  return expr + termo;
}

function apertarDado(expr, faces) {
  const m = expr.match(/(\d*)d(\d+)$/);
  if (m && Number(m[2]) === faces) {             // mesmo dado de novo: 1d6 -> 2d6
    const qtd = (m[1] === '' ? 1 : Number(m[1])) + 1;
    return expr.slice(0, expr.length - m[0].length) + qtd + 'd' + faces;
  }
  if (termina.emDado(expr) || termina.emFechamento(expr)) return expr + '+1d' + faces; // outro dado: soma
  if (termina.emNumero(expr)) return expr + 'd' + faces;  // "2" + d6 -> "2d6"
  if (expr.endsWith('d')) return expr + faces;            // "3d" + d6 -> "3d6"
  return expr + '1d' + faces;
}

// Botão "dX": põe só o "d" para você digitar as faces (ex.: 3, dX, 7 -> 3d7).
function apertarD(expr) {
  if (expr.endsWith('d')) return expr;
  if (termina.emDado(expr) || termina.emFechamento(expr)) return expr + '+d';
  return expr + 'd';
}

function apertarOperador(expr, op) {
  if ((expr === '' || termina.emAbertura(expr)) && op !== '−') return expr;
  if (termina.emOperador(expr)) return expr.slice(0, -1) + op; // troca o operador
  return expr + op;
}

// "(" ou "[": depois de um número vira "×(" (o número é quem repete/multiplica).
function apertarAbre(expr, abre) {
  if (termina.emDado(expr) || termina.emFechamento(expr)) return expr + '+' + abre;
  if (termina.emNumero(expr)) return expr + '×' + abre;
  return expr + abre;
}

// ")" ou "]": só fecha se o último aberto for do mesmo tipo e já houver conteúdo.
function apertarFecha(expr, fecha) {
  const pilha = [];
  for (const c of expr) {
    if (c === '(' || c === '[') pilha.push(c);
    else if (c === ')' || c === ']') pilha.pop();
  }
  const abre = fecha === ')' ? '(' : '[';
  if (pilha[pilha.length - 1] !== abre) return expr;
  if (termina.emAbertura(expr) || termina.emOperador(expr)) return expr;
  return expr + fecha;
}

// Vantagem / Desvantagem: troca o último 1d20 por 2d20kh1 (ou kl1).
// Tocar de novo no mesmo botão volta para 1d20; tocar no outro troca.
function alternarVantagem(expr, alto) {
  const novo = `2d20k${alto ? 'h' : 'l'}1`;
  const ja = expr.match(/2d20k([hl])1?(?!\d)/);
  if (ja) return expr.replace(ja[0], ja[1] === (alto ? 'h' : 'l') ? '1d20' : novo);
  const re = /(^|[^\d])(1?d20)(?![\dk])/g;
  let ultimo = null, m;
  while ((m = re.exec(expr))) ultimo = m;
  if (ultimo) {
    const ini = ultimo.index + ultimo[1].length;
    return expr.slice(0, ini) + novo + expr.slice(ini + ultimo[2].length);
  }
  return juntarTermo(expr, novo);
}

// 6) ROLAGEM EM PARTES: "Acerto: 1d20+5; Dano: 2d6+3" rola as duas de uma vez.
//    Cada parte (separada por ";") pode ter um nome antes de ":".
function separarPartes(texto) {
  const partes = String(texto).split(';').map(p => p.trim()).filter(p => p !== '');
  if (partes.length === 0) throw new Error('A expressão está vazia.');
  return partes.map(p => {
    const dois = p.indexOf(':');
    if (dois < 0) return { rotulo: '', expr: p };
    return { rotulo: p.slice(0, dois).trim(), expr: p.slice(dois + 1).trim() };
  });
}

// Confere todas as partes sem rolar (para salvar favoritos e fichas).
function validar(texto) {
  return separarPartes(texto).map(p => {
    try { return { ...p, arvore: analisar(p.expr) }; }
    catch (e) { throw new Error((p.rotulo ? `${p.rotulo}: ` : '') + e.message); }
  });
}

function temD20(no) {
  switch (no.tipo) {
    case 'dado': return no.faces === 20;
    case 'num': return false;
    case 'neg': return temD20(no.alvo);
    case 'grupo': case 'colchete': return temD20(no.dentro);
    case 'rep': case 'mult': return temD20(no.alvo);
    default: return temD20(no.esq) || temD20(no.dir);
  }
}

// Crítico (regra 2024): rola o DOBRO de dados de dano; os modificadores não dobram.
function dobrarDados(no) {
  switch (no.tipo) {
    case 'dado': return { ...no, qtd: no.qtd * 2, manter: no.manter && { ...no.manter, n: no.manter.n * 2 } };
    case 'num': return no;
    case 'neg': return { ...no, alvo: dobrarDados(no.alvo) };
    case 'grupo': case 'colchete': return { ...no, dentro: dobrarDados(no.dentro) };
    case 'rep': case 'mult': return { ...no, alvo: dobrarDados(no.alvo) };
    default: return { ...no, esq: dobrarDados(no.esq), dir: dobrarDados(no.dir) };
  }
}

// Valor do primeiro d20 que valeu (não descartado), ou null se não houver.
function d20Natural(resultado) {
  for (const l of resultado.linhas) for (const g of l.grupos) for (const d of g) {
    if (d.faces === 20 && !d.descartado) return d.valor;
  }
  return null;
}

// Rola todas as partes. Uma parte com d20 é um "teste/ataque": se tirar 20 natural,
// as partes seguintes SEM d20 (o dano) rolam com dados dobrados, até o próximo ataque.
function rolarPartes(texto, rolarDado, opcoes = {}) {
  const usarCritico = opcoes.critico !== false;
  let critico = false;
  const partes = validar(texto).map(({ rotulo, expr, arvore }) => {
    if (temD20(arvore)) {
      const res = rolarArvore(arvore, rolarDado);
      const natural = d20Natural(res);
      critico = usarCritico && natural === 20;
      return { rotulo, res, natural, ataque: true };
    }
    if (critico) return { rotulo, res: rolarArvore(dobrarDados(arvore), rolarDado), critico: true };
    return { rotulo, res: rolarArvore(arvore, rolarDado) };
  });
  return { partes };
}

// Soma das partes de dano seguidas: "Acerto; Dano; Fogo" -> Dano + Fogo.
// Uma parte com d20 (ataque/teste) separa um bloco do outro, então num
// ataque múltiplo cada ataque tem a sua soma. Só aparece com 2+ partes no bloco.
// Devolve [{ fim, total, rotulos }], onde "fim" é a posição da última parte somada.
function somasDeDano(rolagem) {
  const somas = [];
  let bloco = [];
  const fechar = () => {
    if (bloco.length >= 2) {
      somas.push({
        fim: bloco[bloco.length - 1].i,
        total: bloco.reduce((s, b) => s + b.p.res.total, 0),
        rotulos: bloco.map(b => b.p.rotulo || '?'),
      });
    }
    bloco = [];
  };
  rolagem.partes.forEach((p, i) => {
    if (p.ataque) fechar();
    else bloco.push({ p, i });
  });
  fechar();
  return somas;
}

// Resumo compacto de uma rolagem em partes, para ver tudo sem rolar a tela:
// "Acerto 25 · Dano 19". Depois de um ataque/teste (parte com d20), as partes de
// dano seguidas viram UM número só (a soma), com o nome "Dano" se forem 2 ou mais.
// Partes que não vêm depois de um ataque (ex.: "For: 4d6kh3; Des: 4d6kh3") ficam separadas.
// Devolve [{ rotulo, valor, tipo: 'ataque' | 'dano' | 'parte', natural, critico }].
function resumoCompacto(rolagem) {
  const itens = [];
  let bloco = [];
  let depoisDeAtaque = false;
  const fechar = () => {
    if (!bloco.length) return;
    if (depoisDeAtaque) {
      itens.push({
        rotulo: bloco.length === 1 ? (bloco[0].rotulo || 'Dano') : 'Dano',
        valor: bloco.reduce((s, p) => s + p.res.total, 0),
        tipo: 'dano',
        critico: bloco.some(p => p.critico),
      });
    } else {
      for (const p of bloco) itens.push({ rotulo: p.rotulo || '=', valor: p.res.total, tipo: 'parte' });
    }
    bloco = [];
  };
  rolagem.partes.forEach((p, i) => {
    if (p.ataque) {
      fechar();
      // "parte" guarda a posição, para a tela achar o acerto/erro contra o alvo.
      itens.push({ rotulo: p.rotulo || 'd20', valor: p.res.total, tipo: 'ataque', natural: p.natural, parte: i });
      depoisDeAtaque = true;
    } else {
      bloco.push(p);
    }
  });
  fechar();
  return itens;
}

// Resumo curto para o histórico: "Acerto 17 · Dano 11" (o dano já somado).
function resumir(rolagem) {
  if (rolagem.partes.length === 1) return String(rolagem.partes[0].res.total);
  return resumoCompacto(rolagem).map(i => `${i.rotulo} ${i.valor}`).join(' · ');
}

// Vantagem/Desvantagem das fichas: força o modo no primeiro d20 de cada parte de ataque.
function aplicarModo(texto, modo) {
  if (modo !== 'vant' && modo !== 'desv') return texto;
  const novo = modo === 'vant' ? '2d20kh1' : '2d20kl1';
  return String(texto).split(';').map(parte => {
    if (/2d20k[hl]1?(?!\d)/.test(parte)) return parte.replace(/2d20k[hl]1?(?!\d)/, novo);
    return parte.replace(/(^|[^\d])1?d20(?![\dk])/, (m, antes) => antes + novo);
  }).join(';');
}

// Nome curto para uma rolagem sem título: "Acerto: 1d20+5; Dano: 2d6+3" vira
// "Acerto + Dano" (cabe no botão). Se alguma parte não tiver nome, fica a expressão.
function nomeCurto(expr) {
  const texto = String(expr || '').trim();
  try {
    const partes = separarPartes(texto);
    if (partes.length > 1 && partes.every(p => p.rotulo)) return partes.map(p => p.rotulo).join(' + ');
  } catch { /* vazio: devolve como veio */ }
  return texto;
}

// Atalhos da aba Dados: primeiro os favoritos, depois as rolagens recentes do
// histórico (sem repetir a mesma expressão e sem repetir um favorito).
// Devolve [{ nome, expr, tipo: 'favorito' | 'recente' }].
function montarAtalhos(favoritos, historico, maxRecentes = 6) {
  const lista = [];
  const vistas = new Set();
  for (const f of favoritos || []) {
    if (!f || typeof f.expr !== 'string' || !f.expr.trim()) continue;
    vistas.add(f.expr.trim());
    lista.push({ nome: f.nome || f.expr, expr: f.expr.trim(), tipo: 'favorito' });
  }
  let recentes = 0;
  for (const h of historico || []) {
    if (recentes >= maxRecentes) break;
    if (!h || typeof h.expr !== 'string' || !h.expr.trim() || vistas.has(h.expr.trim())) continue;
    vistas.add(h.expr.trim());
    lista.push({ nome: h.titulo || nomeCurto(h.expr), expr: h.expr.trim(), tipo: 'recente' });
    recentes++;
  }
  return lista;
}

// 7) FICHA EM COMBATE (regras 2024): condições, exaustão, PV temporários, concentração.
// Efeitos resumidos do SRD 5.2.1, só para lembrar na mesa.
const CONDICOES = [
  { id: 'agarrado', nome: 'Agarrado', efeito: 'Deslocamento 0. Desvantagem em ataques contra quem não for quem o agarra.' },
  { id: 'amedrontado', nome: 'Amedrontado', efeito: 'Desvantagem em testes de atributo e ataques com a fonte do medo à vista; não pode se aproximar dela.' },
  { id: 'atordoado', nome: 'Atordoado', efeito: 'Incapacitado. Falha em salvaguardas de For e Des. Ataques contra ele têm Vantagem.' },
  { id: 'caido', nome: 'Caído', efeito: 'Desvantagem nos seus ataques. Ataques contra ele: Vantagem a até 1,5 m, senão Desvantagem. Levantar custa metade do deslocamento.' },
  { id: 'cego', nome: 'Cego', efeito: 'Falha em testes que exigem visão. Ataques contra ele têm Vantagem; os dele, Desvantagem.' },
  { id: 'contido', nome: 'Contido', efeito: 'Deslocamento 0. Ataques contra ele têm Vantagem; os dele, Desvantagem. Desvantagem em salvaguardas de Des.' },
  { id: 'enfeiticado', nome: 'Enfeitiçado', efeito: 'Não ataca quem o enfeitiçou, que tem Vantagem em testes sociais com ele.' },
  { id: 'envenenado', nome: 'Envenenado', efeito: 'Desvantagem em jogadas de ataque e testes de atributo.' },
  { id: 'incapacitado', nome: 'Incapacitado', efeito: 'Sem ação, Ação Bônus nem Reação. Perde a Concentração, não fala. Desvantagem na Iniciativa.' },
  { id: 'inconsciente', nome: 'Inconsciente', efeito: 'Incapacitado e Caído; larga o que segura. Falha em salvaguardas de For e Des. Acerto a até 1,5 m é crítico.' },
  { id: 'invisivel', nome: 'Invisível', efeito: 'Vantagem na Iniciativa e nos ataques; ataques contra ele têm Desvantagem (se não o veem).' },
  { id: 'paralisado', nome: 'Paralisado', efeito: 'Incapacitado, deslocamento 0. Falha em salvaguardas de For e Des. Acerto a até 1,5 m é crítico.' },
  { id: 'petrificado', nome: 'Petrificado', efeito: 'Incapacitado, deslocamento 0. Falha em For e Des. Resistência a todo dano. Ataques contra ele têm Vantagem.' },
  { id: 'surdo', nome: 'Surdo', efeito: 'Falha em testes que exigem audição.' },
  { id: 'concentrando', nome: 'Concentrando', efeito: 'Ao sofrer dano: salvaguarda de Con, CD 10 ou metade do dano (a maior, até 30).', marcador: true },
];
const MAX_EXAUSTAO = 6;

// Dano: os PV temporários são gastos primeiro; os PV normais não passam de 0.
// Devolve { pv, pvTemp, sobra } novos (não muda a ficha: quem chama decide salvar).
// "sobra" é o dano que passou do 0: se for igual ou maior que o PV máximo, um
// personagem morre na hora (dano massivo, regra de 2024).
function aplicarDano(pv, pvTemp, dano) {
  dano = Math.max(0, Math.trunc(dano) || 0);
  const temp = Math.max(0, pvTemp || 0);
  const absorvido = Math.min(temp, dano);
  const resto = dano - absorvido;
  return { pv: Math.max(0, pv - resto), pvTemp: temp - absorvido, sobra: Math.max(0, resto - pv) };
}

// Cura: soma e para no máximo. Cura não mexe nos PV temporários.
function aplicarCura(pv, pvMax, cura) {
  return Math.min(pvMax, pv + Math.max(0, Math.trunc(cura) || 0));
}

// PV temporários não se somam: fica o maior (regra de 2024: você escolhe qual manter).
function ganharPVTemp(atual, novo) {
  return Math.max(Math.max(0, atual || 0), Math.max(0, Math.trunc(novo) || 0));
}

// CD do teste de Concentração ao sofrer dano: a maior entre 10 e metade do dano, no máximo 30.
function cdConcentracao(dano) {
  return Math.min(30, Math.max(10, Math.floor(dano / 2)));
}

// Exaustão (2024): −2 por nível em todo teste de d20. Põe o redutor em cada parte
// que tem d20 (ataque, teste, salvaguarda, iniciativa); o dano não muda.
function aplicarExaustao(texto, nivel) {
  const n = Math.max(0, Math.min(MAX_EXAUSTAO, Math.trunc(nivel) || 0));
  if (!n) return texto;
  return String(texto).split(';').map(parte =>
    /d20(?!\d)/.test(parte) ? parte.replace(/\s+$/, '') + '−' + (2 * n) : parte).join(';');
}


// 8) FICHAS: confere uma ficha (vinda de um backup, por exemplo) e devolve
//    só os campos conhecidos, ou null se não for uma ficha válida.
function limparFicha(f) {
  if (!f || typeof f !== 'object' || typeof f.nome !== 'string' || !f.nome.trim()) return null;
  const numero = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.trunc(Number(v)) : null);
  const pvMax = numero(f.pvMax);
  const pv = numero(f.pv);
  return {
    id: typeof f.id === 'string' && f.id ? f.id : 'f-' + Math.random().toString(36).slice(2),
    tipo: f.tipo === 'monstro' ? 'monstro' : 'personagem',
    nome: f.nome.trim().slice(0, 80),
    subtitulo: typeof f.subtitulo === 'string' ? f.subtitulo.slice(0, 120) : '',
    emoji: typeof f.emoji === 'string' ? f.emoji.slice(0, 8) : '',
    imagem: typeof f.imagem === 'string' && f.imagem.startsWith('data:image/') ? f.imagem : null,
    ca: numero(f.ca),
    pvMax,
    pv: pvMax === null ? null : Math.max(0, Math.min(pvMax, pv === null ? pvMax : pv)),
    notas: typeof f.notas === 'string' ? f.notas.slice(0, 2000) : '',
    // Campos da versão 5 (fichas antigas não têm: começam zerados).
    pvTemp: Math.max(0, numero(f.pvTemp) || 0),
    exaustao: Math.max(0, Math.min(MAX_EXAUSTAO, numero(f.exaustao) || 0)),
    condicoes: Array.isArray(f.condicoes)
      ? CONDICOES.map(c => c.id).filter(id => f.condicoes.includes(id))
      : [],
    rolagens: Array.isArray(f.rolagens)
      ? f.rolagens.filter(r => r && typeof r.nome === 'string' && typeof r.expr === 'string')
          .map(r => ({ nome: r.nome.slice(0, 60), expr: r.expr.slice(0, 300) }))
      : [],
  };
}

// 9) CORES: texto preto ou branco, o que tiver mais contraste com o fundo.
function corDoTexto(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#111111' : '#ffffff';
}

// 10) ALVO: acertou a CA? passou na CD? (regras 2024)
//     Uma parte com d20 é ATAQUE se tiver dano logo depois (ou se chamar "Acerto"/"Ataque");
//     senão é um TESTE (salvaguarda, perícia). Só no ataque o 20 natural sempre acerta e
//     o 1 natural sempre erra; em testes e salvaguardas vale só o total.
//     Devolve uma lista do tamanho das partes: null nas partes sem d20, ou
//     { tipo: 'ataque' | 'teste', sucesso, automatico } nas partes com d20.
function compararComAlvo(rolagem, alvo) {
  const n = Math.trunc(Number(alvo));
  const partes = rolagem.partes;
  return partes.map((p, i) => {
    if (!p.ataque || alvo === null || alvo === '' || !Number.isFinite(n)) return null;
    const seguinte = partes[i + 1];
    const ehAtaque = /acerto|ataque/i.test(p.rotulo || '') || Boolean(seguinte && !seguinte.ataque);
    if (ehAtaque && p.natural === 20) return { tipo: 'ataque', sucesso: true, automatico: true };
    if (ehAtaque && p.natural === 1) return { tipo: 'ataque', sucesso: false, automatico: true };
    return { tipo: ehAtaque ? 'ataque' : 'teste', sucesso: p.res.total >= n, automatico: false };
  });
}

// 11) CONDIÇÕES → VANTAGEM / DESVANTAGEM (regras 2024, SRD 5.2.1).
//     "condicional" = só vale numa situação (ex.: com a fonte do medo à vista), então
//     a tela apenas sugere. Vantagem e Desvantagem juntas se anulam (fica Normal).
const EFEITO_NO_D20 = {
  ataque: [
    { id: 'cego', efeito: 'desv' }, { id: 'envenenado', efeito: 'desv' }, { id: 'caido', efeito: 'desv' },
    { id: 'contido', efeito: 'desv' }, { id: 'invisivel', efeito: 'vant' },
    { id: 'amedrontado', efeito: 'desv', condicional: true }, { id: 'agarrado', efeito: 'desv', condicional: true },
  ],
  // Iniciativa é um teste de Destreza: Envenenado e Amedrontado também pesam;
  // Incapacitado (e quem inclui Incapacitado) rola com Desvantagem; Invisível, com Vantagem.
  iniciativa: [
    { id: 'invisivel', efeito: 'vant' }, { id: 'incapacitado', efeito: 'desv' }, { id: 'atordoado', efeito: 'desv' },
    { id: 'paralisado', efeito: 'desv' }, { id: 'petrificado', efeito: 'desv' }, { id: 'inconsciente', efeito: 'desv' },
    { id: 'envenenado', efeito: 'desv' }, { id: 'amedrontado', efeito: 'desv', condicional: true },
  ],
};
// Devolve { modo: 'normal' | 'vant' | 'desv', vant: [nomes], desv: [nomes] }.
// Com "soCertas", ignora as condicionais (para aplicar sozinho, sem perguntar).
function sugerirModo(condicoes, contexto, soCertas = false) {
  const lista = EFEITO_NO_D20[contexto] || [];
  const nomeDe = (id) => (CONDICOES.find(c => c.id === id) || { nome: id }).nome;
  const vant = [], desv = [];
  for (const regra of lista) {
    if (!(condicoes || []).includes(regra.id) || (soCertas && regra.condicional)) continue;
    (regra.efeito === 'vant' ? vant : desv).push(nomeDe(regra.id) + (regra.condicional ? '*' : ''));
  }
  const modo = vant.length && !desv.length ? 'vant' : desv.length && !vant.length ? 'desv' : 'normal';
  return { modo, vant, desv };
}

// 12) COMBATE: ordem de iniciativa, turnos e rodadas.
//     Cada combatente é { id, iniciativa (número ou null), ... }. A lista É a ordem.

// Do maior para o menor. Empate: fica quem já estava na frente (o Mestre e os jogadores
// decidem a ordem dos empatados, regra 2024; dá para trocar com subirNoEmpate).
// Quem ainda não rolou (null) vai para o fim.
function ordenarIniciativa(lista) {
  const valor = (c) => (typeof c.iniciativa === 'number' ? c.iniciativa : -Infinity);
  return lista.map((c, i) => ({ c, i }))
    .sort((a, b) => valor(b.c) - valor(a.c) || a.i - b.i)
    .map(x => x.c);
}

// Troca um combatente com o de cima, só se os dois tiverem a mesma iniciativa.
function subirNoEmpate(lista, id) {
  const i = lista.findIndex(c => c.id === id);
  if (i <= 0 || lista[i - 1].iniciativa !== lista[i].iniciativa) return lista;
  const nova = lista.slice();
  [nova[i - 1], nova[i]] = [nova[i], nova[i - 1]];
  return nova;
}

// Passa a vez. "vez" é o id de quem está jogando (null = combate não começou).
// Ao passar do último para o primeiro, começa uma rodada nova. "pular" é um Set de ids
// que perdem a vez (ex.: monstros com 0 PV); se todos estiverem nele, ninguém é pulado.
function avancarTurno(lista, vez, rodada, pular = new Set()) {
  if (!lista.length) return { vez: null, rodada: 0 };
  const pode = (c) => !pular.has(c.id);
  const algumPode = lista.some(pode);
  let i = lista.findIndex(c => c.id === vez);
  let r = Math.max(0, rodada || 0);
  if (i < 0) { i = -1; r = Math.max(r, 1) - 1; }  // começa: a 1ª rodada abre no primeiro
  for (let passos = 0; passos < lista.length; passos++) {
    i++;
    if (i >= lista.length) i = 0;
    if (i === 0) r++;
    if (!algumPode || pode(lista[i])) break;
  }
  return { vez: lista[i].id, rodada: r };
}

// Volta a vez para o anterior (para corrigir um toque sem querer). Nunca abaixo da rodada 1.
function voltarTurno(lista, vez, rodada, pular = new Set()) {
  const i0 = lista.findIndex(c => c.id === vez);
  if (i0 < 0) return { vez, rodada };
  const pode = (c) => !pular.has(c.id);
  const algumPode = lista.some(pode);
  let i = i0;
  let r = rodada;
  for (let passos = 0; passos < lista.length; passos++) {
    if (i === 0) {
      if (r <= 1) return { vez, rodada };  // já é o começo do combate
      r--;
      i = lista.length;
    }
    i--;
    if (!algumPode || pode(lista[i])) break;
  }
  return { vez: lista[i].id, rodada: r };
}

// Nome da próxima cópia de um monstro: "Guerreiro Goblin 1", "... 2" (sem repetir número).
function nomeDeCopia(base, nomesUsados) {
  let n = 1;
  while (nomesUsados.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

// A rolagem de Iniciativa da ficha (pelo nome), ou 1d20 se ela não tiver uma.
function exprIniciativa(ficha) {
  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const r = ficha && (ficha.rolagens || []).find(x => semAcento(x.nome) === 'iniciativa');
  return r ? r.expr : '1d20';
}

// Confere o combate salvo (pode vir corrompido ou de outra versão) e devolve um válido.
function limparCombate(dados) {
  const vazio = { participantes: [], vez: null, rodada: 0 };
  if (!dados || typeof dados !== 'object' || !Array.isArray(dados.participantes)) return vazio;
  const numero = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.trunc(Number(v)) : null);
  const ids = new Set();
  const participantes = [];
  for (const c of dados.participantes) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || ids.has(c.id)) continue;
    if (typeof c.nome !== 'string' || !c.nome.trim()) continue;
    ids.add(c.id);
    const pvMax = numero(c.pvMax);
    participantes.push({
      id: c.id,
      fichaId: typeof c.fichaId === 'string' ? c.fichaId : '',
      vinculado: c.vinculado === true,  // personagem: os PV e condições são os da ficha
      nome: c.nome.trim().slice(0, 90),
      tipo: c.tipo === 'personagem' ? 'personagem' : 'monstro',
      iniciativa: numero(c.iniciativa),
      ca: numero(c.ca),
      pvMax,
      pv: pvMax === null ? null : Math.max(0, Math.min(pvMax, numero(c.pv) ?? pvMax)),
      pvTemp: Math.max(0, numero(c.pvTemp) || 0),
      exaustao: Math.max(0, Math.min(MAX_EXAUSTAO, numero(c.exaustao) || 0)),
      condicoes: Array.isArray(c.condicoes) ? CONDICOES.map(x => x.id).filter(id => c.condicoes.includes(id)) : [],
    });
  }
  const vez = participantes.some(c => c.id === dados.vez) ? dados.vez : null;
  return { participantes, vez, rodada: vez ? Math.max(1, numero(dados.rodada) || 1) : 0 };
}

// No Node (testes) exporta as funções; no navegador elas já ficam globais.
if (typeof module !== 'undefined') {
  module.exports = {
    analisar, rolar, descrever, contarDados, estatisticas, rolarDadoCripto,
    apertarDado, apertarD, apertarOperador, apertarAbre, apertarFecha, alternarVantagem,
    separarPartes, validar, rolarPartes, dobrarDados, resumir, somasDeDano, montarAtalhos, aplicarModo, corDoTexto, formatar, limparFicha,
    resumoCompacto, nomeCurto, CONDICOES, MAX_EXAUSTAO, aplicarDano, aplicarCura, ganharPVTemp, cdConcentracao, aplicarExaustao,
    compararComAlvo, sugerirModo, ordenarIniciativa, subirNoEmpate, avancarTurno, voltarTurno,
    nomeDeCopia, exprIniciativa, limparCombate,
  };
}
