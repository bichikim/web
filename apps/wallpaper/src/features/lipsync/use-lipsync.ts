import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import {LIP_SYNC_SHAPES, type PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import type {TrackingParameter} from '../tracking/types'
import {type LipSyncFrame, subscribeLipSync} from './channel'
import {lipSyncValue, resolveLipSyncParameter} from './parameters'

interface UseLipSyncProps {
  readonly widgetId: Accessor<string | undefined>
  readonly options: Accessor<PoffoLipSync | undefined>
  readonly player: Accessor<Player | null>
  readonly parameters: Accessor<readonly TrackingParameter[]>
}
/** Applies independent mouth poses, releasing only its own overrides on rebind or cancellation. */
export const useLipSync = (props: UseLipSyncProps) => {
  const settings = createMemo(() => props.options(), undefined, {
    equals: (first, second) => JSON.stringify(first) === JSON.stringify(second),
  })
  createEffect(() => {
    const id = props.widgetId()
    const options = settings()
    const player = props.player()
    const parameters = props.parameters()
    if (id === undefined || options === undefined || options.source === 'off' || player === null) {
      return
    }
    const connections = LIP_SYNC_SHAPES.flatMap((shape) => {
      const binding = options.shapes?.[shape] ?? {}
      const parameter = resolveLipSyncParameter(parameters, binding.parameterId, shape)
      return parameter === undefined ? [] : [{binding, parameter, shape}]
    })
    if (connections.length === 0) {
      return
    }
    const resting = Object.fromEntries(
      connections.map(({binding, parameter}) => [
        parameter.id,
        lipSyncValue(parameter, 0, binding),
      ]),
    )
    let disposed = false
    let stop: (() => void) | undefined
    let request = 0
    let pending: LipSyncFrame | null = null
    let applied = resting
    const draw = () => {
      request = 0
      if (disposed) {
        return
      }
      const input = pending
      const values = {...resting}
      for (const {binding, parameter, shape} of connections) {
        if (input?.shape === shape) {
          values[parameter.id] = lipSyncValue(parameter, input.level, {
            ...binding,
            gain: options.gain,
          })
        }
      }
      if (Object.entries(values).some(([key, value]) => applied[key] !== value)) {
        applied = values
        player.patchParameterValues(values)
      }
    }
    player.patchParameterValues(resting)
    subscribeLipSync(id, (input) => {
      if (!disposed && input.widgetId === id && input.source === options.source) {
        pending = input
        if (request === 0) {
          request = requestAnimationFrame(draw)
        }
      }
    })
      .then((unsubscribe) => {
        if (disposed) {
          unsubscribe()
        } else {
          stop = unsubscribe
        }
      })
      .catch((cause: unknown) => console.error('Poffo lip sync subscription failed', cause))
    onCleanup(() => {
      disposed = true
      cancelAnimationFrame(request)
      stop?.()
      player.clearParameterValues(Object.keys(resting))
    })
  })
}
