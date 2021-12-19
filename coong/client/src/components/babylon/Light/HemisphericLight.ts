import * as Babylon from 'babylonjs'
import {defineComponent, PropType, provide, ShallowRef, shallowRef, toRefs, watchEffect} from 'vue'
import {useScene} from '../Scene'
import {lightKey} from './context'

export const provideHemisphericLight = (
  name: string,
  vector: Babylon.Vector3,
  scene: ShallowRef<Babylon.Scene | undefined>,
) => {
  const light = shallowRef()

  watchEffect(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      light.value = new Babylon.HemisphericLight(name, vector, sceneValue)
    }
  })

  provide(lightKey, light)
  return light
}

export const HemisphericLight = defineComponent({
  name: 'HemisphericLight',
  props: {
    name: {default: 'light', type: String},
    vector: {default: () => (new Babylon.Vector3(0, 0, 0)), type: Object as PropType<Babylon.Vector3>},
  },
  render() {
    const {$slots} = this
    return $slots.default?.()
  },
  setup(props) {
    const {name, vector} = toRefs(props)
    const scene = useScene()
    const light = provideHemisphericLight(name.value, vector.value, scene)
    return {
      light,
    }
  },
})
