import {type Accessor, createEffect, createMemo, onCleanup, untrack} from 'solid-js'
import type {MotionPlayback, Player} from '@winter-love/puppet/player'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from './types'
import {useSemanticFrame} from './use-semantic-frame'

interface SemanticPlayer {
  readonly getExpression: Player['getExpression']
  readonly setExpression: Player['setExpression']
  readonly resetMotionHistory: Player['resetMotionHistory']
  readonly startMotion: (
    id: string,
    options: {readonly loop: boolean},
  ) => Pick<MotionPlayback, 'stop'> | undefined
}
interface UseSemanticActionsProps {
  /** Widget providing live matching scores and manual execution requests. */
  readonly widgetId: Accessor<string | undefined>
  /** User's text-to-action connections; omitted means no semantic actions. */
  readonly bindings: Accessor<readonly SemanticBinding[] | undefined>
  /** Actions declared by the loaded character; unavailable targets do not execute. */
  readonly actions: Accessor<readonly CharacterAction[]>
  /** Current player; replaced players release their semantic action. */
  readonly player: Accessor<SemanticPlayer | null>
}
export const useSemanticActions = (props: UseSemanticActionsProps) => {
  const current = useSemanticFrame({
    enabled: () => props.bindings()?.some((binding) => binding.enabled) ?? false,
    widgetId: props.widgetId,
  })
  const selected = createMemo<CharacterAction | undefined>(
    () => {
      const frame = current()
      const manual = frame?.previewId
      const actions = props.actions()
      const [winner] = (props.bindings() ?? [])
        .filter(
          (binding) =>
            binding.enabled &&
            binding.action !== undefined &&
            actions.some(
              (item) =>
                item.action.kind === binding.action!.kind && item.action.id === binding.action!.id,
            ),
        )
        .filter((binding) =>
          manual === undefined
            ? (frame?.scores[binding.id] ?? -1) >= binding.threshold
            : binding.id === manual,
        )
        .toSorted(
          (first, second) => (frame?.scores[second.id] ?? -1) - (frame?.scores[first.id] ?? -1),
        )
      return winner?.action === undefined
        ? undefined
        : actions.find(
            (item) =>
              item.action.kind === winner.action!.kind && item.action.id === winner.action!.id,
          )
    },
    undefined,
    {
      equals: (first, second) =>
        first?.action.kind === second?.action.kind && first?.action.id === second?.action.id,
    },
  )
  createEffect(() => {
    const player = props.player()
    const selection = selected()
    if (player === null || selection === undefined) {
      return
    }
    const {action} = selection
    switch (action.kind) {
      case 'expression': {
        const previous = untrack(() => player.getExpression())
        untrack(() => player.setExpression(action.id))
        onCleanup(() => {
          if (player.getExpression() === action.id) {
            player.setExpression(previous)
          }
        })
        return
      }
      case 'motion': {
        const playback = player.startMotion(action.id, {loop: true})
        onCleanup(() => {
          playback?.stop()
          player.resetMotionHistory(selection.parameterIds ?? [])
        })
        return
      }
      default: {
        const exhaustive: never = action
        return exhaustive
      }
    }
  })
}
