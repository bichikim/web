/** Routes pointer activation to the current native control while retaining its keyboard button. */
export default function ControlClient(props, surface) {
  let pressed = surface.state?.pressed === true
  const activate = () => surface.post({generation: props.generation, kind: 'press'})
  surface.onPointer((event) => {
    if (event.type === 'down' && (event.button === 'left' || event.button === undefined)) {
      pressed = true
      surface.setState({pressed: true})
    }
    if (event.type === 'up' && pressed) {
      pressed = false
      surface.setState({pressed: false})
      if (event.x >= 0 && event.x < props.columns && event.y >= 0 && event.y < props.rows) {
        activate()
      }
    }
  })
  surface.onKey((event) => {
    if (event.key === 'return' || event.key === 'space' || event.key === ' ') {
      activate()
    }
  })
  return surface.elements.Box({
    children: [surface.elements.Text({children: ['\u00a0']})],
    height: props.rows,
    width: '100%',
  })
}
