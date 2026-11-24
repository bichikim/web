import type {Player} from '@winter-love/puppet/player'
import {type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter, TouchPoint} from './types'
import {createJointDrag, type JointDrag} from './create-joint-drag'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {jointChainState} from './joint-chain-state'

export type TouchPlayer = Pick<
  Player,
  | 'pickPart'
  | 'patchParameterBlends'
  | 'getParameterValues'
  | 'createParameterDrag'
  | 'releaseParameterPhysics'
>
export interface TouchSession {
  readonly canvas: HTMLCanvasElement
  readonly pointerId: number
  readonly origin: TouchPoint
  readonly parameters: readonly TouchParameter[]
  readonly settings: PoffoTouch
  readonly joints?: JointDrag
  previous: TouchPoint
  dragged: boolean
}
interface CreateTouchSessionOptions {
  readonly write: (offsets: Readonly<Record<string, number>>) => void
  readonly offsets: () => Readonly<Record<string, number>>
  readonly canvas: HTMLCanvasElement
  readonly player: TouchPlayer
  readonly settings: PoffoTouch
  readonly parameters: readonly TouchParameter[]
  readonly point: TouchPoint
  readonly pointerId: number
}

export const createTouchSession = (options: CreateTouchSessionOptions): TouchSession | null => {
  const {canvas, player, settings, point} = options
  const bounds = canvas.getBoundingClientRect()
  const local = {x: point.x - bounds.left, y: point.y - bounds.top}
  const part = player.pickPart(local)
  const parameters = options.parameters.filter(
    (parameter) =>
      parameter.parts.includes(part ?? '') &&
      Object.hasOwn(settings.parameters ?? {}, parameter.id) &&
      (settings.parameters?.[parameter.id]?.parts === undefined ||
        settings.parameters[parameter.id]!.parts!.includes(part ?? '')) &&
      settings.parameters?.[parameter.id]?.axis !== 'off',
  )
  if (part === undefined) {
    return null
  }
  const [connection] = touchJointChains(settings).flatMap((chain) => {
    const state = jointChainState(chain, options.parameters)
    const active = chain.joints.filter((joint) =>
      options.parameters.some(
        (parameter) => parameter.id === joint.parameterId && parameter.parts.includes(part),
      ),
    )
    return chain.enabled && state.kind === 'ready' && active.length > 0 ? [{active, chain}] : []
  })
  const ids = connection?.active.map((joint) => joint.parameterId!) ?? []
  const mobility = connection?.active.map((joint) => joint.response) ?? []
  const ORIENTATION_JOINTS = 3
  const preserveAngle =
    connection?.chain.preserveAngle === true &&
    ids.length >= ORIENTATION_JOINTS &&
    ids.length === connection.chain.joints.length
  const drag =
    connection === undefined
      ? undefined
      : player.createParameterDrag({mobility, parameterIds: ids, point: local, preserveAngle})
  const joints =
    drag === undefined || connection === undefined
      ? undefined
      : createJointDrag({
          drag,
          offsets: options.offsets,
          parameterIds: ids,
          response: mobility,
          values: () => player.getParameterValues(),
          write: options.write,
        })
  if (joints === undefined && parameters.length === 0) {
    return null
  }
  const movable = new Set(ids.filter((_id, index) => mobility[index]! > 0))
  return {
    canvas,
    dragged: false,
    joints,
    origin: point,
    parameters:
      joints === undefined
        ? parameters
        : options.parameters.filter((parameter) => movable.has(parameter.id)),
    pointerId: options.pointerId,
    previous: point,
    settings,
  }
}
