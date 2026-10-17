# 🎲 Rolador de Dados

Calculadora de dados para celular. Arquivo único (`index.html`), funciona offline.

## Notação

| Expressão | Significado |
|---|---|
| `2d12` | rola 2 dados de 12 faces e soma |
| `1d20+5` | soma/subtrai dados e constantes |
| `3×(3d6)` | **parênteses = repetir**: rola `3d6` três vezes, de forma independente (9 dados), e soma |
| `3×[3d6]` | **colchetes = multiplicar**: rola `3d6` uma vez (3 dados) e multiplica o resultado por 3 |
| `2×(1d8+2×[1d4])` | parênteses e colchetes podem ser aninhados |
| `2d20kh1` / `2d20kl1` | mantém o maior / menor dado (vantagem / desvantagem). `4d6kh3` = descarta o menor |

Botões especiais: **Vant/Desv** trocam o último `1d20` por `2d20kh1`/`2d20kl1` (tocar de novo desfaz);
**dX** põe só o `d` para dados de outro tamanho (`3`, `dX`, `7` → `3d7`).
Embaixo do visor aparece o mínimo, a média e o máximo possíveis. ROLAR com o visor vazio repete a última rolagem.

No teclado do celular, `x` e `*` também valem como `×`.

## Estrutura

- `index.html`: tem tudo. Dentro dele há dois `<script>`:
  - **Lógica** (entre `INÍCIO DA LÓGICA` e `FIM DA LÓGICA`): funções puras.
    `tokenizar` → `analisar` (parser, monta a árvore) → `rolar` (percorre a árvore rolando os dados).
    Também ficam aqui as regras do teclado (`apertarDado`, etc.).
  - **Interface**: liga os botões, desenha o resultado e guarda o histórico e os favoritos no `localStorage`.
- `testes.js`: testa a lógica. Rode com `node testes.js`.
- `.github/workflows/testes.yml`: roda os testes no GitHub a cada push.

## Testar no celular

Ative o GitHub Pages: **Settings → Pages → Branch: `main` / `(root)` → Save**.
Em ~1 minuto o app fica em `https://fabricio1974.github.io/rolador-de-dados/`.
