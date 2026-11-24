import { languageInfo } from './languages'
import { describeElement } from './layout'
import { elementBox, textInkBox } from './measure'
import { fieldByCode, findTagUsages, findTags } from './syspdvFields'
import type { Box, LabelElement, LabelLayout, LineElement, TextElement } from './types'

export interface LayoutIssue {
  elementId?: string
  message: string
}

const TOLERANCE_MM = 0.01

function union(first: Box, second: Box | null): Box {
  if (!second) {
    return first
  }
  const x = Math.min(first.x, second.x)
  const y = Math.min(first.y, second.y)
  return {
    x,
    y,
    width: Math.max(first.x + first.width, second.x + second.width) - x,
    height: Math.max(first.y + first.height, second.y + second.height) - y
  }
}

function overlaps(first: Box, second: Box): boolean {
  return (
    first.x < second.x + second.width - TOLERANCE_MM &&
    second.x < first.x + first.width - TOLERANCE_MM &&
    first.y < second.y + second.height - TOLERANCE_MM &&
    second.y < first.y + first.height - TOLERANCE_MM
  )
}

function contains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x - TOLERANCE_MM &&
    inner.y >= outer.y - TOLERANCE_MM &&
    inner.x + inner.width <= outer.x + outer.width + TOLERANCE_MM &&
    inner.y + inner.height <= outer.y + outer.height + TOLERANCE_MM
  )
}

function lineIssues(element: TextElement, layout: LabelLayout, name: string): LayoutIssue[] {
  const ink = textInkBox(element, layout)
  if (!ink) {
    return []
  }
  const cellHeight = elementBox(element, layout).height
  return layout.elements
    .filter((other): other is LineElement => other.type === 'line')
    .filter((line) => {
      const band = elementBox(line, layout)
      return overlaps(band, ink) && !contains(band, ink)
    })
    .map((line) => ({
      elementId: element.id,
      message:
        line.heightMm >= cellHeight
          ? `${name} não cabe inteiro na faixa em que está: uma parte sai para fora dela.`
          : `${name} é cortado por uma linha.`
    }))
}

function contentOf(element: LabelElement): string | null {
  return element.type === 'text' || element.type === 'barcode' ? element.content : null
}

export function validateLayout(layout: LabelLayout): LayoutIssue[] {
  const issues: LayoutIssue[] = []

  for (const element of layout.elements) {
    const name = describeElement(element)

    if (element.type === 'raw') {
      if (element.language !== layout.language) {
        issues.push({
          elementId: element.id,
          message: `${name} é de ${languageInfo(element.language).label} e fica fora do código em ${languageInfo(layout.language).label}.`
        })
      }
      continue
    }

    const box = element.type === 'text' ? union(elementBox(element, layout), textInkBox(element, layout)) : elementBox(element, layout)

    if (
      box.x < -TOLERANCE_MM ||
      box.y < -TOLERANCE_MM ||
      box.x + box.width > layout.widthMm + TOLERANCE_MM ||
      box.y + box.height > layout.heightMm + TOLERANCE_MM
    ) {
      issues.push({ elementId: element.id, message: `${name} passa da borda da etiqueta.` })
    }

    if (element.type === 'text') {
      issues.push(...lineIssues(element, layout, name))
    }

    const content = contentOf(element)
    if (content === null) {
      continue
    }

    if (!content.trim()) {
      issues.push({ elementId: element.id, message: `${name} está sem conteúdo.` })
    }

    for (const usage of findTagUsages(content)) {
      const field = fieldByCode(usage.code)
      if (!field) {
        issues.push({ elementId: element.id, message: `A tag </${usage.code}> não está na legenda do SysPDV.` })
      } else if (field.parameterDigits && usage.parameter.length < field.parameterDigits) {
        issues.push({ elementId: element.id, message: `A tag </${field.code}> precisa de ${field.parameterDigits} dígitos logo depois dela. ${field.parameterHint ?? ''}`.trim() })
      }
    }

    if (element.type === 'barcode' && element.symbology === 'ean13' && findTags(content).length === 0) {
      const digits = content.replace(/\D/g, '')
      if (digits.length !== content.trim().length || (digits.length !== 12 && digits.length !== 13)) {
        issues.push({ elementId: element.id, message: 'Código EAN-13 fixo precisa ter 12 ou 13 dígitos.' })
      }
    }
  }

  return issues
}
