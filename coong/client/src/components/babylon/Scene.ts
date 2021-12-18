import {
  h,
  defineComponent,
  ShallowRef, computed, ComputedRef, provide, InjectionKey, inject, ref,
  DeepReadonly,
} from 'vue'
import {useEngine} from './Engine'
import Babylon from 'babylonjs'

export const sceneKey: InjectionKey<ComputedRef<Babylon.Scene>> = Symbol('scene')

export const useScene = (): ShallowRef<Babylon.Scene | undefined> => {
  return inject(sceneKey, ref())
}

export const provideScene = (
  engine: ShallowRef<Babylon.Engine | undefined>,
  ): ComputedRef<Babylon.Scene | undefined> => {
  const scene = computed(() => {
    const engineValue = engine.value
    if (engineValue) {
      return new Babylon.Scene(engineValue)
    }
  })

  provide(sceneKey, scene)

  return scene
}

export const Scene = defineComponent({
  name: 'Scene',
  setup() {
    const engine = useEngine()
    const scene = provideScene(engine)
    return {
      scene,
    }
  },
  render: () => null,
})
