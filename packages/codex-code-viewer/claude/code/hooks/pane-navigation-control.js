import icons from 'viewer-tree-icons'
import {registerControl} from './control-state.js'
import {COLUMN_PIXELS, ROW_PIXELS, svgDocument, svgElement} from './graphics.js'
const CELL_COLUMNS = 4
const NAV_COLUMNS = 12
const RADIUS = 16
const INSET = 4
const FOCUS_INSET = 12
const DIVIDER_INSET = 10
/** Groups history and refresh in the original single capsule while preserving native actions. */
export function renderNavigation(view) {
  const {Box, Button, Client, Svg, Text} = view.elements
  const items = [
    {
      command: {
        existing: view.visitIndex - 1,
        kind: 'open',
        location: view.visits[view.visitIndex - 1],
      },
      disabled: view.visitIndex <= 0,
      icon: 'arrow-left',
      key: 'back',
      label: '뒤로 이동',
    },
    {
      command: {
        existing: view.visitIndex + 1,
        kind: 'open',
        location: view.visits[view.visitIndex + 1],
      },
      disabled: view.visitIndex >= view.visits.length - 1,
      icon: 'arrow-right',
      key: 'forward',
      label: '앞으로 이동',
    },
    {
      command: {kind: 'refresh'},
      disabled: view.document === undefined,
      icon: 'refresh',
      key: 'refresh',
      label: '새로고침',
    },
  ].map((item) => ({
    ...item,
    label: view.t(item.label),
    stamp: item.disabled ? {} : registerControl(item.key, item.command),
  }))
  const width = NAV_COLUMNS * COLUMN_PIXELS
  const height = ROW_PIXELS * 2
  const content =
    svgElement('rect', {class: 'fill-canvas', height: '100%', width: '100%'}) +
    svgElement('rect', {
      class: 'fill-canvas stroke-divider',
      height: height - INSET * 2,
      rx: RADIUS,
      width: width - INSET,
      x: 2,
      y: 4,
    }) +
    items
      .map((item, index) =>
        svgElement(
          'g',
          {
            class: item.disabled ? 'opacity-30' : '',
            transform: `translate(${index * CELL_COLUMNS * COLUMN_PIXELS} 0)`,
          },
          (item.stamp.focused
            ? svgElement('rect', {
                class: 'fill-selection',
                height: height - FOCUS_INSET,
                rx: 8,
                width: CELL_COLUMNS * COLUMN_PIXELS - INSET,
                x: 2,
                y: 6,
              })
            : '') +
            svgElement(
              'g',
              {class: 'stroke-muted fill-none', transform: 'translate(6 10) scale(.83)'},
              icons[item.icon],
            ),
        ),
      )
      .join('') +
    svgElement('line', {
      class: 'stroke-divider',
      x1: width - CELL_COLUMNS * COLUMN_PIXELS,
      x2: width - CELL_COLUMNS * COLUMN_PIXELS,
      y1: 10,
      y2: height - DIVIDER_INSET,
    })
  return Box({
    children: [
      Box({
        children: items.map((item) =>
          Box({
            children: [
              item.disabled
                ? Text({children: [item.label], dimColor: true})
                : Button({
                    key: item.key,
                    label: item.label,
                    onPress: () => view.send(item.command),
                    plain: true,
                  }),
            ],
            overflow: 'hidden',
            width: CELL_COLUMNS,
          }),
        ),
        height: 2,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }),
      Box({
        children: [
          Svg({
            alt: view.t('파일 탐색 · 뒤로, 앞으로, 새로고침'),
            height,
            source: svgDocument({content, height, width}),
          }),
        ],
        height: 2,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }),
      ...items.flatMap((item, index) =>
        item.disabled
          ? []
          : [
              Box({
                children: [
                  Client({
                    height: 2,
                    key: `control:${item.key}`,
                    module: './control-client.js',
                    props: {columns: CELL_COLUMNS, generation: item.stamp.generation, rows: 2},
                    width: '100%',
                  }),
                ],
                height: 2,
                left: index * CELL_COLUMNS,
                position: 'absolute',
                top: 0,
                width: CELL_COLUMNS,
              }),
            ],
      ),
    ],
    flexShrink: 0,
    height: 2,
    position: 'relative',
    width: NAV_COLUMNS,
  })
}
