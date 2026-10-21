import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement} from './graphics.js'
const MIN_THUMB = 20
/** Draws a manual horizontal scrollbar when unwrapped source exceeds the viewport. */
export function renderHorizontal(view) {
  const {editor} = view
  if (!['source', 'edit'].includes(view.viewMode) || editor.wrap || editor.horizontalMax <= 0) {
    return []
  }
  const {Box, Client, Svg} = view.elements
  const width = editor.columns * COLUMN_PIXELS
  const thumb = Math.max(
    MIN_THUMB,
    (width * editor.columns) / (editor.columns + editor.horizontalMax),
  )
  const left = ((width - thumb) * editor.horizontal) / editor.horizontalMax
  const content =
    svgElement('rect', {class: 'fill-divider', height: 3, rx: 2, width, y: 8}) +
    svgElement('rect', {class: 'fill-muted', height: 6, rx: 3, width: thumb, x: left, y: 6})
  return [
    Box({
      children: [
        Svg({
          alt: `수평 스크롤 ${editor.horizontal}/${editor.horizontalMax}`,
          height: ROW_PIXELS,
          source: svgDocument({content, height: ROW_PIXELS, width}),
        }),
        Box({
          children: [
            Client({
              height: 1,
              key: 'horizontal-scroll',
              module: './horizontal-client.js',
              props: {
                columns: editor.columns,
                epoch: editor.epoch,
                maximum: editor.horizontalMax,
                path: editor.path,
                value: editor.horizontal,
              },
              width: '100%',
            }),
          ],
          height: 1,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
      ],
      flexShrink: 0,
      height: 1,
      position: 'relative',
    }),
  ]
}
