import type {TouchJointChain} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter} from './types'
type JointChainState =
  | {readonly kind: 'ready'; readonly parameterIds: readonly string[]}
  | {readonly kind: 'incomplete' | 'missing' | 'duplicate' | 'unrelated' | 'nonrotation'}

export const jointChainState = (
  chain: TouchJointChain,
  catalog: readonly TouchParameter[],
): JointChainState => {
  const ids = chain.joints.flatMap((joint) =>
    joint.parameterId === undefined ? [] : [joint.parameterId],
  )
  if (ids.length === 0 || ids.length !== chain.joints.length) {
    return {kind: 'incomplete'}
  }
  if (new Set(ids).size !== ids.length) {
    return {kind: 'duplicate'}
  }
  const parameters = ids.flatMap((id) => catalog.filter((parameter) => parameter.id === id))
  if (parameters.length !== ids.length) {
    return {kind: 'missing'}
  }
  if (parameters.some((parameter) => parameter.joint !== true)) {
    return {kind: 'nonrotation'}
  }
  if (
    !parameters[0]!.parts.some((part) =>
      parameters.every((parameter) => parameter.parts.includes(part)),
    )
  ) {
    return {kind: 'unrelated'}
  }
  return {kind: 'ready', parameterIds: ids}
}
