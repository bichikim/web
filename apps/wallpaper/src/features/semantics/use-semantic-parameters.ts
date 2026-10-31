import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../tracking/types'
import {semanticParameters} from './parameters'
import {requestSemanticFrame, subscribeSemanticFrame, subscribeSemanticReady} from './channel'

interface SemanticPlayer {
  readonly patchParameterValues: Player['patchParameterValues']
  readonly clearParameterValues: Player['clearParameterValues']
}
interface UseSemanticParametersProps {
  readonly widgetId: Accessor<string | undefined>
  readonly bindings: Accessor<readonly SemanticBinding[] | undefined>
  readonly parameters: Accessor<readonly TrackingParameter[]>
  readonly player: Accessor<SemanticPlayer | null>
}
export const useSemanticParameters = (props: UseSemanticParametersProps) => {
  const [scores, setScores] = createSignal<Readonly<Record<string, number>>>({})
  createEffect(() => {
    const id = props.widgetId()
    setScores({})
    if (id === undefined || !props.bindings()?.some((binding) => binding.enabled)) {
      return
    }
    let disposed = false
    const request = () => requestSemanticFrame(id).catch(console.error)
    const subscriptions = [
      subscribeSemanticFrame((frame) => {
        if (!disposed && frame.widgetId === id) {
          setScores(frame.scores)
        }
      }),
      subscribeSemanticReady(request),
    ]
    Promise.all(subscriptions)
      .then(() => {
        if (!disposed) {
          request()
        }
      })
      .catch(console.error)
    onCleanup(() => {
      disposed = true
      for (const subscription of subscriptions) {
        subscription.then((stop) => stop()).catch(console.error)
      }
    })
  })
  const values = createMemo(() =>
    semanticParameters({
      bindings: props.bindings() ?? [],
      parameters: props.parameters(),
      scores: scores(),
    }),
  )
  createEffect(() => {
    const player = props.player()
    const mapped = values()
    const ids = Object.keys(mapped)
    if (player === null || ids.length === 0) {
      return
    }
    player.patchParameterValues(mapped)
    onCleanup(() => player.clearParameterValues(ids))
  })
}
