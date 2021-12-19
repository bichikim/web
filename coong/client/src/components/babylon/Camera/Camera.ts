import * as Babylon from 'babylonjs'
import {defineComponent, PropType, provide, shallowRef, ShallowRef, toRefs, watchEffect} from 'vue'
import {useScene} from '../Scene'
import {camaraKey} from './context'

export type CameraType = 'ArcRotateCamera' | 'Camera'

export const provideCamera = (
  name: string,
  vector: Babylon.Vector3,
  scene: ShallowRef<Babylon.Scene | undefined>,
) => {
  const camera = shallowRef()

  watchEffect(() => {
    const sceneValue = scene.value
    if (sceneValue) {
      camera.value = new Babylon.Camera(name, vector, sceneValue)
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
    const camera = provideCamera(name.value, vector.value, scene)
    return {
      camera,
    }
  },
})

