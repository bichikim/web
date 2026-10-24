import {treeKey} from './tree-key.js'
/** Routes one fixed-height row viewport through a single native input surface. */
export default function TreeClient(props, surface) {
  const {Box, Text} = surface.elements
  const previous = surface.state
  let model =
    previous === undefined || previous.cursor !== props.cursor
      ? {
          ...previous,
          cursor: props.cursor,
          hovered: previous?.hovered ?? '',
          path: props.cursor || props.active,
        }
      : previous
  const update = (next) => {
    model = {...model, ...next}
    surface.setState(model)
  }
  const post = (command) => {
    const row = props.rows[command.index]
    if (row === undefined) {
      return
    }
    update({path: row.path})
    surface.post({...command, path: row.path})
  }
  const hover = (index) => {
    const row = props.rows[index]
    const path = row?.path ?? ''
    if (path === model.hovered) {
      return
    }
    const previous = props.rows.findIndex((entry) => entry.path === model.hovered)
    update({hovered: path})
    const target = row === undefined ? props.rows[previous] : row
    if (target !== undefined) {
      surface.post({
        active: row !== undefined,
        index: row === undefined ? previous : index,
        kind: 'hover',
        path: target.path,
      })
    }
  }
  surface.onPointer((event) => {
    if (event.type === 'enter' || event.type === 'move') {
      if (event.button === undefined) {
        const columns = surface.columns > 0 ? surface.columns : props.columns
        hover(event.x >= 0 && event.x < columns ? Math.floor(event.y) : -1)
        if (event.type === 'enter' && props.rows.length === 0) {
          surface.post({kind: 'viewport'})
        }
      }
      return
    }
    if (event.type === 'leave') {
      if (props.rows[Math.floor(event.y)]?.path === model.hovered) {
        hover(-1)
      }
      return
    }
    if (event.type !== 'down') {
      return
    }
    post({
      index: Math.floor(event.y),
      kind: event.button === 'right' ? 'menu' : 'activate',
      point: {x: event.x, y: event.y},
    })
  })
  surface.onKey((event) => {
    const index = props.rows.findIndex((row) => row.path === model.path)
    const cursor = Math.max(0, index)
    const command = treeKey(props, cursor, event)
    if (command !== undefined) {
      post(command)
    }
  })
  return Box({
    children: props.rows.map(() =>
      Box({children: [Text({children: ['\u00a0']})], flexShrink: 0, height: 1}),
    ),
    flexDirection: 'column',
    height: Math.max(1, props.rows.length),
    width: '100%',
  })
}
