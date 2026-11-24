# GôndolaPro

Editor visual de layouts de etiqueta para o **SysPDV**. Você monta a etiqueta arrastando textos, campos do SysPDV, códigos de barras, linhas e caixas sobre uma prévia em milímetros, e o GôndolaPro gera o script na linguagem da impressora (**PPLA**, **EPL/PPLB** ou **ZPL**) pronto para colar em **Utilitários > Configuração de layouts > Etiqueta** no SysPDV.

O objetivo é acabar com o ciclo "editar número → imprimir → ajustar" que o SysPDV exige, já que ele não mostra a etiqueta na tela.

## Como rodar

Pré-requisitos: Node.js 22 ou mais novo (testado com 26) e Windows.

```powershell
npm install
```

```powershell
node node_modules\electron\install.js
```

O segundo comando baixa o executável do Electron; o npm 11+ não roda mais esse download automaticamente.

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o app em modo de desenvolvimento, com recarga automática |
| `npm test` | Roda os testes do núcleo (geradores, medidas, validação) |
| `npm run typecheck` | Checagem de tipos do TypeScript |
| `npm run build` | Gera os arquivos de produção em `out/` |
| `npm run dist` | Gera o instalador do Windows em `release/` |

## Como usar

1. Ajuste **Largura**, **Altura** e **Espaço** (o espaço entre uma etiqueta e outra no rolo) na barra superior.
2. Escolha a **Linguagem** de acordo com a impressora do cliente:
   - **PPLA**: Argox OS-214, Elgin L42
   - **EPL / PPLB**: Zebra TLP 2844 e GC420t, Argox, Elgin, Honeywell
   - **ZPL**: Zebra GC420t e S4M, Elgin L42, Honeywell
3. Adicione elementos pelo painel da esquerda. Os **Campos do SysPDV** entram como texto já com a tag (`</3>`, `</6>` etc.).
4. Arraste os elementos na prévia (encaixam a cada 0,5 mm) ou digite posição e tamanho no painel da direita.
5. Confira o painel **Verificação**: ele avisa sobre elementos fora da etiqueta, tags desconhecidas e códigos EAN inválidos.
6. Use **Imprimir teste** para mandar a etiqueta direto para a impressora, com valores de exemplo no lugar das tags.
7. Leve o layout para o SysPDV de um destes jeitos:
   - **Exportar XML**: gera o mesmo XML que o SysPDV exporta, pronto para importar na tela de layouts de etiqueta. Pede o código (até 2 caracteres) e a descrição (até 40) do layout no SysPDV.
   - **Copiar código**: copia o script para colar direto na tela de layout do SysPDV.
8. Salve o layout em um arquivo `.etq` para reaproveitar depois.

O botão **☾ / ☀** no canto direito da barra superior alterna entre o tema escuro e o claro. A escolha fica salva no computador. O tema muda só a interface: a etiqueta na prévia continua branca com tinta preta, como sai na impressora.

### Abrir um layout que já existe

O botão **Abrir** aceita todos os formatos:

- **Layout do GôndolaPro** (`.etq`): abre direto.
- **XML exportado do SysPDV**: o arquivo com `DATAPACKET`, que traz código, descrição e layout. Se o XML tiver mais de um layout, escolha qual importar.
- **Arquivo de código** (`.txt`, `.prn`, `.zpl`, `.epl`), por exemplo o gerado pelo BarTender ou ZebraDesigner com "Imprimir para arquivo".

Para **código copiado** da tela de layout do SysPDV, clique na prévia e use **Ctrl+V**.

Tudo o que não é `.etq` passa por uma tela de conferência antes de abrir. A linguagem é detectada sozinha e pode ser trocada. Em EPL e ZPL o tamanho da etiqueta vem do próprio código; em PPLA ele não vem, então confira largura e altura antes de importar.

O que o GôndolaPro não sabe desenhar não é descartado. Essas linhas viram **comandos sem prévia**, listados no painel da esquerda, e voltam para o código na mesma posição. Um layout importado e não alterado gera exatamente o mesmo código de antes.

### Atalhos

| Tecla | Ação |
|---|---|
| Setas | Move o elemento 0,5 mm (com Shift, 5 mm) |
| Delete | Exclui o elemento |
| Ctrl+D | Duplica o elemento |
| Ctrl+Z / Ctrl+Y | Desfaz / refaz |
| Ctrl+S / Ctrl+Shift+S | Salva / salva como |
| Ctrl+O | Abre um layout (.etq, XML do SysPDV ou código) |
| Ctrl+V | Importa código de etiqueta copiado (fora de um campo de texto) |
| Ctrl+E | Exporta o XML para o SysPDV |
| Esc | Tira a seleção |

### Cabeçalho e rodapé

Cada linguagem tem um cabeçalho e um rodapé padrão (velocidade, temperatura, tamanho da etiqueta, quantidade). Eles podem ser editados pelo botão **Cabeçalho e rodapé** e ficam salvos junto com o layout. Aceitam as variáveis `{widthDots}`, `{heightDots}` e `{gapDots}`. Detalhes em [docs/printer-languages.md](docs/printer-languages.md).

No código e nos editores, `<STX>` representa o caractere de controle STX (código 2), que o SysPDV grava no início dos comandos de sistema do PPLA. Ele é invisível, por isso aparece escrito assim na tela; ao copiar o código, o caractere real vai junto.

## Documentação

- [docs/architecture.md](docs/architecture.md): organização do código, modelo de dados e convenções
- [docs/printer-languages.md](docs/printer-languages.md): como cada elemento vira PPLA, EPL e ZPL, e o que ainda precisa ser calibrado
- [docs/syspdv-tags.md](docs/syspdv-tags.md): legenda completa das tags do SysPDV, inclusive as que levam parâmetro
- [docs/reference/](docs/reference/): PDFs de referência do SysPDV e dos modelos de etiqueta

## Situação atual

Versão 0.1. Os geradores seguem a sintaxe dos manuais e dos exemplos de layout do SysPDV, mas **ainda não foram validados em uma impressora física**. A lista do que precisa ser conferido está em [docs/printer-languages.md](docs/printer-languages.md#o-que-precisa-ser-calibrado).

## Créditos

Desenvolvido por José Henrique, Erick Henrique e Eduardo Vasconcelos. Os mesmos créditos aparecem no botão **Sobre**, no canto direito da barra de ferramentas.
