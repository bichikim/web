import icons from 'viewer-tree-icons'
import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement} from './graphics.js'
const MIN_COLUMNS = 8
const CONTROL_INSET = 4
/** Paints the shared search chrome behind a directly clickable native input. */
export function renderSearchField(view, field) {
  const {Box, Input, Svg} = view.elements
  const {key, columns, placeholder, value, change, submit} = field
  const width = columns * COLUMN_PIXELS
  const height = ROW_PIXELS * 2
  const content =
    svgElement('rect', {
      class: 'fill-canvas stroke-divider',
      height: height - CONTROL_INSET * 2,
      rx: 16,
      width: width - CONTROL_INSET,
      x: 2,
      y: CONTROL_INSET,
    }) +
    svgElement(
      'g',
      {class: 'stroke-muted fill-none', transform: 'translate(12 12) scale(.67)'},
      icons.search,
    )
  return Box({
    children: [
      Box({
        children: [
          Svg({
            alt: view.t('검색'),
            height,
            source: svgDocument({content, font: 'sans', height, width}),
          }),
        ],
        height: 2,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }),
      Box({
        alignItems: 'stretch',
        children: [
          Input({
            key,
            onInput: (value) => view.send({...change, value}),
            onSubmit: (value) => view.send({...submit, value}),
            placeholder,
            value,
          }),
        ],
        flexDirection: 'column',
        height: 2,
        justifyContent: 'center',
        left: 3,
        position: 'absolute',
        right: 1,
        top: 0,
      }),
    ],
    height: 2,
    key: `field:${key}`,
    minWidth: MIN_COLUMNS,
    position: 'relative',
    width: columns,
  })
}
