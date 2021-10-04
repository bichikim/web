import {CreateInfoMapReturnType} from './info'

export const globalInfoKey = '__vare__'

export const setGlobalInfo = <Identifier extends string>(
  info: CreateInfoMapReturnType<Identifier>,
) => {
  globalThis[globalInfoKey] = info
}

export const getGlobalInfo = <Identifier extends string>(): CreateInfoMapReturnType<Identifier> | undefined => {
  return globalThis[globalInfoKey]
}
