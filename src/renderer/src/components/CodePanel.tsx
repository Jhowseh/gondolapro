import { useState } from 'react'
import { showControlCodes } from '../../../core/controlCodes'
import { languageInfo } from '../../../core/languages'
import type { LabelLayout, Template } from '../../../core/types'
import type { LayoutIssue } from '../../../core/validation'
import { Icon } from './Icon'
import { TemplateEditor } from './TemplateEditor'

interface CodePanelProps {
  layout: LabelLayout
  script: string
  issues: LayoutIssue[]
  expanded: boolean
  printers: string[]
  printer: string
  printing: boolean
  onExpandedChange: (expanded: boolean) => void
  onPrinterChange: (printer: string) => void
  onCopy: () => void
  onPrintTest: () => void
  onTemplateChange: (template: Template | null) => void
  onSelectElement: (id: string) => void
}

function issueSummary(count: number): string {
  if (count === 0) return 'Nenhum problema'
  return count === 1 ? '1 problema' : `${count} problemas`
}

export function CodePanel(props: CodePanelProps) {
  const { layout, script, issues, expanded, printers, printer } = props
  const [showTemplates, setShowTemplates] = useState(false)
  const info = languageInfo(layout.language)
  const hasIssues = issues.length > 0

  return (
    <section className={`code-panel ${expanded ? 'expanded' : ''}`}>
      <div className="code-bar">
        <button
          type="button"
          className="code-toggle"
          aria-expanded={expanded}
          onClick={() => props.onExpandedChange(!expanded)}
          title={expanded ? 'Esconder o código gerado' : 'Mostrar o código gerado'}
        >
          <Icon name={expanded ? 'chevronDown' : 'chevronUp'} size={14} />
          Código {info.label}
        </button>
        <button
          type="button"
          className={`status-chip ${hasIssues ? 'status-warn' : 'status-ok'}`}
          onClick={() => props.onExpandedChange(true)}
          title={hasIssues ? 'Ver os problemas encontrados' : 'O layout passou na verificação'}
        >
          <Icon name={hasIssues ? 'alert' : 'check'} size={14} />
          {issueSummary(issues.length)}
        </button>
        {expanded && (
          <button type="button" onClick={() => setShowTemplates((value) => !value)} className={showTemplates ? 'active' : ''}>
            Cabeçalho e rodapé
          </button>
        )}

        <div className="code-bar-end">
          <button type="button" className="with-icon" onClick={props.onCopy} title="Copiar o código para colar no SysPDV">
            <Icon name="copy" size={14} />
            Copiar código
          </button>
          <div className="print-group">
            <select
              value={printer}
              onChange={(event) => props.onPrinterChange(event.target.value)}
              disabled={printers.length === 0}
              title="Impressora usada no teste"
              aria-label="Impressora usada no teste"
            >
              {printers.length === 0 && <option value="">Nenhuma impressora</option>}
              {printers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button type="button" className="with-icon" onClick={props.onPrintTest} disabled={!printer || props.printing} title="Imprimir uma etiqueta com os valores de exemplo">
              <Icon name="printer" size={14} />
              {props.printing ? 'Enviando…' : 'Imprimir teste'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="code-body">
          <textarea className="code" readOnly spellCheck={false} value={showControlCodes(script)} aria-label="Código gerado" />
          {showTemplates && <TemplateEditor layout={layout} onChange={props.onTemplateChange} />}
          <div className="issues">
            <h3>Verificação</h3>
            {hasIssues ? (
              <ul className="issue-list">
                {issues.map((issue, index) => (
                  <li key={`${issue.elementId ?? 'layout'}-${index}`}>
                    {issue.elementId ? (
                      <button type="button" className="link" onClick={() => props.onSelectElement(issue.elementId!)}>
                        {issue.message}
                      </button>
                    ) : (
                      issue.message
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ok">Nenhum problema encontrado.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
