import {
  COLUMN_PIXELS,
  FONT_BASELINE,
  GUTTER_COLUMNS,
  ROW_PIXELS,
  svgDocument,
  svgElement,
  svgText,
} from './graphics.js'
const CARET_INSET = 2
const MIN_COLUMNS = 10
const DEFAULT_COLUMNS = 60
const MAX_SVG_LENGTH = 120000
function sourceText(line, index, gutter, plain) {
  const y = index * ROW_PIXELS + FONT_BASELINE
  const attributes = {
    class: 'fill-foreground',
    x: gutter * COLUMN_PIXELS,
    'xml:space': 'preserve',
    y,
  }
  const runs = []
  for (const segment of line.segments) {
    const token = plain
      ? undefined
      : line.tokens.find(
          (entry) =>
            entry.offset <= segment.from && entry.offset + entry.text.length > segment.from,
        )
    const kind = ['keyword', 'string', 'number', 'comment'].includes(token?.kind)
      ? token.kind
      : 'foreground'
    const prior = runs.at(-1)
    if (prior?.kind === kind && prior.column + prior.width === segment.column) {
      prior.text += segment.text
      prior.width += segment.width
    } else {
      runs.push({...segment, kind})
    }
  }
  return runs
    .map((run) =>
      svgText(run.text, {
        ...attributes,
        class: `fill-${run.kind}`,
        lengthAdjust: 'spacingAndGlyphs',
        textLength: run.width * COLUMN_PIXELS,
        x: (gutter + run.column) * COLUMN_PIXELS,
      }),
    )
    .join('')
}
/** Paints the source viewport, caret and selection with the original UnoCSS font and palette. */
export function editorGraphics(props, plain = false) {
  const columns = Math.max(MIN_COLUMNS, props.columns || DEFAULT_COLUMNS)
  const width = columns * COLUMN_PIXELS
  const height = props.rows * ROW_PIXELS
  const from = Math.min(props.anchor, props.head)
  const to = Math.max(props.anchor, props.head)
  const content = props.lines
    .map((line, index) => {
      const cell = (offset) =>
        offset >= line.to
          ? line.stops.length - 1
          : Math.max(
              0,
              line.stops.findLastIndex((stop) => stop <= offset),
            )
      const left = cell(from)
      const right = Math.max(left, cell(to))
      const gutter = props.numbers ? GUTTER_COLUMNS : 0
      const y = index * ROW_PIXELS
      const active =
        from === to &&
        from >= line.from &&
        (from < line.to || (from === line.to && props.lines[index + 1]?.number !== line.number))
      const background = active
        ? svgElement('rect', {class: 'fill-selection', height: ROW_PIXELS, width, x: 0, y})
        : ''
      const selection =
        right > left
          ? svgElement('rect', {
              class: 'fill-code-selection',
              height: ROW_PIXELS,
              width: (right - left) * COLUMN_PIXELS,
              x: (gutter + left) * COLUMN_PIXELS,
              y,
            })
          : ''
      const number =
        props.numbers && !line.continuation
          ? svgText(line.number, {
              class: 'fill-muted',
              'text-anchor': 'end',
              x: (GUTTER_COLUMNS - 2) * COLUMN_PIXELS,
              y: y + FONT_BASELINE,
            })
          : ''
      const caret =
        props.editable && active && from >= line.stops[0] && from <= line.stops.at(-1)
          ? svgElement('rect', {
              class: 'fill-foreground',
              height: ROW_PIXELS - CARET_INSET * 2,
              width: 1,
              x: (gutter + cell(from)) * COLUMN_PIXELS,
              y: y + CARET_INSET,
            })
          : ''
      return background + selection + number + sourceText(line, index, gutter, plain) + caret
    })
    .join('')
  const svg = svgDocument({
    content: svgElement('rect', {class: 'fill-canvas', height: '100%', width: '100%'}) + content,
    height,
    width,
  })
  return !plain && svg.length > MAX_SVG_LENGTH ? editorGraphics(props, true) : svg
}
