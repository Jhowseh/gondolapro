import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateScript } from '../../core/generators'
import { languageInfo } from '../../core/languages'
import { createDefaultLayout, createElement, createText, duplicateElement, withSamples, withTemplate } from '../../core/layout'
import { toClipboardText, toPrinterPayload } from '../../core/printerPayload'
import { buildSyspdvExport, normalizeSyspdvCode } from '../../core/exporting'
import { extractCandidates, normalizeScript, summarizeImport, type ImportResult } from '../../core/importing'
import { LAYOUT_FILE_EXTENSION, parseLayout, serializeLayout } from '../../core/serialization'
import type { LabelElement, LabelLayout, Template } from '../../core/types'
import { validateLayout } from '../../core/validation'
import { AboutDialog } from './components/AboutDialog'
import { CodePanel } from './components/CodePanel'
import { ElementPalette } from './components/ElementPalette'
import { ExportDialog, type ExportChoice } from './components/ExportDialog'
import { ImportDialog, type ImportSource } from './components/ImportDialog'
import { LabelCanvas } from './components/LabelCanvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Toolbar } from './components/Toolbar'
import { ZoomControl } from './components/ZoomControl'
import { useHistory } from './hooks/useHistory'
import { useTheme } from './hooks/useTheme'
import { readSetting, STORAGE_KEYS, writeSetting } from './storage'
import { errorMessage } from './text'

type StatusKind = 'info' | 'success' | 'error'

interface Status {
  kind: StatusKind
  text: string
}

const ARROW_STEP_MM = 0.5

const STATUS_DURATION_MS = 4000

const CODE_PANEL_OPEN = 'open'

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function isLayoutFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(`.${LAYOUT_FILE_EXTENSION}`)
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'etiqueta'
}

export function App() {
  const { theme, toggleTheme } = useTheme()
  const history = useHistory<LabelLayout>(createDefaultLayout)
  const layout = history.present
  const [savedLayout, setSavedLayout] = useState<LabelLayout>(layout)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(7)
  const [printers, setPrinters] = useState<string[]>([])
  const [printer, setPrinter] = useState(() => readSetting(STORAGE_KEYS.printer) ?? '')
  const [printing, setPrinting] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [importSource, setImportSource] = useState<ImportSource | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [codeExpanded, setCodeExpanded] = useState(() => readSetting(STORAGE_KEYS.codePanel) === CODE_PANEL_OPEN)
  const modalOpen = importSource !== null || exportOpen || aboutOpen || shortcutsOpen

  const dirty = savedLayout !== layout
  const selected = layout.elements.find((element) => element.id === selectedId) ?? null
  const script = useMemo(() => generateScript(layout), [layout])
  const issues = useMemo(() => validateLayout(layout), [layout])
  const invalidIds = useMemo(() => new Set(issues.flatMap((issue) => (issue.elementId ? [issue.elementId] : []))), [issues])

  const notify = useCallback((kind: StatusKind, text: string) => setStatus({ kind, text }), [])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), STATUS_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    document.title = `${dirty ? '• ' : ''}${layout.name || 'Sem nome'} — GôndolaPro`
  }, [layout.name, dirty])

  useEffect(() => {
    window.api
      .listPrinters()
      .then((names) => {
        setPrinters(names)
        setPrinter((current) => (current && names.includes(current) ? current : (names[0] ?? '')))
      })
      .catch(() => setPrinters([]))
  }, [])

  const updateLayout = useCallback((patch: Partial<LabelLayout>) => history.set((current) => ({ ...current, ...patch })), [history.set])

  const updateElement = useCallback(
    (id: string, patch: Partial<LabelElement>) =>
      history.set((current) => ({
        ...current,
        elements: current.elements.map((element) => (element.id === id ? ({ ...element, ...patch } as LabelElement) : element))
      })),
    [history.set]
  )

  const addElement = useCallback(
    (element: LabelElement) => {
      history.set((current) => ({ ...current, elements: [...current.elements, element] }))
      setSelectedId(element.id)
    },
    [history.set]
  )

  const removeElement = useCallback(
    (id: string) => {
      history.set((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== id) }))
      setSelectedId(null)
    },
    [history.set]
  )

  const duplicate = useCallback(
    (id: string) => {
      const source = layout.elements.find((element) => element.id === id)
      if (source) addElement(duplicateElement(source))
    },
    [layout.elements, addElement]
  )

  const updateSample = useCallback(
    (code: string, value: string) => history.set((current) => withSamples(current, { ...current.samples, [code]: value })),
    [history.set]
  )

  const updateTemplate = useCallback((template: Template | null) => history.set((current) => withTemplate(current, template)), [history.set])

  const moveElement = useCallback((id: string, x: number, y: number) => updateElement(id, { x, y }), [updateElement])

  const confirmDiscard = useCallback(() => !dirty || window.confirm('Existem alterações não salvas. Deseja descartá-las?'), [dirty])

  const loadDocument = useCallback(
    (next: LabelLayout, path: string | null, saved: boolean) => {
      history.reset(next)
      if (saved) setSavedLayout(next)
      setFilePath(path)
      setSelectedId(null)
    },
    [history.reset]
  )

  const handleNew = useCallback(() => {
    if (confirmDiscard()) loadDocument(createDefaultLayout(), null, true)
  }, [confirmDiscard, loadDocument])

  const handleOpen = useCallback(async () => {
    if (!confirmDiscard()) return
    try {
      const file = await window.api.openFile()
      if (!file) return
      if (isLayoutFile(file.fileName)) {
        loadDocument(parseLayout(new TextDecoder('utf-8').decode(file.bytes)), file.path, true)
        notify('success', 'Layout aberto.')
        return
      }
      setImportSource({ label: file.fileName, candidates: extractCandidates(file.bytes, file.fileName) })
    } catch (error) {
      notify('error', errorMessage(error))
    }
  }, [confirmDiscard, loadDocument, notify])

  const handlePaste = useCallback(
    (text: string) => {
      if (!confirmDiscard()) return
      setImportSource({ label: 'Código colado', candidates: [{ label: 'Código colado', name: 'Layout importado', script: normalizeScript(text) }] })
    },
    [confirmDiscard]
  )

  const handleImport = useCallback(
    (result: ImportResult) => {
      loadDocument(result.layout, null, false)
      setImportSource(null)
      const summary = summarizeImport(result)
      const kept = summary.raw > 0 ? ` e ${summary.raw} sem prévia` : ''
      notify(result.warnings.length > 0 ? 'info' : 'success', `Layout importado: ${summary.drawable} elementos com prévia${kept}. ${result.warnings.join(' ')}`.trim())
    },
    [loadDocument, notify]
  )

  const handleSave = useCallback(
    async (saveAs: boolean) => {
      try {
        const path = await window.api.saveLayout({
          content: serializeLayout(layout),
          path: saveAs ? null : filePath,
          suggestedName: `${layout.name || 'etiqueta'}.${LAYOUT_FILE_EXTENSION}`
        })
        if (!path) return
        setFilePath(path)
        setSavedLayout(layout)
        notify('success', 'Layout salvo.')
      } catch (error) {
        notify('error', `Não foi possível salvar: ${errorMessage(error)}`)
      }
    },
    [layout, filePath, notify]
  )

  const handleExport = useCallback(
    async (choice: ExportChoice) => {
      try {
        const code = normalizeSyspdvCode(choice.code)
        const bytes = buildSyspdvExport({ code, description: choice.description, script })
        const path = await window.api.exportSyspdv({ bytes, suggestedName: `${safeFileName(choice.description)}.xml` })
        if (!path) return
        setExportOpen(false)
        if (layout.syspdvCode !== code) updateLayout({ syspdvCode: code })
        notify('success', `XML exportado com o código ${code}. Importe o arquivo na tela de layouts de etiqueta do SysPDV.`)
      } catch (error) {
        notify('error', `Não foi possível exportar: ${errorMessage(error)}`)
      }
    },
    [script, layout.syspdvCode, updateLayout, notify]
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toClipboardText(script))
      notify('success', 'Código copiado. Cole em Utilitários > Configuração de layouts > Etiqueta no SysPDV.')
    } catch (error) {
      notify('error', `Não foi possível copiar: ${errorMessage(error)}`)
    }
  }, [script, notify])

  const handlePrintTest = useCallback(async () => {
    if (!printer) return
    setPrinting(true)
    try {
      const payload = toPrinterPayload(generateScript(layout, { withSamples: true }))
      await window.api.printRaw(printer, payload)
      notify('success', `Etiqueta de teste enviada para ${printer}.`)
    } catch (error) {
      notify('error', `Falha ao imprimir: ${errorMessage(error)}`)
    } finally {
      setPrinting(false)
    }
  }, [printer, layout, notify])

  const handlePrinterChange = useCallback((name: string) => {
    setPrinter(name)
    writeSetting(STORAGE_KEYS.printer, name)
  }, [])

  const handleCodeExpandedChange = useCallback((expanded: boolean) => {
    setCodeExpanded(expanded)
    writeSetting(STORAGE_KEYS.codePanel, expanded ? CODE_PANEL_OPEN : 'closed')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalOpen) return
      const key = event.key.toLowerCase()
      if (event.ctrlKey && key === 's') {
        event.preventDefault()
        void handleSave(event.shiftKey)
        return
      }
      if (event.ctrlKey && key === 'o') {
        event.preventDefault()
        void handleOpen()
        return
      }
      if (event.ctrlKey && key === 'e') {
        event.preventDefault()
        setExportOpen(true)
        return
      }
      if (isEditableTarget(event.target)) return

      if (event.ctrlKey && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) history.redo()
        else history.undo()
      } else if (event.ctrlKey && key === 'y') {
        event.preventDefault()
        history.redo()
      } else if (selected && event.ctrlKey && key === 'd') {
        event.preventDefault()
        duplicate(selected.id)
      } else if (selected && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        removeElement(selected.id)
      } else if (selected && selected.type !== 'raw' && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = ARROW_STEP_MM * (event.shiftKey ? 10 : 1)
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        updateElement(selected.id, { x: Math.max(0, selected.x + dx), y: Math.max(0, selected.y + dy) })
      } else if (event.key === 'Escape') {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, selected, handleSave, handleOpen, history.undo, history.redo, duplicate, removeElement, updateElement])

  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => {
      if (modalOpen || isEditableTarget(event.target)) return
      const text = event.clipboardData?.getData('text/plain') ?? ''
      if (!text.trim()) return
      event.preventDefault()
      handlePaste(text)
    }
    window.addEventListener('paste', handlePasteEvent)
    return () => window.removeEventListener('paste', handlePasteEvent)
  }, [modalOpen, handlePaste])

  return (
    <div className="app">
      <Toolbar
        name={layout.name}
        dirty={dirty}
        theme={theme}
        onToggleTheme={toggleTheme}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onNameChange={(name) => updateLayout({ name })}
        onNew={handleNew}
        onOpen={() => void handleOpen()}
        onSave={() => void handleSave(false)}
        onSaveAs={() => void handleSave(true)}
        onExport={() => setExportOpen(true)}
        onUndo={history.undo}
        onRedo={history.redo}
        onManual={() => window.api.openManual()}
        onShortcuts={() => setShortcutsOpen(true)}
        onAbout={() => setAboutOpen(true)}
      />

      <main className="workspace">
        <ElementPalette
          elements={layout.elements}
          language={layout.language}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={(type) => addElement(createElement(type))}
          onAddField={(tagText) => addElement(createText({ content: tagText }))}
        />
        <section className="canvas-area">
          <div className="canvas-scroll">
            <LabelCanvas
              layout={layout}
              selectedId={selectedId}
              zoom={zoom}
              invalidIds={invalidIds}
              onSelect={setSelectedId}
              onMove={moveElement}
            />
          </div>
          <div className="canvas-footer">
            <span className="canvas-caption" title="A prévia mostra valores de exemplo no lugar das tags do SysPDV.">
              {layout.widthMm} × {layout.heightMm} mm · {languageInfo(layout.language).label} · {layout.dpi} dpi
            </span>
            <ZoomControl zoom={zoom} onChange={setZoom} />
          </div>
        </section>
        <PropertiesPanel
          layout={layout}
          element={selected}
          issues={issues}
          onChange={updateElement}
          onLayoutChange={updateLayout}
          onDuplicate={duplicate}
          onRemove={removeElement}
          onDeselect={() => setSelectedId(null)}
          onSampleChange={updateSample}
        />
      </main>

      <CodePanel
        layout={layout}
        script={script}
        issues={issues}
        expanded={codeExpanded}
        onExpandedChange={handleCodeExpandedChange}
        printers={printers}
        printer={printer}
        printing={printing}
        onPrinterChange={handlePrinterChange}
        onCopy={() => void handleCopy()}
        onPrintTest={() => void handlePrintTest()}
        onTemplateChange={updateTemplate}
        onSelectElement={setSelectedId}
      />

      {importSource && <ImportDialog source={importSource} defaultDpi={layout.dpi} onCancel={() => setImportSource(null)} onImport={handleImport} />}

      {exportOpen && (
        <ExportDialog
          defaultCode={layout.syspdvCode ?? ''}
          defaultDescription={layout.name}
          issueCount={issues.length}
          onCancel={() => setExportOpen(false)}
          onExport={(choice) => void handleExport(choice)}
        />
      )}

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}

      {status && <div className={`toast toast-${status.kind}`}>{status.text}</div>}
    </div>
  )
}
