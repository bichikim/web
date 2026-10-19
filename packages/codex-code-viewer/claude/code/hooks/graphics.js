import styles from 'viewer-graphics-styles'
export {COLUMN_PIXELS, ROW_PIXELS} from './pane-metrics.ts'
export const FONT_BASELINE = 14
export const GUTTER_COLUMNS = 5
const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
export const svgElement = (tag, attributes, content = '') => {
  const markup = Object.entries(attributes)
    .map(([name, value]) => `${name}="${escape(value)}"`)
    .join(' ')
  return `<${tag} ${markup}>${content}</${tag}>`
}
export const svgText = (text, attributes) => svgElement('text', attributes, escape(text))
/** Wraps scriptless vector content in the original viewer's generated UnoCSS palette and typography. */
export const svgDocument = ({
  width,
  height,
  content,
  font = 'mono',
  stylesheet = styles,
  preserveAspectRatio = 'none',
}) =>
  svgElement(
    'svg',
    {
      height,
      preserveAspectRatio,
      viewBox: `0 0 ${width} ${height}`,
      width,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    svgElement('style', {}, stylesheet) +
      svgElement('g', {class: `font-${font} [font-size:13px]`}, content),
  )
