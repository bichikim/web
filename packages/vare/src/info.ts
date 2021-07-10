import {Action, ActionIdentifierName} from 'src/act'
import {Computation, ComputationIdentifierName, ComputationRefIdentifierName} from 'src/compute'
import {Mutation, MutationIdentifierName} from 'src/mutate'
import {State, StateIdentifierName} from 'src/state'
import {Atom, AtomIdentifierName} from './atom'
import {Ref} from 'vue-demi'

export type AllKinds = State<any> | Mutation<any> | Computation<any, any> | Action<any> | Atom<any>

export type Identifier = MutationIdentifierName
  | StateIdentifierName
  | ComputationIdentifierName
  | ActionIdentifierName
  | ComputationRefIdentifierName
  | AtomIdentifierName

export interface PlaygroundInfo {
  args: any
}

export interface VareInfo {
  description?: string
  identifier: Identifier
  name?: string
  playground?: PlaygroundInfo
  relates: Set<AllKinds>
  type?: string | undefined
  watchFlag?: Ref<any>
}

export interface VareInfoOptions extends Omit<VareInfo, 'relates'>{
  relates?: Set<AllKinds>
}

export const createInfoMap = () => {
  const infoMap = new WeakMap<AllKinds, VareInfo>()

  return {
    get: (target: AllKinds): VareInfo | undefined => (
      infoMap.get(target)
    ),
    set: (target: AllKinds, info: VareInfoOptions) => {
      const {relates = new Set(), ...rest} = info
      infoMap.set(target, {...rest, relates})
    },
  }
}

export const info = createInfoMap()

/**
 * get item identifier refer to Identifier
 * only work in development NODE_ENV
 * @param value
 */
export const getIdentifier = (value?: AllKinds): undefined | Identifier => {
  const valueInfo = info.get(value)
  return valueInfo?.identifier
}

/**
 * get item name
 * only work in development NODE_ENV
 * @param value
 */
export const getName = (value?: AllKinds) => {
  const valueInfo = info.get(value)
  return valueInfo?.name
}

/**
 * get item name
 * only work in development NODE_ENV
 * @param value
 * @param name
 */
export const setName = (value: AllKinds, name: string) => {
  const valueInfo = info.get(value)
  if (valueInfo) {
    valueInfo.name = name
  }
}

/**
 * get playground data for devtool (computation only)
 * only work in development NODE_ENV
 * @param target
 */
export const getPlayground = (target: AllKinds): any | undefined => {
  const valueInfo = info.get(target)
  return valueInfo?.playground
}

/**
 * get playground data for devtool (computation only)
 * only work in development NODE_ENV
 * @param target
 * @param value
 */
export const setPlayground = (target: AllKinds, value: PlaygroundInfo): void => {
  const valueInfo = info.get(target)
  if (valueInfo) {
    valueInfo.playground = value
  }
}

export const getRelates = (target: AllKinds): Set<AllKinds> | undefined => (
  info.get(target)?.relates
)

export const getDescription = (value?: AllKinds): undefined | string => {
  const valueInfo = info.get(value)
  return valueInfo?.description
}

export const describe = (value: AllKinds, description: string) => {
  const valueInfo = info.get(value)
  if (valueInfo) {
    valueInfo.description = description
  }
}
