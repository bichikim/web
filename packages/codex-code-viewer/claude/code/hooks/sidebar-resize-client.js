import {SIDEBAR_LAYOUT} from '../../../src/headless/sidebar-layout.ts'
import {paneSidebarWidth} from './pane-sidebar-width.ts'
import {COLUMN_PIXELS, DIVIDER_COLUMNS} from './pane-metrics.ts'
/** Captures the internal divider with shared width bounds and keyboard resizing. */
export default function SidebarResizeClient(props, surface) {
  const {Box, Text} = surface.elements
  const prior = surface.state
  let model =
    prior === undefined || prior.received !== props.value || prior.columns !== props.columns
      ? {
          ...prior,
          columns: props.columns,
          received: props.value,
          width: paneSidebarWidth(props.columns, props.value),
        }
      : prior
  const resize = (preferred, commit = false) => {
    const width = Math.round(paneSidebarWidth(props.columns, preferred))
    if (width === model.width && !commit) {
      return
    }
    model = {...model, width}
    surface.setState(model)
    if (commit) {
      surface.post({commit: true, kind: 'resize', value: `${width}px`})
    }
  }
  const pointerColumn = (event) => (event.fine?.x ?? event.x) - surface.columns
  surface.onPointer((event) => {
    if (
      event.type === 'down' &&
      event.x < DIVIDER_COLUMNS &&
      (event.button === undefined || event.button === 'left')
    ) {
      model = {...model, drag: {start: pointerColumn(event), width: model.width}}
      surface.setState(model)
    } else if (event.type === 'move' && model.drag !== undefined) {
      resize(model.drag.width + (model.drag.start - pointerColumn(event)) * COLUMN_PIXELS)
    } else if (event.type === 'up' && model.drag !== undefined) {
      resize(model.width, true)
      model = {...model, drag: undefined}
      surface.setState(model)
    }
    const hovered =
      model.drag !== undefined ||
      (event.type !== 'leave' && event.x >= 0 && event.x < DIVIDER_COLUMNS)
    if (model.hovered !== hovered) {
      model = {...model, hovered}
      surface.setState(model)
    }
  })
  surface.onKey((event) => {
    switch (event.key) {
      case 'left':
        resize(model.width + SIDEBAR_LAYOUT.keyboardStep, true)
        break
      case 'right':
        resize(model.width - SIDEBAR_LAYOUT.keyboardStep, true)
        break
      case 'home':
        resize(0, true)
        break
      case 'end':
        resize(Infinity, true)
        break
      default:
        break
    }
  })
  return Box({
    children: [
      Box({width: SIDEBAR_LAYOUT.spacing / 2 / COLUMN_PIXELS}),
      Box({
        backgroundColor: model.hovered
          ? (props.palette?.accent ?? 'blue')
          : (props.palette?.divider ?? 'gray'),
        children: [Text({children: ['\u00a0']})],
        height: props.rows,
        width: 1 / COLUMN_PIXELS,
      }),
    ],
    flexDirection: 'row',
    height: props.rows,
    key: 'divider-surface',
    width: model.width / COLUMN_PIXELS + DIVIDER_COLUMNS,
  })
}
