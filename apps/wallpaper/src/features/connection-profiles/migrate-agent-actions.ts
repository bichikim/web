import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'

/** Removes Ash's previous default tool glasses connection while retaining customized bindings. */
export const migrateAgentActions = (
  bindings: AgentStateBindings | undefined,
): AgentStateBindings | undefined => {
  const tool = bindings?.tool
  const action = tool?.actions?.[0]
  if (
    tool?.parameterId === null &&
    tool.on === undefined &&
    tool.off === undefined &&
    tool.actions?.length === 1 &&
    action?.kind === 'expression' &&
    action.id === '안경'
  ) {
    return {...bindings, tool: {...tool, actions: []}}
  }
  return bindings
}
