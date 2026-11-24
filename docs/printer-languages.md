# Linguagens de impressora

Este documento descreve como cada elemento do GôndolaPro vira código em cada linguagem. As regras vêm dos PDFs de referência (artigo do SysPDV e exemplos de layout da Raro), guardados só localmente em `docs/reference/` e fora do Git por serem material de terceiros, e dos manuais das linguagens.

Todas as conversões assumem 203 dpi, que dá **8 pontos por mm** (exatamente 7,992). A 300 dpi o app converte as posições corretamente, mas as tabelas de fonte bitmap continuam as de 203 dpi (ver calibração).

## PPLA (Argox, Elgin)

### Formato de uma linha

Cada elemento é uma linha de 15 caracteres seguida do conteúdo:

```
1 3 1 1 000 0097 0008 </3>
│ │ │ │ │   │    │    └ conteúdo (texto fixo ou tag)
│ │ │ │ │   │    └ coluna (X), 4 dígitos, em 0,01 polegada
│ │ │ │ │   └ linha (Y), 4 dígitos, em 0,01 polegada, medida a partir de BAIXO
│ │ │ │ └ subtipo da fonte / altura do código de barras (3 dígitos)
│ │ │ └ multiplicador vertical (1–9, depois A–O)
│ │ └ multiplicador horizontal
│ └ fonte (0–4) ou tipo de código de barras
└ rotação
```

O artigo do SysPDV fala em "milímetros" e diz que as posições 10–12 são a linha e 13–15 a coluna. Na prática os números batem com **centésimos de polegada** (uma etiqueta de 100 mm vai até a coluna ~394, como nos exemplos) e a linha e a coluna têm 4 dígitos cada; o primeiro dígito costuma ser zero, por isso a leitura simplificada do artigo funciona.

### Rotação

| GôndolaPro | Código PPLA | Ponto de referência usado |
|---|---|---|
| 0° | `1` | canto inferior esquerdo |
| 90° (lendo de cima para baixo) | `4` | canto superior esquerdo |
| 180° | `3` | canto superior direito |
| 270° (lendo de baixo para cima) | `2` | canto inferior direito |

O SysPDV confirma que `4` é a impressão vertical. Os pontos de referência das rotações são **hipótese** e precisam de teste.

### Fontes

| Fonte | Altura (pontos) | Avanço por caractere (pontos) | Escolha automática |
|---|---|---|---|
| 0 | 7 | 6 | sim |
| 1 | 13 | 9 | sim |
| 2 | 18 | 12 | sim |
| 3 | 27 | 16 | sim |
| 4 | 36 | 20 | sim |
| 5 | 52 | 20 | não |
| 6 | 64 | 34 | não |
| 7 (OCR-A) | 28 | 17 | não |
| 8 (OCR-B) | 28 | 17 | não |

As fontes 5 a 8 têm conjunto de caracteres limitado (só maiúsculas, números ou OCR), então o app não as escolhe sozinho. Elas existem na tabela para medir layouts importados; o layout real do SysPDV usa a fonte 6 no preço. Os tamanhos de 5 a 8 são estimativas.

Um multiplicador `0` (que aparece em layouts reais, como `1410000...`) é tratado como `1` na medição e mantido como `0` no código.

### Unidade

Sem comando de unidade, as posições são em 0,01 polegada. Se o cabeçalho tiver a linha `m` (com ou sem STX), o app passa a usar 0,1 mm, tanto ao gerar quanto ao importar.

### Modos de impressão (A1, A2)

`A1` liga o modo **XOR**: o que for impresso por cima de uma área preta sai branco. `A2` volta ao modo normal (transparente). O layout real do SysPDV usa `A1` no cabeçalho para escrever em branco sobre uma faixa preta, e `A2` antes do preço. A prévia reproduz isso: elementos desenhados em modo XOR invertem as cores do que está embaixo.

A impressora desenha os elementos na ordem do código, e o modo vale a partir do comando. Por isso a ordem importa: uma faixa preta em modo normal desenhada **depois** de um texto cobre o texto, e um texto em modo normal desenhado **depois** de uma faixa some nela.

## Linhas e caixas que invertem o que está embaixo

Linhas e caixas têm a opção **Inverter as cores do que estiver por baixo** (`invert`), ligada por padrão em elementos novos. Para dar o mesmo resultado em qualquer ordem, o gerador manda esses elementos para o **fim do código**, depois de todos os textos, no modo de inversão de cada linguagem:

| Linguagem | Como sai |
|---|---|
| PPLA | `A1`, os elementos invertidos, `A2` |
| EPL | linha com `LE` no lugar de `LO`; a caixa vira 4 linhas `LE` (topo, base e laterais sem os cantos, para os cantos não se anularem) |
| ZPL | `^FR` antes do `^GB` |

A prévia segue a mesma ordem. Com a opção desligada, o elemento sai na posição normal e cobre de preto o que estiver embaixo.

Elementos importados de PPLA chegam com a opção desligada, porque ali o modo vem dos próprios comandos `A1`/`A2` do layout, mantidos como comandos sem prévia. Em EPL, `LE` é importado como linha invertida; em ZPL, `^FR` com `^GB` também.

### Código de barras

- `F` = EAN-13 e `D` = 2 de 5 intercalado. Em **minúscula** (`f`, `d`) as barras saem sem os números embaixo.
- O 3º caractere é a largura da barra larga e o 4º a da barra estreita, em pontos. O app usa: EAN-13 com larga = 3 × módulo; 2 de 5 com larga = 2 × módulo (igual aos exemplos da Raro: `1d42...`).
- Os três dígitos seguintes são a altura das barras em 0,01 polegada.

### Linhas e caixas

- Linha: `1X11000` + linha + coluna + `L` + largura (3 dígitos) + altura (3 dígitos), em 0,01 polegada.
- Caixa: `1X11000` + linha + coluna + `B` + largura + altura + espessura topo/base + espessura laterais.

### Cabeçalho e rodapé padrão

```
<STX>O0220
<STX>e
<STX>L
H14
SC
R0000
D11
...elementos...
Q</17>
E
```

Baseado num layout real exportado do SysPDV (gôndola com preço referencial, impressora Argox). `<STX>O0220` é o deslocamento de início da impressão e varia de impressora para impressora (os exemplos têm `O0148`, `O0205` e `O0220`). `<STX>e` seleciona o sensor de espaço entre etiquetas, `<STX>L` entra no modo de formatação, `H14` é a temperatura, `SC` a velocidade, `R0000` o deslocamento de linha, `D11` o tamanho do ponto e `Q</17>` a quantidade.

### O caractere STX

A exportação do SysPDV confirmou que **o próprio SysPDV grava o caractere STX** (código 2) no início dos comandos de sistema (`<STX>O0220`, `<STX>e`, `<STX>L`). Nos PDFs de referência ele não aparece porque é invisível. Na tela do GôndolaPro ele aparece como `<STX>`, e o botão **Copiar código** copia o caractere real.

O cabeçalho PPLA é acertado uma vez só, quando o código é gerado (`pplaHeader`, chamado por `generateScript`). Se alguma linha do cabeçalho já tem STX, ele fica como foi escrito. Se nenhuma tem (cabeçalhos antigos, escritos à mão), o gerador coloca STX em todas as linhas até a que começa com `L` (em todas, se não houver linha `L`). Se essa linha for algo como `LC0000`, ela vira `<STX>L` seguido de `C0000` em outra linha.

Por isso **Copiar código**, **Exportar XML** e **Imprimir teste** partem do mesmo script, e o SysPDV recebe o mesmo cabeçalho que a impressão de teste usa. O painel de código também já mostra o `<STX>` acrescentado.

## EPL / PPLB (Zebra, Argox, Elgin, Honeywell)

- Texto: `A x,y,rotação,fonte,mult.horizontal,mult.vertical,N,"conteúdo"`
- Código de barras: `B x,y,rotação,tipo,estreita,larga,altura,B|N,"conteúdo"`. Tipo `E30` para EAN-13 e `2` para 2 de 5. `B` imprime os números e `N` não imprime.
- Linha: `LO x,y,largura,altura`
- Caixa: `X x,y,espessura,x final,y final`
- Origem no canto superior esquerdo, em pontos. Aspas e barras invertidas dentro do conteúdo são escapadas.

| GôndolaPro | Código EPL | Ponto de referência usado |
|---|---|---|
| 0° | `0` | canto superior esquerdo |
| 90° | `1` | canto superior direito |
| 180° | `2` | canto inferior direito |
| 270° | `3` | canto inferior esquerdo |

Fontes a 203 dpi (altura / avanço em pontos): 1 = 12/10, 2 = 16/12, 3 = 20/14, 4 = 24/16, 5 = 48/34. O multiplicador horizontal vai até 6 e o vertical até 9.

Cabeçalho padrão: `N`, `q{widthDots}`, `Q{heightDots},{gapDots}`, `S3`, `D9`, `ZT`. Rodapé: `P</17>`.

## ZPL (Zebra, Elgin, Honeywell)

- Texto: `^FOx,y^A0o,altura,largura^FDconteúdo^FS`, com a fonte 0 escalável (largura igual à altura).
- EAN-13: `^FOx,y^BYmódulo,2.0,altura^BEo,altura,Y|N,N^FDconteúdo^FS`
- 2 de 5: igual, com `^B2o,altura,Y|N,N,N`
- Linha e caixa: `^FOx,y^GBlargura,altura,espessura^FS`
- `^FO` é sempre o canto superior esquerdo do elemento, inclusive quando rotacionado. Orientação: `N` = 0°, `R` = 90°, `I` = 180°, `B` = 270°.
- Os caracteres `^` e `~` são removidos do conteúdo, porque iniciam comandos ZPL.

Cabeçalho padrão: `^XA`, `^PW{widthDots}`, `^LL{heightDots}`, `^LH0,0`. Rodapé: `^PQ</17>,0,1,Y` e `^XZ`.

## O que precisa ser calibrado

Itens que dependem de teste em impressora real. Ao confirmar ou corrigir um item, atualize o gerador, o teste correspondente em `tests/generators.test.ts` e esta lista.

1. **PPLA, ponto de referência do código de barras**: hoje a linha é a base da área total (barras + números). Pode ser que a impressora use a base das barras.
2. **PPLA e EPL, rotações de 90°, 180° e 270°**: confirmar os cantos de referência das tabelas acima.
3. **PPLA, cabeçalho padrão**: confirmar que o cabeçalho baseado no layout real funciona também na Elgin L42.
4. **Tabelas de fonte**: medir a altura e a largura reais de cada fonte nas impressoras dos clientes e ajustar `src/core/fonts.ts`. Uma impressão na Elgin L42 (24/11/2026, fonte 4 em 2x2) confirmou o avanço de ~20 pontos e a altura de ~36 pontos da fonte 4. Na mesma impressão, a linha informada foi a base das letras: os números ocupam a altura toda da fonte e a vírgula desce cerca de 1/4 dessa altura abaixo da linha. A prévia em PPLA desenha assim (`PPLA_DESCENT_RATIO` em `src/core/measure.ts`), e a verificação conta essa descida.
   - **Preço com espaços**: o SysPDV entrega `</6>` com **2 espaços à esquerda** (o preço saiu 2 caracteres depois da coluna, tanto em `0,00` quanto em `165,00`). Por isso o `R$` aparece encostado no preço no layout real. A prévia acrescenta esses 2 espaços aos preços (`</6>` a `</11>` e `</28>`), e a verificação ignora os espaços ao conferir se o preço cabe na faixa. Falta confirmar se `</29>` e `</30>` também vêm assim.
5. **300 dpi**: as fontes bitmap têm outro tamanho em pontos nessas impressoras.
6. **Codificação de acentos**: o app envia em Latin-1. Confirmar como cada impressora (e o SysPDV) trata acentos.
7. **Tamanho real dos campos**: os valores de exemplo podem ser editados em Propriedades e são salvos no `.etq` (`samples`). Por padrão o preço de exemplo tem 4 dígitos antes da vírgula (`1.249,90`), para a prévia mostrar o pior caso comum. A verificação avisa quando um texto sai da faixa preta (linha) em que está ou é cortado por uma linha.
8. **ZPL com `^FT`**: layouts do ZebraDesigner/BarTender costumam posicionar pelo `^FT` (linha de base). A importação converte para `^FO` subtraindo a altura do texto ou das barras, o que é aproximado.

## Importação

A importação faz o caminho inverso dos geradores, com as mesmas tabelas. O que cada parser reconhece:

| Linguagem | Reconhece | Vira comando sem prévia |
|---|---|---|
| PPLA | texto com fontes 0–8, códigos `F`/`f`/`D`/`d`, linha `X…L`, caixa `X…B` com bordas iguais | outros códigos de barras, gráficos rotacionados, linhas com `</32>`, `<corpo>`, comandos como `A1`/`A2` no meio do código |
| EPL | `A` com fontes 1–5 em modo normal, `B` com `E30` ou `2`, `LO`, `LE` (linha invertida), `X` | texto reverso (`R`), outras simbologias, `LW`, fontes baixadas |
| ZPL | campos `^FO`/`^FT` com `^A`, `^BE`, `^B2`, `^GB` e `^FD`; `^BY` dentro ou fora do campo; `^FR` em `^GB` | campos com `^FB`, `^FH`, `^A@`, `^FR` em texto ou código de barras, texto sem `^A`, rotação com `^FT` |
