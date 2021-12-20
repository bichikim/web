import * as Babylon from 'babylonjs'
import {defineComponent, inject, InjectionKey, provide, ref, ShallowRef, shallowRef, watchEffect} from 'vue'
import {EngineMeta, useEngine} from './Engine'
import {useBabylonDispose} from './use-babylon-dispose'

export const sceneKey: InjectionKey<ShallowRef<Babylon.Scene>> =
  Symbol('scene')

export const useScene = (): ShallowRef<Babylon.Scene | undefined> => {
  return inject(sceneKey, ref())
}

export const provideScene = (
  engineMeta: EngineMeta,
): ShallowRef<Babylon.Scene | undefined> => {
  const scene = shallowRef()

  watchEffect(() => {
    const engineValue: Babylon.Engine | undefined = engineMeta.engine
    if (engineValue) {
      scene.value = new Babylon.Scene(engineValue)
    }
  })

  provide(sceneKey, scene)

  return scene
}

export const Scene = defineComponent({
  name: 'Scene',
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup() {
    const engineMeta = useEngine()
    const scene = provideScene(engineMeta)

    useBabylonDispose(scene)

    return {
      scene,
    }
  },
})
