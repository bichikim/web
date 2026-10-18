let counter = 0
let commands = new Map()
let previous = new Map()
let seed
let focused
export function beginControls(view) {
  const context = {
    active: view.state.active,
    column: view.document?.column,
    dirty: view.document?.source !== view.document?.base,
    line: view.document?.line,
    page: view.page,
    selection: [view.startColumn, view.endLine, view.endColumn],
    tree: view.preferences.tree,
    visitIndex: view.visitIndex,
  }

  previous = commands
  commands = new Map()
  seed = JSON.stringify(context)
}
export function registerControl(key, command) {
  const signature = JSON.stringify(command)
  const prior = previous.get(key)
  const unchanged = prior?.seed === seed && prior.signature === signature
  if (!unchanged) {
    counter += 1
  }
  const generation = unchanged ? prior.generation : counter
  commands.set(key, {command, generation, seed, signature})
  return {focused: focused === key, generation}
}
export function controlCommand(event) {
  const command = commands.get(event.element.slice('control:'.length))
  return command !== undefined &&
    event.data?.kind === 'press' &&
    event.data.generation === command.generation
    ? command.command
    : undefined
}
export function focusControl(engine, event) {
  const next = commands.has(event.element) ? event.element : undefined
  if (focused !== next) {
    focused = next
    engine.ui.invalidate('ui.render')
  }
}

/** Requests keyboard focus on an owned native field. */
export function focusField(engine, key) {
  return engine.ui.focus({key, requestId: 'code-viewer-pane'})
}
