import * as Babylon from '@babylonjs/core'
import {inject, InjectionKey, ref, ShallowRef} from 'vue'

export const lightKey: InjectionKey<ShallowRef<Babylon.Light | undefined>> =
  Symbol('light')

export const useLight = () => {
  return inject(lightKey, ref())
}
