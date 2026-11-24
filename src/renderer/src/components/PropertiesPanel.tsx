import { restoreControlCodes, showControlCodes } from '../../../core/controlCodes'
import { DPI_OPTIONS, LANGUAGES, languageInfo } from '../../../core/languages'
import { measureText } from '../../../core/measure'
import type { BarcodeElement, BoxElement, LabelElement, LabelLayout, Language, LineElement, RawElement, Rotation, Symbology, TextElement } from '../../../core/types'
import { dotsToMm } from '../../../core/units'
import type { LayoutIssue } from '../../../core/validation'
import { Icon } from './Icon'
import { NumberField } from './NumberField'
import { SampleFields } from './SampleFields'
import { TagPicker } from './TagPicker'

type Patch = Partial<LabelElement>

interface PropertiesPanelProps {
  layout: LabelLayout
  element: LabelElement | null
  issues: LayoutIssue[]
  onChange: (id: string, patch: Patch) => void
  onLayoutChange: (patch: Partial<LabelLayout>) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onDeselect: () => void
  onSampleChange: (code: string, value: string) => void
}

const ROTATIONS: Rotation[] = [0, 90, 180, 270]

const TITLES: Record<LabelElement['type'], string> = {
  text: 'Texto',
  barcode: 'Código de barras',
  line: 'Linha',
  box: 'Caixa',
  raw: 'Comando sem prévia'
}

function RotationField({ value, onChange }: { value: Rotation; onChange: (rotation: Rotation) => void }) {
  return (
    <div className="field">
      <span className="field-label">Rotação</span>
      <div className="segmented">
        {ROTATIONS.map((rotation) => (
          <button key={rotation} type="button" className={rotation === value ? 'active' : ''} onClick={() => onChange(rotation)}>
            {rotation}°
          </button>
        ))}
      </div>
    </div>
  )
}

function TextProperties({ element, layout, onChange }: { element: TextElement; layout: LabelLayout; onChange: (patch: Partial<TextElement>) => void }) {
  const { font } = measureText(element, layout)
  const imported = element.font?.language === layout.language
  const realHeight = dotsToMm(font.heightDots, layout.dpi).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const fontDescription =
    layout.language === 'zpl'
      ? `Fonte ${font.fontId}${font.fontId === '0' ? ' escalável' : ''} · ${realHeight} mm`
      : `Fonte ${font.fontId} · ×${font.hMult}/×${font.vMult} · ${realHeight} mm`

  return (
    <>
      <label className="field">
        <span className="field-label">Conteúdo</span>
        <textarea rows={2} value={element.content} onChange={(event) => onChange({ content: event.target.value })} spellCheck={false} />
      </label>
      <TagPicker placeholder="Inserir campo do SysPDV…" onPick={(tagText) => onChange({ content: element.content + tagText })} />
      <div className="field-row">
        <NumberField
          label="Altura da letra"
          suffix="mm"
          value={element.heightMm}
          min={0.5}
          max={60}
          step={0.5}
          onChange={(heightMm) => onChange({ heightMm, font: undefined })}
        />
      </div>
      <p
        className="hint"
        title={imported ? 'A fonte veio do layout importado e é mantida exatamente como estava. Mudar a altura troca para a fonte escolhida automaticamente.' : undefined}
      >
        {`${languageInfo(layout.language).label}: ${imported ? 'fonte importada, ' : ''}${fontDescription}`}
      </p>
      <RotationField value={element.rotation} onChange={(rotation) => onChange({ rotation })} />
    </>
  )
}

function RawProperties({ element, layout, onChange }: { element: RawElement; layout: LabelLayout; onChange: (patch: Partial<RawElement>) => void }) {
  const ignored = element.language !== layout.language
  return (
    <>
      <label className="field">
        <span className="field-label">Comando</span>
        <textarea
          rows={4}
          value={showControlCodes(element.content)}
          onChange={(event) => onChange({ content: restoreControlCodes(event.target.value) })}
          spellCheck={false}
        />
      </label>
      <p className="hint">
        {`Comando de ${languageInfo(element.language).label} que o GôndolaPro não sabe desenhar. Ele não aparece na prévia, mas é enviado como está, na mesma posição do código.`}
      </p>
      {ignored && <p className="hint">{`Como a etiqueta agora está em ${languageInfo(layout.language).label}, este comando fica fora do código.`}</p>}
    </>
  )
}

function BarcodeProperties({ element, onChange }: { element: BarcodeElement; onChange: (patch: Partial<BarcodeElement>) => void }) {
  return (
    <>
      <label className="field">
        <span className="field-label">Conteúdo</span>
        <input value={element.content} onChange={(event) => onChange({ content: event.target.value })} spellCheck={false} />
      </label>
      <TagPicker placeholder="Trocar pelo campo do SysPDV…" onPick={(tagText) => onChange({ content: tagText })} />
      <label className="field">
        <span className="field-label">Tipo</span>
        <select value={element.symbology} onChange={(event) => onChange({ symbology: event.target.value as Symbology, wideDots: undefined })}>
          <option value="ean13">EAN-13</option>
          <option value="i2of5">2 de 5 intercalado</option>
        </select>
      </label>
      <div className="field-row">
        <NumberField label="Altura das barras" suffix="mm" value={element.heightMm} min={2} max={80} onChange={(heightMm) => onChange({ heightMm })} />
        <NumberField label="Largura do módulo" suffix="pontos" value={element.moduleDots} min={1} max={6} step={1} integer onChange={(moduleDots) => onChange({ moduleDots, wideDots: undefined })} />
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={element.showText} onChange={(event) => onChange({ showText: event.target.checked })} />
        Imprimir os números abaixo das barras
      </label>
      <RotationField value={element.rotation} onChange={(rotation) => onChange({ rotation })} />
    </>
  )
}

function InvertField({ value, onChange }: { value: boolean; onChange: (invert: boolean) => void }) {
  return (
    <>
      <label className="checkbox">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        Inverter as cores do que estiver por baixo
      </label>
      {value && <p className="hint">Texto preto embaixo deste elemento sai branco. O elemento vai no fim do código, depois dos textos.</p>}
    </>
  )
}

function LineProperties({ element, onChange }: { element: LineElement; onChange: (patch: Partial<LineElement>) => void }) {
  return (
    <>
      <div className="field-row">
        <NumberField label="Largura" suffix="mm" value={element.widthMm} min={0.1} max={240} onChange={(widthMm) => onChange({ widthMm })} />
        <NumberField label="Altura" suffix="mm" value={element.heightMm} min={0.1} max={300} step={0.1} onChange={(heightMm) => onChange({ heightMm })} />
      </div>
      <InvertField value={element.invert === true} onChange={(invert) => onChange({ invert })} />
    </>
  )
}

function BoxProperties({ element, onChange }: { element: BoxElement; onChange: (patch: Partial<BoxElement>) => void }) {
  return (
    <>
      <div className="field-row">
        <NumberField label="Largura" suffix="mm" value={element.widthMm} min={1} max={240} onChange={(widthMm) => onChange({ widthMm })} />
        <NumberField label="Altura" suffix="mm" value={element.heightMm} min={1} max={300} onChange={(heightMm) => onChange({ heightMm })} />
      </div>
      <NumberField label="Espessura" suffix="mm" value={element.thicknessMm} min={0.1} max={10} step={0.1} onChange={(thicknessMm) => onChange({ thicknessMm })} />
      <InvertField value={element.invert === true} onChange={(invert) => onChange({ invert })} />
    </>
  )
}

function contentsOf(elements: LabelElement[]): string[] {
  return elements.flatMap((item) => (item.type === 'text' || item.type === 'barcode' ? [item.content] : []))
}

function LabelProperties({
  layout,
  onLayoutChange,
  onSampleChange
}: {
  layout: LabelLayout
  onLayoutChange: (patch: Partial<LabelLayout>) => void
  onSampleChange: (code: string, value: string) => void
}) {
  return (
    <aside className="panel properties">
      <div className="panel-header">
        <h2>Etiqueta</h2>
      </div>
      <div className="field-row field-row-3">
        <NumberField label="Largura" suffix="mm" value={layout.widthMm} min={10} max={240} onChange={(widthMm) => onLayoutChange({ widthMm })} />
        <NumberField label="Altura" suffix="mm" value={layout.heightMm} min={5} max={300} onChange={(heightMm) => onLayoutChange({ heightMm })} />
        <NumberField label="Espaço" suffix="mm" value={layout.gapMm} min={0} max={20} onChange={(gapMm) => onLayoutChange({ gapMm })} />
      </div>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Linguagem</span>
          <select value={layout.language} onChange={(event) => onLayoutChange({ language: event.target.value as Language })}>
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id} title={language.printers}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Resolução</span>
          <select value={layout.dpi} onChange={(event) => onLayoutChange({ dpi: Number(event.target.value) })}>
            {DPI_OPTIONS.map((dpi) => (
              <option key={dpi} value={dpi}>
                {dpi} dpi
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint">Impressoras: {languageInfo(layout.language).printers}</p>
      <SampleFields texts={contentsOf(layout.elements)} samples={layout.samples} title="Valores de exemplo" onChange={onSampleChange} />
      <p className="empty-state">Clique em um elemento da etiqueta para editá-lo.</p>
    </aside>
  )
}

export function PropertiesPanel({ layout, element, issues, onChange, onLayoutChange, onDuplicate, onRemove, onDeselect, onSampleChange }: PropertiesPanelProps) {
  if (!element) {
    return <LabelProperties layout={layout} onLayoutChange={onLayoutChange} onSampleChange={onSampleChange} />
  }

  const change = (patch: Patch) => onChange(element.id, patch)
  const elementIssues = issues.filter((issue) => issue.elementId === element.id)

  return (
    <aside className="panel properties">
      <div className="panel-header">
        <h2>{TITLES[element.type]}</h2>
        <button type="button" className="icon-only icon-ghost" onClick={onDeselect} title="Voltar para a etiqueta (Esc)" aria-label="Voltar para a etiqueta">
          <Icon name="close" size={14} />
        </button>
      </div>

      {element.type !== 'raw' && (
        <div className="field-row">
          <NumberField label="Posição X" suffix="mm" value={element.x} min={0} max={layout.widthMm} onChange={(x) => change({ x })} />
          <NumberField label="Posição Y" suffix="mm" value={element.y} min={0} max={layout.heightMm} onChange={(y) => change({ y })} />
        </div>
      )}

      {element.type === 'raw' && <RawProperties element={element} layout={layout} onChange={change} />}
      {element.type === 'text' && <TextProperties element={element} layout={layout} onChange={change} />}
      {element.type === 'barcode' && <BarcodeProperties element={element} onChange={change} />}
      {element.type === 'line' && <LineProperties element={element} onChange={change} />}
      {element.type === 'box' && <BoxProperties element={element} onChange={change} />}

      <SampleFields texts={contentsOf([element])} samples={layout.samples} title="Valor de exemplo" defaultOpen onChange={onSampleChange} />

      {elementIssues.length > 0 && (
        <ul className="issue-list">
          {elementIssues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      )}

      <div className="properties-actions">
        <button type="button" onClick={() => onDuplicate(element.id)}>Duplicar</button>
        <button type="button" className="danger" onClick={() => onRemove(element.id)}>Excluir</button>
      </div>
    </aside>
  )
}
