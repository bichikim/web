import {registerControl} from './control-state.js'
import {ROW_PIXELS} from './graphics.js'
import {controlGraphics} from './control-graphics.js'
const MIN_COLUMNS = 4
const LABEL_PADDING = 3
/** Retains native button roles and keyboard actions beneath the viewer's vector controls. */
export function paneButton(view, {key, label, command, options = {}}) {
  const {Box, Button, Svg, Client} = view.elements
  const caption = ['open', 'referenceGroup'].includes(command.kind) ? label : view.t(label)
  const stamp = registerControl(key, command)
  const columns = options.columns ?? Math.max(MIN_COLUMNS, caption.length + LABEL_PADDING)
  const rows = options.rows ?? 2
  const overlay = (children) =>
    Box({children, height: rows, left: 0, position: 'absolute', right: 0, top: 0})
  return Box({
    children: [
      overlay([
        Button({
          autoFocus: options.focus || undefined,
          key,
          label: caption,
          onPress: () => view.send(command),
          plain: true,
        }),
      ]),
      overlay([
        Svg({
          alt: caption,
          height: rows * ROW_PIXELS,
          source: controlGraphics({columns, focused: stamp.focused, label: caption, options, rows}),
        }),
      ]),
      overlay([
        Client({
          height: rows,
          key: `control:${key}`,
          module: './control-client.js',
          props: {columns, generation: stamp.generation, rows},
          width: '100%',
        }),
      ]),
    ],
    flexShrink: 0,
    height: rows,
    position: 'relative',
    width: columns,
  })
}
