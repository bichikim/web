import icons from 'viewer-tree-icons'
import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement, svgText} from './graphics.js'
const INSET = 4
const RADIUS = 16
const DOCUMENT_RADIUS = 12
const ICON_SIZE = 20
const ICON_GAP = 6
const TEXT_BASELINE = 25
const LINE_HEIGHT = 18
const controlBackground = ({circular, height, options, palette, row, width}) =>
  circular
    ? svgElement('circle', {
        class: palette,
        cx: width / 2,
        cy: height / 2,
        r: Math.min(width - INSET, height - INSET * 2) / 2,
      })
    : svgElement('rect', {
        class: palette,
        height: height - (row ? 0 : INSET * 2),
        rx: row ? INSET : options.document ? DOCUMENT_RADIUS : RADIUS,
        width: width - INSET,
        x: 2,
        y: row ? 0 : INSET,
      })
/** Paints native action geometry with the viewer's shared palette, icons and typography. */
export function controlGraphics({columns, rows, label, options, focused}) {
  const width = columns * COLUMN_PIXELS
  const height = rows * ROW_PIXELS
  const row = options.row === true
  const circular = !row && !options.showLabel && (options.icon !== undefined || label === '⋯')
  const palette = focused
    ? 'fill-selection stroke-accent'
    : options.active
      ? 'fill-tree-background stroke-divider'
      : options.primary
        ? 'fill-action'
        : row
          ? 'fill-canvas'
          : 'fill-canvas stroke-divider'
  const background = controlBackground({circular, height, options, palette, row, width})
  const textWidth = label.length * COLUMN_PIXELS
  const groupWidth = ICON_SIZE + ICON_GAP + textWidth
  const iconLeft = options.showLabel ? (width - groupWidth) / 2 : (width - ICON_SIZE) / 2
  const glyph =
    options.icon === undefined
      ? ''
      : svgElement(
          'g',
          {
            class: options.active ? 'stroke-accent fill-none' : 'stroke-muted fill-none',
            transform: `translate(${iconLeft} ${(height - ICON_SIZE) / 2}) scale(.83)`,
          },
          icons[options.icon],
        )
  const lines = options.lines ?? [label]
  const text =
    options.icon === undefined || options.showLabel
      ? lines
          .map((line, index) =>
            svgText(line, {
              class: options.primary ? 'fill-action-text' : 'fill-foreground',
              'text-anchor': row || options.showLabel ? 'start' : 'middle',
              x: row
                ? COLUMN_PIXELS
                : options.showLabel
                  ? iconLeft + ICON_SIZE + ICON_GAP
                  : width / 2,
              'xml:space': 'preserve',
              y: row ? LINE_HEIGHT * (index + 1) : TEXT_BASELINE,
            }),
          )
          .join('')
      : ''
  return svgDocument({
    content:
      svgElement('rect', {class: 'fill-canvas', height: '100%', width: '100%'}) +
      background +
      glyph +
      text,
    font: options.mono ? 'mono' : 'sans',
    height,
    preserveAspectRatio: circular ? 'xMidYMid meet' : 'none',
    width,
  })
}
