# 🎲 Rolador de Dados

Rolador de dados para RPG no celular: calculadora de expressões, fichas de personagens
e monstros com imagem e rolagens com nome, 10 temas de cores. Funciona offline.

**Abrir no celular:** https://fabricio1974.github.io/rolador-de-dados/ (depois de ativar o GitHub Pages)

## Notação

| Expressão | Significado |
|---|---|
| `2d12` | rola 2 dados de 12 faces e soma |
| `1d20+5` | soma/subtrai dados e constantes |
| `3×(3d6)` | **parênteses = repetir**: rola `3d6` três vezes, de forma independente (9 dados), e soma. O resultado mostra uma linha por repetição, com o valor de cada uma (`6×(4d6kh3)` = os 6 atributos) |
| `3×[3d6]` | **colchetes = multiplicar**: rola `3d6` uma vez (3 dados) e multiplica o resultado por 3 |
| `2×(1d8+2×[1d4])` | parênteses e colchetes podem ser aninhados |
| `2d20kh1` / `2d20kl1` | mantém o maior / menor dado (vantagem / desvantagem). `4d6kh3` descarta o menor |
| `Acerto: 1d20+5; Dano: 1d8+3` | **várias partes** de uma vez, cada uma com seu nome |

Se uma parte com d20 tirar **20 natural**, as partes seguintes sem d20 (o dano) rolam com
**o dobro de dados** (regra de crítico de 2024; os modificadores não dobram).
Duas ou mais partes de dano seguidas (ex.: `Acerto: 1d20+5; Dano: 1d8+3; Fogo: 1d6`)
ganham uma linha **Total** com a soma delas.
Rolagens em partes mostram no topo um **resumo** que fica sempre à vista
(ex.: `Acerto 25 · Dano 19`, com o dano já somado); o histórico usa o mesmo resumo.

## Telas

- **Dados**: a calculadora. Vant/Desv trocam o último `1d20` por `2d20kh1`/`2d20kl1`;
  `dX` serve para dados de qualquer tamanho; ROLAR com o visor vazio repete a última rolagem.
  Acima do visor fica uma barra de **atalhos**: seus favoritos (★) e as rolagens recentes (↻);
  um toque já rola. Cada dado do resultado tem a cor do seu tipo (d6, d20...); 20 natural
  deixa o número e a borda verdes, 1 natural, vermelhos.
- **Fichas**: personagens e monstros (em grupos separados), com imagem (da galeria ou câmera),
  CA, PV e modo Normal/Vantagem/Desvantagem para os botões de rolagem com nome.
  Já vem com 10 monstros do SRD 5.2.1 (D&D 2024), do ND 1/4 ao 21.
  - **PV**: digite a quantidade e toque em **Dano**, **Cura** ou **Temp** (PV temporários:
    o dano gasta eles primeiro e eles não se somam, fica o maior). Avisa o teste de
    Concentração, a chegada a 0 PV e o dano massivo.
  - **Condições** (regras 2024): toque em **+ Condição** para marcar Caído, Envenenado,
    Concentrando etc.; o efeito de cada uma aparece logo abaixo como lembrete, e um toque
    no ✕ tira. **Exaustão** tem níveis (− / +) e já desconta −2 por nível de todo d20 rolado
    pela ficha.
  - O resultado aparece embaixo, com o resumo no topo; a setinha recolhe os detalhes para
    os botões ficarem à vista.
- **Histórico**, **Favoritos** e **Configurações** (tema, fundo, opções, backup): os ícones
  no alto da tela.
## Organização do código

```
index.html        estrutura da página (só HTML)
css/estilo.css    visual; as cores são variáveis trocadas pelo tema
js/logica.js      funções PURAS: parser, rolagem, crítico, estatísticas, teclado
js/temas.js       os 10 temas de cores e os 3 tons de fundo
js/monstros.js    os 10 monstros padrão
js/app.js         a interface: liga botões, desenha telas, salva no localStorage
testes.js         testes da lógica e dos dados (node testes.js)
```

`logica.js`, `temas.js` e `monstros.js` não mexem na tela, por isso o `testes.js` consegue
testá-los no Node. O GitHub roda os testes a cada push (aba **Actions**).

## Dados salvos

Tudo fica no `localStorage` do navegador, só no aparelho. Em **Configurações → Seus dados** dá para
exportar e importar um backup (`.json`).
