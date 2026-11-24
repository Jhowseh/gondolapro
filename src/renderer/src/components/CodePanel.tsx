import { useState } from 'react'
import { showControlCodes } from '../../../core/controlCodes'
import { languageInfo } from '../../../core/languages'
import type { LabelLayout, Template } from '../../../core/types'
import type { LayoutIssue } from '../../../core/validation'
import { TemplateEditor } from './TemplateEditor'

interface CodePanelProps {
  layout: LabelLayout
  script: string
  issues: LayoutIssue[]
  printers: string[]
  printer: string
  printing: boolean
  onPrinterChange: (printer: string) => void
  onCopy: () => void
  onPrintTest: () => void
  onTemplateChange: (template: Template | null) => void
  onSelectElement: (id: string) => void
}

export function CodePanel(props: CodePanelProps) {
  const { layout, script, issues, printers, printer } = props
  const [showTemplates, setShowTemplates] = useState(false)
  const info = languageInfo(layout.language)

  return (
    <section className="code-panel">
      <div className="code-header">
        <div>
          <h2>Código gerado · {info.label}</h2>
          <span className="subtitle">{info.printers}</span>
        </div>
        <div className="code-actions">
          <button type="button" onClick={() => setShowTemplates((value) => !value)} className={showTemplates ? 'active' : ''}>
            Cabeçalho e rodapé
          </button>
          <button type="button" onClick={props.onCopy}>Copiar código</button>
          <select value={printer} onChange={(event) => props.onPrinterChange(event.target.value)} disabled={printers.length === 0}>
            {printers.length === 0 && <option value="">Nenhuma impressora encontrada</option>}
            {printers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button type="button" className="primary" onClick={props.onPrintTest} disabled={!printer || props.printing}>
            {props.printing ? 'Enviando…' : 'Imprimir teste'}
          </button>
        </div>
      </div>

      <div className="code-body">
        <textarea className="code" readOnly spellCheck={false} value={showControlCodes(script)} />
        {showTemplates && <TemplateEditor layout={layout} onChange={props.onTemplateChange} />}
        <div className="issues">
          <h3>Verificação</h3>
          {issues.length === 0 ? (
            <p className="ok">Nenhum problema encontrado.</p>
          ) : (
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
          )}
        </div>
      </div>
    </section>
  )
}
