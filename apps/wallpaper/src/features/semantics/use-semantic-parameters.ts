import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {TrackingParameter} from '../tracking/types'
import {semanticMatches, semanticParameters} from './parameters'
import {requestSemanticFrame, subscribeSemanticFrame, subscribeSemanticReady} from './channel'

interface SemanticPlayer {
  readonly patchParameterBlends: Player['patchParameterBlends']
}
interface UseSemanticParametersProps {
  readonly widgetId: Accessor<string | undefined>
  readonly bindings: Accessor<readonly SemanticBinding[] | undefined>
  readonly parameters: Accessor<readonly TrackingParameter[]>
  readonly player: Accessor<SemanticPlayer | null>
}
const MILLISECONDS_PER_SECOND = 1000
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
  const matches = createMemo(
    () =>
      semanticMatches({
        bindings: props.bindings() ?? [],
        parameters: props.parameters(),
        scores: scores(),
      }).map((match) => ({
        ...match,
        binding: {
          ...match.binding,
          animation:
            match.binding.animation === undefined ? undefined : {...match.binding.animation},
        },
        parameter: {...match.parameter},
      })),
    [],
    {equals: (first, second) => JSON.stringify(first) === JSON.stringify(second)},
  )
  createEffect(() => {
    const player = props.player()
    const selected = matches()
    if (player === null || selected.length === 0) {
      return
    }
    const configuration = {
      bindings: selected.map((item) => item.binding),
      parameters: selected.map((item) => item.parameter),
      scores: Object.fromEntries(selected.map((item) => [item.binding.id, item.score])),
    }
    let applied: string[] = []
    let frame = 0
    let origin: number | null = null
    const apply = (elapsed: number) => {
      const values = semanticParameters({...configuration, elapsed})
      const released = applied
        .filter((id) => !Object.hasOwn(values, id))
        .map((id) => [id, undefined] as const)
      const blends = Object.entries(values).map(
        ([id, value]) => [id, {mode: 'overwrite' as const, value}] as const,
      )
      player.patchParameterBlends(Object.fromEntries([...released, ...blends]), 'after-physics')
      applied = Object.keys(values)
    }
    const durations = selected
      .filter(
        (item) => item.score >= item.binding.threshold && item.binding.animation !== undefined,
      )
      .map(({binding}) =>
        binding.animation!.cycles === undefined
          ? Infinity
          : binding.animation!.cycles * binding.animation!.period,
      )
    const end = Math.max(0, ...durations)
    const step = (time: number) => {
      origin ??= time
      const elapsed = (time - origin) / MILLISECONDS_PER_SECOND
      apply(elapsed)
      frame = elapsed < end ? requestAnimationFrame(step) : 0
    }
    apply(0)
    if (end > 0) {
      frame = requestAnimationFrame(step)
    }
    onCleanup(() => {
      cancelAnimationFrame(frame)
      player.patchParameterBlends(
        Object.fromEntries(applied.map((id) => [id, undefined])),
        'after-physics',
      )
    })
  })
}
