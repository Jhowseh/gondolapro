type FieldGroup = 'product' | 'price' | 'reference' | 'promotion' | 'stock' | 'company' | 'structure'

export interface SysPdvField {
  code: string
  label: string
  maxLength?: number
  sample: string
  group: FieldGroup
  parameterDigits?: number
  parameterHint?: string
  insert?: string
  padding?: string
}

export type SampleValues = Record<string, string>

interface TagUsage {
  code: string
  parameter: string
}

export const QUANTITY_TAG = '17'

export const FIELD_GROUPS: { id: FieldGroup; label: string }[] = [
  { id: 'product', label: 'Produto' },
  { id: 'price', label: 'Preços' },
  { id: 'reference', label: 'Preço referencial' },
  { id: 'promotion', label: 'Oferta programada' },
  { id: 'stock', label: 'Estoque e datas' },
  { id: 'company', label: 'Empresa e fornecedor' }
]

const DESCRIPTION_SAMPLE = 'ARROZ TIPO 1 PREMIUM PACOTE 5KG'

const PRICE_PADDING = '  '

const DESCRIPTION_CODE = '2'

const DESCRIPTION_SLICES: Record<string, [number, number]> = { '15': [0, 25], '16': [25, 45] }

export const SYSPDV_FIELDS: SysPdvField[] = [
  { code: '1', label: 'Código do produto', maxLength: 14, sample: '7891234567895', group: 'product' },
  { code: '2', label: 'Descrição do produto', maxLength: 45, sample: DESCRIPTION_SAMPLE, group: 'product' },
  { code: '3', label: 'Descrição reduzida', maxLength: 20, sample: 'ARROZ T1 PREMIUM 5KG', group: 'product' },
  { code: '4', label: 'Seção', maxLength: 30, sample: 'MERCEARIA', group: 'product' },
  { code: '5', label: 'Unidade', maxLength: 3, sample: 'UN', group: 'product' },
  { code: '6', label: 'Preço de venda ou oferta 1', maxLength: 22, sample: '1.249,90', group: 'price', padding: PRICE_PADDING },
  { code: '7', label: 'Preço de venda ou oferta 2', maxLength: 22, sample: '1.229,90', group: 'price', padding: PRICE_PADDING },
  { code: '8', label: 'Preço de venda ou oferta 3', maxLength: 22, sample: '1.219,90', group: 'price', padding: PRICE_PADDING },
  { code: '9', label: 'Tabela de preço 1', maxLength: 22, sample: '1.269,90', group: 'price', padding: PRICE_PADDING },
  { code: '10', label: 'Tabela de preço 2', maxLength: 22, sample: '1.259,90', group: 'price', padding: PRICE_PADDING },
  { code: '11', label: 'Tabela de preço 3', maxLength: 22, sample: '1.245,50', group: 'price', padding: PRICE_PADDING },
  { code: '12', label: 'Fornecedor', maxLength: 40, sample: 'DISTRIBUIDORA EXEMPLO LTDA', group: 'company' },
  { code: '13', label: 'Nome fantasia da empresa', maxLength: 40, sample: 'MERCADO EXEMPLO', group: 'company' },
  { code: '14', label: 'Data atual (DDMM)', maxLength: 4, sample: '2411', group: 'stock' },
  { code: '15', label: 'Descrição, caracteres 1 a 25', maxLength: 25, sample: DESCRIPTION_SAMPLE.slice(...DESCRIPTION_SLICES['15']), group: 'product' },
  { code: '16', label: 'Descrição, caracteres 26 a 45', maxLength: 20, sample: DESCRIPTION_SAMPLE.slice(...DESCRIPTION_SLICES['16']), group: 'product' },
  { code: QUANTITY_TAG, label: 'Quantidade de etiquetas', maxLength: 4, sample: '1', group: 'structure' },
  {
    code: '18',
    label: 'Trecho da descrição',
    maxLength: 45,
    sample: DESCRIPTION_SAMPLE,
    group: 'product',
    parameterDigits: 4,
    parameterHint: '</18>XXYY: XX é o caractere inicial e YY o final da descrição. Exemplo: </18>0234 imprime do 2º ao 34º caractere.',
    insert: '</18>0125'
  },
  { code: '19', label: 'Estoque mínimo', maxLength: 10, sample: '10', group: 'stock' },
  { code: '20', label: 'Estoque máximo', maxLength: 10, sample: '100', group: 'stock' },
  { code: '21', label: 'Palavra OFERTA', maxLength: 6, sample: 'OFERTA', group: 'price' },
  { code: '22', label: 'Data do último reajuste de preço (DDMM)', maxLength: 4, sample: '0111', group: 'stock' },
  { code: '23', label: 'Unidade de referência', maxLength: 5, sample: 'LT', group: 'reference' },
  { code: '24', label: 'Medida de referência', maxLength: 13, sample: '4,98', group: 'reference' },
  { code: '25', label: 'Divisor da quantidade dividida por 3', sample: '1', group: 'stock' },
  { code: '26', label: 'Início da oferta programada (DD/MM/AA)', maxLength: 8, sample: '24/11/26', group: 'promotion' },
  { code: '27', label: 'Fim da oferta programada (DD/MM/AA)', maxLength: 8, sample: '30/11/26', group: 'promotion' },
  { code: '28', label: 'Preço da oferta programada', maxLength: 22, sample: '1.199,90', group: 'promotion', padding: PRICE_PADDING },
  { code: '29', label: 'Quantidade mínima da tabela de preço 2', maxLength: 22, sample: '6', group: 'price' },
  { code: '30', label: 'Quantidade mínima da tabela de preço 3', maxLength: 22, sample: '12', group: 'price' },
  {
    code: '32',
    label: 'Coluna da etiqueta individual',
    sample: '',
    group: 'structure',
    parameterDigits: 7,
    parameterHint: '</32>VVVXXXX: VVV é a distância horizontal entre etiquetas e XXXX a coordenada X da primeira.'
  },
  { code: '33', label: 'Código auxiliar numérico (principal)', maxLength: 15, sample: '789123456789', group: 'product' },
  {
    code: '99',
    label: 'Caractere pelo código ASCII',
    maxLength: 1,
    sample: '',
    group: 'structure',
    parameterDigits: 3,
    parameterHint: '</99>XXX: XXX é o código ASCII do caractere. Exemplo: </99>065 escreve A.'
  },
  { code: 'referenciafabricante', label: 'Referência do fabricante', maxLength: 20, sample: 'REF-12345', group: 'product' },
  { code: 'precoreferencial', label: 'Preço referencial', maxLength: 1, sample: 'R$ 4,98/LT', group: 'reference' },
  { code: 'corpo', label: 'Fim do trecho repetido nas etiquetas individuais', sample: '', group: 'structure' }
]

const FIELD_BY_CODE = new Map(SYSPDV_FIELDS.map((field) => [field.code, field]))

const TAG_PATTERN = /<\/(\d+|[a-z]+)>(\d*)/gi

export function tag(code: number | string): string {
  return `</${code}>`
}

export function fieldByCode(code: string): SysPdvField | undefined {
  return FIELD_BY_CODE.get(code.toLowerCase())
}

export function insertTextOf(field: SysPdvField): string {
  return field.insert ?? tag(field.code)
}

export function isPrintableField(field: SysPdvField): boolean {
  return field.group !== 'structure'
}

export const PRINTABLE_FIELD_GROUPS = FIELD_GROUPS.map((group) => ({
  ...group,
  fields: SYSPDV_FIELDS.filter((field) => isPrintableField(field) && field.group === group.id)
}))

export function findTagUsages(text: string): TagUsage[] {
  return [...text.matchAll(TAG_PATTERN)].map((match) => {
    const field = fieldByCode(match[1])
    const digits = match[2]
    return { code: match[1].toLowerCase(), parameter: field?.parameterDigits ? digits.slice(0, field.parameterDigits) : '' }
  })
}

export function findTags(text: string): string[] {
  return findTagUsages(text).map((usage) => usage.code)
}

function isEditableSample(field: SysPdvField): boolean {
  return isPrintableField(field) && !field.parameterDigits && !(field.code in DESCRIPTION_SLICES)
}

export function sampleFieldsFor(texts: string[]): SysPdvField[] {
  const codes = new Set(texts.flatMap(findTags).map((code) => (code in DESCRIPTION_SLICES || code === '18' ? DESCRIPTION_CODE : code)))
  return SYSPDV_FIELDS.filter((field) => codes.has(field.code) && isEditableSample(field))
}

export function sampleValue(field: SysPdvField, samples: SampleValues = {}): string {
  const value = samples[field.code] ?? field.sample
  return field.maxLength ? value.slice(0, field.maxLength) : value
}

export function cleanSamples(samples: SampleValues): SampleValues {
  return Object.fromEntries(
    Object.entries(samples).filter(([code, value]) => {
      const field = fieldByCode(code)
      return field !== undefined && field.code === code && isEditableSample(field) && value !== field.sample
    })
  )
}

function descriptionSample(samples: SampleValues): string {
  return sampleValue(fieldByCode(DESCRIPTION_CODE)!, samples)
}

function printedSample(field: SysPdvField, samples: SampleValues): string {
  const slice = DESCRIPTION_SLICES[field.code]
  if (slice) {
    return descriptionSample(samples).slice(...slice)
  }
  return (field.padding ?? '') + sampleValue(field, samples)
}

function sampleFor(code: string, digits: string, samples: SampleValues): string {
  const field = fieldByCode(code)
  if (!field) {
    return `[${code}]${digits}`
  }
  const size = field.parameterDigits ?? 0
  if (size === 0 || digits.length < size) {
    return printedSample(field, samples) + digits
  }
  const parameter = digits.slice(0, size)
  const rest = digits.slice(size)
  switch (field.code) {
    case '18':
      return descriptionSample(samples).slice(Number(parameter.slice(0, 2)) - 1, Number(parameter.slice(2, 4))) + rest
    case '99':
      return String.fromCharCode(Number(parameter)) + rest
    case '32':
      return parameter.slice(3) + rest
    default:
      return printedSample(field, samples) + rest
  }
}

export function substituteSamples(text: string, samples: SampleValues = {}): string {
  return text.replace(TAG_PATTERN, (_match, code: string, digits: string) => sampleFor(code.toLowerCase(), digits, samples))
}
