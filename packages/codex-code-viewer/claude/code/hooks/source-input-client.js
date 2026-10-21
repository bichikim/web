const MAX_EVENTS = 256
const GUTTER_COLUMNS = 5
const navigationOffset = ({props, line, input, event, gutter}) => {
  if (gutter || event.shift || (props.editable && !event.ctrl)) {
    return undefined
  }
  return line.links?.find((entry) => entry.from <= input.offset && input.offset < entry.to)?.from
}
/** Captures ordered input and completes pointer gestures before redrawing the host. */
export default function SourceInputClient(props, surface) {
  const {Box, Text} = surface.elements
  const prior = surface.state
  const model =
    prior === undefined || prior.path !== props.path || prior.epoch !== props.epoch
      ? {epoch: props.epoch, path: props.path, pending: [], serial: props.serial}
      : prior
  const pending = model.pending.filter((entry) => entry.serial > props.serial)
  let current = {...model, pending}
  let gesture
  if (pending.length !== model.pending.length) {
    surface.setState(current)
  }
  const post = (events) => {
    const previousSerial = Math.max(current.serial, props.serial)
    const received = events.map((event, index) => ({...event, serial: previousSerial + index + 1}))
    const serial = previousSerial + received.length
    current = {...current, pending: [...current.pending, ...received].slice(-MAX_EVENTS), serial}
    surface.setState(current)
    surface.post({epoch: props.epoch, events: current.pending, kind: 'events', path: props.path})
  }
  const visibleRows = Math.floor(surface.rows)
  if (visibleRows > 0 && current.viewportRows !== visibleRows) {
    current = {...current, viewportRows: visibleRows}
    post([{kind: 'viewport', rows: visibleRows}])
  }
  const finish = (activate = true) => {
    if (gesture !== undefined) {
      const events = gesture.last === undefined ? [gesture.first] : [gesture.first, gesture.last]
      const click = gesture.last === undefined || gesture.last.offset === gesture.first.offset
      const followed =
        activate && click && gesture.follow !== undefined
          ? [...events, {kind: 'follow', offset: gesture.follow, point: gesture.point}]
          : events
      gesture = undefined
      post(followed)
    }
  }
  surface.onPointer((event) => {
    if (event.type === 'enter') {
      surface.post({kind: 'viewport'})
      return
    }
    if (event.type === 'up' || event.type === 'leave') {
      finish()
      return
    }
    if (event.type === 'down' && event.button === 'right') {
      finish(false)
      const line = props.lines[Math.max(0, Math.min(props.lines.length - 1, Math.floor(event.y)))]
      const column = Math.max(0, Math.floor(event.x) - (props.numbers ? GUTTER_COLUMNS : 0))
      if (line !== undefined) {
        post([
          {
            kind: 'context',
            offset: line.stops[Math.min(column, line.stops.length - 1)],
            point: {x: event.x, y: event.y},
          },
        ])
      }
      return
    }
    const begins = event.type === 'down' && (event.button === undefined || event.button === 'left')
    if (!begins && !(event.type === 'move' && gesture !== undefined)) {
      return
    }
    const line = props.lines[Math.max(0, Math.min(props.lines.length - 1, Math.floor(event.y)))]
    if (line === undefined) {
      return
    }
    const gutter = begins ? props.numbers && event.x < GUTTER_COLUMNS : gesture.gutter
    const column = Math.max(0, Math.floor(event.x) - (props.numbers ? GUTTER_COLUMNS : 0))
    const input = gutter
      ? {begin: begins, kind: 'lines', line: line.number, shift: event.shift === true}
      : {
          kind: begins ? 'cursor' : 'extend',
          offset: line.stops[Math.min(column, line.stops.length - 1)],
          shift: event.shift === true,
        }
    const follow = navigationOffset({event, gutter, input, line, props})
    gesture = begins
      ? {first: input, follow, gutter, point: {x: event.x, y: event.y}}
      : {...gesture, last: input}
  })
  surface.onKey((event) => {
    finish(false)
    post([
      {
        ctrl: event.ctrl === true,
        key: event.key,
        kind: 'key',
        meta: event.meta === true,
        shift: event.shift === true,
      },
    ])
  })
  return Box({
    children: Array.from({length: props.viewportRows ?? props.rows}, () =>
      Box({children: [Text({children: ['\u00a0']})], height: 1}),
    ),
    flexDirection: 'column',
    height: props.viewportRows ?? props.rows,
    width: '100%',
  })
}
