import * as Babylon from '@babylonjs/core'
import {
  defineComponent,
  inject,
  InjectionKey,
  PropType,
  provide,
  ref,
  ShallowRef,
  shallowRef,
  toRefs,
  watchEffect,
} from 'vue'
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
  props: {
    color: {type: Object as PropType<Babylon.Color4>},
  },
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup(props) {
    const {color: colorRef} = toRefs(props)
    const engineMeta = useEngine()
    const sceneRef = provideScene(engineMeta)

    watchEffect(() => {
      const scene = sceneRef.value
      const color = colorRef.value
      if (scene && color) {
        scene.clearColor = color
      }
    })

    useBabylonDispose(sceneRef)

    return {
      scene: sceneRef,
    }
  },
})
