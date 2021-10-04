import {PlaygroundInfo, VareInfo, VareInfoOptions} from './types'
import {Ref} from 'vue-demi'

export interface CreateInfoMapReturnType<Identifier extends string> {
  get: (target: any) => VareInfo<Identifier> | undefined
  set: (target: any, info: VareInfoOptions<Identifier>) => void
}

export const createInfoMap = <Identifier extends string>(): CreateInfoMapReturnType<Identifier | 'unknown'> => {
  const infoMap = new WeakMap<any, VareInfo<Identifier | 'unknown'>>()

  return {
    get: (target: any): VareInfo<Identifier | 'unknown'> | undefined => (
      infoMap.get(target)
    ),
    set: (target: any, info: VareInfoOptions<Identifier | 'unknown'>) => {
      const {relates = new Set(), identifier = 'unknown' as const, ...rest} = info
      infoMap.set(target, {...rest, identifier, relates})
    },
  }
}

export const getIdentifier = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target?: any,
) => {
  const valueInfo = info.get(target)
  return valueInfo?.identifier
}

export const getName = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target?: any,
) => {
  const valueInfo = info.get(target)
  return valueInfo?.name
}

export const setName = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
  name: string,
) => {
  const valueInfo = info.get(target)
  if (valueInfo) {
    valueInfo.name = name
  }
}

export const getPlayground = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
): any | undefined => {
  const valueInfo = info.get(target)
  return valueInfo?.playground
}

export const setPlayground = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
  value: PlaygroundInfo,
): void => {
  const valueInfo = info.get(target)
  if (valueInfo) {
    valueInfo.playground = value
  }
}

export const getRelates = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
): Set<any> | undefined => {
  return info.get(target)?.relates
}

export const getDescription = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
): undefined | string => {
  const valueInfo = info.get(target)
  return valueInfo?.description
}

export const getState = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
): undefined | any => {
  const valueInfo = info.get(target)
  return valueInfo?.state
}

export const getTrigger = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
  target: any,
): undefined | Ref<any> => {
  const valueInfo = info.get(target)
  return valueInfo?.trigger
}
