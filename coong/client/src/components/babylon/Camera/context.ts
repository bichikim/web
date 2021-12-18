import Babylon from 'babylonjs'
import {ComputedRef, inject, InjectionKey, ref, ShallowRef} from 'vue'

export const camaraKey: InjectionKey<ShallowRef<Babylon.Camera | undefined>> = Symbol('camara')

export const useCamera = (): ShallowRef<Babylon.Camera | undefined> => {
  return inject(camaraKey, ref())
}
