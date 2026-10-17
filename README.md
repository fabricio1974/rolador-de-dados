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
  - **Alvo CA/CD** (ao lado de "Rolagens"): digite a CA do alvo (ou a CD da salvaguarda) e o
    resultado mostra **ACERTOU/ERROU** ou **PASSOU/FALHOU**. Em ataques, 20 natural sempre acerta
    e 1 natural sempre erra; em testes e salvaguardas vale só o total (regras 2024). O dano de
    um ataque que errou fica riscado no resumo.
  - Condições que mudam os ataques (Envenenado, Caído, Cego, Contido, Invisível...) marcam com
    tracejado o modo sugerido (Vantagem/Desvantagem) e explicam o porquê; você decide se usa.
  - O resultado aparece embaixo, com o resumo no topo; a setinha recolhe os detalhes para
    os botões ficarem à vista (e o app lembra se você deixou recolhido).
- **Combate**: a ordem de iniciativa da mesa.
  - **Adicionar** escolhe personagens e monstros. O mesmo monstro pode entrar várias vezes
    (Guerreiro Goblin 1, 2, 3), cada um com seus PV e condições; personagens entram uma vez e
    usam os PV da própria ficha.
  - **Começar combate** rola a Iniciativa de quem falta (a rolagem "Iniciativa" da ficha, ou
    1d20) e abre a rodada 1. Cópias do mesmo monstro rolam uma vez só e ficam com o mesmo número
    (regra 2024). Invisível rola com Vantagem; Incapacitado, Envenenado etc., com Desvantagem.
  - **Próximo turno** (botão grande embaixo) passa a vez e conta as rodadas; a seta ao lado
    volta um turno. Monstro com 0 PV perde a vez; personagem com 0 PV não.
  - Toque num combatente para abrir: Dano/Cura/Temp, iniciativa (digitar ou rolar), **Antes**
    para desempatar com o de cima, **Ficha e rolagens** (rolar ataques daquele combatente) e Tirar.
  - O combate fica salvo: dá para fechar o app e continuar depois. A aba mostra a rodada (R3).
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

Tudo fica no `localStorage` do navegador, só no aparelho (`rolador.config`, `.historico`,
`.favoritos`, `.fichas` e, desde a versão 6, `.combate`). Em **Configurações → Seus dados** dá para
exportar e importar um backup (`.json`).
