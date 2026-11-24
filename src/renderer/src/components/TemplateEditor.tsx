import { restoreControlCodes, showControlCodes, STX_LABEL } from '../../../core/controlCodes'
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES, templateFor } from '../../../core/templates'
import type { LabelLayout, Template } from '../../../core/types'

interface TemplateEditorProps {
  layout: LabelLayout
  onChange: (template: Template | null) => void
}

export function TemplateEditor({ layout, onChange }: TemplateEditorProps) {
  const template = templateFor(layout)
  const customized = Boolean(layout.templates[layout.language])

  return (
    <div className="template-editor">
      <label className="field">
        <span className="field-label">Cabeçalho</span>
        <textarea
          rows={6}
          spellCheck={false}
          value={showControlCodes(template.header)}
          onChange={(event) => onChange({ ...template, header: restoreControlCodes(event.target.value) })}
        />
      </label>
      <label className="field">
        <span className="field-label">Rodapé</span>
        <textarea
          rows={3}
          spellCheck={false}
          value={showControlCodes(template.footer)}
          onChange={(event) => onChange({ ...template, footer: restoreControlCodes(event.target.value) })}
        />
      </label>
      <p className="hint">
        Variáveis disponíveis: {TEMPLATE_VARIABLES.map((name) => `{${name}}`).join(', ')}. A tag &lt;/17&gt; é a quantidade de etiquetas. {STX_LABEL} representa o
        caractere de controle STX, que o SysPDV grava no início dos comandos de sistema do PPLA.
      </p>
      <button
        type="button"
        disabled={!customized}
        onClick={() => onChange(null)}
        title={`Volta para o padrão: ${showControlCodes(DEFAULT_TEMPLATES[layout.language].header).split('\n').join(' ')}`}
      >
        Restaurar padrão
      </button>
    </div>
  )
}
