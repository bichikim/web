/* eslint-disable */
import {Ref} from 'vue-demi'

export type StateKind = 'atom' | string

export interface Info {
  args?: any[]
  kind?: StateKind
  name?: string
  raw?: string
  relates?: Map<string, any>
  /**
   * kind > type
   */
  type?: string
  watchTrigger?: Ref<any>
}

export interface InfoInside extends Info {
  relates: Map<string, any>
}

export type InfoMapObjectKey = string | symbol | number

export type InfoMapKey = Record<InfoMapObjectKey, any>

/**
 * @deprecated
 * @param relatesSource
 * @param relatesTarget
 */
export const mergeRelates = (relatesSource: Map<string, any>, relatesTarget: Map<string, any>) => {
  relatesSource.forEach((value, key) => {
    relatesTarget.set(key, value)
  })

  return relatesTarget
}

export class InfoMap {

  private _infoMap: WeakMap<InfoMapKey, InfoInside> = new WeakMap()

  get(target: InfoMapKey): undefined | InfoInside {
    return this._infoMap.get(target)
  }

  set(target: InfoMapKey, info: Info, previousTarget?: InfoMapKey): void {

    const previousInfo = previousTarget ? this._infoMap.get(previousTarget) : previousTarget

    const {
      kind,
      relates = new Map<string, any>(),
      ...rest
    } = info

    let newRelates = relates

    const previousRelates = previousInfo?.relates

    const newKind = kind ?? previousInfo?.kind

    if (previousRelates) {
      newRelates = mergeRelates(relates, previousRelates)
    }

    this._infoMap.set(target, {...rest, kind: newKind, relates: newRelates})
  }
}

let _infoMap: InfoMap | undefined

/**
 * @deprecated
 */
export const useInfo = () => {
  if (_infoMap) {
    return _infoMap
  }

  _infoMap = new InfoMap()

  return _infoMap
}
