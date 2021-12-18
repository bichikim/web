import Babylon from 'babylonjs'
import {computed, defineComponent, PropType, provide, ShallowRef, toRefs} from 'vue'
import {useScene} from '../Scene'
import {camaraKey} from './context'

export type CameraType = 'ArcRotateCamera' | 'Camera'

export const provideCamera = (
  name: string,
  scene: ShallowRef<Babylon.Scene | undefined>,
  vector: Babylon.Vector3,
) => {
  const camera = computed(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      return new Babylon.Camera(name, vector, sceneValue)
    }
  })

  provide(camaraKey, camera)

  return camera
}

export const Camera = defineComponent({
  name: 'Camera',
  props: {
    name: {default: 'camera', type: String},
    vector: {default: () => (new Babylon.Vector3(0, 0, 0)), type: Object as PropType<Babylon.Vector3>},
  },
  render: () => null,
  setup(props) {
    const {vector, name} = toRefs(props)
    const scene = useScene()
    const camera = provideCamera(name.value, scene, vector.value)
    return {
      camera,
    }
  },
})

