import {Action, ActionIdentifierName} from 'src/act'
import {Computation, ComputationIdentifierName, ComputationRefIdentifierName} from 'src/compute'
import {Mutation, MutationIdentifierName} from 'src/mutate'
import {State, StateIdentifierName} from 'src/state'
import {Ref} from 'vue-demi'

export type AllKinds = State<any> | Mutation<any> | Computation<any, any> | Action<any>

export type Identifier = MutationIdentifierName
  | StateIdentifierName
  | ComputationIdentifierName
  | ActionIdentifierName
  | ComputationRefIdentifierName

export interface PlaygroundInfo {
  args: any
}

export interface VareInfo {
  playground?: PlaygroundInfo
  identifier: Identifier
  relates: Set<AllKinds>
  name?: string
  description?: string
  type?: string | undefined
  watchFlag?: Ref<any>
}

export const createInfoMap = () => {
  const infoMap = new WeakMap<AllKinds, VareInfo>()

  return {
    set: (target: AllKinds, info: VareInfo) => {
      infoMap.set(target, info)
    },
    get: (target: AllKinds): VareInfo | undefined => {
      return infoMap.get(target)
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

export const getRelates = (target: AllKinds): Set<AllKinds> | undefined => {
  return info.get(target)?.relates
}

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
