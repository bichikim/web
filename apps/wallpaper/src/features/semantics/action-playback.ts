import type {SemanticPlayer, SemanticSelection} from './types'

const startAction = (player: SemanticPlayer, selection: SemanticSelection): (() => void) => {
  const {action} = selection.action
  switch (action.kind) {
    case 'expression': {
      const layer = `semantic:${selection.group}`
      player.setExpressionLayer(layer, action.id)
      return () => {
        player.setExpressionLayer(layer)
      }
    }
    case 'motion': {
      const playback = player.startMotion(action.id, {loop: true})
      return () => {
        playback?.stop()
        player.resetMotionHistory(selection.action.parameterIds ?? [])
      }
    }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
interface ActiveAction {
  readonly key: string
  readonly release: () => void
}
/** Owns this widget's action channels, keeping unchanged groups running until explicitly disposed. */
export const createActionPlayback = (player: SemanticPlayer) => {
  const active = new Map<string, ActiveAction>()
  return {
    dispose: () => {
      for (const running of active.values()) {
        running.release()
      }
      active.clear()
    },
    sync: (selections: readonly SemanticSelection[]) => {
      const groups = new Set(selections.map((selection) => selection.group))
      for (const [group, running] of active) {
        if (!groups.has(group)) {
          running.release()
          active.delete(group)
        }
      }
      for (const selection of selections) {
        const key = JSON.stringify(selection.action.action)
        if (active.get(selection.group)?.key !== key) {
          active.get(selection.group)?.release()
          active.set(selection.group, {key, release: startAction(player, selection)})
        }
      }
    },
  }
}
