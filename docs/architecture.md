# Arquitetura

O GôndolaPro é um app Electron com interface em React. A regra de negócio fica isolada em `src/core`, em TypeScript puro e sem dependência de interface, para poder ser testada com Vitest e reaproveitada (por exemplo, numa futura integração direta com o banco do SysPDV).

## Convenções do projeto

- A interface e a documentação são em **português**. Código, nomes de arquivos e pastas são em **inglês**.
- O código **não tem comentários**. Toda explicação de regra, decisão ou hipótese fica nesta pasta `docs/`.
- Textos exibidos ao usuário (rótulos, mensagens de validação e erros) ficam em português, mesmo dentro de `src/core`.

## Estrutura de pastas

```
src/
  core/                 regra de negócio, sem React nem Electron
    types.ts            modelo de dados (LabelLayout, elementos)
    units.ts            conversões mm ↔ pontos ↔ centésimos de polegada
    fonts.ts            tabela de fontes das impressoras e escolha da fonte
    measure.ts          tamanho de cada elemento (usado pela prévia e pelos geradores)
    syspdvFields.ts     catálogo de tags do SysPDV e valores de exemplo
    templates.ts        cabeçalho e rodapé padrão de cada linguagem
    generators/         um gerador por linguagem (ppla, epl, zpl) + index
    importing/          leitura de layouts prontos (XML do SysPDV, RTF, PPLA, EPL, ZPL)
    exporting.ts        gravação do XML de layout no formato do SysPDV
    controlCodes.ts     caractere STX e a forma visível <STX> usada na tela
    printModes.ts       modos de impressão do PPLA (A1 = XOR) para a prévia
    printerPayload.ts   prepara o texto para envio direto à impressora
    validation.ts       verificações exibidas no painel Verificação
    serialization.ts    leitura e gravação do arquivo .etq
    layout.ts           criação de elementos e layout padrão
    languages.ts        lista de linguagens e resoluções
  main/                 processo principal do Electron
    index.ts            janela, diálogos de abrir/salvar, IPC
    rawPrinter.ts       envio RAW para a impressora do Windows
    resources.ts        caminho da pasta resources em desenvolvimento e no app instalado
  preload/index.ts      ponte segura (contextBridge) exposta como window.api
  renderer/             interface React
    src/App.tsx         estado da tela, atalhos, abrir/salvar/imprimir
    src/components/     barra superior, paleta, prévia (Konva), propriedades, barra de código
    src/hooks/          histórico de desfazer/refazer, tema e imagem do código de barras
    src/theme.ts        leitura, gravação e aplicação do tema claro/escuro
resources/
  raw-print.ps1         script que grava bytes direto no spooler do Windows
  icon.ico / icon.png   ícone do app (etiqueta azul com G), usado na janela, na barra de tarefas e no instalador
tests/                  testes do núcleo
docs/                   esta documentação e os PDFs de referência
```

## Modelo de dados

Um layout (`LabelLayout`) guarda o tamanho da etiqueta em milímetros, o espaço entre etiquetas, a resolução (dpi), a linguagem escolhida, os cabeçalhos/rodapés personalizados por linguagem e a lista de elementos.

Os elementos são de cinco tipos:

| Tipo | Campos principais |
|---|---|
| `text` | conteúdo (texto fixo e/ou tags), altura da letra em mm, rotação, fonte importada opcional (`font`) |
| `barcode` | conteúdo (normalmente `</1>`), tipo (EAN-13 ou 2 de 5), altura das barras em mm, largura do módulo em pontos, largura da barra larga opcional (`wideDots`), mostrar números |
| `line` | largura e altura em mm (uma linha é um retângulo preenchido), inverter o que está embaixo (`invert`) |
| `box` | largura, altura e espessura da borda em mm, inverter o que está embaixo (`invert`) |
| `raw` | comando sem prévia: uma linha de código que o app não sabe desenhar, com a linguagem de origem |

O layout também guarda `syspdvCode` (o campo `ETQCOD` do SysPDV). Ele vem do XML na importação e é gravado na exportação, para a próxima exportação já sugerir o mesmo código.

### Fidelidade na importação

Para que um layout importado e não alterado gere exatamente o mesmo código, o modelo guarda o que não dá para deduzir de milímetros:

- **`font`** (em `text`): a fonte e os multiplicadores exatamente como estavam no código, inclusive valores fora do padrão (como multiplicador `0` no PPLA). Vale só para a linguagem de origem. Ao mudar a altura da letra no painel, ela é descartada e a fonte volta a ser escolhida automaticamente.
- **`wideDots`** (em `barcode`): a largura da barra larga. É descartada ao mudar o tipo ou o módulo.
- **Elementos `raw`**: linhas não reconhecidas no meio do código (por exemplo `A2`) ficam na mesma posição da lista de elementos e são reemitidas como estão. Se a linguagem da etiqueta for trocada, eles ficam fora do código e o painel Verificação avisa.
- **Cabeçalho e rodapé**: tudo antes do primeiro elemento e depois do último vira o cabeçalho e o rodapé personalizados do layout.

### Convenção de coordenadas

No modelo, **toda posição é em milímetros, com origem no canto superior esquerdo da etiqueta**, e `x`/`y` apontam para o canto superior esquerdo da área ocupada pelo elemento **já rotacionado**. Cada gerador converte para o sistema da sua linguagem:

- PPLA usa origem no canto **inferior** esquerdo e unidades de 0,01 polegada.
- EPL e ZPL usam origem no canto superior esquerdo e unidades em pontos (8 pontos por mm a 203 dpi).

### Tamanho do texto

O usuário informa a **altura da letra em mm**. O EPL e o PPLA só têm algumas fontes fixas e multiplicadores inteiros, então `resolveFont` escolhe a combinação mais próxima, penalizando multiplicadores altos (letra "quadriculada"). O painel de propriedades mostra a fonte escolhida e a altura real. No ZPL a fonte 0 é escalável e a altura é usada direto.

A largura do texto na prévia é estimada como `quantidade de caracteres × avanço da fonte`, usando o valor de exemplo de cada tag. Os valores de exemplo podem ser trocados em Propriedades (sem elemento selecionado, ou no elemento que usa a tag) e ficam salvos no layout em `samples`; `</15>`, `</16>` e `</18>` são recortados da descrição `</2>`. A prévia continua **aproximada**: os valores reais do SysPDV podem ser mais longos (até o tamanho máximo de cada campo).

## Fluxo de dados na interface

1. `App.tsx` guarda o layout em um histórico (`useHistory`), o que dá desfazer/refazer em qualquer alteração.
2. A cada alteração, `generateScript` gera o código e `validateLayout` gera os avisos. Ambos são recalculados com `useMemo`.
3. A prévia (`LabelCanvas`) usa as mesmas funções de medida do núcleo, então o que aparece na tela corresponde ao que os geradores calculam. Ela desenha os elementos na mesma ordem em que vão para o código (`emissionOrder`: linhas e caixas invertidas por último). Elementos em modo de inversão (`invertedElementIds`) são desenhados com mistura "difference", que reproduz o XOR da impressora. A grade é desenhada por cima com mistura "multiply", para não aparecer dentro das áreas pretas.
4. **Imprimir teste** gera o script com valores de exemplo (`withSamples`), passa por `toPrinterPayload` e manda para o processo principal, que grava os bytes em Latin-1 num arquivo temporário e chama `resources/raw-print.ps1`.

## Tema claro e escuro

- As cores da interface são variáveis CSS em `styles.css`: o bloco `:root` é o tema claro e `:root[data-theme='dark']` redefine as mesmas variáveis para o escuro. Nenhuma regra de componente usa cor fixa, só essas variáveis.
- `theme.ts` lê e grava a escolha no `localStorage` (`gondolapro.theme`). Sem escolha salva, segue o tema do Windows. `main.tsx` aplica o tema antes do primeiro desenho, para não piscar o tema errado ao abrir.
- `useTheme` guarda o tema no estado do `App`, e o botão da barra superior alterna entre os dois. A cada troca o processo principal recebe `theme:set`, que ajusta `nativeTheme` (barra de título e diálogos do Windows) e a cor de fundo da janela.
- A prévia da etiqueta **não segue o tema**. O `LabelCanvas` desenha no Konva com a paleta fixa `LABEL_COLORS` (papel branco, tinta escura, grade, seleção), e o código de barras usa cores fixas em `useBarcodeImage`. Só o fundo em volta da etiqueta (`--canvas-bg`) muda com o tema.

## Importação

O fluxo fica em `src/core/importing`:

1. O botão **Abrir** usa um só diálogo (`layout:open`), que devolve o arquivo como bytes, porque o XML do SysPDV vem em Windows-1252 e não em UTF-8. Se a extensão for `.etq`, o arquivo é lido por `parseLayout` e abre direto. Qualquer outro arquivo vai para a tela de conferência (`ImportDialog`). Texto colado com Ctrl+V fora de um campo de texto também vai para essa tela.
2. `extractCandidates` decide o formato. Se for um XML com `DATAPACKET` (exportação do SysPDV), cada `ROW` vira uma opção: `ETQCOD` é o código, `ETQDES` a descrição e `ETQLAY` o layout em base64. O conteúdo de `ETQLAY` é um documento **RTF** (o SysPDV guarda o layout num campo de texto rico), convertido para texto puro por `rtfToText`. Qualquer outro arquivo é tratado como código puro (ou RTF, se começar com `{\rtf`).
3. `detectLanguage` escolhe a linguagem: `^XA` indica ZPL; senão, conta as linhas que parecem elementos PPLA e EPL.
4. `inferFrame` lê o tamanho da etiqueta quando o código informa (`q`/`Q` no EPL, `^PW`/`^LL` no ZPL). No PPLA o usuário precisa conferir.
5. `importScript` chama o parser da linguagem. Cada linha de elemento reconhecida vira um elemento posicionado em mm, fazendo o caminho inverso dos geradores (mesmas tabelas de rotação e de cantos de referência). O resto vira `raw`.

O teste `tests/importing.test.ts` usa um layout real exportado do SysPDV e confere que importar e gerar de novo devolve o script original, caractere por caractere.

## Exportação para o SysPDV

`buildSyspdvExport` (em `src/core/exporting.ts`) faz o caminho inverso da importação:

1. O script gerado (o mesmo de **Copiar código**, com cabeçalho e rodapé) vira RTF por `textToRtf`: o mesmo cabeçalho que o SysPDV grava (fonte Tahoma, `\fs20`), uma linha por parágrafo terminada em `\par`, um parágrafo vazio no fim e o byte nulo que o SysPDV deixa depois da última chave. Caracteres de controle e acentos viram `\'hh` (byte em Windows-1252); `\`, `{` e `}` são escapados.
2. O RTF é codificado em Windows-1252 e depois em base64, e vai no atributo `ETQLAY`.
3. O XML usa o mesmo `DATAPACKET` (metadados `ETQCOD`, `ETQDES`, `ETQLAY`) do arquivo que o SysPDV exporta, com uma única `ROW`, e é gravado em Windows-1252.

O código aceita até 2 letras ou números (um dígito sozinho vira `04`, por exemplo) e a descrição até 40 caracteres, os mesmos limites do banco do SysPDV.

O teste `tests/exporting.test.ts` confere que exportar o layout real usado nos testes de importação devolve exatamente o mesmo base64 que o SysPDV gravou. **Ainda não foi testada a importação do XML gerado dentro do SysPDV**, nem o que o SysPDV faz quando o código já existe (substitui ou recusa).

## Arquivo .etq

JSON com `kind: "gondolapro-layout"` (arquivos antigos, com `"etiqstudio-layout"`, também abrem), `version` e o `layout`. Se o formato mudar no futuro, aumente `FILE_VERSION` em `serialization.ts` e trate a migração em `parseLayout`.

## Testes

`npm test` cobre conversões de unidade, escolha de fonte, os três geradores, a importação (incluindo ida e volta em cada linguagem), tags, validação, preparação do envio para a impressora e leitura/gravação do arquivo. Os valores esperados dos geradores foram calculados à mão a partir das regras descritas em [printer-languages.md](printer-languages.md). Quando uma regra for corrigida após teste em impressora, atualize o teste e a documentação juntos.
