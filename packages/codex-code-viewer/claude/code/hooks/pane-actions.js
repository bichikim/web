let actions = Promise.resolve()
/** Orders document actions and reports failures without blocking later actions. */
export function runPaneAction(engine, action) {
  actions = actions.then(action).catch((error) => {
    engine.ui.toast(`Code Viewer: ${error instanceof Error ? error.message : String(error)}`)
    engine.ui.invalidate('ui.render')
  })
  return actions
}
