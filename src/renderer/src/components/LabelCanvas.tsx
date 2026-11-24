import type Konva from 'konva'
import { memo, useMemo } from 'react'
import { Group, Image as KonvaImage, Layer, Line, Rect, Shape, Stage, Text } from 'react-konva'
import { MONO_ADVANCE_RATIO } from '../../../core/fonts'
import { emissionOrder, isDrawable } from '../../../core/layout'
import { invertedElementIds } from '../../../core/printModes'
import { contentSizeMm, elementBox, measureBarcode, measureText } from '../../../core/measure'
import type { BarcodeElement, BoxElement, DrawableElement, LabelElement, LabelLayout, LineElement, Rotation, TextElement } from '../../../core/types'
import { clamp, dotsPerMm, snap } from '../../../core/units'
import { useBarcodeImage } from '../hooks/useBarcodeImage'

const CANVAS_PADDING = 28

const SNAP_MM = 0.5

const UNSELECTED_DASH = [4, 3]

const PREVIEW_FONT = "Consolas, 'Courier New', monospace"

const PREVIEW_CAP_RATIO = 0.64

const PREVIEW_ASCENT_RATIO = 0.75

const LABEL_COLORS = {
  paper: '#ffffff',
  paperShadow: 'rgba(15, 23, 42, 0.18)',
  ink: '#111827',
  invertedInk: '#ffffff',
  grid: '#eef0f4',
  gridMajor: '#dde1e8',
  selection: '#3056d3',
  invalid: '#fde2e2',
  invalidText: '#b42318'
}

interface LabelCanvasProps {
  layout: LabelLayout
  selectedId: string | null
  zoom: number
  invalidIds: Set<string>
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
}

interface ShapeProps<T extends LabelElement> {
  element: T
  layout: LabelLayout
  zoom: number
  inverted: boolean
}

function ink(inverted: boolean) {
  return inverted
    ? { color: LABEL_COLORS.invertedInk, globalCompositeOperation: 'difference' as const }
    : { color: LABEL_COLORS.ink, globalCompositeOperation: 'source-over' as const }
}

function setCursor(event: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = event.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

function rotatedPlacement(rotation: Rotation, width: number, height: number) {
  switch (rotation) {
    case 0:
      return { x: 0, y: 0 }
    case 90:
      return { x: height, y: 0 }
    case 180:
      return { x: width, y: height }
    case 270:
      return { x: 0, y: width }
  }
}

function TextShape({ element, layout, zoom, inverted }: ShapeProps<TextElement>) {
  const { color, globalCompositeOperation } = ink(inverted)
  const metrics = measureText(element, layout)
  const pxPerDot = zoom / dotsPerMm(layout.dpi)
  const cellHeight = metrics.height * pxPerDot
  const advance = metrics.font.advanceDots * pxPerDot
  const width = metrics.width * pxPerDot
  const placement = rotatedPlacement(element.rotation, width, cellHeight)
  const baselineAtBottom = layout.language === 'ppla'
  const fontSize = baselineAtBottom ? cellHeight / PREVIEW_CAP_RATIO : cellHeight
  const baseline = baselineAtBottom ? cellHeight : cellHeight * PREVIEW_ASCENT_RATIO
  const stretch = advance / (fontSize * MONO_ADVANCE_RATIO)

  return (
    <Shape
      {...placement}
      rotation={element.rotation}
      globalCompositeOperation={globalCompositeOperation}
      listening={false}
      sceneFunc={(context) => {
        context.setAttr('font', `${fontSize}px ${PREVIEW_FONT}`)
        context.setAttr('fillStyle', color)
        context.setAttr('textAlign', 'center')
        context.setAttr('textBaseline', 'alphabetic')
        Array.from(metrics.text).forEach((character, index) => {
          if (character === ' ') return
          context.save()
          context.translate((index + 0.5) * advance, baseline)
          context.scale(stretch, 1)
          context.fillText(character, 0, 0)
          context.restore()
        })
      }}
    />
  )
}

function BarcodeShape({ element, layout, zoom }: ShapeProps<BarcodeElement>) {
  const metrics = measureBarcode(element, layout)
  const image = useBarcodeImage(element.symbology, metrics.data, element.showText)
  const size = contentSizeMm(element, layout)
  const width = size.width * zoom
  const height = size.height * zoom
  const placement = rotatedPlacement(element.rotation, width, height)

  if (!image) {
    return (
      <Group {...placement} rotation={element.rotation} listening={false}>
        <Rect width={width} height={height} fill={LABEL_COLORS.invalid} />
        <Text width={width} height={height} text="Código inválido" align="center" verticalAlign="middle" fontSize={12} fill={LABEL_COLORS.invalidText} />
      </Group>
    )
  }

  return <KonvaImage {...placement} rotation={element.rotation} image={image} width={width} height={height} listening={false} />
}

function LineShape({ element, zoom, inverted }: ShapeProps<LineElement>) {
  const { color, globalCompositeOperation } = ink(inverted)
  return (
    <Rect
      width={element.widthMm * zoom}
      height={element.heightMm * zoom}
      fill={color}
      globalCompositeOperation={globalCompositeOperation}
      listening={false}
    />
  )
}

function BoxShape({ element, zoom, inverted }: ShapeProps<BoxElement>) {
  const { color, globalCompositeOperation } = ink(inverted)
  const thickness = element.thicknessMm * zoom
  return (
    <Rect
      x={thickness / 2}
      y={thickness / 2}
      width={Math.max(0, element.widthMm * zoom - thickness)}
      height={Math.max(0, element.heightMm * zoom - thickness)}
      stroke={color}
      strokeWidth={thickness}
      globalCompositeOperation={globalCompositeOperation}
      listening={false}
    />
  )
}

function ElementShape(props: ShapeProps<DrawableElement>) {
  const { element } = props
  switch (element.type) {
    case 'text':
      return <TextShape {...props} element={element} />
    case 'barcode':
      return <BarcodeShape {...props} element={element} />
    case 'line':
      return <LineShape {...props} element={element} />
    case 'box':
      return <BoxShape {...props} element={element} />
  }
}

interface ElementNodeProps {
  element: DrawableElement
  layout: LabelLayout
  zoom: number
  selected: boolean
  invalid: boolean
  inverted: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

function ElementNode({ element, layout, zoom, selected, invalid, inverted, onSelect, onMove }: ElementNodeProps) {
  const box = elementBox(element, layout)
  const maxX = Math.max(0, layout.widthMm - box.width)
  const maxY = Math.max(0, layout.heightMm - box.height)
  const toPx = (mm: number) => CANVAS_PADDING + mm * zoom
  const toMm = (px: number) => (px - CANVAS_PADDING) / zoom
  const snapX = (px: number) => clamp(snap(toMm(px), SNAP_MM), 0, maxX)
  const snapY = (px: number) => clamp(snap(toMm(px), SNAP_MM), 0, maxY)

  const outline = selected ? LABEL_COLORS.selection : invalid ? LABEL_COLORS.invalidText : 'transparent'

  return (
    <Group
      x={toPx(box.x)}
      y={toPx(box.y)}
      draggable
      dragBoundFunc={(position) => ({ x: toPx(snapX(position.x)), y: toPx(snapY(position.y)) })}
      onMouseDown={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => onMove(element.id, snapX(event.target.x()), snapY(event.target.y()))}
      onMouseEnter={(event: Konva.KonvaEventObject<MouseEvent>) => setCursor(event, 'move')}
      onMouseLeave={(event: Konva.KonvaEventObject<MouseEvent>) => setCursor(event, 'default')}
    >
      <ElementShape element={element} layout={layout} zoom={zoom} inverted={inverted} />
      <Rect
        x={-2}
        y={-2}
        width={box.width * zoom + 4}
        height={box.height * zoom + 4}
        fill="rgba(0,0,0,0)"
        stroke={outline}
        strokeWidth={1}
        dash={selected ? undefined : UNSELECTED_DASH}
      />
    </Group>
  )
}

const Grid = memo(function Grid({ widthMm, heightMm, zoom }: { widthMm: number; heightMm: number; zoom: number }) {
  const stepMm = zoom >= 5 ? 1 : 5
  const width = widthMm * zoom
  const height = heightMm * zoom
  const axes = [
    { key: 'v', lengthMm: widthMm, points: (px: number) => [px, 0, px, height] },
    { key: 'h', lengthMm: heightMm, points: (px: number) => [0, px, width, px] }
  ]

  return (
    <Group x={CANVAS_PADDING} y={CANVAS_PADDING} listening={false}>
      {axes.flatMap(({ key, lengthMm, points }) =>
        Array.from({ length: Math.ceil(lengthMm / stepMm) - 1 }, (_, index) => {
          const mm = (index + 1) * stepMm
          const major = Math.round(mm) % 10 === 0
          return (
            <Line
              key={`${key}${mm}`}
              points={points(mm * zoom)}
              stroke={major ? LABEL_COLORS.gridMajor : LABEL_COLORS.grid}
              strokeWidth={1}
              globalCompositeOperation="multiply"
            />
          )
        })
      )}
    </Group>
  )
})

export const LabelCanvas = memo(function LabelCanvas({ layout, selectedId, zoom, invalidIds, onSelect, onMove }: LabelCanvasProps) {
  const labelWidth = layout.widthMm * zoom
  const labelHeight = layout.heightMm * zoom
  const invertedIds = useMemo(() => invertedElementIds(layout), [layout])

  return (
    <Stage
      width={labelWidth + CANVAS_PADDING * 2}
      height={labelHeight + CANVAS_PADDING * 2}
      onMouseDown={(event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.target === event.target.getStage() || event.target.name() === 'label-background') {
          onSelect(null)
        }
      }}
    >
      <Layer>
        <Rect
          name="label-background"
          x={CANVAS_PADDING}
          y={CANVAS_PADDING}
          width={labelWidth}
          height={labelHeight}
          fill={LABEL_COLORS.paper}
          cornerRadius={3}
          shadowColor={LABEL_COLORS.paperShadow}
          shadowBlur={18}
          shadowOffsetY={4}
        />
        {emissionOrder(layout.elements).filter(isDrawable).map((element) => (
          <ElementNode
            key={element.id}
            element={element}
            layout={layout}
            zoom={zoom}
            selected={element.id === selectedId}
            invalid={invalidIds.has(element.id)}
            inverted={invertedIds.has(element.id)}
            onSelect={onSelect}
            onMove={onMove}
          />
        ))}
        <Grid widthMm={layout.widthMm} heightMm={layout.heightMm} zoom={zoom} />
      </Layer>
    </Stage>
  )
})
