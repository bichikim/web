const KEYBOARD_STEP = 4
/** Maps scrollbar gestures and navigation keys onto bounded source columns. */
export default function HorizontalClient(props, surface) {
  const post = (value) =>
    surface.post({
      epoch: props.epoch,
      kind: 'horizontal',
      path: props.path,
      value: Math.max(0, Math.min(props.maximum, Math.round(value))),
    })
  surface.onPointer((event) => {
    if (event.type === 'down' && event.button === 'left') {
      surface.setState({drag: true})
    }
    if (
      (event.type === 'down' && event.button === 'left') ||
      (event.type === 'move' && surface.state?.drag)
    ) {
      post((event.x / Math.max(1, props.columns - 1)) * props.maximum)
    }
    if (event.type === 'up' || event.type === 'leave') {
      surface.setState({drag: false})
    }
  })
  surface.onKey((event) => {
    const positions = {
      end: props.maximum,
      home: 0,
      left: props.value - KEYBOARD_STEP,
      pagedown: props.value + props.columns,
      pageup: props.value - props.columns,
      right: props.value + KEYBOARD_STEP,
    }
    if (positions[event.key] !== undefined) {
      post(positions[event.key])
    }
  })
  return surface.elements.Box({
    children: [surface.elements.Text({children: ['\u00a0']})],
    height: 1,
    width: '100%',
  })
}
