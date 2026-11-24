# Tags do SysPDV

O SysPDV troca as tags pelos dados do produto no momento da impressão. A lista oficial fica no botão **Legendas** da tela **Utilitários > Configuração de layouts > Etiqueta**, que só aparece com o parâmetro **136 – Habilita etiqueta por layout** ligado (Sistema > Parâmetro > SysPDV Server).

No banco do SysPDV, cada layout tem um código de 2 caracteres (`ETQCOD`), uma descrição de até 40 caracteres (`ETQDES`) e o layout em si (`ETQLAY`), gravado como RTF. É esse o formato do XML que o GôndolaPro abre e que gera em **Exportar XML**.

O catálogo usado pelo app está em `src/core/syspdvFields.ts`. Cada campo tem o rótulo, o tamanho máximo da legenda, um valor de exemplo (usado na prévia e na impressão de teste) e um grupo (usado para organizar a paleta).

## Campos

Transcrição da tela Legendas. A coluna "Tam. máx." é a do SysPDV.

| Tag | Descrição | Tam. máx. | Grupo no app |
|---|---|---|---|
| `</1>` | Código do produto | 14 | Produto |
| `</2>` | Descrição do produto | 45 | Produto |
| `</3>` | Descrição reduzida do produto | 20 | Produto |
| `</4>` | Seção | 30 | Produto |
| `</5>` | Unidade do produto | 3 | Produto |
| `</6>` | Tabela preço de venda ou oferta 1 | 22 | Preços |
| `</7>` | Tabela preço de venda ou oferta 2 | 22 | Preços |
| `</8>` | Tabela preço de venda ou oferta 3 | 22 | Preços |
| `</9>` | Tabela preço 1 | 22 | Preços |
| `</10>` | Tabela preço 2 | 22 | Preços |
| `</11>` | Tabela preço 3 | 22 | Preços |
| `</12>` | Fornecedor | 40 | Empresa e fornecedor |
| `</13>` | Nome fantasia da empresa na qual o programa está registrado | 40 | Empresa e fornecedor |
| `</14>` | Data em que o sistema se encontra | 4 | Estoque e datas |
| `</15>` | Descrição do produto, caracteres 1 a 25 | 25 | Produto |
| `</16>` | Descrição do produto, caracteres 26 a 45 | 20 | Produto |
| `</17>` | Quantidade de etiquetas de determinado produto impressa | 4 | (estrutura) |
| `</18>XXYY` | Trecho da descrição, do caractere XX ao YY | 45 | Produto |
| `</19>` | Estoque mínimo do produto | 10 | Estoque e datas |
| `</20>` | Estoque máximo do produto | 10 | Estoque e datas |
| `</21>` | Palavra OFERTA | 6 | Preços |
| `</22>` | Data do último reajuste do preço, formato DDMM | 4 | Estoque e datas |
| `</23>` | Unidade da referência do produto | 5 | Preço referencial |
| `</24>` | Medida de referência do produto | 13 | Preço referencial |
| `</25>` | Divisor da quantidade dividida por 3 | 0 | Estoque e datas |
| `</26>` | Início da oferta programada, formato DD/MM/AA | 4 | Oferta programada |
| `</27>` | Fim da oferta programada, formato DD/MM/AA | 4 | Oferta programada |
| `</28>` | Preço de oferta do preço programado | 22 | Oferta programada |
| `</29>` | Quantidade mínima da tabela preço 2 | 22 | Preços |
| `</30>` | Quantidade mínima da tabela preço 3 | 22 | Preços |
| `</32>VVVXXXX` | Coluna da etiqueta individual (ver abaixo) | – | (estrutura) |
| `</33>` | Código auxiliar numérico do produto (principal) | 15 | Produto |
| `</99>XXX` | Caractere pelo código ASCII | 1 | (estrutura) |
| `</referenciafabricante>` | Código de referência do fabricante | 20 | Produto |
| `</precoreferencial>` | Impressão do preço referencial do produto | 1 | Preço referencial |
| `<corpo>…</corpo>` | Trecho repetido em cada etiqueta individual | – | (estrutura) |
| `<etiquetaPorLinha=X/>` | Quantidade de etiquetas por linha | – | (estrutura) |

Observações:

- A legenda diz tamanho 4 para `</26>` e `</27>`, mas o formato DD/MM/AA tem 8 caracteres. O app usa 8 no catálogo.
- Os prints da legenda não mostram nenhuma `</31>`. Se ela existir, falta incluir.
- Os campos marcados como "estrutura" não aparecem na paleta, porque não são textos para colocar na etiqueta: controlam quantidade, colunas ou caracteres especiais.

## Tags com parâmetro

Algumas tags levam dígitos logo depois. O app reconhece esses dígitos na prévia e na impressão de teste, e o painel Verificação avisa quando faltam.

| Tag | Formato | Exemplo | Resultado com o exemplo do app |
|---|---|---|---|
| `</18>` | `</18>XXYY`: caractere inicial XX e final YY da descrição | `</18>0105` | `ARROZ` |
| `</99>` | `</99>XXX`: código ASCII do caractere | `</99>065` | `A` (`013` é Enter, `110` é `n`) |
| `</32>` | `</32>VVVXXXX`: distância VVV entre etiquetas e coordenada X da primeira | `</32>1200005` | `0005` (coluna da primeira etiqueta) |

Ao clicar em **Trecho da descrição** na paleta, o app insere `</18>0125` (caracteres 1 a 25) para servir de ponto de partida.

## Etiquetas individuais (`<corpo>` e `</32>`)

Os layouts que imprimem até 3 produtos diferentes lado a lado usam um bloco `<corpo>…</corpo>`. O SysPDV repete o trecho para cada etiqueta da linha e troca `</32>VVVXXXX` pela coluna de cada uma: `XXXX` na primeira, `XXXX + VVV` na segunda, e assim por diante. `<etiquetaPorLinha=X/>` informa quantas etiquetas há por linha. Exemplo (PPLA):

```
<corpo>
1D420200012</32>1200005</1>
</corpo>
```

**O GôndolaPro ainda não monta esse formato pelo editor.** Ao importar um layout assim, as linhas com `<corpo>` e `</32>` viram comandos sem prévia e são mantidas no código. Na impressão de teste, `</32>` é trocado pela coluna da primeira etiqueta.
