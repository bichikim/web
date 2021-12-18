import {inject, InjectionKey, ShallowRef, ref} from 'vue'
import Babylon from 'babylonjs'

export const lightKey: InjectionKey<ShallowRef<Babylon.Light | undefined>> = Symbol('light')

export const useLight = () => {
  return inject(lightKey, ref())
}
