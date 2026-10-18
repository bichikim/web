const COLUMN_PIXELS = 8
const ROW_PIXELS = 20
const ZOOM_STEP = 1.25
const PAN_STEP = 40
const ORIGINAL_PERCENT = 100
/** Collects an image drag until release and routes explicit camera keys. */
export default function ImageClient(props, surface) {
  let origin
  const send = (command) => surface.post({...props, ...command})
  surface.onPointer((event) => {
    if (event.type === 'down' && (event.button === 'left' || event.button === undefined)) {
      origin = event.fine ?? event
    }
    if (event.type === 'up' && origin !== undefined) {
      const point = event.fine ?? event
      send({
        delta: {
          x: (point.x - origin.x) * COLUMN_PIXELS,
          y: (point.y - origin.y) * ROW_PIXELS,
        },
        kind: 'imagePan',
      })
      origin = undefined
    }
  })
  surface.onKey((event) => {
    const deltas = {
      down: [0, -PAN_STEP],
      left: [PAN_STEP, 0],
      right: [-PAN_STEP, 0],
      up: [0, PAN_STEP],
    }
    if (deltas[event.key] !== undefined) {
      const [x, y] = deltas[event.key]
      send({delta: {x, y}, kind: 'imagePan'})
    } else if (event.key === 'home') {
      send({kind: 'imageFit'})
    } else if (['+', '=', '-', '0'].includes(event.key)) {
      send({
        kind: 'imageZoom',
        percent:
          event.key === '0'
            ? ORIGINAL_PERCENT
            : props.percent * (event.key === '-' ? 1 / ZOOM_STEP : ZOOM_STEP),
      })
    }
  })
  return surface.elements.Box({
    children: [surface.elements.Text({children: ['\u00a0']})],
    height: props.rows,
    width: '100%',
  })
}
