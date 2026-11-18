import type {SemanticPlayer, SemanticSelection} from './types'

const actionKey = (selection: SemanticSelection) =>
  JSON.stringify([selection.group, selection.action.action.kind, selection.action.action.id])

const startAction = (
  player: SemanticPlayer,
  selection: SemanticSelection,
): (() => void) | undefined => {
  const {action} = selection.action
  switch (action.kind) {
    case 'expression': {
      const layer = `semantic:${actionKey(selection)}`
      player.setExpressionLayer(layer, action.id)
      return () => {
        player.setExpressionLayer(layer)
      }
    }
    case 'motion': {
      const playback = player.startMotion(action.id, {loop: true})
      if (playback === undefined) {
        return undefined
      }
      return () => {
        playback.stop()
        player.resetMotionHistory(selection.action.parameterIds ?? [])
      }
    }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
/** Owns this widget's action channels, keeping unchanged actions running until explicitly disposed. */
export const createActionPlayback = (player: SemanticPlayer) => {
  const active = new Map<string, NonNullable<ReturnType<typeof startAction>>>()
  return {
    dispose: () => {
      for (const release of active.values()) {
        release()
      }
      active.clear()
    },
    sync: (selections: readonly SemanticSelection[]) => {
      const keys = new Set(selections.map(actionKey))
      for (const [key, release] of active) {
        if (!keys.has(key)) {
          release()
          active.delete(key)
        }
      }
      for (const selection of selections) {
        const key = actionKey(selection)
        if (!active.has(key)) {
          const release = startAction(player, selection)
          if (release !== undefined) {
            active.set(key, release)
          }
        }
      }
    },
  }
}
