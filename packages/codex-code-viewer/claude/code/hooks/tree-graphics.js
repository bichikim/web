import icons from 'viewer-tree-icons'
import stylesheet from 'viewer-tree-styles'
import {
  COLUMN_PIXELS,
  FONT_BASELINE,
  ROW_PIXELS,
  svgDocument,
  svgElement,
  svgText,
} from './graphics.js'
const CHEVRON_INSET = 4
const TEXT_INSET = 3
const INDENT_PIXELS = 16
const LABEL_OFFSET = 26
const ROW_RADIUS = 6
const glyph = (name, left, top) =>
  svgElement(
    'g',
    {class: 'stroke-muted fill-none', transform: `translate(${left} ${top}) scale(.65)`},
    icons[name].replaceAll('currentColor', 'var(--viewer-muted)'),
  )
function rowIcon(row, left, top) {
  if (row.kind === 'directory') {
    return glyph(row.expanded ? 'chevron-down' : 'chevron-right', left + CHEVRON_INSET, top + 2)
  }
  if (['TS', 'JS', '{}', 'M↓'].includes(row.icon)) {
    const kind = row.icon === 'TS' ? 'accent' : row.icon === 'M↓' ? 'string' : 'muted'
    return svgText(row.icon, {class: `fill-${kind}`, x: left + TEXT_INSET, y: top + FONT_BASELINE})
  }
  return glyph('file', left + 2, top + 2)
}
/** Paints file rows with the original palette, file-type glyphs and disclosure icons. */
export function treeGraphics(props) {
  const width = props.columns * COLUMN_PIXELS
  const height = props.rows.length * ROW_PIXELS
  const content = props.rows
    .map((row, index) => {
      const inset = row.depth * INDENT_PIXELS
      const y = index * ROW_PIXELS
      const selected = props.highlight || row.path === props.active || row.path === props.cursor
      const background = selected
        ? svgElement('rect', {
            class: 'fill-hover',
            height: ROW_PIXELS,
            rx: ROW_RADIUS,
            width,
            x: 0,
            y,
          })
        : ''
      const text = svgText(row.name + (row.dirty ? ' *' : ''), {
        class: 'fill-foreground',
        x: inset + LABEL_OFFSET,
        y: y + FONT_BASELINE,
      })
      return background + rowIcon(row, inset, y) + text
    })
    .join('')
  return svgDocument({content, font: 'sans', height, stylesheet, width})
}
