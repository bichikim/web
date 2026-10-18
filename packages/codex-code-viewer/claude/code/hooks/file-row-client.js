import {treeKey} from './tree-key.js'
/** Handles one native file row while keeping keyboard navigation on the shared tree cursor. */
export default function FileRowClient(props, surface) {
  const {Box, Text} = surface.elements
  let model = surface.state ?? {hovered: false, pressed: false}
  const update = (next) => {
    model = {...model, ...next}
    surface.setState(model)
  }
  const post = (command) => surface.post({...command, index: props.index, path: props.row.path})
  const hover = (active) => {
    if (active !== model.hovered) {
      update({hovered: active})
      surface.post({active, index: props.index, kind: 'hover', path: props.row.path})
    }
  }
  surface.onPointer((event) => {
    switch (event.type) {
      case 'enter':
      case 'move':
        if (event.button === undefined) {
          if (model.pressed) {
            update({pressed: false})
          }
          hover(event.y >= 0 && event.y < 1)
        }
        break
      case 'leave':
        if (!model.pressed) {
          hover(false)
        }
        break
      case 'up':
        update({pressed: false})
        break
      case 'down':
        update({pressed: true})
        post({
          kind: event.button === 'right' ? 'menu' : 'activate',
          point: {x: event.x, y: props.index + event.y},
        })
        break
      default:
        break
    }
  })
  surface.onKey((event) => {
    const command = treeKey({rows: [props.keyboard.row]}, 0, event)
    if (command !== undefined) {
      surface.post({...command, index: props.keyboard.index, path: props.keyboard.row.path})
    }
  })
  return Box({
    children: [Text({children: ['\u00a0'.repeat(props.columns)]})],
    height: 1,
    hover: {scope: `tree-row:${props.index}`},
    width: '100%',
  })
}
