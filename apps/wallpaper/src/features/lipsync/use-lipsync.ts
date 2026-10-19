import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import type {TrackingParameter} from '../tracking/types'
import {subscribeLipSync} from './channel'
import {lipSyncValue, resolveLipSyncParameter} from './parameters'

interface UseLipSyncProps {
  readonly widgetId: Accessor<string | undefined>
  readonly options: Accessor<PoffoLipSync | undefined>
  readonly player: Accessor<Player | null>
  readonly parameters: Accessor<readonly TrackingParameter[]>
}
/** Applies a widget's lip-sync input independently of gaze tracking and default motions. */
export const useLipSync = (props: UseLipSyncProps) => {
  const settings = createMemo(() => props.options(), undefined, {
    equals: (first, second) =>
      first?.source === second?.source &&
      first?.parameterId === second?.parameterId &&
      first?.inverted === second?.inverted &&
      first?.gain === second?.gain,
  })
  createEffect(() => {
    const id = props.widgetId()
    const options = settings()
    const player = props.player()
    const parameter = resolveLipSyncParameter(props.parameters(), options?.parameterId)
    if (
      id === undefined ||
      options === undefined ||
      options.source === 'off' ||
      player === null ||
      parameter === undefined
    ) {
      return
    }
    let disposed = false
    let stop: (() => void) | undefined
    let request = 0
    let pending = 0
    let applied = lipSyncValue(parameter, 0, options)
    const draw = () => {
      request = 0
      if (disposed) {
        return
      }
      const value = lipSyncValue(parameter, pending, options)
      if (value !== applied) {
        applied = value
        player.patchParameterValues({[parameter.id]: value})
      }
    }
    player.patchParameterValues({[parameter.id]: applied})
    subscribeLipSync(id, (input) => {
      if (!disposed && input.widgetId === id && input.source === options.source) {
        pending = input.level
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
      player.clearParameterValues([parameter.id])
    })
  })
}
