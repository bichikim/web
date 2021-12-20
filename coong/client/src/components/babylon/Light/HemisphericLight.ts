import * as Babylon from '@babylonjs/core'
import {defineComponent, PropType, provide, ShallowRef, shallowRef, toRefs, watchEffect} from 'vue'
import {useScene} from '../Scene'
import {lightKey} from './context'
import {useBabylonDispose} from '../use-babylon-dispose'

export const provideHemisphericLight = (
  name: string,
  direction: Babylon.Vector3,
  scene: ShallowRef<Babylon.Scene | undefined>,
) => {
  const light = shallowRef<undefined | Babylon.HemisphericLight>()

  watchEffect(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      light.value = new Babylon.HemisphericLight(name, direction, sceneValue)
    }
  })

  provide(lightKey, light)
  return light
}

export const HemisphericLight = defineComponent({
  name: 'HemisphericLight',
  props: {
    direction: {default: () => (new Babylon.Vector3(0, 0, 0)), type: Object as PropType<Babylon.Vector3>},
    name: {default: 'light', type: String},
  },
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup(props) {
    const {name, direction} = toRefs(props)
    const scene = useScene()
    const light = provideHemisphericLight(name.value, direction.value, scene)

    useBabylonDispose(light)

    return {
      light,
    }
  },
})
