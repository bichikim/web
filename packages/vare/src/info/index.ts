import {Ref} from 'vue-demi'

export type StateKind = 'atom' | string

export interface Info {
  kind?: StateKind
  name?: string
  relates?: Map<string, any>
  watchTrigger?: Ref<any>
}

export interface InfoInside extends Info {
  relates: Map<string, any>
}

export type InfoMapObjectKey = string | symbol | number

export type InfoMapKey = Record<InfoMapObjectKey, any>

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

  set(target: InfoMapKey, info: Info, previousTarget: InfoMapKey): void {

    const previousInfo = this._infoMap.get(previousTarget)
    const {
      kind = 'unknown',
      relates = new Map<string, any>(),
      ...rest
    } = info

    let newRelates = relates
    const previousRelates = previousInfo?.relates

    if (previousRelates) {
      newRelates = mergeRelates(relates, previousRelates)
    }

    this._infoMap.set(target, {...rest, kind, relates: newRelates})
  }
}

let _infoMap: InfoMap | undefined

export const useInfo = () => {
  if (_infoMap) {
    return _infoMap
  }

  _infoMap = new InfoMap()

  return _infoMap
}
