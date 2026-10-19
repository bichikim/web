import {type App, applyHostStyleVariables} from '@modelcontextprotocol/ext-apps'

export const connectHostAppearance = (app: App): (() => void) => {
  const root = document.documentElement
  let applied: string[] = []
  const update = (): void => {
    const context = app.getHostContext()
    if (context?.theme !== undefined) {
      root.dataset.theme = context.theme
    }
    const variables = context?.styles?.variables
    if (variables !== undefined) {
      const active = Object.entries(variables)
        .filter(([, value]) => value !== undefined)
        .map(([name]) => name)
      applied
        .filter((name) => !active.includes(name))
        .forEach((name) => root.style.removeProperty(name))
      applyHostStyleVariables(variables, root)
      applied = active
    }
  }
  app.addEventListener('hostcontextchanged', update)
  update()
  return () => app.removeEventListener('hostcontextchanged', update)
}
